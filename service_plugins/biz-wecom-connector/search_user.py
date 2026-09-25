#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
search_user.py —— 按手机号反查成员 userid（wecom.contact.search_user）
====================================================================
企业微信的 user/getuserid 接口一次只支持一个手机号，因此本方法对逗号分隔的
mobiles 逐号查询并汇总。每个号码独立报告：查到的进 user_list，查不到的进 not_found
（含 errcode/errmsg，便于区分"号码不存在/未激活"与其它原因）。
手机号反查通常用于把"手机号"换算成应用消息可用的 userid。

stdin/stdout 协议：
  输入(stdin): {"mobiles":"13800000000,13900000000"}
  输出(stdout): {"code":0,"msg":"ok","data":{"query":{"mobiles":[...]},"count":1,
                 "user_list":[{"mobile":"138...","userid":"zhangsan"}],
                 "not_found":[{"mobile":"139...","errcode":60111,"errmsg":"..."}]}}
"""
import sys
import traceback

from wecom_utils import (
    check_app_credentials,
    get_config,
    output_json,
    read_params,
    search_user_by_mobile,
)


def _split(value: str):
    return [s.strip() for s in str(value or "").split(",") if s.strip()]


def main():
    method_name = sys.argv[1] if len(sys.argv) > 1 else "wecom.contact.search_user"
    params = read_params()

    try:
        cfg = get_config()
        check_app_credentials(cfg)

        mobiles = _split(params.get("mobiles", ""))
        if not mobiles:
            output_json(-1, "缺少查询条件: 请提供 mobiles（手机号，多个用英文逗号分隔）")
        if len(mobiles) > 50:
            output_json(-1, "单次最多查询 50 个手机号")

        user_list, not_found = [], []
        for mobile in mobiles:
            errcode, errmsg, userid = search_user_by_mobile(cfg, mobile)
            if errcode in (None, 0) and userid:
                user_list.append({"mobile": mobile, "userid": userid})
            else:
                not_found.append({
                    "mobile": mobile,
                    "errcode": errcode,
                    "errmsg": errmsg or "未查询到该手机号对应的成员 userid",
                })

        output_json(0, "ok", {
            "query": {"mobiles": mobiles},
            "count": len(user_list),
            "user_list": user_list,
            "not_found": not_found,
        })
    except SystemExit:
        raise
    except Exception as e:
        traceback.print_exc(file=sys.stderr)
        output_json(-1, f"[{method_name}] 查询失败: {e}")


if __name__ == "__main__":
    main()
