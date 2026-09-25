#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
mqtt_request.py —— intra.mqtt.request
=====================================
通过 MQTT 对内网服务做一次「请求-应答」式调用：
  每次调用 = 新建连接 → 订阅应答主题 → 发布请求 → 等待对端回复(带超时) → 断开。
MQTT 是发布/订阅协议，并非天生请求-响应；本方法把「请求主题 + 应答主题」约定
封装成一次同步请求，适用于对端服务按该约定应答的场景。
stdout: {"code":0,"msg":"ok","data":{...}}
"""
import json
import random
import sys
import threading
import time
import traceback
from urllib.parse import urlsplit

from intra_utils import (
    output_json,
    read_stdin_params,
    method_name_arg,
    get_config,
    get_default_timeout,
    require_site,
    split_url_userinfo,
    redact_url,
    neutralize_tree,
)


# 默认 MQTT 端口
_DEFAULT_PORT = {"mqtt": 1883, "mqtts": 8883}


def _import_paho():
    """懒加载 paho-mqtt，缺失时给出明确提示"""
    try:
        import paho.mqtt.client as mqtt
    except ImportError:
        output_json(
            -1,
            "缺少依赖 paho-mqtt：intra.mqtt.request 需要该库。"
            "请管理员在服务器执行: pip install paho-mqtt"
            "（.plugins-venv 环境用 .plugins-venv/bin/pip install paho-mqtt）",
        )
    return mqtt


def _create_client(mqtt, client_id: str):
    """兼容 paho-mqtt v1.x 与 v2.x 创建客户端"""
    try:
        if hasattr(mqtt, "CallbackAPIVersion"):
            return mqtt.Client(callback_api_version=mqtt.CallbackAPIVersion.VERSION2, client_id=client_id)
        return mqtt.Client(client_id=client_id)
    except TypeError:
        try:
            return mqtt.Client(client_id=client_id)
        except TypeError:
            return mqtt.Client()


def _int_rc(info) -> int:
    """从 publish 返回信息中取出数字 rc（兼容 paho v1 int / v2 ReasonCode）"""
    rc = getattr(info, "rc", None)
    if rc is None:
        return -1
    try:
        return int(rc)
    except (TypeError, ValueError):
        value = getattr(rc, "value", None)
        try:
            return int(value) if value is not None else -1
        except (TypeError, ValueError):
            return -1


def _decode_payload(payload) -> str:
    if payload is None:
        return ""
    if isinstance(payload, bytes):
        return payload.decode("utf-8", errors="replace")
    return str(payload)


def main():
    method_name = method_name_arg()
    params = read_stdin_params()
    cfg = get_config()

    # ---- 1. 解析 broker 地址 ----
    site = None
    site_name = ""
    url_param = str(params.get("url", "") or "").strip()
    if url_param:
        broker_url = url_param
        if params.get("site"):
            site = require_site(str(params["site"]).strip())
            site_name = str(site.get("name", "") or "")
    else:
        site = require_site(str(params.get("site", "") or "").strip())
        site_name = str(site.get("name", "") or "")
        broker_url = str(site.get("url", "") or "").strip()

    if not broker_url:
        output_json(-1, f"站点 [{site_name}] 未配置 url（mqtt://host:port），无法连接")

    broker_url, url_user, url_pwd = split_url_userinfo(broker_url)
    parsed = urlsplit(broker_url)
    scheme = (parsed.scheme or "mqtt").lower()
    if scheme not in ("mqtt", "mqtts"):
        output_json(-1, f"不支持的 broker 协议 [{scheme}]，请使用 mqtt:// 或 mqtts://")
    host = parsed.hostname
    if not host:
        output_json(-1, f"MQTT broker 地址无效: {broker_url}")
    port = parsed.port or _DEFAULT_PORT.get(scheme, 1883)
    use_tls = scheme == "mqtts"

    options = {}
    if site:
        site_opts = site.get("options")
        options = site_opts if isinstance(site_opts, dict) else {}

    # ---- 2. 请求/应答主题 ----
    request_topic = str(params.get("request_topic", "") or options.get("request_topic", "") or "").strip()
    response_topic = str(params.get("response_topic", "") or options.get("response_topic", "") or "").strip()
    if not request_topic:
        output_json(
            -1,
            "缺少请求主题：请传 request_topic（或站点 options.request_topic 预设），"
            "MQTT 需要明确的主题语义才能发起请求",
        )

    # ---- 3. 其他参数 ----
    try:
        qos = int(params.get("qos") if params.get("qos") is not None else options.get("qos", 0))
    except (TypeError, ValueError):
        qos = 0
    if qos not in (0, 1, 2):
        output_json(-1, f"qos 只支持 0/1/2，收到: {qos}")

    try:
        wait_timeout = int(params.get("wait_timeout") if params.get("wait_timeout") is not None else 0)
        if wait_timeout <= 0:
            wait_timeout = int(options.get("wait_timeout", 0) or 0)
        if wait_timeout <= 0:
            wait_timeout = get_default_timeout()
    except (TypeError, ValueError):
        wait_timeout = get_default_timeout()
    if wait_timeout < 1:
        wait_timeout = 1

    payload = params.get("payload")
    if isinstance(payload, (dict, list)):
        payload_text = json.dumps(payload, ensure_ascii=False, default=str)
    elif payload is None:
        payload_text = ""
    else:
        payload_text = str(payload)

    client_id = str(
        params.get("client_id") or options.get("client_id") or f"intra-fetch-{random.randrange(100000, 999999)}"
    )

    auth = None
    if params.get("username") is not None or params.get("password") is not None:
        auth = (str(params.get("username", "") or ""), str(params.get("password", "") or ""))
    elif options.get("username"):
        auth = (str(options.get("username", "") or ""), str(options.get("password", "") or ""))
    elif site:
        site_auth = site.get("auth")
        if isinstance(site_auth, dict) and site_auth.get("username"):
            auth = (str(site_auth.get("username", "") or ""), str(site_auth.get("password", "") or ""))
    if auth is None and (url_user is not None or url_pwd is not None):
        auth = (url_user or "", url_pwd or "")

    # 【影子演练】已上移宿主：由宿主的影子闸门统一拦截（不再在插件内实现）

    # ---- 4. 建立连接并执行 ----
    mqtt = _import_paho()
    client = _create_client(mqtt, client_id)
    if auth:
        client.username_pw_set(*auth)
    if use_tls:
        client.tls_set()

    connected = threading.Event()
    got_message = threading.Event()
    connect_error = []
    messages = []

    def on_connect(cli, userdata, flags, rc, *extra):
        # paho v1: rc 为 int；v2: rc 为 ReasonCode
        try:
            rc_int = int(rc)
        except (TypeError, ValueError):
            value = getattr(rc, "value", None)
            rc_int = int(value) if value is not None else -1
        if rc_int == 0:
            connected.set()
        else:
            connect_error.append(f"连接被拒绝 (rc={rc_int})")

    def on_message(cli, userdata, msg):
        messages.append(
            {
                "topic": getattr(msg, "topic", ""),
                "payload": _decode_payload(getattr(msg, "payload", None)),
                "qos": getattr(msg, "qos", 0),
                "retain": getattr(msg, "retain", False),
            }
        )
        got_message.set()

    client.on_connect = on_connect
    client.on_message = on_message

    display = f"{scheme}://{host}:{port}"
    try:
        client.connect(host, port, keepalive=max(wait_timeout + 5, 30))
    except Exception as e:
        output_json(-1, f"无法连接 MQTT broker {display}: {e}")
    client.loop_start()

    deadline = time.monotonic() + wait_timeout
    try:
        # 等待连接建立
        remain = deadline - time.monotonic()
        if remain <= 0 or not connected.wait(remain):
            err = connect_error[0] if connect_error else "连接超时"
            output_json(-1, f"连接 MQTT broker {display} 失败: {err}")

        # 订阅应答主题（先订阅再发布，避免漏收）
        if response_topic:
            sub_result, _ = client.subscribe(response_topic, qos=qos)
            if _int_rc(sub_result) not in (0, 1, 2, 3):
                # v1 的 subscribe 返回 (result, mid)，result 0 表示成功
                output_json(-1, f"订阅应答主题 [{response_topic}] 失败 (rc={_int_rc(sub_result)})")

        # 发布请求
        publish_info = client.publish(request_topic, payload=payload_text, qos=qos)
        publish_rc = _int_rc(publish_info)

        # 等待应答
        waited_ms = 0
        if response_topic and publish_rc in (0, 1, 2, 3, -1):
            remain = deadline - time.monotonic()
            if remain > 0:
                got_message.wait(remain)
            waited_ms = int((wait_timeout - max(deadline - time.monotonic(), 0)) * 1000)

        timed_out = bool(response_topic) and not messages
    finally:
        try:
            client.loop_stop()
            client.disconnect()
        except Exception:
            pass

    if publish_rc not in (0, 1, 2, 3, -1):
        output_json(-1, f"发布到主题 [{request_topic}] 失败 (rc={publish_rc})")

    # 【防注入】对端设备/服务的应答内容不受本系统控制（见 SKILL.md「安全约定」），
    # 回传前统一中和：剔除零宽字符与伪分隔符，避免内容伪装成指令或对话边界。
    safe_messages = neutralize_tree(messages[:20])

    result = {
        "site": site_name,
        "broker": display,
        "request_topic": request_topic,
        "response_topic": response_topic,
        "published": True,
        "publish_rc": publish_rc,
        "payload": payload_text,
        "message_count": len(messages),
        "messages": safe_messages,
        "waited_ms": waited_ms,
        "timed_out": timed_out,
        # 【防注入】来源与可信度标注（MQTT 发布可能改变对端状态）
        "untrusted": True,
        "source": display,
        "write_operation": True,
    }
    if timed_out:
        result["hint"] = f"等待应答超时（{wait_timeout}s），对端服务可能未按「请求-应答」约定回复，或需更长 wait_timeout"
    output_json(0, "ok", result)


if __name__ == "__main__":
    try:
        main()
    except SystemExit:
        raise
    except Exception as e:
        traceback.print_exc(file=sys.stderr)
        output_json(-1, f"MQTT 请求失败: {e}")
