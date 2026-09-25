#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
wecom_utils.py —— 企业微信连接服务公共模块
============================================
职责：
  1. 统一 JSON 响应输出（stdout 只能有一行 JSON）；
  2. 从 plugin.json 读取 config（corp_id/app_secret/agent_id/robot_webhook/recipients/署名白名单等）；
  3. 企业微信 access_token 获取（gettoken，带进程内缓存与过期时间）；
  4. 通用 HTTP 请求封装（requests，超时统一 30s）与 errcode 业务错误处理；
  5. 企业微信 API 封装：应用发消息（message/send）、群自定义机器人 webhook 推送、
     按手机号查 userid（user/getuserid）、按 userid 查成员详情（user/get）；
  6. 发起人署名归一化：缺省 default_sender、allowed_senders 白名单校验（防冒用）。
     注意：企业微信成员的收件标识是 userid（不是 openid），因此本模块的 normalize_sender
     不做任何 openid 反查逻辑——sender 只接受可读名。

通信协议遵循插件标准：
  sys.argv[1] = 方法名；参数从 stdin 读单行 JSON；结果输出唯一一行 JSON 到 stdout。
  失败统一 {"code":-1,"msg":"原因","data":null} 并退出码 1。
"""
import sys
import os
import json
import time

import requests

# 企业微信 API 域名
WECOM_API_BASE = "https://qyapi.weixin.qq.com/cgi-bin"

# ============================================================
# 统一响应输出
# ============================================================

def output_json(code: int, msg: str, data=None) -> None:
    """统一输出 JSON 响应到 stdout；失败时自动退出（退出码 1）。"""
    print(json.dumps({"code": code, "msg": msg, "data": data},
                     ensure_ascii=False, default=str))
    if code != 0:
        sys.exit(1)


def read_params() -> dict:
    """从 stdin 读取参数 JSON（单行）。非 JSON 输入直接失败退出。"""
    raw = sys.stdin.read().strip()
    try:
        return json.loads(raw) if raw else {}
    except json.JSONDecodeError:
        print(f"[wecom] 参数 JSON 格式无效: {raw[:200]}", file=sys.stderr)
        sys.exit(1)


# ============================================================
# 插件配置加载（优先宿主注入的已解析配置，回退 plugin.json）
# ============================================================

_plugin_config_cache = None


def load_plugin_config() -> dict:
    """读取当前插件目录下的 plugin.json（结果缓存）"""
    global _plugin_config_cache
    if _plugin_config_cache is not None:
        return _plugin_config_cache

    script_dir = os.path.dirname(os.path.abspath(__file__))
    config_path = os.path.join(script_dir, "plugin.json")
    if not os.path.isfile(config_path):
        output_json(-1, f"插件配置文件不存在: {config_path}")

    try:
        with open(config_path, "r", encoding="utf-8") as f:
            _plugin_config_cache = json.load(f)
    except Exception as e:
        output_json(-1, f"读取 plugin.json 失败: {e}")

    return _plugin_config_cache


# 宿主注入的已解析配置（见 service_plugins/README_ZH.md「插件密钥箱」）：
# 宿主调用插件前会把 config 中的 ${secret_key} 从密钥箱解析为真值，经该环境变量下发。
_HOST_CONFIG_ENV = "GIS_PLUGIN_CONFIG"


def _host_injected_config() -> dict:
    """读取宿主注入的已解析 config；无注入或非法时返回 {}（调用方回退 plugin.json）"""
    raw = os.environ.get(_HOST_CONFIG_ENV, "").strip()
    if not raw:
        return {}
    try:
        cfg = json.loads(raw)
    except json.JSONDecodeError:
        return {}
    return cfg if isinstance(cfg, dict) else {}



# ============================================================
# 实例配置（service_plugins_configs/<plugin>.json）——手工执行时的回退层
# ============================================================

_INSTANCE_CONFIG_DIR_ENV = "GIS_PLUGIN_CONFIG_DIR"


def _instance_config() -> dict:
    """读取实例配置的 config 节；目录/文件不存在或解析失败时返回 {}"""
    base = os.environ.get(_INSTANCE_CONFIG_DIR_ENV, "").strip()
    if not base:
        # 目录约定：<repo>/service_plugins/<plugin>/ → ../../service_plugins_configs
        here = os.path.dirname(os.path.abspath(__file__))
        base = os.path.normpath(os.path.join(here, "..", "..", "service_plugins_configs"))

    name = str(load_plugin_config().get("manifest", {}).get("name", "")).strip()
    if not name:
        return {}

    path = os.path.join(base, f"{name}.json")
    if not os.path.isfile(path):
        return {}
    try:
        with open(path, "r", encoding="utf-8") as f:
            inst = json.load(f)
    except Exception:
        return {}
    cfg = inst.get("config") if isinstance(inst, dict) else None
    return cfg if isinstance(cfg, dict) else {}


def get_config() -> dict:
    """获取 config：优先宿主注入（含密钥箱解析结果），回退 plugin.json"""
    injected = _host_injected_config()
    if injected:
        return injected
    inst = _instance_config()
    if inst:
        return inst
    plugin = load_plugin_config()
    return plugin.get("config", {})


def check_app_credentials(cfg: dict) -> None:
    """校验 corp_id/app_secret 已配置（app 类方法与通讯录查询必填），未配置时直接报错退出"""
    if not str(cfg.get("corp_id", "")).strip():
        output_json(-1, "插件配置错误: 缺少 config.corp_id。"
                        "请在企业微信管理后台『我的企业』获取企业 ID 后，填入 plugin.json 的 config.corp_id")
    if not str(cfg.get("app_secret", "")).strip():
        output_json(-1, "插件配置错误: 缺少 config.app_secret。"
                        "请在 plugin.json 的 config.app_secret 中填入自建应用 Secret（应用详情页获取）")


def get_agent_id(cfg: dict) -> int:
    """获取应用 agentid 并校验为合法正整数（app 消息发送必填）"""
    try:
        agent_id = int(cfg.get("agent_id", 0) or 0)
    except (TypeError, ValueError):
        agent_id = 0
    if agent_id <= 0:
        output_json(-1, "插件配置错误: 缺少 config.agent_id（正整数）。"
                        "请在 plugin.json 的 config.agent_id 中填入自建应用的 AgentId（应用详情页查看）")
    return agent_id


# ============================================================
# access_token 管理
# ============================================================

_token_cache = {"token": None, "expire_at": 0.0}


def get_access_token(cfg: dict) -> str:
    """
    获取企业微信 access_token（带进程内缓存，按 expires_in 提前 60s 过期）。
    失败时统一报错退出。
    """
    now = time.time()
    if _token_cache["token"] and _token_cache["expire_at"] > now:
        return _token_cache["token"]

    url = f"{WECOM_API_BASE}/gettoken"
    data = http_get_json(url, params={
        "corpid": str(cfg.get("corp_id", "")).strip(),
        "corpsecret": str(cfg.get("app_secret", "")).strip(),
    }, action_desc="获取 access_token")
    check_wecom_err(data, "获取 access_token")

    token = str(data.get("access_token", "")).strip()
    if not token:
        output_json(-1, "获取 access_token 失败: 响应缺少 access_token 字段")
    expires_in = int(data.get("expires_in", 7200) or 7200)
    _token_cache["token"] = token
    _token_cache["expire_at"] = now + expires_in - 60
    return token


# ============================================================
# 通用 HTTP 请求封装
# ============================================================

def http_get_json(url: str, params=None, action_desc: str = "请求", timeout: int = 30) -> dict:
    """GET 请求并解析 JSON；网络/HTTP/JSON 解析错误统一报错退出"""
    try:
        resp = requests.get(url, params=params, timeout=timeout)
    except requests.exceptions.RequestException as e:
        output_json(-1, f"{action_desc}网络请求失败: {e}")
    return _parse_response(resp, action_desc)


def http_post_json(url: str, body: dict, params=None,
                   action_desc: str = "请求", timeout: int = 30) -> dict:
    """POST JSON 请求（可带 query 参数，如 access_token）并解析；
    网络/HTTP/JSON 解析错误统一报错退出"""
    try:
        resp = requests.post(url, params=params, json=body, timeout=timeout)
    except requests.exceptions.RequestException as e:
        output_json(-1, f"{action_desc}网络请求失败: {e}")
    return _parse_response(resp, action_desc)


def _parse_response(resp, action_desc: str) -> dict:
    """把 requests 响应解析为 dict，任何异常统一报错退出（不抛给调用方）"""
    try:
        data = resp.json()
    except ValueError:
        output_json(-1, f"{action_desc}响应非 JSON: HTTP {resp.status_code} {resp.text[:200]}")
    if resp.status_code != 200:
        output_json(-1, f"{action_desc}HTTP 状态异常: {resp.status_code}, body={str(data)[:200]}")
    if not isinstance(data, dict):
        output_json(-1, f"{action_desc}响应格式异常: 预期 JSON 对象，实际为 {type(data).__name__}")
    return data


def check_wecom_err(data: dict, action_desc: str) -> dict:
    """
    校验企业微信统一响应体 errcode：errcode 非 0/None 视为业务失败并报错退出；
    成功（errcode=0）原样返回 data。
    """
    errcode = data.get("errcode")
    if errcode not in (None, 0):
        errmsg = str(data.get("errmsg", "") or "")
        output_json(-1, f"{action_desc}失败: errcode={errcode}, errmsg={errmsg}"
                        "(常见原因：secret/agentid 不对、应用或成员不在通讯录可见范围、"
                        "IP 未加入可信 IP、未传 userid 或 userid 不存在)")
    return data


# ============================================================
# 企业微信 API 封装
# ============================================================

def send_app_message(cfg: dict, touser: str, msgtype: str, content: str) -> dict:
    """
    以自建应用身份给成员发应用消息（message/send）。
    touser 为企业微信成员 userid；msgtype 支持 text / markdown。
    """
    agent_id = get_agent_id(cfg)
    token = get_access_token(cfg)
    body = {
        "touser": touser,
        "msgtype": msgtype,
        "agentid": agent_id,
        msgtype: {"content": content},  # text:{content} / markdown:{content}
    }
    url = f"{WECOM_API_BASE}/message/send"
    data = http_post_json(url, body, params={"access_token": token}, action_desc="发送应用消息")
    check_wecom_err(data, "发送应用消息")
    return data


def send_robot_message(webhook_url: str, msgtype: str, content: str) -> dict:
    """
    通过群自定义机器人 webhook 推送消息（无需 access_token）。
    msgtype 支持 text / markdown；成功返回 {errcode:0, errmsg:"ok"}。
    """
    body = {msgtype: {"content": content}}
    # webhook 回调地址本身已带签名 key，直接 POST 即可
    data = http_post_json(webhook_url, body, action_desc="群机器人推送")
    check_wecom_err(data, "群机器人推送")
    return data


def search_user_by_mobile(cfg: dict, mobile: str) -> tuple:
    """
    按手机号查 userid（user/getuserid，单号单查）。
    返回 (errcode, errmsg, userid)：errcode=0 表示查到（userid 可能为空串表示查无此人）；
    非 0 表示该号码查询失败（如 60111 手机号不存在/未激活），由调用方决定是否视为整体失败。
    注意：先 get_access_token，token 类系统错误在此前已拦截，因此剩余 errcode 多为单号级问题。
    """
    token = get_access_token(cfg)
    url = f"{WECOM_API_BASE}/user/getuserid"
    data = http_post_json(url, {"mobile": str(mobile).strip()},
                          params={"access_token": token},
                          action_desc=f"手机号反查 userid [{mobile}]")
    errcode = data.get("errcode")
    return errcode, str(data.get("errmsg", "") or ""), str(data.get("userid", "") or "")


def get_user_detail(cfg: dict, userid: str) -> dict:
    """按 userid 查成员详情（user/get）：姓名/部门/手机号/邮箱/职位等"""
    token = get_access_token(cfg)
    url = f"{WECOM_API_BASE}/user/get"
    data = http_get_json(url, params={"access_token": token, "userid": userid},
                         action_desc="查询成员详情")
    check_wecom_err(data, "查询成员详情")
    return data


# ============================================================
# 发起人（sender）署名
# ============================================================

def normalize_sender(cfg: dict, params: dict) -> str:
    """
    解析并校验发起人署名，返回归一化后的可读署名：
      - 取 params.sender，缺省取 config.default_sender（再无则 allowed_senders[0] / 企业助手）；
      - 企业微信个人标识是 userid（不是 openid），sender 只接受可读名，
        不做任何 id 反查（不存在飞书 ou_ 那种逻辑）；
      - 若配置了 config.allowed_senders 白名单（非空），最终署名必须命中，否则拒绝（防冒用）。
    """
    allowed = [str(s).strip() for s in (cfg.get("allowed_senders") or []) if str(s).strip()]
    default = str(cfg.get("default_sender", "")).strip() or (allowed[0] if allowed else "企业助手")

    sender = str(params.get("sender", "")).strip() or default
    if allowed and sender not in allowed:
        output_json(-1, f"署名 [{sender}] 不在允许名单内。"
                        f"请在 plugin.json 的 config.allowed_senders 中配置，或改传合法 sender 参数。"
                        f"当前允许: {', '.join(allowed)}")
    return sender


def sign_content(content: str, sender: str) -> str:
    """把归一化后的可读署名追加到消息内容末尾（审计线索，不改动原文）"""
    return f"{content}\n—— 发起人：{sender}" if sender else content


# ============================================================
# 收件人 / webhook 目标解析
# ============================================================

def _recipients_list(cfg: dict):
    """读取并校验 config.recipients（必须为 {name,type,target} 对象数组）"""
    recipients = cfg.get("recipients") or []
    if recipients and not isinstance(recipients, list):
        output_json(-1, "插件配置错误: config.recipients 应为数组（[{...}]），当前类型为 "
                        + type(recipients).__name__ + "。请修正 plugin.json（改动即时生效，无需重启）")
    for i, r in enumerate(recipients):
        if not isinstance(r, dict):
            output_json(-1, f"插件配置错误: config.recipients 第 {i + 1} 项应为对象 {{name,type,target}}，"
                            f"实际为 {type(r).__name__}: {r!r}。请修正 plugin.json（改动即时生效，无需重启）")
        name = str(r.get("name", "")).strip()
        rtype = str(r.get("type", "")).strip()
        if name and rtype not in ("user", "robot"):
            output_json(-1, f"插件配置错误: config.recipients 中 [{name}] 的 type 只能是 user / robot，"
                            f"当前为 [{rtype}]。请修正 plugin.json（改动即时生效，无需重启）")
    return recipients


def resolve_user_target(cfg: dict, params: dict) -> str:
    """
    解析应用消息收件人（个人），返回企业微信成员 userid：
      - params.target 优先匹配 config.recipients 里 type=user 的预配名字
        （如 {"name":"张三","type":"user","target":"zhangsan"}）；
      - 否则把 target 直接当作成员 userid 使用。
    企业微信成员的收件标识是 userid（不是 openid），本插件不做 openid 转换。
    """
    target = str(params.get("target", "")).strip()
    if not target:
        output_json(-1, "缺少必填参数: target（成员 userid，或 config.recipients 中预配的收件人名字）")

    recipients = _recipients_list(cfg)
    for r in recipients:
        name = str(r.get("name", "")).strip()
        if name and name == target:
            rtype = str(r.get("type", "")).strip()
            rid = str(r.get("target", "")).strip()
            if rtype != "user":
                output_json(-1, f"收件人 [{target}] 预配类型为 {rtype}，应用消息只能发给 type=user 的成员。"
                                f"若要推送到群，请改用 wecom.robot.send（type=robot / config.robot_webhook）")
            if not rid:
                output_json(-1, f"收件人 [{target}] 在 config.recipients 中缺少 target 字段（应为成员 userid）")
            return rid

    return target


def resolve_robot_webhook(cfg: dict, params: dict) -> str:
    """
    解析群机器人 webhook 地址：
      - params.target 为空 → 取 config.robot_webhook；
      - params.target 填名字 → 匹配 config.recipients 里 type=robot 的预配项取其 webhook；
      - 目标 webhook 一律来自配置（config.robot_webhook / recipients type=robot），
        不接受运行时直传任意 URL，防止把消息内容外泄到未授权地址。
    """
    target = str(params.get("target", "")).strip()

    if target:
        recipients = _recipients_list(cfg)
        for r in recipients:
            name = str(r.get("name", "")).strip()
            if name and name == target:
                rtype = str(r.get("type", "")).strip()
                rid = str(r.get("target", "")).strip()
                if rtype != "robot":
                    output_json(-1, f"目标 [{target}] 预配类型为 {rtype}，群机器人推送只支持 type=robot 的预配项。"
                                    f"若要发给成员个人，请改用 wecom.app.send_text / wecom.app.send_markdown")
                if not rid:
                    output_json(-1, f"目标 [{target}] 在 config.recipients 中缺少 target 字段（应为机器人 webhook 地址）")
                return rid
        output_json(-1, f"未知群机器人名 [{target}]：请在 config.recipients 中预配 type=robot 的条目"
                        "(target 为 webhook 地址)，或留空 target 使用 config.robot_webhook")

    webhook = str(cfg.get("robot_webhook", "")).strip()
    if not webhook:
        output_json(-1, "缺少群机器人 webhook：请配置 config.robot_webhook，"
                        "或在 config.recipients 中预配 type=robot 条目后传 target=机器人名")
    return webhook
