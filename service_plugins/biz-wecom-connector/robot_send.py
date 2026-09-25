#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
robot_send.py —— 群自定义机器人 webhook 推送（wecom.robot.send）
================================================================
把文本 / Markdown 推送到企业微信群"自定义机器人"所在的群。
webhook 来源二选一：
  - target 留空 → 使用 config.robot_webhook（默认群）；
  - target 填名字 → 匹配 config.recipients 中 type=robot 的预配项取 webhook（支持多群）。
webhook 一律取自配置，不接受运行时直传任意 URL，防止消息外泄到未授权地址。

署名规则同 app 发送（normalize_sender）：可读名 / 缺省 default_sender / allowed_senders 白名单。

stdin/stdout 协议：
  输入(stdin): {"msgtype":"markdown","content":"**/data** 使用率 92%","sender":"运维"}（target 可空）
  输出(stdout): {"code":0,"msg":"ok","data":{"errcode":0,"errmsg":"ok","msgtype":"markdown","target":"config.robot_webhook"}}
"""
import sys
import traceback

from wecom_utils import (
    get_config,
    normalize_sender,
    output_json,
    read_params,
    resolve_robot_webhook,
    send_robot_message,
    sign_content,
)



def main():
    method_name = sys.argv[1] if len(sys.argv) > 1 else "wecom.robot.send"
    params = read_params()

    try:
        cfg = get_config()
        webhook_url = resolve_robot_webhook(cfg, params)

        msgtype = str(params.get("msgtype", "")).strip().lower()
        if msgtype not in ("text", "markdown"):
            output_json(-1, f"msgtype 无效: [{msgtype}]，可选值: text / markdown")

        content = str(params.get("content", "")).strip()
        if not content:
            output_json(-1, "缺少必填参数: content（推送内容）")

        sender = normalize_sender(cfg, params)
        payload = sign_content(content, sender)
        target_label = str(params.get("target", "")).strip() or "config.robot_webhook"

        # 【影子演练】已上移宿主：由宿主的影子闸门统一拦截（不再在插件内实现）

        data = send_robot_message(webhook_url, msgtype, payload)

        # 不回显 webhook 地址（含推送 key，属敏感信息），只回标签
        output_json(0, "ok", {
            "errcode": data.get("errcode"),
            "errmsg": data.get("errmsg"),
            "msgtype": msgtype,
            "target": target_label,
            "sender": sender,
        })
    except SystemExit:
        raise
    except Exception as e:
        traceback.print_exc(file=sys.stderr)
        output_json(-1, f"[{method_name}] 推送失败: {e}")


if __name__ == "__main__":
    main()
