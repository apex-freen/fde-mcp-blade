#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
notify_by_phone.py —— 按手机号给指定用户发通知（notify.by_phone）
=================================================================
【消息中心约定方法】宿主「消息中心」只认这一个方法名：
  任何插件只要实现 `notify.by_phone`，就会被宿主的「通知类插件探测」选中，
  从而出现在「消息中心 → 通知插件」的候选里。**加新通知插件零代码改动。**

职责边界：**「手机号 → 平台用户标识 → 发消息」的全过程由本插件完成**，
宿主只负责传手机号 + 标题 + 正文，不参与任何平台细节。

stdin/stdout 协议：
  输入(stdin): {"phone":"13800000000","title":"存储告警","content":"磁盘使用率 92%"}
  输出(stdout): {"code":0,"msg":"ok","data":{"phone":"...","open_id":"ou_xxx","message_id":"om_xxx"}}
"""
import json
import sys
import traceback

from lark_oapi.api.contact.v3 import BatchGetIdUserRequestBuilder, BatchGetIdUserRequestBodyBuilder
from lark_oapi.api.im.v1 import CreateMessageRequestBuilder, CreateMessageRequestBodyBuilder

from feishu_utils import (
    check_app_credentials,
    clean,
    ensure_ok,
    get_client,
    get_config,
    output_json,
    read_params,
)

METHOD = "notify.by_phone"


def find_open_id_by_phone(client, phone: str):
    """按手机号反查 open_id；查不到返回 None"""
    body = BatchGetIdUserRequestBodyBuilder().mobiles([phone]).build()
    req = BatchGetIdUserRequestBuilder().user_id_type("open_id").request_body(body).build()
    data = ensure_ok(client.contact.v3.user.batch_get_id(req), "按手机号反查用户")
    for item in (clean(getattr(data, "user_list", None)) or []):
        uid = str((item or {}).get("user_id", "")).strip()
        if uid:
            return uid
    return None


def build_card(title: str, content: str) -> dict:
    """构造飞书互动卡片（与 feishu.im.send_card 一致的形状）"""
    return {
        "config": {"wide_screen_mode": True},
        "header": {"title": {"tag": "plain_text", "content": title}},
        "elements": [{"tag": "markdown", "content": content}],
    }


def main():
    method_name = sys.argv[1] if len(sys.argv) > 1 else METHOD
    params = read_params()

    try:
        phone = str(params.get("phone", "")).strip()
        title = str(params.get("title", "")).strip() or "系统通知"
        content = str(params.get("content", "")).strip()

        if not phone:
            output_json(-1, "缺少必填参数: phone（收件人手机号）")
        if not content:
            output_json(-1, "缺少必填参数: content（通知正文，支持 Markdown）")

        cfg = get_config()
        check_app_credentials(cfg)
        client = get_client(cfg)

        open_id = find_open_id_by_phone(client, phone)
        if not open_id:
            # 给出可辨识的失败原因：宿主会记进 deliver_note（不静默）
            output_json(-1, f"未在飞书中找到手机号 [{phone}] 对应的用户"
                            "（请确认该成员在应用可用范围内，且通讯录手机号与之一致）")

        body = CreateMessageRequestBodyBuilder() \
            .receive_id(open_id) \
            .msg_type("interactive") \
            .content(json.dumps(build_card(title, content), ensure_ascii=False)) \
            .build()
        req = CreateMessageRequestBuilder() \
            .receive_id_type("open_id") \
            .request_body(body) \
            .build()

        data = ensure_ok(client.im.v1.message.create(req), "发送通知")

        output_json(0, "ok", {
            "phone": phone,
            "open_id": open_id,
            "message_id": clean(getattr(data, "message_id", None)),
            "title": title,
        })
    except SystemExit:
        raise
    except Exception as e:
        traceback.print_exc(file=sys.stderr)
        output_json(-1, f"[{method_name}] 通知失败: {e}")


if __name__ == "__main__":
    main()
