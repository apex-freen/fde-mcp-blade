#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
notify_by_phone.py —— 按手机号给指定成员发通知（notify.by_phone）
=================================================================
【消息中心约定方法】宿主「消息中心」只认这一个方法名：
  任何插件只要实现 `notify.by_phone`，就会被宿主的「通知类插件探测」选中，
  从而出现在「消息中心 → 通知插件」的候选里。**加新通知插件零代码改动。**

职责边界：**「手机号 → userid → 发消息」的全过程由本插件完成**，
宿主只负责传手机号 + 标题 + 正文。

stdin/stdout 协议：
  输入(stdin): {"phone":"13800000000","title":"存储告警","content":"**/data** 使用率 92%"}
  输出(stdout): {"code":0,"msg":"ok","data":{"phone":"...","userid":"zhangsan","msgid":"xxx"}}
"""
import sys
import traceback

from wecom_utils import (
    check_app_credentials,
    get_config,
    normalize_sender,
    output_json,
    read_params,
    search_user_by_mobile,
    send_app_message,
    sign_content,
)

METHOD = "notify.by_phone"


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
            output_json(-1, "缺少必填参数: content（通知正文，支持企业微信 Markdown 子集）")

        cfg = get_config()
        check_app_credentials(cfg)

        # 手机号 → userid（单号单查：非 0 errcode 表示该号码查询失败，如 60111 手机号不存在/未激活）
        errcode, errmsg, userid = search_user_by_mobile(cfg, phone)
        if errcode != 0 or not userid:
            # 给出可辨识的失败原因：宿主会记进 deliver_note（不静默）
            output_json(-1, f"未在企业微信中找到手机号 [{phone}] 对应的成员"
                            f"（errcode={errcode}, errmsg={errmsg or '-'}）")

        sender = normalize_sender(cfg, params)
        # 与企业微信 send_markdown 一致：署名追加到正文底部
        body = sign_content(content, sender)

        # 企业微信 markdown 不支持标题字段，把标题作为首行加粗（保持"标题可见"）
        md = f"**{title}**\n\n{body}" if title else body

        data = send_app_message(cfg, userid, "markdown", md)

        output_json(0, "ok", {
            "phone": phone,
            "userid": userid,
            "msgid": data.get("msgid"),
            "title": title,
        })
    except SystemExit:
        raise
    except Exception as e:
        traceback.print_exc(file=sys.stderr)
        output_json(-1, f"[{method_name}] 通知失败: {e}")


if __name__ == "__main__":
    main()
