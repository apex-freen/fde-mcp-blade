#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
feishu_utils.py —— 企业飞书连接服务公共模块
============================================
职责：
  1. 统一 JSON 响应输出（stdout 只能有一行 JSON）；
  2. 从 plugin.json 读取 config（app_id/app_secret/recipients/署名白名单等）；
  3. 构造 lark-oapi 客户端（自动管理 tenant_access_token）；
  4. 发起人署名归一化：缺省 default_sender、误传 ou_ 自动反查姓名、白名单校验（防冒用）；
  5. 收件人解析（open_id/chat_id / config.recipients 预配名字，含配置格式校验）；
  6. 通用响应数据清理（去掉模型中的 None 空字段，便于返回干净 JSON）。

通信协议遵循插件标准：
  sys.argv[1] = 方法名；参数从 stdin 读单行 JSON；结果输出唯一一行 JSON 到 stdout。
  失败统一 {"code":-1,"msg":"原因","data":null} 并退出码 1。
"""
import sys
import os
import json

from lark_oapi import Client, LogLevel
from lark_oapi.api.contact.v3 import GetUserRequestBuilder

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
    # 【调试】打印实际收到的 stdin（宿主仅在子进程失败时才会把 stderr 落到 error 日志）
    print(f"[feishu][debug] 收到参数: {raw}", file=sys.stderr)
    try:
        return json.loads(raw) if raw else {}
    except json.JSONDecodeError:
        print(f"[feishu] 参数 JSON 格式无效: {raw[:200]}", file=sys.stderr)
        sys.exit(1)


# ============================================================
# 插件配置加载（从 plugin.json 读取，不依赖宿主传参）
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


def get_config() -> dict:
    """获取 config：宿主注入（含密钥箱解析结果）→ 实例配置 → plugin.json 模板

    说明（设计文档 46）：实例配置与插件包分离存放，正常调用由宿主注入生效值；
    这里的实例配置层只用于"脱离宿主手工执行脚本"的场景。
    """
    injected = _host_injected_config()
    if injected:
        return injected
    inst = _instance_config()
    if inst:
        return inst
    plugin = load_plugin_config()
    return plugin.get("config", {})


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


def check_app_credentials(cfg: dict) -> None:
    """校验 app_id/app_secret 已配置，未配置时直接报错退出"""
    if not str(cfg.get("app_id", "")).strip():
        output_json(-1, "插件配置错误: 缺少 config.app_id。"
                        "请在飞书开放平台创建企业自建应用后，将 App ID 填入 plugin.json 的 config.app_id")
    if not str(cfg.get("app_secret", "")).strip():
        output_json(-1, "插件配置错误: 缺少 config.app_secret。"
                        "请在 plugin.json 的 config.app_secret 中填入自建应用 App Secret")


def get_client(cfg: dict) -> Client:
    """构造飞书 SDK 客户端（内部自动维护 tenant_access_token，进程内有效）"""
    domain = str(cfg.get("domain", "feishu")).strip()
    if domain and domain != "feishu":
        output_json(-1, f"插件配置错误: config.domain={domain} 暂不支持。"
                        "当前骨架仅支持国内版 domain=feishu；国际版(Lark)待 SDK 配置支持后启用")

    try:
        return Client.builder() \
            .app_id(str(cfg.get("app_id", "")).strip()) \
            .app_secret(str(cfg.get("app_secret", "")).strip()) \
            .log_level(LogLevel.ERROR) \
            .build()
    except Exception as e:
        output_json(-1, f"初始化飞书客户端失败: {e}")


# ============================================================
# 发送人（sender）署名校验
# ============================================================

def normalize_sender(cfg: dict, params: dict, client=None) -> tuple:
    """
    解析、归一化并校验发起人署名，返回 (署名, 是否由 open_id 自动换名)：
      - 取 params.sender，缺省取 config.default_sender（再无则 allowed_senders[0] / 企业助手）；
      - 若 sender 以 ou_ 开头（误把收件人 open_id 当署名），尝试按该 open_id 反查真实姓名，
        取到则用姓名署名，取不到则回退默认署名——open_id 永不进入消息文案；
      - 若配置了 config.allowed_senders 白名单（非空），最终署名必须命中，否则拒绝（防冒用）。
    """
    allowed = [str(s).strip() for s in (cfg.get("allowed_senders") or []) if str(s).strip()]
    default = str(cfg.get("default_sender", "")).strip() or (allowed[0] if allowed else "企业助手")

    sender = str(params.get("sender", "")).strip() or default
    auto_resolved = False
    if sender.startswith("ou_"):
        name = _resolve_openid_name(client, sender)
        if name:
            sender, auto_resolved = name, True
        else:
            sender = default

    if allowed and sender not in allowed:
        output_json(-1, f"署名 [{sender}] 不在允许名单内。"
                        f"请在 plugin.json 的 config.allowed_senders 中配置，或改传合法 sender 参数。"
                        f"当前允许: {', '.join(allowed)}")
    return sender, auto_resolved


def _resolve_openid_name(client, open_id: str):
    """把 open_id 解析为可读姓名（失败返回 None，绝不抛错、不影响发送主流程）"""
    if client is None:
        return None
    try:
        req = GetUserRequestBuilder().user_id_type("open_id").user_id(open_id).build()
        resp = client.contact.v3.user.get(req)
        if resp.success():
            name = str(getattr(getattr(resp.data, "user", None), "name", "") or "").strip()
            return name or None
    except Exception as e:
        print(f"[feishu] 解析署名 open_id 姓名失败（将回退默认署名）: {e}", file=sys.stderr)
    return None


# ============================================================
# 收件人解析
# ============================================================

def resolve_receive(cfg: dict, params: dict):
    """
    解析收件人，返回 (receive_id_type, receive_id)：
      - params.target 优先匹配 config.recipients 里预配的收件人名字（如 {"name":"张三","type":"user","target":"ou_xxx"}）；
      - 否则按 receive_type 校验：user → open_id(ou_ 开头)，chat → chat_id(oc_ 开头)。
    config.recipients 格式错误时给出清晰报错（元素必须是 {name,type,target} 对象）。
    """
    receive_type = str(params.get("receive_type", "")).strip()
    target = str(params.get("target", "")).strip()
    if not receive_type:
        output_json(-1, "缺少必填参数: receive_type（user=个人 / chat=群）")
    if not target:
        output_json(-1, "缺少必填参数: target（open_id / chat_id / config.recipients 中的收件人名字）")

    # 1) 优先按预配收件人名字解析（先校验配置格式，避免裸 Python 异常）
    recipients = cfg.get("recipients") or []
    if recipients and not isinstance(recipients, list):
        output_json(-1, "插件配置错误: config.recipients 应为数组（[{...}]），当前类型为 "
                        + type(recipients).__name__ + "。请修正 plugin.json（改动即时生效，无需重启）")
    for i, r in enumerate(recipients):
        if not isinstance(r, dict):
            output_json(-1, f"插件配置错误: config.recipients 第 {i + 1} 项应为对象 {{name,type,target}}，"
                            f"实际为 {type(r).__name__}: {r!r}。请修正 plugin.json（改动即时生效，无需重启）")
        name = str(r.get("name", "")).strip()
        if name and name == target:
            rtype = str(r.get("type", "")).strip()
            rid = str(r.get("target", "")).strip()
            if receive_type and rtype != receive_type:
                output_json(-1, f"收件人 [{target}] 预配类型为 {rtype}，与 receive_type={receive_type} 不一致。"
                                f"请检查 config.recipients 或改传 receive_type")
            if not rid:
                output_json(-1, f"收件人 [{target}] 在 config.recipients 中缺少 target 字段")
            return rtype or receive_type, rid

    # 2) 直接按 ID 传
    if receive_type == "user":
        if not target.startswith("ou_"):
            output_json(-1, "user 收件人 target 须为 open_id（ou_ 开头）。"
                            "可先用 feishu.contact.search_user 按手机号/邮箱查询 open_id，"
                            "或在 config.recipients 中预配收件人后用名字引用")
        return "open_id", target
    if receive_type == "chat":
        if not target.startswith("oc_"):
            output_json(-1, "chat 收件人 target 须为 chat_id（oc_ 开头）或 config.recipients 中预配的群名")
        return "chat_id", target

    output_json(-1, f"receive_type 无效: [{receive_type}]，可选值: user / chat")


# ============================================================
# 响应处理与数据清理
# ============================================================

def ensure_ok(resp, action_desc: str):
    """SDK 调用失败时统一报错退出；成功返回 resp.data"""
    if not resp.success():
        msg = str(getattr(resp, "msg", "") or "")
        code = str(getattr(resp, "code", ""))
        output_json(-1, f"{action_desc}失败: code={code}, msg={msg}"
                        "(常见原因：权限 scope 未申请/未发布、机器人不在目标群或不可用范围内、calendar 无写权限)")
    return resp.data


def _clean_value(value):
    """递归清理：去掉模型对象中的 None 空字段，只保留有意义的返回数据"""
    if value is None:
        return None
    if isinstance(value, (str, int, float, bool)):
        return value
    if isinstance(value, dict):
        return {k: _clean_value(v) for k, v in value.items() if v is not None}
    if isinstance(value, (list, tuple)):
        return [_clean_value(v) for v in value if v is not None]
    # lark-oapi 模型对象：遍历其全部字段，丢弃 None
    if hasattr(value, "__dict__"):
        return {k: _clean_value(v) for k, v in vars(value).items() if v is not None}
    # 兜底：枚举等无法序列化的类型转字符串
    try:
        json.dumps(value)
        return value
    except Exception:
        return str(value)


def clean(data):
    """对外返回数据前清理（去除 None 空字段 / 模型转 dict）"""
    return _clean_value(data)
