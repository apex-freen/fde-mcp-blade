#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
list_calendars.py —— 查询日历列表（feishu.calendar.list_calendars）
====================================================================
列出当前应用身份（tenant_access_token）可见的日历，用于确定建/查日程要用哪个日历：
type=primary 即应用主日历，shared 为应用创建/订阅的共享日历。

建/查日程未传 calendar_id（且 config.calendar_id 为空）时，会自动回退到应用主日历。

stdin/stdout 协议：
  输入(stdin): {"page_size":50,"page_token":""}
  输出(stdout): {"code":0,"msg":"ok","data":{"items":[...],"has_more":false}}
"""
import sys
import traceback

from feishu_utils import (
    check_app_credentials,
    fetch_calendars,
    get_client,
    get_config,
    output_json,
    read_params,
)


def main():
    method_name = sys.argv[1] if len(sys.argv) > 1 else "feishu.calendar.list_calendars"
    params = read_params()

    try:
        cfg = get_config()
        check_app_credentials(cfg)

        try:
            page_size = int(params.get("page_size", 50))
        except (TypeError, ValueError):
            page_size = 50
        if not 1 <= page_size <= 100:
            output_json(-1, "page_size 取值范围 1~100")
        page_token = str(params.get("page_token", "") or "").strip()

        items, has_more, next_token = fetch_calendars(get_client(cfg), page_size, page_token)

        output_json(0, "ok", {
            "count": len(items),
            "items": items,
            "has_more": has_more,
            "page_token": next_token or None,
        })
    except SystemExit:
        raise
    except Exception as e:
        traceback.print_exc(file=sys.stderr)
        output_json(-1, f"[{method_name}] 查询日历列表失败: {e}")


if __name__ == "__main__":
    main()
