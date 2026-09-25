#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
dingtalk_utils.py —— 企业钉钉连接服务公共模块
============================================
职责：
  1. 统一 JSON 响应输出（stdout 只能有一行 JSON）；
  2. 从 plugin.json 读取 config（app_key/app_secret/agent_id/robot_webhook/robot_sign/recipients/署名白名单等）；
  3. 获取并缓存 access_token（GET oapi.dingtalk.com/gettoken）；
  4. 统一 HTTP 请求封装与钉钉 errcode 业务码错误处理（任何失败输出单行 JSON 并退出码 1）；
  5. 发起人署名归一化：缺省 default_sender、白名单校验（防冒用）。钉钉个人标识是 userId，不是 open_id，
     因此不存在“误传 ou_ 自动反查姓名”的逻辑（不同于飞书版 feishu_utils.normalize_sender）；
  6. 收件人解析：个人（userId / config.recipients 预配名字，type=user）、群机器人
     （config.robot_webhook / config.recipients 预配机器人名 type=robot，可选各自 robot_sign）；
  7. 工作通知发消息（topapi/message/corpconversation/asyncsend_v2）、群机器人 webhook 加签推送
     （HMAC-SHA256：timestamp 毫秒 + "\n" + secret，base64 后再 URL 编码为 sign）；
  8. 通用响应数据清理（去掉 None 空字段，便于返回干净 JSON）。

通信协议遵循插件标准：
  sys.argv[1] = 方法名；参数从 stdin 读单行 JSON；结果输出唯一一行 JSON 到 stdout。
  失败统一 {"code":-1,"msg":"原因","data":null} 并退出码 1。
"""
import base64
import hashlib
import hmac
import json
import os
import sys
import time
import urllib.parse

import requests

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
        print(f"[dingtalk] 参数 JSON 格式无效: {raw[:200]}", file=sys.stderr)
        sys.exit(1)


# ============================================================
# 插件配置加载（优先宿主注入的已解析配置，回退 plugin.json）
# ============================================================

_plugin_config_cache = None


def load_plugin_config() -> dict:
    """读取当前插件目录下的 plugin.json（结果缓存；宿主每次调用都是新进程，改配置即时生效）"""
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
    """校验 app_key/app_secret 已配置，未配置时直接报错退出"""
    if not str(cfg.get("app_key", "")).strip():
        output_json(-1, "插件配置错误: 缺少 config.app_key。"
                        "请在钉钉开放平台创建企业自建应用后，将 AppKey 填入 plugin.json 的 config.app_key")
    if not str(cfg.get("app_secret", "")).strip():
        output_json(-1, "插件配置错误: 缺少 config.app_secret。"
                        "请在 plugin.json 的 config.app_secret 中填入自建应用 AppSecret")


def check_agent_id(cfg: dict) -> int:
    """校验 agent_id 已配置为正整数（工作通知 dingtalk.app.* 必需），返回 int"""
    try:
        agent_id = int(cfg.get("agent_id") or 0)
    except (TypeError, ValueError):
        output_json(-1, "插件配置错误: config.agent_id 须为数字。"
                        "请在钉钉开放平台『应用详情』中查看 AgentId 并填入 plugin.json 的 config.agent_id")
    if agent_id <= 0:
        output_json(-1, "插件配置错误: config.agent_id 未配置或为 0。"
                        "工作通知（dingtalk.app.send_text / dingtalk.app.send_markdown）依赖 AgentId："
                        "请在钉钉开放平台企业自建应用『凭证与基础信息』中查看并填入 plugin.json 的 config.agent_id")
    return agent_id


# ============================================================
# HTTP 请求封装与统一错误处理
# ============================================================

def _http_json(method: str, url: str, *, params=None, json_body=None,
               action_desc: str = "请求钉钉接口") -> dict:
    """
    发起 HTTP 请求并解析 JSON。网络错误 / 非 JSON / 非 200 响应统一报错退出；
    返回解析后的 JSON dict，由调用方用 ensure_errcode 校验业务码。
    """
    try:
        resp = requests.request(method, url, params=params, json=json_body, timeout=20)
    except requests.RequestException as e:
        output_json(-1, f"{action_desc}网络错误: {e}")
    try:
        body = resp.json()
    except ValueError:
        output_json(-1, f"{action_desc}返回非 JSON: HTTP {resp.status_code}, "
                        f"{resp.text[:200]}")
    if not isinstance(body, dict):
        output_json(-1, f"{action_desc}响应格式异常: {str(body)[:200]}")
    if resp.status_code != 200:
        # 钉钉偶发在非 200 时也带 errcode/errmsg
        errmsg = str(body.get("errmsg") or "") or f"HTTP {resp.status_code}"
        output_json(-1, f"{action_desc}失败: HTTP {resp.status_code}, {errmsg}")
    return body


def ensure_errcode(body: dict, action_desc: str) -> dict:
    """校验钉钉业务码 errcode==0；非零统一报错退出（带 errmsg，不编造具体码含义）"""
    code = body.get("errcode", -1)
    if code != 0:
        errmsg = str(body.get("errmsg") or "") or "未知错误"
        output_json(-1, f"{action_desc}失败: errcode={code}, errmsg={errmsg}"
                        "(非零业务码常见原因：权限未开通/版本未发布、参数有误、成员不在可见范围、"
                        "机器人加签或关键字安全设置不匹配。请核对配置，勿反复重试)")
    return body


# ============================================================
# access_token（进程内缓存）
# ============================================================

_token_cache = {"token": "", "expire_at": 0}


def get_access_token(cfg: dict) -> str:
    """获取企业自建应用的 access_token（进程内按 expires_in 缓存，提前 120s 刷新）"""
    now = time.time()
    if _token_cache["token"] and _token_cache["expire_at"] > now + 120:
        return _token_cache["token"]

    app_key = str(cfg.get("app_key", "")).strip()
    app_secret = str(cfg.get("app_secret", "")).strip()

    body = _http_json(
        "GET", "https://oapi.dingtalk.com/gettoken",
        params={"appkey": app_key, "appsecret": app_secret},
        action_desc="获取 access_token",
    )
    ensure_errcode(body, "获取 access_token")
    token = str(body.get("access_token", "")).strip()
    if not token:
        output_json(-1, "获取 access_token 失败: 响应中无 access_token 字段")
    expires_in = int(body.get("expires_in") or 7200)
    _token_cache["token"] = token
    _token_cache["expire_at"] = now + expires_in
    return token


# ============================================================
# 工作通知发消息（dingtalk.app.send_text / send_markdown）
# ============================================================

def send_work_notice(cfg: dict, userid_list: str, msg: dict,
                     action_desc: str = "发送工作通知") -> dict:
    """
    以自建应用身份发工作通知。
      userid_list: 单个/多个 userId（英文逗号分隔）；
      msg: 钉钉 msg 对象，如 {"msgtype":"text","text":{"content":".."}}
    成功返回 {"errcode":0,"task_id":..,...}
    """
    token = get_access_token(cfg)
    agent_id = check_agent_id(cfg)
    body = _http_json(
        "POST",
        "https://oapi.dingtalk.com/topapi/message/corpconversation/asyncsend_v2",
        params={"access_token": token},
        json_body={"agent_id": agent_id, "userid_list": userid_list, "msg": msg},
        action_desc=action_desc,
    )
    ensure_errcode(body, action_desc)
    return body


# ============================================================
# 通讯录查询（手机号查 userId / 按 userId 查详情）
# ============================================================

def search_user_by_mobile(cfg: dict, mobile: str) -> dict:
    """
    按手机号查用户（topapi/v2/user/getbymobile）。
      成功：{"mobile": m, "userid": ".."}（号码未匹配到成员时 userid 为空串）；
    业务码非 0 时抛 DingTalkApiError（由调用方决定中断或记入 errors）。
    """
    token = get_access_token(cfg)
    resp = _http_json(
        "POST", "https://oapi.dingtalk.com/topapi/v2/user/getbymobile",
        params={"access_token": token},
        json_body={"mobile": mobile},
        action_desc=f"按手机号 {mobile} 查用户",
    )
    code = resp.get("errcode", -1)
    if code != 0:
        raise DingTalkApiError(f"errcode={code}, errmsg={resp.get('errmsg') or ''}")
    userid = str((resp.get("result") or {}).get("userid") or "").strip()
    return {"mobile": mobile, "userid": userid}


def get_user_detail(cfg: dict, userid: str) -> dict:
    """
    按 userId 查成员详情（topapi/v2/user/get），返回 result 节
    （name/mobile/email/dept_id_list/title 等，以钉钉实际返回为准）。
    """
    token = get_access_token(cfg)
    resp = _http_json(
        "POST", "https://oapi.dingtalk.com/topapi/v2/user/get",
        params={"access_token": token},
        json_body={"userid": userid},
        action_desc="查询用户详情",
    )
    ensure_errcode(resp, "查询用户详情")
    return resp.get("result") or {}


class DingTalkApiError(Exception):
    """钉钉接口业务码非 0 错误（供调用方选择中断或逐条记录）"""


# ============================================================
# 群自定义机器人 webhook（HMAC-SHA256 加签）
# ============================================================

def robot_sign(timestamp_ms: int, secret: str) -> str:
    """
    钉钉机器人加签算法（2026 现状）：
      string_to_sign = f"{timestamp_ms}\n{secret}"
      hmac_code = HMAC-SHA256(secret, string_to_sign) -> bytes
      sign = base64(hmac_code) 再 URL 编码
    """
    string_to_sign = "{}\n{}".format(int(timestamp_ms), secret)
    digest = hmac.new(
        secret.encode("utf-8"),
        string_to_sign.encode("utf-8"),
        digestmod=hashlib.sha256,
    ).digest()
    return urllib.parse.quote_plus(base64.b64encode(digest))


def send_robot_message(webhook: str, secret: str, payload: dict,
                       action_desc: str = "发送机器人消息") -> dict:
    """
    向群自定义机器人 webhook 推送消息。
      webhook: 完整 URL（含 access_token=..）；
      secret:  加签 secret，为空串则不加 timestamp/sign（机器人未开加签）；
      payload: {"msgtype":"text","text":{"content":".."}} 或 markdown 结构。
    注意：webhook URL 中含 access_token，属敏感凭证，绝不回显到输出。
    """
    timestamp_ms = int(time.time() * 1000)
    url = webhook
    if secret:
        sign = robot_sign(timestamp_ms, secret)
        sep = "&" if "?" in webhook else "?"
        url = "{}{}timestamp={}&sign={}".format(webhook, sep, timestamp_ms, sign)
    body = _http_json("POST", url, json_body=payload, action_desc=action_desc)
    ensure_errcode(body, action_desc)
    return body


# ============================================================
# 发送人（sender）署名校验
# ============================================================

def normalize_sender(cfg: dict, params: dict) -> str:
    """
    解析、归一化并校验发起人署名，返回纯可读署名：
      - 取 params.sender，缺省取 config.default_sender（再无则 allowed_senders[0] / 企业助手）；
      - 钉钉个人标识是 userId（非 open_id），署名只接受可读名，不做 ID 反查；
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


# ============================================================
# config.recipients 预配校验 / 收件人解析
# ============================================================

_RECIPIENT_TYPES = ("user", "robot")


def _validate_recipients(cfg: dict):
    """
    校验 config.recipients 格式，返回元素列表。
    每项必须是 {name, type, target} 对象，type 限 user / robot；
    格式错误时给出清晰报错（插件每次调用都重读 plugin.json，修正后即时生效）。
    """
    recipients = cfg.get("recipients") or []
    if not recipients:
        return []
    if not isinstance(recipients, list):
        output_json(-1, "插件配置错误: config.recipients 应为数组（[{...}]），当前类型为 "
                        + type(recipients).__name__ + "。请修正 plugin.json（改动即时生效，无需重启）")
    for i, r in enumerate(recipients):
        if not isinstance(r, dict):
            output_json(-1, f"插件配置错误: config.recipients 第 {i + 1} 项应为对象 "
                            f"{{name,type,target}}，实际为 {type(r).__name__}: {r!r}。"
                            f"请修正 plugin.json（改动即时生效，无需重启）")
        rtype = str(r.get("type", "")).strip()
        name = str(r.get("name", "")).strip()
        if not name:
            output_json(-1, f"插件配置错误: config.recipients 第 {i + 1} 项缺少 name（调用时引用的名字）")
        if rtype not in _RECIPIENT_TYPES:
            output_json(-1, f"插件配置错误: config.recipients 第 {i + 1} 项 [{name}] 的 type 无效: "
                            f"[{rtype}]，可选 user（个人 userId）/ robot（群机器人 webhook）")
        if not str(r.get("target", "")).strip():
            output_json(-1, f"插件配置错误: config.recipients 第 {i + 1} 项 [{name}] 缺少 target 字段"
                            f"（user 为 userId；robot 为完整 webhook URL）")
    return recipients


def _find_recipient(cfg: dict, name: str):
    """在 config.recipients 中按名字查找（大小写敏感），找不到返回 None"""
    name = str(name or "").strip()
    for r in _validate_recipients(cfg):
        if str(r.get("name", "")).strip() == name:
            return r
    return None


def resolve_user_target(cfg: dict, params: dict) -> str:
    """
    解析工作通知收件人，返回 userId：
      - params.target 优先匹配 config.recipients 预配的成员名字（type=user，target=userId）；
      - 否则把 target 直接当作 userId（钉钉 userId 无固定前缀，无法像 ou_/oc_ 那样格式校验）。
    """
    target = str(params.get("target", "")).strip()
    if not target:
        output_json(-1, "缺少必填参数: target（userId 或 config.recipients 中预配的成员名字）")

    entry = _find_recipient(cfg, target)
    if entry is not None:
        rtype = str(entry.get("type", "")).strip()
        rid = str(entry.get("target", "")).strip()
        if rtype != "user":
            output_json(-1, f"目标 [{target}] 预配类型为 {rtype}，不是个人成员。"
                            f"工作通知只能发给个人 userId；群消息请改用 dingtalk.robot.send 发群机器人")
        return rid

    # 未命中预配名字：直接按 userId 使用（逗号分隔可批量）
    return target


def resolve_robot(cfg: dict, params: dict) -> tuple:
    """
    解析群机器人目标，返回 (webhook, secret, label)：
      - params.target 为空 → config.robot_webhook + config.robot_sign，label='config.robot_webhook'；
      - params.target 命中 config.recipients 预配机器人名（type=robot，target=完整 webhook URL，
        可选 robot_sign 字段）→ 用该机器人自己的 webhook/secret；
      - params.target 为完整 webhook URL → 直接使用，加签 secret 取 config.robot_sign；
      - 其余情况给出清晰报错。
    label 仅用于回显（webhook URL 含 access_token，属敏感凭证，绝不回显）。
    """
    target = str(params.get("target", "")).strip()

    if not target:
        webhook = str(cfg.get("robot_webhook", "")).strip()
        secret = str(cfg.get("robot_sign", "")).strip()
        if not webhook:
            output_json(-1, "缺少机器人目标: 未传 target，且 config.robot_webhook 为空。"
                            "请在 plugin.json 的 config.robot_webhook 配置群自定义机器人 webhook，"
                            "或传 target（config.recipients 中预配的机器人名 / 完整 webhook URL）")
        return webhook, secret, "config.robot_webhook"

    entry = _find_recipient(cfg, target)
    if entry is not None:
        rtype = str(entry.get("type", "")).strip()
        webhook = str(entry.get("target", "")).strip()
        if rtype != "robot":
            output_json(-1, f"目标 [{target}] 预配类型为 {rtype}，不是群机器人。"
                            f"个人成员请用 dingtalk.app.send_text / dingtalk.app.send_markdown 发工作通知")
        return webhook, str(entry.get("robot_sign", "")).strip(), target

    if target.startswith("http://") or target.startswith("https://"):
        return target, str(cfg.get("robot_sign", "")).strip(), "直接传入的 webhook"

    output_json(-1, f"机器人 [{target}] 未命中: config.recipients 中无此名字（type=robot），"
                    f"且不是完整 webhook URL。请核对名字拼写或直接传 webhook URL")


# ============================================================
# 响应数据清理
# ============================================================

def _clean_value(value):
    """递归清理：去掉 None 空字段，只保留有意义的返回数据"""
    if value is None:
        return None
    if isinstance(value, (str, int, float, bool)):
        return value
    if isinstance(value, dict):
        return {k: _clean_value(v) for k, v in value.items() if v is not None}
    if isinstance(value, (list, tuple)):
        return [_clean_value(v) for v in value if v is not None]
    try:
        json.dumps(value)
        return value
    except Exception:
        return str(value)


def clean(data):
    """对外返回数据前清理（去除 None 空字段）"""
    return _clean_value(data)
