#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
create_event.py —— 创建日历日程（feishu.calendar.create_event）
================================================================
在指定日历上创建日程。start_ms/end_ms 为毫秒时间戳。

注意：以租户身份(tenant_access_token)建日程，日历须为应用可写的日历
（如 config.calendar_id 指向的订阅日历）；企业成员的私人日历通常需要
该用户 OAuth 授权（user_access_token），超出本插件一期范围——若遇权限
类错误，错误信息会明确返回。

stdin/stdout 协议：
  输入(stdin): {"summary":"周会","start_ms":...,"end_ms":...,"description":"..."}
  输出(stdout): {"code":0,"msg":"ok","data":{"event_id":"evt_xxx",...}}
"""
import sys
import traceback

from lark_oapi.api.calendar.v4 import CreateCalendarEventRequestBuilder, CalendarEventBuilder, EventTimeBuilder

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
    method_name = sys.argv[1] if len(sys.argv) > 1 else "feishu.calendar.create_event"
    params = read_params()

    try:
        cfg = get_config()
        check_app_credentials(cfg)

        calendar_id = str(params.get("calendar_id", "")).strip() or str(cfg.get("calendar_id", "")).strip()
        if not calendar_id:
            output_json(-1, "缺少 calendar_id: 请传 calendar_id 参数，或在 plugin.json 的 config.calendar_id 中预配")

        summary = str(params.get("summary", "")).strip()
        if not summary:
            output_json(-1, "缺少必填参数: summary（日程标题）")
        try:
            start_ms = int(params.get("start_ms", 0))
            end_ms = int(params.get("end_ms", 0))
        except (TypeError, ValueError):
            output_json(-1, "start_ms/end_ms 须为毫秒时间戳（整数）")
        if start_ms <= 0 or end_ms <= start_ms:
            output_json(-1, "参数错误: 需要 end_ms > start_ms > 0（毫秒时间戳）")

        description = str(params.get("description", "")).strip()

        # 【影子演练】已上移宿主：由宿主的影子闸门统一拦截（不再在插件内实现）

        ev = CalendarEventBuilder() \
            .summary(summary) \
            .description(description or None) \
            .start_time(EventTimeBuilder().time_stamp(str(start_ms)).build()) \
            .end_time(EventTimeBuilder().time_stamp(str(end_ms)).build()) \
            .build()

        req = CreateCalendarEventRequestBuilder() \
            .calendar_id(calendar_id) \
            .user_id_type("open_id") \
            .request_body(ev) \
            .build()

        client = get_client(cfg)
        data = ensure_ok(client.calendar.v4.calendar_event.create(req), "创建日程")

        evt = clean(getattr(data, "event", None)) or {}
        output_json(0, "ok", {
            "calendar_id": calendar_id,
            "event_id": evt.get("event_id"),
            "summary": summary,
            "start_ms": start_ms,
            "end_ms": end_ms,
            "app_link": evt.get("app_link"),
        })
    except SystemExit:
        raise
    except Exception as e:
        traceback.print_exc(file=sys.stderr)
        output_json(-1, f"[{method_name}] 创建失败: {e}")


if __name__ == "__main__":
    main()
