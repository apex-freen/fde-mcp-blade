#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
soap_call.py —— intra.soap.call
===============================
调用内网 SOAP WebService（HTTP POST + XML SOAP Envelope，SOAP 1.1/1.2）。
自动组包：method + namespace + params → SOAP Body；
响应同时返回原始 XML（截断）与结构化解析结果；SOAP Fault 视为业务错误。
stdout: {"code":0,"msg":"ok","data":{...}}
"""
import sys
import traceback
import xml.etree.ElementTree as ET

from intra_utils import (
    output_json,
    read_stdin_params,
    method_name_arg,
    get_default_timeout,
    get_max_body_chars,
    require_site,
    split_url_userinfo,
    redact_url,
    resolve_auth,
    merge_headers,
    truncate_text,
    sanitize_text,
    neutralize_injection,
    neutralize_tree,
)


SOAP11_NS = "http://schemas.xmlsoap.org/soap/envelope/"
SOAP12_NS = "http://www.w3.org/2003/05/soap-envelope"


def _import_requests():
    """懒加载 requests，缺失时给出明确提示"""
    try:
        import requests
    except ImportError:
        output_json(
            -1,
            "缺少依赖 requests：HTTP/SOAP 方法需要该库。"
            "请管理员在服务器执行: pip install requests",
        )
    return requests


# ============================================================
# XML 工具
# ============================================================

def _xml_escape(value: str) -> str:
    """文本节点转义"""
    return (
        str(value)
        .replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
    )


def _xml_escape_attr(value: str) -> str:
    """属性值转义"""
    return _xml_escape(value).replace('"', "&quot;").replace("'", "&apos;")


def _scalar_text(value) -> str:
    """标量值 → XML 文本：bool 用 xsd:boolean 词法 true/false"""
    if isinstance(value, bool):
        return "true" if value else "false"
    if value is None:
        return ""
    return str(value)


def render_param(tag: str, value) -> str:
    """把 (键, 值) 渲染成 XML 元素。支持标量 / 嵌套 dict / list(同标签重复)"""
    if isinstance(value, dict):
        inner = "".join(render_param(k, v) for k, v in value.items())
        return f"<{tag}>{inner}</{tag}>"
    if isinstance(value, (list, tuple)):
        return "".join(render_param(tag, item) for item in value)
    if value is None:
        return f"<{tag} />"
    return f"<{tag}>{_xml_escape(_scalar_text(value))}</{tag}>"


def build_envelope(soap_version: int, method: str, namespace: str, params: dict, raw_body: str = "") -> str:
    """
    构建 SOAP Envelope。
    - raw_body 非空：直接作为 Body 内容（跳过 method/namespace/params）
    - 否则用 method(+namespace) 包一层动作元素，内部渲染 params
    """
    env_ns = SOAP12_NS if soap_version == 2 else SOAP11_NS

    if raw_body and raw_body.strip():
        body_inner = raw_body.strip()
    else:
        params_xml = "".join(render_param(k, v) for k, v in params.items()) if params else ""
        if namespace:
            body_inner = (
                f'<m:{method} xmlns:m="{_xml_escape_attr(namespace)}">'
                f"{params_xml}</m:{method}>"
            )
        else:
            body_inner = f"<{method}>{params_xml}</{method}>"

    return (
        '<?xml version="1.0" encoding="utf-8"?>'
        f'<s:Envelope xmlns:s="{env_ns}">{body_inner}</s:Envelope>'
    )


def _local_name(tag: str) -> str:
    if isinstance(tag, str) and "}" in tag:
        return tag.split("}", 1)[1]
    return str(tag)


def xml_to_dict(elem) -> object:
    """ElementTree 元素 → dict（同名子元素升为 list；叶节点返回文本）"""
    children = [c for c in list(elem) if isinstance(c.tag, str)]
    if not children:
        text = (elem.text or "").strip()
        return text if text else ""
    result = {}
    for c in children:
        tag = _local_name(c.tag)
        value = xml_to_dict(c)
        if tag in result:
            if not isinstance(result[tag], list):
                result[tag] = [result[tag]]
            result[tag].append(value)
        else:
            result[tag] = value
    return result


def _find_fault(body_xml: str) -> str:
    """解析响应 XML 查找 SOAP Fault，返回可读错误描述；未找到返回空串"""
    if not body_xml or not body_xml.strip():
        return ""
    try:
        root = ET.fromstring(body_xml)
    except ET.ParseError:
        return ""
    for elem in root.iter():
        if not isinstance(elem.tag, str):
            continue
        if _local_name(elem.tag) != "Fault":
            continue
        parts = {}
        for child in elem.iter():
            name = _local_name(child.tag)
            if name in ("faultcode", "faultstring", "detail", "Code", "Reason", "Text"):
                if child.text and child.text.strip():
                    parts.setdefault(name, []).append(child.text.strip())
        summary = "SOAP Fault: "
        summary += "; ".join(f"{k}={', '.join(v)}" for k, v in parts.items()) or "未知错误"
        return summary
    return ""


def _parse_body(body_xml: str) -> dict:
    """解析 SOAP 响应，返回 {响应元素名: 结构化内容}"""
    try:
        root = ET.fromstring(body_xml)
    except ET.ParseError as e:
        return {"_parse_error": f"XML 解析失败: {e}"}

    # 定位 <Body> 元素（任意命名空间）
    body_el = None
    for elem in root.iter():
        if isinstance(elem.tag, str) and _local_name(elem.tag) == "Body":
            body_el = elem
            break
    if body_el is None:
        body_el = root

    parsed = {}
    for child in list(body_el):
        if isinstance(child.tag, str):
            parsed[_local_name(child.tag)] = xml_to_dict(child)
    return parsed


# ============================================================
# 主流程
# ============================================================

def main():
    method_name = method_name_arg()
    params = read_stdin_params()

    requests = _import_requests()

    # ---- 1. 目标地址 ----
    site = None
    site_name = ""
    url_param = str(params.get("url", "") or "").strip()
    if url_param:
        base_url = url_param
        if params.get("site"):
            site = require_site(str(params["site"]).strip())
            site_name = str(site.get("name", "") or "")
    else:
        site = require_site(str(params.get("site", "") or "").strip())
        site_name = str(site.get("name", "") or "")
        base_url = str(site.get("url", "") or "").strip()
        if not base_url:
            output_json(-1, f"站点 [{site_name}] 未配置 url，无法请求")
    endpoint, url_user, url_pwd = split_url_userinfo(base_url.strip())
    if not endpoint:
        output_json(-1, "SOAP 端点地址为空：请传 url 或配置 site")

    # ---- 2. SOAP 参数 ----
    soap_version = params.get("soap_version")
    try:
        soap_version = int(soap_version) if soap_version is not None else 1
    except (TypeError, ValueError):
        soap_version = 1
    if soap_version not in (1, 2):
        output_json(-1, f"soap_version 只支持 1(SOAP1.1) 或 2(SOAP1.2)，收到: {soap_version}")

    method = str(params.get("method", "") or "").strip()
    namespace = str(params.get("namespace", "") or "").strip()
    raw_body = str(params.get("raw_body", "") or "").strip()
    soap_params = params.get("params")
    if soap_params is None:
        soap_params = {}
    if not isinstance(soap_params, dict):
        output_json(-1, "params 必须是 JSON 对象")

    if not method and not raw_body:
        output_json(-1, "缺少 SOAP 操作：请传 method（操作名，如 GetSystemTime）或 raw_body（自定义 Body XML）")

    soap_action = str(params.get("soap_action", "") or "").strip()
    if not soap_action and soap_version == 1 and namespace:
        soap_action = f'"{namespace}#{method}"'

    envelope = build_envelope(soap_version, method, namespace, soap_params, raw_body)

    # ---- 3. HTTP 层 ----
    headers = merge_headers(site, params.get("headers"))
    if soap_version == 2:
        ctype = "application/soap+xml; charset=utf-8"
        if soap_action:
            ctype += f'; action="{_xml_escape_attr(soap_action.strip(chr(34)))}"'
        headers["Content-Type"] = ctype
    else:
        headers["Content-Type"] = "text/xml; charset=utf-8"
        if soap_action:
            headers["SOAPAction"] = soap_action

    timeout = params.get("timeout")
    try:
        timeout = int(timeout) if timeout is not None else 0
        if timeout <= 0:
            timeout = get_default_timeout()
    except (TypeError, ValueError):
        timeout = get_default_timeout()
    if timeout < 1:
        timeout = 1

    insecure_ssl = bool(params.get("insecure_ssl", False))
    max_body = params.get("max_body_chars")
    try:
        max_body = int(max_body) if max_body is not None else get_max_body_chars()
    except (TypeError, ValueError):
        max_body = get_max_body_chars()

    auth = resolve_auth(params.get("username"), params.get("password"), site)
    if auth is None and (url_user is not None or url_pwd is not None):
        auth = (url_user or "", url_pwd or "")

    display = redact_url(endpoint)

    # 【影子演练】已上移宿主：由宿主的影子闸门统一拦截（不再在插件内实现）

    try:
        if insecure_ssl:
            import urllib3
            urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)
        req_kwargs = {
            "url": endpoint,
            "data": envelope.encode("utf-8"),
            "headers": headers or None,
            "timeout": timeout,
            "verify": not insecure_ssl,
        }
        if auth is not None:
            req_kwargs["auth"] = auth
        resp = requests.post(**req_kwargs)
    except Exception as e:
        output_json(-1, f"调用 SOAP 端点 {display} 失败: {e}")

    body_text = resp.content.decode(resp.encoding or "utf-8", errors="replace") if resp.content else ""

    # SOAP Fault 检查（服务端可能用 HTTP 200 返回 Fault）
    fault_msg = _find_fault(body_text)
    if fault_msg:
        # 【防注入】Fault 文本同样来自外部，中和后再回传
        output_json(-1, f"{display} 返回 {neutralize_injection(fault_msg)}")

    truncated = len(body_text) > max_body
    # 【防注入】外部内容净化（见 SKILL.md「安全约定」）：
    # 保留 XML 结构（不去标签），仅去注释并中和零宽字符与伪分隔符；解析结果同样中和。
    # 解析必须用原始 body_text，净化只作用于回传字段。
    body_xml_out = sanitize_text(body_text)
    parsed_out = neutralize_tree(_parse_body(body_text))
    result = {
        "site": site_name,
        "endpoint": display,
        "soap_version": soap_version,
        "method": method or "(raw_body)",
        "namespace": namespace,
        "soap_action": soap_action if soap_version == 1 else "",
        "status": int(resp.status_code),
        "ok": 200 <= resp.status_code < 300,
        "content_type": resp.headers.get("Content-Type", ""),
        "body_xml": truncate_text(body_xml_out, max_body),
        "truncated": truncated,
        "parsed": parsed_out,
        # 【防注入】来源与可信度标注（SOAP 调用一律为 POST，可能改变服务端状态）
        "untrusted": True,
        "source": display,
        "text_sanitized": body_xml_out != body_text,
        "write_operation": True,
    }
    output_json(0, "ok", result)


if __name__ == "__main__":
    try:
        main()
    except SystemExit:
        raise
    except Exception as e:
        traceback.print_exc(file=sys.stderr)
        output_json(-1, f"SOAP 调用失败: {e}")
