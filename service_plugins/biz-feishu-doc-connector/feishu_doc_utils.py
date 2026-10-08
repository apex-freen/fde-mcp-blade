#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
feishu_doc_utils.py —— 企业飞书云文档连接服务公共模块
=====================================================
职责：
  1. 统一 JSON 响应输出（stdout 只能有一行 JSON）；从 stdin 读单行参数 JSON；
  2. 从 plugin.json / 宿主注入读取 config（app_id/app_secret/默认目录等）；
  3. 构造 lark-oapi 客户端（自动管理 tenant_access_token）；
  4. 防提示词注入净化：外部文本/结构统一「中和」并标注来源；
  5. lark-oapi 模型 → 干净 dict（去掉 None 空字段）；
  6. 路径校验（下载白名单）、整数区间夹取、文文档链接拼接等通用工具。

通信协议遵循插件标准：
  sys.argv[1] = 方法名；参数从 stdin 读单行 JSON；结果输出唯一一行 JSON 到 stdout。
  失败统一 {"code":-1,"msg":"原因","data":null} 并退出码 1。
"""
import json
import os
import re
import sys

from lark_oapi import Client, LogLevel

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
    print(f"[feishu-doc][debug] 收到参数: {raw}", file=sys.stderr)
    try:
        return json.loads(raw) if raw else {}
    except json.JSONDecodeError:
        print(f"[feishu-doc] 参数 JSON 格式无效: {raw[:200]}", file=sys.stderr)
        sys.exit(1)


# ============================================================
# 插件配置加载（宿主注入 → 实例配置 → plugin.json 模板）
# ============================================================

_plugin_config_cache = None

# 宿主注入的已解析配置（含密钥箱解析结果），见 service_plugins/README_ZH.md「插件密钥箱」
_HOST_CONFIG_ENV = "GIS_PLUGIN_CONFIG"
# 实例配置目录（手工执行脚本时的回退层）
_INSTANCE_CONFIG_DIR_ENV = "GIS_PLUGIN_CONFIG_DIR"


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


def _host_injected_config() -> dict:
    """读取宿主注入的已解析 config；无注入或非法时返回 {}"""
    raw = os.environ.get(_HOST_CONFIG_ENV, "").strip()
    if not raw:
        return {}
    try:
        cfg = json.loads(raw)
    except json.JSONDecodeError:
        return {}
    return cfg if isinstance(cfg, dict) else {}


def _instance_config() -> dict:
    """读取实例配置文件的 config 节；不存在或解析失败时返回 {}"""
    base = os.environ.get(_INSTANCE_CONFIG_DIR_ENV, "").strip()
    if not base:
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
    """获取 config：宿主注入（含密钥箱解析结果）→ 实例配置 → plugin.json 模板"""
    injected = _host_injected_config()
    if injected:
        return injected
    inst = _instance_config()
    if inst:
        return inst
    return load_plugin_config().get("config", {})


def check_app_credentials(cfg: dict) -> None:
    """校验 app_id/app_secret 已配置，未配置时直接报错退出"""
    if not str(cfg.get("app_id", "")).strip():
        output_json(-1, "插件配置错误: 缺少 config.app_id。"
                        "请在飞书开放平台创建企业自建应用后，将 App ID 填入 config.app_id")
    if not str(cfg.get("app_secret", "")).strip():
        output_json(-1, "插件配置错误: 缺少 config.app_secret。"
                        "App Secret 应录入插件密钥箱（键名 app_secret），文件里保持 ${app_secret} 占位符")


def get_client(cfg: dict) -> Client:
    """构造飞书 SDK 客户端（内部自动维护 tenant_access_token，进程内有效）"""
    domain = str(cfg.get("domain", "feishu")).strip()
    if domain and domain != "feishu":
        output_json(-1, f"插件配置错误: config.domain={domain} 暂不支持。"
                        "当前仅支持国内版 domain=feishu；国际版(Lark)待 SDK 配置支持后启用")
    try:
        return Client.builder() \
            .app_id(str(cfg.get("app_id", "")).strip()) \
            .app_secret(str(cfg.get("app_secret", "")).strip()) \
            .log_level(LogLevel.ERROR) \
            .build()
    except Exception as e:
        output_json(-1, f"初始化飞书客户端失败: {e}")


def ensure_ok(resp, action_desc: str):
    """SDK 调用失败时统一报错退出；成功返回 resp.data"""
    if not resp.success():
        msg = str(getattr(resp, "msg", "") or "")
        code = str(getattr(resp, "code", ""))
        output_json(-1, f"{action_desc}失败: code={code}, msg={msg}"
                        "（常见原因：云文档/云盘权限 scope 未申请或未发布、"
                        "应用不在文档协作者中、目标资源不存在或已删除）")
    return resp.data


# ============================================================
# 防提示词注入：外部内容净化和来源标注
# ============================================================

_SCRIPT_STYLE_RE = re.compile(r"<(script|style|template|noscript)\b[^>]*>.*?</\1\s*>", re.I | re.S)
_TAG_RE = re.compile(r"</?[a-zA-Z][^>]*>")
_INVISIBLE_RE = re.compile("[\u200b-\u200f\u202a-\u202e\u2060-\u2064\u2066-\u2069\ufeff]")
_DELIMITER_MARKERS = ("<|im_start|>", "<|im_end|>", "<|endoftext|>", "[INST]", "<<SYS>>")

# 会改变外部服务/本地状态的方法（写操作），用于结果标注
_WRITE_METHODS = {
    "feishu.doc.create",
    "feishu.doc.append",
    "feishu.drive.file.upload",
    "feishu.drive.file.download",
    "feishu.drive.file.move",
    "feishu.drive.file.delete",
}


def neutralize(text: str) -> str:
    """中和不可信内容：剔除零宽/双向控制符 + 把伪分隔符的尖括号/方括号换成全角"""
    if not text:
        return ""
    s = _INVISIBLE_RE.sub("", str(text))
    for m in _DELIMITER_MARKERS:
        if m in s:
            s = s.replace(m, m.replace("<", "＜").replace(">", "＞")
                          .replace("[", "［").replace("]", "］"))
    return s


def sanitize_text(text: str, html: bool = False) -> str:
    """外部文本统一净化入口：html=True 先 HTML 文本化再中和，否则直接中和"""
    if not text:
        return ""
    if html:
        text = _SCRIPT_STYLE_RE.sub("", text)
        text = _TAG_RE.sub("", text)
    return neutralize(text)


def neutralize_tree(obj):
    """递归中和 JSON 结构中的字符串叶子（不改结构、不改键名）"""
    if isinstance(obj, str):
        return neutralize(obj)
    if isinstance(obj, list):
        return [neutralize_tree(v) for v in obj]
    if isinstance(obj, dict):
        return {k: neutralize_tree(v) for k, v in obj.items()}
    return obj


def is_write_method(method_name: str) -> bool:
    """是否为会产生副作用的写方法（用于结果标注 write_operation）"""
    return method_name in _WRITE_METHODS


def untrusted_marks(source: str, method_name: str) -> dict:
    """统一的外部数据来源/可信度标注字段（外部内容返回必带）"""
    return {
        "untrusted": True,
        "source": source,
        "text_sanitized": True,
        "write_operation": is_write_method(method_name),
    }


# ============================================================
# lark-oapi 模型 → 干净 dict
# ============================================================


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
    if hasattr(value, "__dict__"):
        return {k: _clean_value(v) for k, v in vars(value).items() if v is not None}
    try:
        json.dumps(value)
        return value
    except Exception:
        return str(value)


def clean(data):
    """对外返回数据前清理（去除 None 空字段 / 模型转 dict）"""
    return _clean_value(data)


# ============================================================
# 通用小工具
# ============================================================


def clamp_int(value, default: int, lo: int, hi: int) -> int:
    """把入参夹取到 [lo, hi]；非法/缺省时用 default"""
    try:
        n = int(value)
    except (TypeError, ValueError):
        return default
    return max(lo, min(hi, n))


def doc_url(cfg: dict, document_id: str):
    """拼出文档可访问链接；未配置 config.tenant_host 时返回 None（不臆造链接）"""
    host = str(cfg.get("tenant_host", "")).strip()
    if not host or not document_id:
        return None
    host = host.replace("https://", "").replace("http://", "").strip("/")
    return f"https://{host}/docx/{document_id}"


def resolve_download_path(cfg: dict, save_path: str, fallback_name: str) -> str:
    """解析下载保存路径：缺省落到 config.download_dir 或插件目录 downloads/。
    若配置了 config.allowed_download_dirs 白名单，最终路径必须落在其中之一（防护任意写文件）。
    """
    script_dir = os.path.dirname(os.path.abspath(__file__))
    target_dir = str(cfg.get("download_dir", "")).strip()
    if not target_dir:
        target_dir = os.path.join(script_dir, "downloads")

    if save_path:
        path = os.path.abspath(save_path)
    else:
        path = os.path.abspath(os.path.join(target_dir, fallback_name or "download.bin"))

    allowed = cfg.get("allowed_download_dirs") or []
    if allowed:
        if not isinstance(allowed, list):
            output_json(-1, "插件配置错误: config.allowed_download_dirs 应为数组（绝对路径列表）")
        dirs = [os.path.abspath(str(d).strip()) for d in allowed if str(d).strip()]
        if dirs and not any(path == d or path.startswith(d + os.sep) for d in dirs):
            output_json(-1, f"下载路径 [{path}] 不在允许目录白名单内。"
                            f"请改传白名单内的 save_path，或调整 config.allowed_download_dirs。"
                            f"当前允许: {', '.join(dirs)}")
    return path


# ============================================================
# 文档块解析辅助
# ============================================================

# block_type 数值 → 名称（常用块）
BLOCK_TYPE_MAP = {
    1: "page", 2: "text",
    3: "heading1", 4: "heading2", 5: "heading3", 6: "heading4", 7: "heading5",
    8: "heading6", 9: "heading7", 10: "heading8", 11: "heading9",
    12: "bullet", 13: "ordered", 14: "code", 15: "quote",
    17: "todo", 18: "bitable", 19: "callout", 20: "chat_card", 21: "diagram",
    22: "divider", 23: "file", 24: "grid", 25: "grid_column", 26: "iframe",
    27: "image", 28: "isv", 29: "add_ons", 30: "mindnote", 31: "sheet",
    32: "table", 33: "table_cell", 34: "view", 35: "quote_container",
    36: "task", 37: "okr", 38: "okr_objective", 39: "okr_key_result",
    40: "okr_progress", 41: "add_ons", 42: "jira_issue", 43: "wiki_catalog",
}

# block_type → 承载文本的字段名（Text 类型）
_TEXT_ATTR_BY_TYPE = {
    1: "page", 2: "text",
    3: "heading1", 4: "heading2", 5: "heading3", 6: "heading4", 7: "heading5",
    8: "heading6", 9: "heading7", 10: "heading8", 11: "heading9",
    12: "bullet", 13: "ordered", 14: "code", 15: "quote", 17: "todo",
}
_TEXT_ATTRS = ("page", "text", "heading1", "heading2", "heading3", "heading4",
               "heading5", "heading6", "heading7", "heading8", "heading9",
               "bullet", "ordered", "code", "quote", "todo")


def _text_of(text_obj) -> str:
    """从 Text 对象提取纯文本（拼接各 text_run.content）"""
    if text_obj is None:
        return ""
    parts = []
    for el in (getattr(text_obj, "elements", None) or []):
        tr = getattr(el, "text_run", None)
        content = getattr(tr, "content", None) if tr is not None else None
        if content:
            parts.append(str(content))
    return "".join(parts)


def extract_block_text(block) -> str:
    """按 block_type 优先取对应文本字段，取不到再兜底遍历所有文本字段"""
    bt = getattr(block, "block_type", None)
    attr = _TEXT_ATTR_BY_TYPE.get(bt)
    if attr:
        s = _text_of(getattr(block, attr, None))
        if s:
            return s
    for a in _TEXT_ATTRS:
        s = _text_of(getattr(block, a, None))
        if s:
            return s
    return ""


def simplify_block(block) -> dict:
    """把 Block 模型压成结构化摘要（净化文本），便于智能体阅读"""
    bt = getattr(block, "block_type", None)
    children = getattr(block, "children", None) or []
    return {
        "block_id": getattr(block, "block_id", None),
        "block_type": bt,
        "block_type_name": BLOCK_TYPE_MAP.get(bt, str(bt)),
        "parent_id": getattr(block, "parent_id", None),
        "children": list(children),
        "text": neutralize(extract_block_text(block)),
    }
