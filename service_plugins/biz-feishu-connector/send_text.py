#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
send_text.py —— 发送纯文本消息（feishu.im.send_text）
====================================================
以机器人身份（tenant_access_token）给个人/群发纯文本。

署名规则（feishu_utils.normalize_sender）：
  - sender 只接受可读名；留空用 config.default_sender；
  - 误传 ou_ open_id 会自动反查姓名后署名（sender_auto=true），取不到回退默认；
  - open_id 永不进入消息文案。

stdin/stdout 协议：
  输入(stdin): {"receive_type":"user","target":"ou_xxx","text":"...","sender":"张三"}
  输出(stdout): {"code":0,"msg":"ok","data":{"message_id":"om_xxx",...,"sender_auto":false}}
"""
import json
import sys
import traceback

from lark_oapi.api.im.v1 import CreateMessageRequestBuilder, CreateMessageRequestBodyBuilder

from feishu_utils import (
    clean,
    check_app_credentials,
    ensure_ok,
    get_client,
    get_config,
    normalize_sender,
    output_json,
    read_params,
    resolve_receive,
)


def main():
    method_name = sys.argv[1] if len(sys.argv) > 1 else "feishu.im.send_text"
    params = read_params()

    try:
        cfg = get_config()
        check_app_credentials(cfg)
        receive_id_type, receive_id = resolve_receive(cfg, params)

        text = str(params.get("text", "")).strip()
        if not text:
            output_json(-1, "缺少必填参数: text（消息内容）")

        # 【影子演练】已上移宿主：由宿主的影子闸门统一拦截（不再在插件内实现）
        # 见实例配置 config.shadow_mode + 方法声明 side_effect（宿主在启动子进程前拦下、落库、待批准）

        client = get_client(cfg)
        sender, sender_auto = normalize_sender(cfg, params, client)

        # 发起人署名（已归一化为可读名，绝不含 ou_/oc_）追加到文本末尾，形成审计线索（不改动原文）
        payload_text = text if not sender else f"{text}\n—— 发起人：{sender}"
        content = json.dumps({"text": payload_text}, ensure_ascii=False)

        body = CreateMessageRequestBodyBuilder() \
            .receive_id(receive_id) \
            .msg_type("text") \
            .content(content) \
            .build()
        req = CreateMessageRequestBuilder() \
            .receive_id_type(receive_id_type) \
            .request_body(body) \
            .build()

        data = ensure_ok(client.im.v1.message.create(req), "发送文本消息")

        output_json(0, "ok", {
            "message_id": clean(getattr(data, "message_id", None)),
            "receive_type": receive_id_type,
            "target": receive_id,
            "sender": sender,
            "sender_auto": sender_auto,
        })
    except SystemExit:
        raise
    except Exception as e:
        traceback.print_exc(file=sys.stderr)
        output_json(-1, f"[{method_name}] 发送失败: {e}")


if __name__ == "__main__":
    main()
