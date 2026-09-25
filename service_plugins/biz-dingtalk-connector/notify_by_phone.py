#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
notify_by_phone.py —— 按手机号给指定成员发通知（notify.by_phone）
=================================================================
【消息中心约定方法】宿主「消息中心」只认这一个方法名：
  任何插件只要实现 `notify.by_phone`，就会被宿主的「通知类插件探测」选中，
  从而出现在「消息中心 → 通知插件」的候选里。**加新通知插件零代码改动。**

职责边界：**「手机号 → userId → 发消息」的全过程由本插件完成**，
宿主只负责传手机号 + 标题 + 正文。

stdin/stdout 协议：
  输入(stdin): {"phone":"13800000000","title":"存储告警","content":"**/data** 使用率 92%"}
  输出(stdout): {"code":0,"msg":"ok","data":{"phone":"...","userid":"zhangsan","task_id":123}}
"""
import sys
import traceback

from dingtalk_utils import (
    check_app_credentials,
    get_config,
    normalize_sender,
    output_json,
    read_params,
    search_user_by_mobile,
    send_work_notice,
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
            output_json(-1, "缺少必填参数: content（通知正文，支持 Markdown）")

        cfg = get_config()
        check_app_credentials(cfg)

        # 手机号 → userId（查不到时 userid 为空串）
        userid = str(search_user_by_mobile(cfg, phone).get("userid") or "").strip()
        if not userid:
            # 给出可辨识的失败原因：宿主会记进 deliver_note（不静默）
            output_json(-1, f"未在钉钉中找到手机号 [{phone}] 对应的成员"
                            "（请确认该成员在应用可见范围内，且手机号与通讯录一致）")

        sender = normalize_sender(cfg, params)
        # 与 dingtalk.app.send_markdown 一致：署名追加到正文底部，形成审计线索
        text = content if not sender else f"{content}\n\n---\n发起人：{sender}"
        msg = {"msgtype": "markdown", "markdown": {"title": title, "text": text}}

        resp = send_work_notice(cfg, userid, msg, action_desc="发送通知(按手机号)")

        output_json(0, "ok", {
            "phone": phone,
            "userid": userid,
            "task_id": resp.get("task_id"),
            "title": title,
        })
    except SystemExit:
        raise
    except Exception as e:
        traceback.print_exc(file=sys.stderr)
        output_json(-1, f"[{method_name}] 通知失败: {e}")


if __name__ == "__main__":
    main()
