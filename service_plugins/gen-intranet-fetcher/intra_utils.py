#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
intra_utils.py —— gen-intranet-fetcher 插件公共模块
=====================================================
通用能力：统一响应输出、plugin.json 配置读取、内网站点查找、
地址拼接、认证解析、敏感信息脱敏等。
宿主调用协议（与 service_plugins/README.md 一致）：
  python3 <handler.py> <method_name>
  stdin: 方法参数 JSON（宿主会合并 plugin.json config 与 manifest.serverUrl）
  stdout: 单行 {"code":0,"msg":"ok","data":{...}}
"""
import json
import os
import re
import sys
from typing import Any, Optional

# ============================================================
# 统一响应输出
# ============================================================

def output_json(code: int, msg: str, data: Any = None) -> None:
    """统一输出 JSON 响应到 stdout；失败时退出进程（退出码 1）"""
    print(json.dumps({"code": code, "msg": msg, "data": data}, ensure_ascii=False, default=str))
    if code != 0:
        sys.exit(1)


def read_stdin_params() -> dict:
    """读取宿主经 stdin 传入的方法参数（JSON），非 JSON/空则返回 {}"""
    raw = sys.stdin.read().strip()
    if not raw:
        return {}
    try:
        params = json.loads(raw)
        return params if isinstance(params, dict) else {}
    except json.JSONDecodeError:
        return {}


def method_name_arg() -> str:
    """取宿主传入的方法名（sys.argv[1]，用于日志/调试）"""
    return sys.argv[1] if len(sys.argv) > 1 else "unknown"


# ============================================================
# 插件配置加载（优先宿主注入的已解析配置，回退插件目录下的 plugin.json，自包含）
# ============================================================

_plugin_config_cache: Optional[dict] = None


def load_plugin_config() -> dict:
    """读取当前插件目录下的 plugin.json，结果缓存"""
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
    """获取插件配置（来自 config 节）：优先宿主注入（含密钥箱解析结果），回退 plugin.json"""
    injected = _host_injected_config()
    if injected:
        return injected
    inst = _instance_config()
    if inst:
        return inst
    plugin = load_plugin_config()
    cfg = plugin.get("config", {})
    return cfg if isinstance(cfg, dict) else {}


def get_manifest() -> dict:
    """获取插件清单（来自 plugin.json 的 manifest 节）"""
    plugin = load_plugin_config()
    mf = plugin.get("manifest", {})
    return mf if isinstance(mf, dict) else {}


# ============================================================
# 常用配置取值
# ============================================================

def cfg_int(cfg: dict, key: str, default: int) -> int:
    try:
        return int(cfg.get(key, default))
    except (TypeError, ValueError):
        return default


def get_default_timeout() -> int:
    return cfg_int(get_config(), "default_timeout", 10)


def get_max_body_chars() -> int:
    return cfg_int(get_config(), "max_body_chars", 20000)


def get_default_site() -> str:
    cfg = get_config()
    return str(cfg.get("default_site", "") or "").strip()


# ============================================================
# 内网站点（config.sites）
# ============================================================
# 站点结构（type: http | soap | mqtt）：
#   {
#     "name": "唯一标识，方法调用时用 site 参数引用",
#     "type": "http",
#     "url":  "内网地址（http/https/mqtt）",
#     "desc": "可选说明",
#     "headers": {},                       # 站点级默认请求头（http/soap）
#     "auth": {"username":"","password":""},  # 可选 Basic/账号认证
#     "timeout": 10,                       # 可选，站点级超时
#     "options": {}                        # 协议级参数（mqtt 等）
#   }

def get_sites() -> list:
    sites = get_config().get("sites", [])
    return [s for s in sites if isinstance(s, dict)] if isinstance(sites, list) else []


def find_site(name: str) -> Optional[dict]:
    """按名称查找站点：先精确匹配，再大小写不敏感匹配"""
    if not name:
        return None
    target = str(name).strip()
    if not target:
        return None
    for s in get_sites():
        if str(s.get("name", "")).strip() == target:
            return s
    for s in get_sites():
        if str(s.get("name", "")).strip().lower() == target.lower():
            return s
    return None


def site_names() -> str:
    names = [str(s.get("name", "")).strip() for s in get_sites() if s.get("name")]
    return "、".join(names) if names else "（未配置任何站点）"


def require_site(name: str) -> dict:
    """按名称取站点，找不到则输出错误并退出。name 为空时尝试 config.default_site"""
    cfg = get_config()
    site_name = (name or "").strip() or str(cfg.get("default_site", "") or "").strip()
    if not site_name:
        output_json(
            -1,
            f"缺少目标地址：请传 site（config.sites 中的站点名）或 url（完整内网地址）。"
            f"可用站点: {site_names()}",
        )
    site = find_site(site_name)
    if site is None:
        output_json(
            -1,
            f"未找到内网站点 [{site_name}]。可用站点: {site_names()}。"
            f"请先在 plugin.json 的 config.sites 中配置，或改用 url 参数直接请求。",
        )
    return site


# ============================================================
# 地址 / 认证 / 请求头工具
# ============================================================

_URL_SPLIT_RE = re.compile(r"^(?P<scheme>[a-zA-Z][a-zA-Z0-9+.\-]*://)(?P<userinfo>[^/@]+)@(?P<rest>.*)$")


def split_url_userinfo(url: str):
    """
    从 URL 中拆出 userinfo（user:pass@）。
    返回 (干净URL, username, password)；无 userinfo 时后两者为 None。
    """
    url = (url or "").strip()
    if not url:
        return url, None, None
    m = _URL_SPLIT_RE.match(url)
    if m:
        userinfo = m.group("userinfo")
        if ":" in userinfo:
            user, _, pwd = userinfo.partition(":")
            return m.group("scheme") + m.group("rest"), user, pwd
        return m.group("scheme") + m.group("rest"), userinfo, ""
    return url, None, None


def redact_url(url: str) -> str:
    """把 URL 中的 user:pass@ 整体替换为 ***@，用于回显，避免泄露密码"""
    url = (url or "").strip()
    m = _URL_SPLIT_RE.match(url)
    if m:
        return m.group("scheme") + "***@" + m.group("rest")
    return url


def append_path(base_url: str, path: str) -> str:
    """把 path 拼接到基础地址后（自动处理斜杠），path 可为空"""
    path = (path or "").strip()
    base_url = (base_url or "").strip()
    if not path:
        return base_url
    if not base_url:
        return path
    sep = "" if path.startswith("/") else "/"
    return base_url.rstrip("/") + sep + path


def resolve_auth(username, password, site: Optional[dict]):
    """
    解析 Basic/账号认证信息，返回 (user, pwd) 或 None。
    优先级：方法参数 username/password > 站点 auth > 无。
    """
    if username is not None or password is not None:
        return (str(username or ""), str(password or ""))
    if site:
        auth = site.get("auth")
        if isinstance(auth, dict) and (auth.get("username") or auth.get("password")):
            return (str(auth.get("username", "") or ""), str(auth.get("password", "") or ""))
    return None


def merge_headers(site: Optional[dict], extra_headers) -> dict:
    """合并站点级默认请求头与方法级自定义请求头（后者覆盖同名项）"""
    headers = {}
    if site:
        site_headers = site.get("headers")
        if isinstance(site_headers, dict):
            for k, v in site_headers.items():
                headers[str(k)] = str(v)
    if isinstance(extra_headers, dict):
        for k, v in extra_headers.items():
            headers[str(k)] = str(v)
    return headers


# ============================================================
# 响应体截断 / 常用小工具
# ============================================================

def truncate_text(text: str, limit: int) -> str:
    """按字符数截断文本"""
    try:
        limit = int(limit)
    except (TypeError, ValueError):
        limit = 20000
    if limit <= 0 or text is None:
        return ""
    return text[:limit]


def looks_binary(data: bytes) -> bool:
    """粗判是否为二进制内容（前 2048 字节含 NUL 判定为二进制）"""
    if not data:
        return False
    return b"\x00" in data[:2048]


_SECRET_KEY_RE = re.compile(
    r"(password|passwd|pwd|secret|token|apikey|api_key|cookie|authorization|credential|access_key|private_key)",
    re.IGNORECASE,
)


def sanitize_options(options) -> dict:
    """过滤站点 options，隐藏所有疑似密钥的键（值置为 ***），用于站点列表回显"""
    result = {}
    if not isinstance(options, dict):
        return result
    for k, v in options.items():
        key = str(k)
        if _SECRET_KEY_RE.search(key):
            result[key] = "***"
        elif isinstance(v, (dict, list)):
            result[key] = "<object>"
        else:
            result[key] = v
    return result


def sanitize_headers(headers) -> dict:
    """站点 headers 回显：只保留键名列表（值可能是密钥）"""
    if not isinstance(headers, dict):
        return {}
    return {str(k): "***" for k in headers.keys()}


# ============================================================
# 不可信内容净化（防提示词注入，详见 SKILL.md「安全约定」）
# ============================================================
#
# 本插件把内网响应的原文回传给 AI，而内网页面/接口/设备返回的内容
# **不受本系统控制**，可能夹带针对 AI 的恶意指令（提示词注入）。
# 因此所有外部文本在进入结果前都要过一遍净化：
#   1) 去掉脚本/样式/模板/注释/隐藏元素，再剥标签（隐藏指令的常见藏身处）
#   2) 剔除零宽与双向控制字符，并把伪分隔符的尖括号换成全角（防伪装成对话/角色边界）
# 注意：只做"中和"，不改写数据本体（不做破坏性净化，避免损害可用性）。

_SCRIPT_STYLE_RE = re.compile(r"<(script|style|template|noscript)\b[^>]*>.*?</\1\s*>", re.IGNORECASE | re.DOTALL)
_COMMENT_RE = re.compile(r"<!--.*?-->", re.DOTALL)
# 视觉隐藏元素：连同内容一起删除（隐藏指令最典型的藏身处）
_HIDDEN_ELEMENT_RE = re.compile(
    r"<(?P<htag>[a-zA-Z][a-zA-Z0-9]*)\b(?=[^>]*?(?:display\s*:\s*none|visibility\s*:\s*hidden|type\s*=\s*[\"']hidden[\"']|\shidden(?=[\s/>])))[^>]*>.*?</(?P=htag)\s*>",
    re.IGNORECASE | re.DOTALL,
)
_TAG_RE = re.compile(r"</?[a-zA-Z][^>]*>")
_INVISIBLE_RE = re.compile("[\u200b-\u200f\u202a-\u202e\u2060-\u2064\u2066-\u2069\ufeff]")

# 常见伪分隔符标记（与宿主 neutralize 的标记集保持一致）
_DELIMITER_MARKERS = (
    "<|im_start|>", "<|im_end|>", "<|system|>", "<|user|>", "<|assistant|>",
    "<|endoftext|>", "<|begin_of_text|>", "<|end_of_text|>",
    "[INST]", "[/INST]", "<<SYS>>", "<</SYS>>",
)

_HTML_HINT_RE = re.compile(r"<\s*(!doctype|html|head|body|div|span|script|style|p|a|table|ul|li)\b", re.IGNORECASE)


def looks_like_html(text: str) -> bool:
    """粗判文本是否为 HTML（决定是否连标签一起去掉）"""
    if not text:
        return False
    return bool(_HTML_HINT_RE.search(text[:4096]))


def strip_comments(text: str) -> str:
    """去掉 HTML/XML 注释（隐藏指令的常见藏身处）"""
    if not text or "<!--" not in text:
        return text or ""
    return _COMMENT_RE.sub("", text)


def html_to_text(text: str) -> str:
    """HTML 文本化：去脚本/样式/模板/注释/隐藏元素 → 剥标签 → 还原常见实体"""
    if not text:
        return ""
    s = _SCRIPT_STYLE_RE.sub("", text)
    s = _COMMENT_RE.sub("", s)
    s = _HIDDEN_ELEMENT_RE.sub("", s)
    s = _TAG_RE.sub("", s)
    return (
        s.replace("&lt;", "<")
        .replace("&gt;", ">")
        .replace("&quot;", '"')
        .replace("&#39;", "'")
        .replace("&apos;", "'")
        .replace("&nbsp;", " ")
        .replace("&amp;", "&")
    )


def neutralize_injection(text: str) -> str:
    """中和不可信内容：剔除零宽/双向控制符 + 把伪分隔符的方/尖括号换成全角"""
    if not text:
        return ""
    s = _INVISIBLE_RE.sub("", text)
    for marker in _DELIMITER_MARKERS:
        for variant in (marker, marker.lower()):
            if variant in s:
                safe = variant.replace("<", "＜").replace(">", "＞").replace("[", "［").replace("]", "］")
                s = s.replace(variant, safe)
    return s


def sanitize_text(text: str, html: bool = False) -> str:
    """
    外部文本统一净化入口。

    html=False（默认）：仅去注释 + 中和（保留标签，用于 XML/SOAP/纯文本）
    html=True：先 HTML 文本化再中和（用于网页等 HTML 内容）
    """
    if not text:
        return ""
    s = html_to_text(text) if html else strip_comments(text)
    return neutralize_injection(s)


def neutralize_tree(obj):
    """
    递归中和 JSON 结构里的字符串叶子（不改结构、不改键名）。
    用于把"优先阅读结构化字段"这条约定也变成安全的路径。
    """
    if isinstance(obj, str):
        return neutralize_injection(obj)
    if isinstance(obj, list):
        return [neutralize_tree(v) for v in obj]
    if isinstance(obj, dict):
        return {k: neutralize_tree(v) for k, v in obj.items()}
    return obj


_WRITE_METHODS = ("POST", "PUT", "PATCH", "DELETE")


def is_write_method(method: str) -> bool:
    """是否可能改变服务端状态的方法（用于结果里显式标注写操作）"""
    return str(method or "").strip().upper() in _WRITE_METHODS


