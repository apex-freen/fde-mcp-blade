#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
list_events.py —— 查询日历日程列表（feishu.calendar.list_events）
================================================================
查询指定日历的日程。可用 start_ms/end_ms 限定时间窗口（毫秒时间戳），
缺省返回"最近 7 天"。

目标日历：参数 calendar_id → config.calendar_id（日历 id 或日历名称）→ 应用主日历
（应用身份可读，不依赖员工私人日历 OAuth 授权）。

stdin/stdout 协议：
  输入(stdin): {"calendar_id":"feishu_cn_xxx","start_ms":...}
  输出(stdout): {"code":0,"msg":"ok","data":{"items":[...],"has_more":false}}
"""
import sys
import time
import traceback

from lark_oapi.api.calendar.v4 import ListCalendarEventRequestBuilder

from feishu_utils import (
    clean,
    check_app_credentials,
    ensure_ok,
    get_client,
    get_config,
    output_json,
    read_params,
    resolve_calendar_id,
)


def _slim_event(ev: dict) -> dict:
    """只保留日程常用字段，便于阅读；起止时间的 timestamp 由"秒"换算为"毫秒"（与本插件对外口径一致）"""
    keys = ["event_id", "summary", "description", "status", "visibility", "app_link"]
    slim = {k: ev.get(k) for k in keys if ev.get(k) is not None}
    for key in ("start_time", "end_time"):
        t = ev.get(key)
        if isinstance(t, dict):
            t = dict(t)
            if str(t.get("timestamp", "")).isdigit():
                t["timestamp"] = int(t["timestamp"]) * 1000
            slim[key] = t
    return slim


def main():
    method_name = sys.argv[1] if len(sys.argv) > 1 else "feishu.calendar.list_events"
    params = read_params()

    try:
        cfg = get_config()
        check_app_credentials(cfg)

        now_ms = int(time.time() * 1000)
        start_ms = int(params.get("start_ms", 0)) or now_ms
        end_ms = int(params.get("end_ms", 0)) or (now_ms + 7 * 24 * 3600 * 1000)
        try:
            page_size = int(params.get("page_size", 50))
        except (TypeError, ValueError):
            page_size = 50
        if not 1 <= page_size <= 100:
            output_json(-1, "page_size 取值范围 1~100")

        client = get_client(cfg)
        # 目标日历：参数 calendar_id → config.calendar_id（id 或名称）→ 应用主日历
        calendar_id = resolve_calendar_id(cfg, params, client)

        # 飞书时间区间参数是"秒级"时间戳；本插件对外统一用毫秒，故此处换算
        req = ListCalendarEventRequestBuilder() \
            .calendar_id(calendar_id) \
            .start_time(str(start_ms // 1000)) \
            .end_time(str(end_ms // 1000)) \
            .page_size(page_size) \
            .build()

        data = ensure_ok(client.calendar.v4.calendar_event.list(req), "查询日程")

        items = clean(getattr(data, "items", None)) or []
        slim_items = [_slim_event(e) for e in items if isinstance(e, dict)]

        output_json(0, "ok", {
            "calendar_id": calendar_id,
            "start_ms": start_ms,
            "end_ms": end_ms,
            "count": len(slim_items),
            "items": slim_items,
            "has_more": bool(getattr(data, "has_more", False)),
        })
    except SystemExit:
        raise
    except Exception as e:
        traceback.print_exc(file=sys.stderr)
        output_json(-1, f"[{method_name}] 查询失败: {e}")


if __name__ == "__main__":
    main()
