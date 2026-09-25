#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
robot_send.py —— 群自定义机器人 webhook 推送（dingtalk.robot.send）
==================================================================
通过群自定义机器人 webhook 向群推送 text / markdown 消息（发群消息的唯一通道）。
支持『加签』安全设置：timestamp(毫秒) + "\n" + secret 做 HMAC-SHA256，base64 后 URL 编码为 sign。
注意：走机器人 webhook 不依赖 app_key/app_secret/agent_id，但依赖 config.robot_webhook(+robot_sign)
或 config.recipients 中预配的机器人（type=robot，可带各自 robot_sign）。

stdin/stdout 协议：
  输入(stdin): {"target":"IT告警群","msgtype":"text","content":"磁盘使用率 92%","sender":"运维"}
  输出(stdout): {"code":0,"msg":"ok","data":{"robot":"IT告警群","msgtype":"text","sender":"运维"}}
webhook URL 含 access_token，属敏感凭证，绝不回显到输出（只回显机器人名字/label）。
"""
import sys
import traceback

from dingtalk_utils import (
    get_config,
    normalize_sender,
    output_json,
    read_params,
    resolve_robot,
    send_robot_message,
)



def main():
    method_name = sys.argv[1] if len(sys.argv) > 1 else "dingtalk.robot.send"
    params = read_params()

    try:
        cfg = get_config()
        # 机器人 webhook 推送不需要 app 凭证；解析目标（空=config.robot_webhook / 机器人名 / webhook URL）
        webhook, secret, label = resolve_robot(cfg, params)

        msgtype = str(params.get("msgtype", "text")).strip().lower()
        if msgtype not in ("text", "markdown"):
            output_json(-1, f"msgtype 无效: [{msgtype}]，可选值: text / markdown")

        content = str(params.get("content", "")).strip()
        if not content:
            output_json(-1, "缺少必填参数: content（消息内容）")

        sender = normalize_sender(cfg, params)
        # 发起人署名（已归一化为可读名）追加到正文末尾，形成审计线索（不改动原文）
        payload_text = content if not sender else f"{content}\n—— 发起人：{sender}"
        if msgtype == "text":
            payload = {"msgtype": "text", "text": {"content": payload_text}}
        else:
            title = str(params.get("title", "")).strip() or "企业通知"
            payload = {"msgtype": "markdown", "markdown": {"title": title, "text": payload_text}}

        # 【影子演练】已上移宿主：由宿主的影子闸门统一拦截（不再在插件内实现）

        resp = send_robot_message(webhook, secret, payload, action_desc="发送机器人消息")

        output_json(0, "ok", {
            "robot": label,
            "msgtype": msgtype,
            "sender": sender,
            "errcode": resp.get("errcode"),
        })
    except SystemExit:
        raise
    except Exception as e:
        traceback.print_exc(file=sys.stderr)
        output_json(-1, f"[{method_name}] 发送失败: {e}")


if __name__ == "__main__":
    main()
