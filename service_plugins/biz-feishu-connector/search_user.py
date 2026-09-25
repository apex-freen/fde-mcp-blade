#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
search_user.py —— 按手机号/邮箱反查用户（feishu.contact.search_user）
====================================================================
飞书不支持按姓名直接检索用户；本方法用 手机号(mobiles) 或 邮箱(emails) 反查，
返回应用视角的用户 id（user_id_type 固定取 open_id）。

stdin/stdout 协议：
  输入(stdin): {"mobiles":"13800000000,13900000000"}  或  {"emails":"a@x.com"}
  输出(stdout): {"code":0,"msg":"ok","data":{"count":N,"user_list":[...]}}
"""
import sys
import traceback

from lark_oapi.api.contact.v3 import BatchGetIdUserRequestBuilder, BatchGetIdUserRequestBodyBuilder

from feishu_utils import (
    clean,
    check_app_credentials,
    ensure_ok,
    get_client,
    get_config,
    output_json,
    read_params,
)


def _split(value: str):
    return [s.strip() for s in str(value or "").split(",") if s.strip()]


def main():
    method_name = sys.argv[1] if len(sys.argv) > 1 else "feishu.contact.search_user"
    params = read_params()

    try:
        cfg = get_config()
        check_app_credentials(cfg)

        mobiles = _split(params.get("mobiles", ""))
        emails = _split(params.get("emails", ""))
        if not mobiles and not emails:
            output_json(-1, "缺少查询条件: 请提供 mobiles（手机号，逗号分隔）或 emails（邮箱，逗号分隔）")
        if len(mobiles) > 50 or len(emails) > 50:
            output_json(-1, "单次最多查询 50 个")

        body_builder = BatchGetIdUserRequestBodyBuilder()
        if mobiles:
            body_builder.mobiles(mobiles)
        else:
            body_builder.emails(emails)

        # user_id_type=open_id：返回的应用内用户 id 即为 open_id，可直接用于发消息
        req = BatchGetIdUserRequestBuilder() \
            .user_id_type("open_id") \
            .request_body(body_builder.build()) \
            .build()

        client = get_client(cfg)
        data = ensure_ok(client.contact.v3.user.batch_get_id(req), "反查用户")

        user_list = clean(getattr(data, "user_list", None)) or []
        output_json(0, "ok", {
            "query": {"mobiles": mobiles, "emails": emails},
            "count": len(user_list),
            "user_list": user_list,
        })
    except SystemExit:
        raise
    except Exception as e:
        traceback.print_exc(file=sys.stderr)
        output_json(-1, f"[{method_name}] 查询失败: {e}")


if __name__ == "__main__":
    main()
