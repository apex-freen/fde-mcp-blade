#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
send_markdown.py —— 自建应用发 Markdown 消息给成员（wecom.app.send_markdown）
============================================================================
以自建应用身份给企业微信"成员"发应用 Markdown 消息（msgtype=markdown）。
成员标识是企业微信 userid（不是 openid），也可以传 config.recipients 中预配的收件人名字。
注意：企业微信 markdown 只支持部分语法（标题/加粗/引用/链接/字体颜色等），不支持表格/图片。

署名规则同 send_text（normalize_sender）：可读名 / 缺省 default_sender / allowed_senders 白名单。

stdin/stdout 协议：
  输入(stdin): {"target":"zhangsan","text":"**磁盘告警** /data 使用率 92%","sender":"运维"}
  输出(stdout): {"code":0,"msg":"ok","data":{"msgid":"xxx","target":"zhangsan","sender":"运维"}}
"""
import sys
import traceback

from wecom_utils import (
    check_app_credentials,
    get_config,
    normalize_sender,
    output_json,
    read_params,
    resolve_user_target,
    send_app_message,
    sign_content,
)



def main():
    method_name = sys.argv[1] if len(sys.argv) > 1 else "wecom.app.send_markdown"
    params = read_params()

    try:
        cfg = get_config()
        check_app_credentials(cfg)
        userid = resolve_user_target(cfg, params)

        text = str(params.get("text", "")).strip()
        if not text:
            output_json(-1, "缺少必填参数: text（消息内容，支持企业微信 Markdown 子集语法）")

        sender = normalize_sender(cfg, params)
        content = sign_content(text, sender)

        # 【影子演练】已上移宿主：由宿主的影子闸门统一拦截（不再在插件内实现）

        data = send_app_message(cfg, userid, "markdown", content)

        output_json(0, "ok", {
            "msgid": data.get("msgid"),
            "target": userid,
            "sender": sender,
        })
    except SystemExit:
        raise
    except Exception as e:
        traceback.print_exc(file=sys.stderr)
        output_json(-1, f"[{method_name}] 发送失败: {e}")


if __name__ == "__main__":
    main()
