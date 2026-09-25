#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
chat_ask.py —— 应用对话问答（dify.chat.ask）
============================================
调用 Dify 已发布应用的对话消息 API（response_mode=blocking）完成一次问答。
使用应用 API Key（config.app_api_key，可被调用参数 api_key 覆盖）。
返回 answer 与 conversation_id，多轮对话可回传 conversation_id 延续会话。

stdin/stdout 协议：
  输入(stdin): {"query":"公司报销流程是什么","conversation_id":""}
  输出(stdout): {"code":0,"msg":"ok","data":{"answer":"...","conversation_id":"...",...}}
"""
import sys
import traceback

from dify_utils import (
    api_request,
    auth_headers,
    clean,
    get_config,
    output_json,
    read_params,
    require_base_url,
    resolve_api_key,
)



def main():
    method_name = sys.argv[1] if len(sys.argv) > 1 else "dify.chat.ask"
    params = read_params()

    try:
        query = str(params.get("query", "")).strip()
        if not query:
            output_json(-1, "缺少必填参数: query（用户问题）")
        conversation_id = str(params.get("conversation_id", "")).strip()

        cfg = get_config()
        base_url = require_base_url(cfg)
        # chat_ask 走「应用」API Key（app_api_key），参数 api_key 可覆盖
        api_key = resolve_api_key(cfg, params, use="app")

        url = base_url + "/chat-messages"

        # 【影子演练】已上移宿主：由宿主的影子闸门统一拦截（不再在插件内实现）

        body = api_request(
            "POST", url,
            headers=auth_headers(api_key),
            json_body={
                "inputs": {},
                "query": query,
                "response_mode": "blocking",
                "conversation_id": conversation_id,
                "user": "gis-agent",
            },
            action_desc="应用对话问答",
        )

        output_json(0, "ok", clean({
            "answer": body.get("answer"),
            "conversation_id": body.get("conversation_id"),
            "message_id": body.get("message_id"),
            "mode": body.get("mode"),
            "created_at": body.get("created_at"),
        }))
    except SystemExit:
        raise
    except Exception as e:
        traceback.print_exc(file=sys.stderr)
        output_json(-1, f"[{method_name}] 对话问答失败: {e}")


if __name__ == "__main__":
    main()
