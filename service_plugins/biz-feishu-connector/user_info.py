#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
user_info.py —— 按 open_id 查用户详情（feishu.contact.user_info）
================================================================
stdin/stdout 协议：
  输入(stdin): {"open_id":"ou_xxx"}
  输出(stdout): {"code":0,"msg":"ok","data":{"user":{...}}}
"""
import sys
import traceback

from lark_oapi.api.contact.v3 import GetUserRequestBuilder

from feishu_utils import (
    clean,
    check_app_credentials,
    ensure_ok,
    get_client,
    get_config,
    output_json,
    read_params,
)


def main():
    method_name = sys.argv[1] if len(sys.argv) > 1 else "feishu.contact.user_info"
    params = read_params()

    try:
        cfg = get_config()
        check_app_credentials(cfg)

        open_id = str(params.get("open_id", "")).strip()
        if not open_id:
            output_json(-1, "缺少必填参数: open_id（ou_ 开头，可从 feishu.contact.search_user 获取）")
        if not open_id.startswith("ou_"):
            output_json(-1, f"open_id 格式疑似不正确: [{open_id}]，应以 ou_ 开头")

        req = GetUserRequestBuilder() \
            .user_id_type("open_id") \
            .user_id(open_id) \
            .build()

        client = get_client(cfg)
        data = ensure_ok(client.contact.v3.user.get(req), "查询用户详情")

        output_json(0, "ok", {
            "open_id": open_id,
            "user": clean(getattr(data, "user", None)),
        })
    except SystemExit:
        raise
    except Exception as e:
        traceback.print_exc(file=sys.stderr)
        output_json(-1, f"[{method_name}] 查询失败: {e}")


if __name__ == "__main__":
    main()
