#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
send_card.py —— 发送富文本卡片消息（feishu.im.send_card）
========================================================
以机器人身份给个人/群发"互动卡片"（标题 + Markdown 正文），更醒目，适合告警/通知。

署名规则同 send_text（normalize_sender）：可读名 / 缺省 default_sender / ou_ 自动换名。

stdin/stdout 协议：
  输入(stdin): {"receive_type":"chat","target":"oc_xxx","title":"存储告警","md":"磁盘使用率 92%","sender":"运维"}
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


def build_card(title: str, md: str, sender: str) -> dict:
    """构造飞书互动卡片 JSON（消息的 content）"""
    body = md
    if sender:
        body = f"{body}\n\n---\n发起人：{sender}"
    return {
        "config": {"wide_screen_mode": True},
        "header": {
            "title": {"tag": "plain_text", "content": title},
        },
        "elements": [
            {"tag": "markdown", "content": body},
        ],
    }


def main():
    method_name = sys.argv[1] if len(sys.argv) > 1 else "feishu.im.send_card"
    params = read_params()

    try:
        cfg = get_config()
        check_app_credentials(cfg)
        receive_id_type, receive_id = resolve_receive(cfg, params)

        md = str(params.get("md", "")).strip()
        if not md:
            output_json(-1, "缺少必填参数: md（卡片正文，支持 Markdown）")
        title = str(params.get("title", "")).strip() or "企业通知"

        # 【影子演练】已上移宿主：由宿主的影子闸门统一拦截（不再在插件内实现）

        client = get_client(cfg)
        sender, sender_auto = normalize_sender(cfg, params, client)

        # 署名已归一化为可读名（绝不含 ou_/oc_），build_card 会追加到卡片正文底部
        card = build_card(title, md, sender)
        content = json.dumps(card, ensure_ascii=False)

        body = CreateMessageRequestBodyBuilder() \
            .receive_id(receive_id) \
            .msg_type("interactive") \
            .content(content) \
            .build()
        req = CreateMessageRequestBuilder() \
            .receive_id_type(receive_id_type) \
            .request_body(body) \
            .build()

        data = ensure_ok(client.im.v1.message.create(req), "发送卡片消息")

        output_json(0, "ok", {
            "message_id": clean(getattr(data, "message_id", None)),
            "receive_type": receive_id_type,
            "target": receive_id,
            "title": title,
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
