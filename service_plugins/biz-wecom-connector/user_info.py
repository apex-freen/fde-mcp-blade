#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
user_info.py —— 按 userid 查成员详情（wecom.contact.user_info）
=============================================================
返回姓名 name、部门 department（部门 id 数组）、手机号 mobile、邮箱 email、
职位 position 等（mobile 字段在无通讯录授权时可能脱敏展示）。用于发消息前确认收件人。

stdin/stdout 协议：
  输入(stdin): {"userid":"zhangsan"}
  输出(stdout): {"code":0,"msg":"ok","data":{"userid":"zhangsan","user":{...}}}
"""
import sys
import traceback

from wecom_utils import (
    check_app_credentials,
    get_config,
    get_user_detail,
    output_json,
    read_params,
)


def main():
    method_name = sys.argv[1] if len(sys.argv) > 1 else "wecom.contact.user_info"
    params = read_params()

    try:
        cfg = get_config()
        check_app_credentials(cfg)

        userid = str(params.get("userid", "")).strip()
        if not userid:
            output_json(-1, "缺少必填参数: userid（企业微信成员 userid，可从 wecom.contact.search_user 反查获取）")

        data = get_user_detail(cfg, userid)

        # 去掉 errcode/errmsg 及空字段，只保留有意义的成员信息
        user = {k: v for k, v in data.items()
                if k not in ("errcode", "errmsg") and v is not None}
        output_json(0, "ok", {"userid": userid, "user": user})
    except SystemExit:
        raise
    except Exception as e:
        traceback.print_exc(file=sys.stderr)
        output_json(-1, f"[{method_name}] 查询失败: {e}")


if __name__ == "__main__":
    main()
