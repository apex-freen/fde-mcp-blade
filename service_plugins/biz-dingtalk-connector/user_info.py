#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
user_info.py —— 按 userId 查成员详情（dingtalk.contact.user_info）
================================================================
调用 topapi/v2/user/get 查询单个成员的姓名/手机号/邮箱/部门/职位等，
用于发工作通知（dingtalk.app.*）前确认收件人。

stdin/stdout 协议：
  输入(stdin): {"userid":"zhangsan"}
  输出(stdout): {"code":0,"msg":"ok","data":{"userid":"zhangsan","user":{"name":...,"mobile":...,"dept_id_list":[...]}}}
"""
import sys
import traceback

from dingtalk_utils import (
    check_app_credentials,
    clean,
    get_config,
    get_user_detail,
    output_json,
    read_params,
)


def main():
    method_name = sys.argv[1] if len(sys.argv) > 1 else "dingtalk.contact.user_info"
    params = read_params()

    try:
        cfg = get_config()
        check_app_credentials(cfg)

        userid = str(params.get("userid", "")).strip()
        if not userid:
            output_json(-1, "缺少必填参数: userid（钉钉 userId，可从 dingtalk.contact.search_user 获取）")

        result = clean(get_user_detail(cfg, userid))
        output_json(0, "ok", {"userid": userid, "user": result})
    except SystemExit:
        raise
    except Exception as e:
        traceback.print_exc(file=sys.stderr)
        output_json(-1, f"[{method_name}] 查询失败: {e}")


if __name__ == "__main__":
    main()
