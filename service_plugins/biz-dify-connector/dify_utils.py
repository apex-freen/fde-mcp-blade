#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
dify_utils.py —— Dify 知识库连接服务公共模块
============================================
职责：
  1. 统一 JSON 响应输出（stdout 只能有一行 JSON）；
  2. 从 plugin.json 读取 config（base_url / dataset_api_key / app_api_key）；
  3. base_url 拼接与鉴权头（Authorization: Bearer <api key>）；
  4. requests 请求封装（统一 timeout，默认 60s——检索/问答/建索引可能较慢）；
  5. Dify 错误处理：非 2xx（含 401/404 等）或业务 code!=0 时给出清晰 msg；
  6. 通用响应数据清理（递归去掉 None 空字段 / 模型转 dict）。

通信协议遵循插件标准：
  sys.argv[1] = 方法名；参数从 stdin 读单行 JSON；结果输出唯一一行 JSON 到 stdout。
  失败统一 {"code":-1,"msg":"原因","data":null} 并退出码 1。

Dify 自托管 API 约定：
  - base_url 即 http://<host>/v1（config.base_url 已含 /v1），后续直接拼资源路径；
  - 知识库类接口用 数据集 API Key（config.dataset_api_key，可被调用参数 api_key 覆盖）；
  - 应用对话接口用 应用 API Key（config.app_api_key）。
"""
import json
import os
import sys

import requests

DEFAULT_TIMEOUT = 60  # 检索/问答/建索引可能较慢，默认给足 60s


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
        print(f"[dify] 参数 JSON 格式无效: {raw[:200]}", file=sys.stderr)
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


# ============================================================
# base_url / API Key 解析
# ============================================================

def require_base_url(cfg: dict) -> str:
    """校验 config.base_url 已配置（自托管地址，如 http://192.168.x.x/v1），返回去掉尾部 '/' 的地址"""
    base = str(cfg.get("base_url", "")).strip().rstrip("/")
    if not base:
        output_json(-1, "插件配置错误: 缺少 config.base_url。"
                        "请填自托管 Dify 的 API 地址（形如 http://192.168.x.x/v1，即 Dify 后台「API 访问」页显示的 API 服务器地址）")
    if not base.startswith(("http://", "https://")):
        output_json(-1, f"插件配置错误: config.base_url=[{base}] 不是合法 URL，"
                        "应以 http:// 或 https:// 开头（形如 http://192.168.x.x/v1）")
    return base


def resolve_api_key(cfg: dict, params: dict, use: str = "dataset") -> str:
    """
    解析本次调用的 API Key：
      - 调用参数 params.api_key 优先（便于临时换用其它数据集/应用）；
      - 否则按用途取 config 默认值：dataset → config.dataset_api_key；app → config.app_api_key。
    """
    override = str(params.get("api_key", "")).strip()
    if override:
        return override
    key = str(cfg.get("dataset_api_key" if use == "dataset" else "app_api_key", "")).strip()
    if not key:
        cfg_field = "config.dataset_api_key" if use == "dataset" else "config.app_api_key"
        source_hint = ("请在 Dify「知识库 → API 访问」页生成数据集 API Key" if use == "dataset"
                       else "请在 Dify「应用 → API 访问」页生成应用 API Key")
        output_json(-1, f"插件配置错误: 缺少 {cfg_field}（可改由调用参数 api_key 传入）。{source_hint} 后填入 plugin.json 的 config")
    return key


def auth_headers(api_key: str) -> dict:
    """Dify 鉴权头：Authorization: Bearer <api key>"""
    return {"Authorization": f"Bearer {api_key}"}


# ============================================================
# requests 请求封装 + Dify 错误处理
# ============================================================

def _extract_dify_error(body, http_code: int) -> str:
    """从 Dify 错误响应体尽量提取可读 message（不抛异常）"""
    detail = ""
    if isinstance(body, dict):
        for k in ("message", "error", "msg", "description"):
            v = body.get(k)
            if v:
                detail = str(v)
                break
        code_val = body.get("code")
        if code_val is not None and str(code_val) not in ("0", ""):
            detail = f"{detail} (error_code={code_val})" if detail else f"error_code={code_val}"
    elif isinstance(body, (list, tuple)):
        detail = json.dumps(body, ensure_ascii=False)[:200]
    if not detail and body is not None and not isinstance(body, (dict, list, tuple)):
        detail = str(body)[:200]
    return f"HTTP {http_code}" + (f": {detail}" if detail else "")


def api_request(method: str, url: str, api_key: str = None, headers: dict = None,
                timeout: int = None, json_body=None, data=None, files=None,
                action_desc: str = "调用 Dify") -> dict:
    """
    统一的 requests 封装：
      1. 网络层异常（超时/连接失败）给出清晰中文 msg；
      2. 非 2xx 或业务 code!=0（含错误码非 0 的包装响应）→ 报错退出；
      3. 成功：返回完整响应体 JSON（dict），是否取 body['data'] 由调用方用 data_of() 决定。
    绝不吞掉真实错误，也不把异常打成裸 traceback。
    """
    try:
        resp = requests.request(
            method, url,
            headers=headers,
            json=json_body,
            data=data,
            files=files,
            timeout=timeout if timeout is not None else DEFAULT_TIMEOUT,
        )
    except requests.exceptions.Timeout:
        output_json(-1, f"{action_desc}超时（>{timeout or DEFAULT_TIMEOUT}s）: {method.upper()} {url}"
                        "。检索/问答/建索引可能较慢，可稍后重试或确认 Dify 服务状态")
    except requests.exceptions.ConnectionError as e:
        output_json(-1, f"{action_desc}网络连接失败: {method.upper()} {url} —— {e}"
                        "（请确认 Dify 已启动、config.base_url 正确、宿主机可访问该地址）")
    except requests.exceptions.RequestException as e:
        output_json(-1, f"{action_desc}请求异常: {method.upper()} {url} —— {e}")

    # 解析响应体（可能为空 / 非 JSON）
    try:
        body = resp.json() if resp.content else {}
    except ValueError:
        output_json(-1, f"{action_desc}返回非 JSON 响应: {_extract_dify_error(None, resp.status_code)}，"
                        f"响应前 200 字符: {resp.text[:200]}")

    # 非 2xx：按 HTTP 状态给常见原因提示，再附 Dify 返回的错误 message
    if resp.status_code < 200 or resp.status_code >= 300:
        hint = _http_error_hint(resp.status_code)
        output_json(-1, f"{action_desc}失败: {_extract_dify_error(body, resp.status_code)}" + (f"。{hint}" if hint else ""))

    # 2xx 但业务 code != 0（Dify 知识库类接口的包装响应）
    if isinstance(body, dict) and "code" in body:
        code_val = body.get("code")
        if str(code_val) not in ("0", ""):
            output_json(-1, f"{action_desc}失败: {_extract_dify_error(body, resp.status_code)}")

    return body


def _http_error_hint(http_code: int) -> str:
    """把常见 HTTP 状态映射为可操作提示（速查见 SKILL.md）"""
    return {
        400: "参数或请求体不合法（检查 dataset_id / name / text 等字段）",
        401: "鉴权失败：API Key 错误或未授权（检查 Authorization: Bearer 用的是哪一个 Key）",
        403: "无权限：该 API Key 对该资源无操作权限",
        404: "资源不存在：dataset_id 错误或该知识库已被删除",
        405: "方法不允许：确认 URL 与请求方法正确",
        413: "请求体过大：文本/文件超出 Dify 服务端限制",
        429: "请求过于频繁（限流），请稍后重试",
        500: "Dify 服务端内部错误（可能是模型/embedding 未配置或服务异常）",
        503: "Dify 服务不可用（可能正在启动/升级）",
    }.get(http_code, "")


def data_of(body) -> object:
    """Dify 部分接口（如知识库类）成功时包一层 {"code":0,"data":...,"message":"..."}，这里解出 data；无 data 键则原样返回"""
    if isinstance(body, dict) and "data" in body:
        return body["data"]
    return body


# ============================================================
# 响应数据清理
# ============================================================

def clean(data):
    """对外返回数据前清理（递归去掉 None 空字段 / dict 化），只保留有意义内容"""
    return _clean_value(data)


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
    # 其它对象：尝试直接序列化，失败转字符串兜底
    try:
        json.dumps(value)
        return value
    except Exception:
        return str(value)
