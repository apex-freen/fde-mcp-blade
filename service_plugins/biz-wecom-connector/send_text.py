#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
send_text.py —— 自建应用发纯文本消息给成员（wecom.app.send_text）
================================================================
以自建应用身份（access_token）给企业微信"成员"发应用纯文本消息。
成员标识是企业微信 userid（不是 openid），也可以传 config.recipients 中预配的收件人名字。

署名规则（wecom_utils.normalize_sender）：sender 只接受可读名；留空用 config.default_sender；
命中 allowed_senders 白名单才放行。企业微信没有飞书 ou_ 那种 id，故无 id 反查逻辑。

stdin/stdout 协议：
  输入(stdin): {"target":"zhangsan","text":"下午三点开会","sender":"张三"}
  输出(stdout): {"code":0,"msg":"ok","data":{"msgid":"xxx","target":"zhangsan","sender":"张三"}}
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
    method_name = sys.argv[1] if len(sys.argv) > 1 else "wecom.app.send_text"
    params = read_params()

    try:
        cfg = get_config()
        check_app_credentials(cfg)
        userid = resolve_user_target(cfg, params)

        text = str(params.get("text", "")).strip()
        if not text:
            output_json(-1, "缺少必填参数: text（消息内容）")

        sender = normalize_sender(cfg, params)
        # 署名已归一化为可读名，追加到文本末尾形成审计线索（不改动原文）
        content = sign_content(text, sender)

        # 【影子演练】已上移宿主：由宿主的影子闸门统一拦截（不再在插件内实现）

        data = send_app_message(cfg, userid, "text", content)

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
