#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
send_markdown.py —— 发工作通知 Markdown 消息（dingtalk.app.send_markdown）
=======================================================================
以企业自建应用身份（access_token + agent_id）给指定成员发 Markdown 富文本工作通知。
钉钉 markdown 消息必带 title 字段（缺省『企业通知』）。

署名规则同 send_text（dingtalk_utils.normalize_sender）：只接受可读名，白名单校验。

stdin/stdout 协议：
  输入(stdin): {"target":"zhangsan","title":"存储告警","text":"**/data** 使用率 92%","sender":"运维"}
  输出(stdout): {"code":0,"msg":"ok","data":{"task_id":123,"userid_list":"zhangsan","title":"存储告警","sender":"运维"}}
"""
import sys
import traceback

from dingtalk_utils import (
    check_app_credentials,
    get_config,
    normalize_sender,
    output_json,
    read_params,
    resolve_user_target,
    send_work_notice,
)



def main():
    method_name = sys.argv[1] if len(sys.argv) > 1 else "dingtalk.app.send_markdown"
    params = read_params()

    try:
        cfg = get_config()
        check_app_credentials(cfg)

        userid_list = resolve_user_target(cfg, params)

        text = str(params.get("text", "")).strip()
        if not text:
            output_json(-1, "缺少必填参数: text（消息正文，支持 Markdown）")
        title = str(params.get("title", "")).strip() or "企业通知"

        sender = normalize_sender(cfg, params)
        # 发起人署名（已归一化为可读名）追加到 Markdown 底部，形成审计线索（不改动原文）
        payload_text = text if not sender else f"{text}\n\n---\n发起人：{sender}"
        msg = {"msgtype": "markdown", "markdown": {"title": title, "text": payload_text}}

        # 【影子演练】已上移宿主：由宿主的影子闸门统一拦截（不再在插件内实现）

        resp = send_work_notice(cfg, userid_list, msg, action_desc="发送工作通知(Markdown)")

        output_json(0, "ok", {
            "task_id": resp.get("task_id"),
            "userid_list": userid_list,
            "title": title,
            "sender": sender,
        })
    except SystemExit:
        raise
    except Exception as e:
        traceback.print_exc(file=sys.stderr)
        output_json(-1, f"[{method_name}] 发送失败: {e}")


if __name__ == "__main__":
    main()
