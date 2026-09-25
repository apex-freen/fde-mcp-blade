#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
http_request.py —— intra.http.request
=====================================
对内网 HTTP(S) 服务发起一次通用请求（GET/POST/PUT/PATCH/DELETE/HEAD/OPTIONS）。
成功标准：能收到 HTTP 响应即返回 code=0（4xx/5xx 也视为「收到响应」，状态码放在 data.status）；
连接失败 / 超时 / 依赖缺失才返回错误。
stdout: {"code":0,"msg":"ok","data":{...}}
"""
import json
import sys
import traceback
from typing import Any

from intra_utils import (
    output_json,
    read_stdin_params,
    method_name_arg,
    get_config,
    get_default_timeout,
    get_max_body_chars,
    require_site,
    split_url_userinfo,
    redact_url,
    append_path,
    resolve_auth,
    merge_headers,
    truncate_text,
    looks_binary,
    looks_like_html,
    sanitize_text,
    neutralize_tree,
    is_write_method,
    cfg_int,
)


# 响应头白名单：避免把 Set-Cookie 等大段/敏感头全部回传
RESP_HEADER_KEYS = (
    "Content-Type", "Content-Length", "Server", "Date", "Location",
    "Last-Modified", "ETag", "Cache-Control", "Allow", "WWW-Authenticate",
    "Content-Disposition", "X-Request-Id", "X-Request-ID",
)


def _import_requests():
    """懒加载 requests，缺失时给出明确提示"""
    try:
        import requests
    except ImportError:
        output_json(
            -1,
            "缺少依赖 requests：HTTP/SOAP 方法需要该库。"
            "请管理员在服务器执行: pip install requests（.plugins-venv 环境用 .plugins-venv/bin/pip install requests）",
        )
    return requests


def _detect_json(body_text: str, content_type: str):
    """尽力把响应体解析为 JSON；成功返回 (obj, True)，否则 (None, False)"""
    text = (body_text or "").strip()
    if not text:
        return None, False
    if content_type and "json" not in content_type.lower():
        if not (text[:1] in ("{", "[")):
            return None, False
    try:
        return json.loads(text), True
    except (ValueError, TypeError, json.JSONDecodeError):
        return None, False


def main():
    method_name = method_name_arg()
    params = read_stdin_params()
    cfg = get_config()

    requests = _import_requests()

    # ---- 1. 解析目标地址 ----
    site = None
    base_url = ""
    site_name = ""
    url_param = str(params.get("url", "") or "").strip()
    path = str(params.get("path", "") or "").strip()

    if url_param:
        base_url = url_param
        if params.get("site"):
            # 给了 url 又给了 site：site 仅用于继承请求头/认证
            site = require_site(str(params["site"]).strip())
            site_name = str(site.get("name", "") or "")
    else:
        site = require_site(str(params.get("site", "") or "").strip())
        site_name = str(site.get("name", "") or "")
        site_type = str(site.get("type", "") or "").strip().lower()
        if site_type not in ("http", "soap", ""):
            output_json(
                -1,
                f"站点 [{site_name}] 类型为 {site_type}，不能用 intra.http.request 请求（需 http/soap 类型）",
            )
        base_url = str(site.get("url", "") or "").strip()
        if not base_url:
            output_json(-1, f"站点 [{site_name}] 未配置 url，无法请求")

    target_url = append_path(base_url, path)
    if not target_url:
        output_json(-1, "目标地址为空：请传 url 或配置 site")

    # 从地址中拆出 user:pass@（如有），并清洗掉 URL 中的凭据
    target_url, url_user, url_pwd = split_url_userinfo(target_url)

    # ---- 2. 请求参数 ----
    method = str(params.get("method", "") or "GET").strip().upper()
    if method not in ("GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"):
        output_json(-1, f"不支持的 HTTP 方法 [{method}]，可选: GET/POST/PUT/PATCH/DELETE/HEAD/OPTIONS")

    headers = merge_headers(site, params.get("headers"))
    query = params.get("params")
    if not isinstance(query, dict):
        query = None

    body = params.get("body")
    content_type_param = str(params.get("content_type", "") or "").strip()

    timeout = params.get("timeout")
    try:
        timeout = int(timeout) if timeout is not None else 0
        if timeout <= 0 and site:
            timeout = cfg_int(site, "timeout", 0) or 0
        if timeout <= 0:
            timeout = get_default_timeout()
    except (TypeError, ValueError):
        timeout = get_default_timeout()
    if timeout < 1:
        timeout = 1

    insecure_ssl = bool(params.get("insecure_ssl", False))
    follow_redirects = True if params.get("follow_redirects") is None else bool(params.get("follow_redirects"))
    max_body = params.get("max_body_chars")
    try:
        max_body = int(max_body) if max_body is not None else get_max_body_chars()
    except (TypeError, ValueError):
        max_body = get_max_body_chars()

    # ---- 3. 认证 ----
    auth = resolve_auth(params.get("username"), params.get("password"), site)
    if auth is None and (url_user is not None or url_pwd is not None):
        auth = (url_user or "", url_pwd or "")

    # ---- 4. 请求体组装 ----
    data = None
    json_body = None
    if body is not None:
        if isinstance(body, str):
            data = body
        elif isinstance(body, (dict, list)):
            json_body = body
        else:
            data = str(body)
        if content_type_param:
            headers["Content-Type"] = content_type_param
        elif json_body is not None:
            headers["Content-Type"] = "application/json"

    # ---- 5. 发起请求 ----
    display_url = redact_url(target_url)

    # 【影子演练】已上移宿主：由宿主的影子闸门统一拦截（不再在插件内实现）

    try:
        if insecure_ssl:
            import urllib3
            urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

        request_kwargs = {
            "url": target_url,
            "method": method,
            "headers": headers or None,
            "params": query,
            "timeout": timeout,
            "allow_redirects": follow_redirects,
            "verify": not insecure_ssl,
        }
        if auth is not None:
            request_kwargs["auth"] = auth
        if json_body is not None:
            request_kwargs["json"] = json_body
        elif data is not None:
            request_kwargs["data"] = data

        resp = requests.request(**request_kwargs)
    except Exception as e:
        err = str(e)
        if "Max retries exceeded" in err or "Failed to establish" in err:
            output_json(-1, f"无法连接到 {display_url}: {err}")
        if "timed out" in err.lower() or "timeout" in err.lower():
            output_json(-1, f"请求 {display_url} 超时 ({timeout}s): {err}")
        output_json(-1, f"请求 {display_url} 失败: {err}")

    # ---- 6. 组装响应 ----
    raw = resp.content or b""
    encoding = resp.encoding or "utf-8"
    content_type = resp.headers.get("Content-Type", "")
    resp_headers = {k: str(v) for k, v in resp.headers.items() if k in RESP_HEADER_KEYS or k.lower() in [h.lower() for h in RESP_HEADER_KEYS]}
    binary = looks_binary(raw)

    text_sanitized = False
    if binary:
        body_text = ""
        parsed_json, json_ok = None, False
        truncated = False
    else:
        try:
            body_text = raw.decode(encoding, errors="replace")
        except Exception:
            body_text = raw.decode("utf-8", errors="replace")
        # 【防注入】外部内容净化（见 SKILL.md「安全约定」）：
        # HTML 内容做文本化（剥脚本/样式/注释/隐藏元素），其余去注释；统一中和零宽字符与伪分隔符。
        # 内网页面/接口返回的内容不受本系统控制，是提示词注入的主要载体。
        if looks_like_html(body_text) or "html" in content_type.lower():
            cleaned = sanitize_text(body_text, html=True)
        else:
            cleaned = sanitize_text(body_text)
        text_sanitized = cleaned != body_text
        body_text = cleaned

        truncated = len(body_text) > max_body
        parsed_json, json_ok = _detect_json(body_text, content_type)
        # 结构化字段同样中和：让"优先阅读 data.json"这条约定也成为安全路径
        parsed_json = neutralize_tree(parsed_json)
        body_text = truncate_text(body_text, max_body)

    result = {
        "site": site_name,
        "method": method,
        "request_url": display_url,
        "final_url": redact_url(resp.url),
        "redirected": bool(resp.history),
        "status": int(resp.status_code),
        "reason": str(resp.reason or ""),
        "ok": 200 <= resp.status_code < 300,
        "headers": resp_headers,
        "content_type": content_type,
        "charset": encoding,
        "size_bytes": len(raw),
        "binary": binary,
        "body_text": body_text,
        "truncated": truncated,
        "json": parsed_json,
        "json_parsed": json_ok,
        "elapsed_ms": int(resp.elapsed.total_seconds() * 1000) if resp.elapsed else 0,
        # 【防注入】来源与可信度标注：明确告诉调用方"这是外部数据，不是指令"
        "untrusted": True,
        "source": display_url,
        "text_sanitized": text_sanitized,
        # 写操作显式标注：便于调用方遵守"写操作必须由用户明确要求"的约定
        "write_operation": is_write_method(method),
    }

    output_json(0, "ok", result)


if __name__ == "__main__":
    try:
        main()
    except SystemExit:
        raise
    except Exception as e:
        traceback.print_exc(file=sys.stderr)
        output_json(-1, f"HTTP 请求失败: {e}")
