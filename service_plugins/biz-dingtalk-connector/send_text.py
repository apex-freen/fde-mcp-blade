#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
send_text.py —— 发工作通知纯文本消息（dingtalk.app.send_text）
============================================================
以企业自建应用身份（access_token + agent_id）给指定成员发纯文本工作通知。

署名规则（dingtalk_utils.normalize_sender）：
  - sender 只接受可读名；留空用 config.default_sender；
  - 命中 allowed_senders 白名单才放行；钉钉个人标识是 userId（非 open_id），不做 ID 反查。

stdin/stdout 协议：
  输入(stdin): {"target":"zhangsan","text":"下午三点开会","sender":"张三"}
  输出(stdout): {"code":0,"msg":"ok","data":{"task_id":123,"userid_list":"zhangsan","sender":"张三"}}
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
    method_name = sys.argv[1] if len(sys.argv) > 1 else "dingtalk.app.send_text"
    params = read_params()

    try:
        cfg = get_config()
        check_app_credentials(cfg)

        userid_list = resolve_user_target(cfg, params)

        text = str(params.get("text", "")).strip()
        if not text:
            output_json(-1, "缺少必填参数: text（消息内容）")

        sender = normalize_sender(cfg, params)
        # 发起人署名（已归一化为可读名）追加到文本末尾，形成审计线索（不改动原文）
        payload_text = text if not sender else f"{text}\n—— 发起人：{sender}"
        msg = {"msgtype": "text", "text": {"content": payload_text}}

        # 【影子演练】已上移宿主：由宿主的影子闸门统一拦截（不再在插件内实现）

        resp = send_work_notice(cfg, userid_list, msg, action_desc="发送工作通知(文本)")

        output_json(0, "ok", {
            "task_id": resp.get("task_id"),
            "userid_list": userid_list,
            "sender": sender,
        })
    except SystemExit:
        raise
    except Exception as e:
        traceback.print_exc(file=sys.stderr)
        output_json(-1, f"[{method_name}] 发送失败: {e}")


if __name__ == "__main__":
    main()
