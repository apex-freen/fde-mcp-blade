#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
search_user.py —— 按手机号反查 userId（dingtalk.contact.search_user）
====================================================================
逐个调用 topapi/v2/user/getbymobile 把手机号换成钉钉 userId（个人标识，可用于 dingtalk.app.* 发工作通知）。
钉钉不支持按姓名/邮箱反查；未匹配到的手机号记入 not_found，单号调用失败记入 errors，不中断其余号码。

stdin/stdout 协议：
  输入(stdin): {"mobiles":"13800000000,13900000000"}
  输出(stdout): {"code":0,"msg":"ok","data":{"count":N,"user_list":[...],"not_found":[...]}}
"""
import sys
import traceback

from dingtalk_utils import (
    DingTalkApiError,
    check_app_credentials,
    get_config,
    output_json,
    read_params,
    search_user_by_mobile,
)


def _split(value: str):
    return [s.strip() for s in str(value or "").split(",") if s.strip()]


def main():
    method_name = sys.argv[1] if len(sys.argv) > 1 else "dingtalk.contact.search_user"
    params = read_params()

    try:
        cfg = get_config()
        check_app_credentials(cfg)

        mobiles = _split(params.get("mobiles", ""))
        if not mobiles:
            output_json(-1, "缺少必填参数: mobiles（手机号，多个用英文逗号分隔）")
        if len(mobiles) > 20:
            output_json(-1, "单次最多查询 20 个手机号")

        user_list, not_found, errors = [], [], []
        for mobile in mobiles:
            try:
                found = search_user_by_mobile(cfg, mobile)
            except DingTalkApiError as e:
                errors.append({"mobile": mobile, "error": str(e)})
                continue
            if found["userid"]:
                user_list.append(found)
            else:
                not_found.append(mobile)

        data = {
            "query": {"mobiles": mobiles},
            "count": len(user_list),
            "user_list": user_list,
        }
        if not_found:
            data["not_found"] = not_found
        if errors:
            data["errors"] = errors
        output_json(0, "ok", data)
    except SystemExit:
        raise
    except Exception as e:
        traceback.print_exc(file=sys.stderr)
        output_json(-1, f"[{method_name}] 查询失败: {e}")


if __name__ == "__main__":
    main()
