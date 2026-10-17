---
name: feishu-calendar-event
description: 飞书日历日程操作指南：前置条件核对、查可用日历、按毫秒时间戳建日程、按时间段查日程。日历能力对"应用可写/订阅的日历"（含应用主日历）生效，个人日历通常需用户授权。
  Use when 用户要求「在飞书日历建日程/安排会议/查某日历有什么日程」时取用本技能。
metadata:
  version: "1.0.0"
  author: biz-feishu-connector
allowed-tools: feishu.calendar.list_calendars feishu.calendar.create_event feishu.calendar.list_events
---

# 飞书日历日程操作指南（企业飞书连接服务）

> **调用方式（必读）**：本插件的方法统一通过 `local_service_call` 调用，参数里**必须带** `service_name: "biz-feishu-connector"`（即本技能的 `author`，也就是插件名）与 `method_name`（如 `feishu.calendar.create_event`），再加上各方法自己的参数（见下文）。缺 `service_name` 会被宿主直接拒绝。

## 0. 前提条件（先核对）

1. `config.app_id` 已配置，且 `config.app_secret` 已录入插件密钥箱（同消息技能）；
2. 飞书应用已申请并发布日历相关权限（如 `calendar:calendar`）；
3. **目标日历不用手工瞎填**：不传 `calendar_id`（且 `config.calendar_id` 为空）时会自动使用**应用主日历**；也可以传日历 id，或直接传**日历名称**（按可见日历精确匹配、唯一命中才用）。不确定有哪些日历就先调 `feishu.calendar.list_calendars`。

> 能力边界（如实告知，不要反复重试）：本插件以**租户身份**（机器人）操作日历，只对**应用可写/已订阅的日历**（含应用主日历）生效；普通员工的私人日历通常需要该用户在飞书里 OAuth 授权（超出本插件一期能力）。遇到权限类错误就把这条边界说明给用户，并建议改走"给管理员留言申请/用群日历"等替代路径。
> 建在**应用主日历**上的日程，员工默认在自己的飞书日历里看不到——需要把该日历共享/订阅给成员，或把成员加为日程参与人，也可以直接把返回的 `app_link` 发给用户点开查看。

## 1. 查可用日历 feishu.calendar.list_calendars

参数：`page_size` 可选（默认 50，最大 100）、`page_token` 可选（翻页）。

返回每个日历的 `calendar_id` / `summary`（名称）/ `type`（`primary` 即应用主日历）/ `role`。**先看清楚有哪些日历，再决定用哪个**，别凭猜写名称。

## 2. 建日程 feishu.calendar.create_event

参数：

- `summary` 必填：日程标题；
- `start_ms` / `end_ms` 必填：**毫秒时间戳**（如 2026-09-09 10:00 北京时间 = 换算成毫秒的数）。只收整数毫秒，不收"明天上午 10 点"这种自然语言；
- `description` 可选：日程说明；
- `calendar_id` 可选：日历 id 或日历名称；缺省取 `config.calendar_id`；两者都无则用应用主日历。

换算口诀：自然语言时间 → 让模型先换算成 UTC/本地毫秒时间戳再传，避免传错导致日程落在错误时间。

## 3. 查日程 feishu.calendar.list_events

参数：

- `calendar_id` 可选（id 或名称），缺省取 `config.calendar_id`，两者都无则用应用主日历；
- `start_ms` / `end_ms` 可选（毫秒时间戳），缺省返回**最近 7 天**；
- `page_size` 可选（默认 50，最大 100）。

返回每条日程含 `event_id`（删除/改期二期能力用）、`summary`、起止时间（`start_time.timestamp` / `end_time.timestamp`，**毫秒**，`status=cancelled` 表示已取消）、`app_link`（可发给用户点开看详情）。

## 示例

- 「看看能往哪个日历写日程」→ `feishu.calendar.list_calendars {}`
- 「下周一 10:00-10:30 建个周会」→ 先取系统当前毫秒时间戳推算下周一 → `feishu.calendar.create_event {summary:"周会", start_ms:..., end_ms:...}`（不传 calendar_id 即写进应用主日历）
- 「查一下这周的安排」→ `feishu.calendar.list_events {}`（不传时间即近 7 天）
