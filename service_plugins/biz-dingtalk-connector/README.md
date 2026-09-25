<!--
  ┌──────────────────────────────────────────────────────┐
  │  apex-mcp-bridge Plugin README Template (English)    │
  │  biz-dingtalk-connector — user-facing config guide   │
  └──────────────────────────────────────────────────────┘
-->
<p align="center">
  <img src="https://img.shields.io/badge/plugin-biz--dingtalk--connector-3370ff?style=flat-square" alt="plugin">
  <img src="https://img.shields.io/badge/api%20version-plugin.gis%2Fv1-6c5ce7?style=flat-square" alt="API Version">
  <img src="https://img.shields.io/badge/version-0.1.0-blue?style=flat-square" alt="Version">
  <img src="https://img.shields.io/badge/python-3-3776AB?logo=python&style=flat-square" alt="Python">
  <img src="https://img.shields.io/badge/server-oapi.dingtalk.com-orange?style=flat-square" alt="Server">
</p>

# DingTalk Connector (biz-dingtalk-connector)

A connectivity plugin for the DingTalk Open Platform (`oapi.dingtalk.com`): deliver messages to **individuals** (as app *work notifications*), push to **groups** (through a group *custom bot* webhook), look up a user's `userId` by mobile number, and fetch member details by `userId`.

This document is a **user/admin-facing configuration guide**: it explains where each configuration value comes from in the DingTalk consoles, how to fill it in, and the common pitfalls. All field names, method names, and the signature algorithm below match the plugin's real `plugin.json` and source code. Nothing is promised beyond the plugin's actual capabilities.

> This plugin runs on top of apex-mcp-bridge. See the host project documentation for the overall plugin architecture and invocation model.

## Table of Contents

- [1. Capability / Method List](#1-capability--method-list)
- [2. Two Channels and DingTalk-Side Prerequisites](#2-two-channels-and-dingtalk-side-prerequisites)
- [3. ★ Configuration Guide (plugin.json config) ★](#3--configuration-guide-pluginjson-config-)
- [4. Configuration Example (sanitized)](#4-configuration-example-sanitized)
- [5. Quick Start and Connectivity Checks](#5-quick-start-and-connectivity-checks)
- [6. Official Documentation](#6-official-documentation)
- [7. FAQ](#7-faq)
- [8. Common Misconceptions](#8-common-misconceptions)
- [9. Appendix: Call Protocol and File Structure](#9-appendix-call-protocol-and-file-structure)

---

## 0. Know These Identifiers First

| Identifier | What it is | Where to see it |
|------------|------------|-----------------|
| `userId` | **Per-member** identifier inside your org (e.g. `zhangsan`). This is the recipient that *work notices / member lookup* accept | DingTalk **Admin Console** → Contacts → Member Management → click a member; or reverse-look-up it via the plugin's `dingtalk.contact.search_user` by mobile |
| `openid` / `unionid` | Identifiers of other ID systems — **not accepted** by this plugin | — |
| `AgentId` | The **numeric** identifier of your enterprise internal app; required for work notices | Developer Console → app detail page (see §3) |
| `AppKey`/`AppSecret` (newer consoles label them **Client ID / Client Secret**) | The app's identity credentials, used to obtain `access_token` | Developer Console → app detail → Credentials & Basic Information (see §3) |
| Bot `webhook` | The entry URL of a group custom bot; **contains an `access_token` — treat as sensitive** | Target group → Group Settings → Bots (see §3) |

---

## 1. Capability / Method List

All methods run with `mode=sync` and a default 30s timeout. Success returns `{"code":0,"msg":"ok","data":{...}}`; failure returns `{"code":-1,"msg":"<reason>","data":null}`.

| Method | Channel / underlying API | Default `risk_level` | One-line description |
|--------|--------------------------|----------------------|----------------------|
| `dingtalk.app.send_text` | Work notice to an individual (`topapi/message/corpconversation/asyncsend_v2`) | `normal` | Send a **plain-text** message to a member as the internal app (recipient = DingTalk `userId`) |
| `dingtalk.app.send_markdown` | Same (work notice) | `normal` | Send a **Markdown** message; optional `title` (default "企业通知"/Enterprise Notice) |
| `dingtalk.robot.send` | Group custom bot (`robot/send` webhook, sign-enabled) | `normal` | Push **text/markdown to a group** — the only group channel; **no** app credentials needed |
| `dingtalk.contact.search_user` | Contact API (`topapi/v2/user/getbymobile`) | `risk` | Reverse-look-up `userId` by **mobile number** (up to 20 numbers per call, comma-separated) |
| `dingtalk.contact.user_info` | Contact API (`topapi/v2/user/get`) | `risk` | Fetch member details by `userId` (name/mobile/org etc.); confirm a recipient before sending |

> **About `risk_level`**: the table shows the factory defaults. An admin may change them in the host admin panel — e.g. `disable` to turn a method off, `auth` to require human approval, or downgrade `risk` to `normal`. The two `risk` methods query contact/private data and are flagged in audit logs.

What the plugin does **not** do (set expectations accordingly): it does not receive/listen to message callbacks (outbound only); it has no OAuth "send on behalf of a user" model; DingTalk does not support reverse look-up by name or email — only mobile numbers.

---

## 2. Two Channels and DingTalk-Side Prerequisites

### 2.1 Remember the two channels

| Goal | Channel | Config needed | Who receives it |
|------|---------|---------------|-----------------|
| Send to an **individual** | Work notice (`dingtalk.app.*`) | `app_key` + `app_secret` + `agent_id` | The person sees an app **work notification** in DingTalk |
| Send to a **group** | Group custom bot webhook (`dingtalk.robot.send`) | `robot_webhook` (+ `robot_sign` if the bot uses signing) | The group sees a message from the **bot** |

- **Work notices cannot send to a group**, and **a bot webhook cannot send to an individual** (a webhook is not tied to a `userId`). Mixing them up produces a clear error telling you to switch channels.
- `dingtalk.contact.*` (contact look-up) only needs `app_key`/`app_secret` — not `agent_id`.

### 2.2 Three DingTalk-side tasks (needs an org admin / developer)

1. **Create an enterprise internal app**: DingTalk Developer Console (开发者后台) → App Development (应用开发) → DingTalk Apps (钉钉应用) → Create "企业内部应用" (internal app).
2. **Request permissions + publish a version**:
   - In the app detail page → **Permission Management (权限管理)**, request the relevant permissions: messaging permission for work notices; contact-read permission for mobile→userId look-up and member details (mobile look-up is a *sensitive* permission and may need an enterprise-admin review).
   - In the app detail page → **Version Management & Release (版本管理与发布)**, publish a version; after the admin review the permissions take effect. **The work-notice / contact APIs only work once the app is published.**
   - Target members must be inside the app's **visible scope (可见范围)** — otherwise they can't be found or notified.
3. **Add a custom bot to the target group**: this is done in the **DingTalk client** by an org member (an org admin console cannot add a group bot): open the target group → Group Settings (群设置) → Bots (机器人) → Add Bot (添加机器人) → choose **Custom** (自定义, Webhook integration) → configure at least one security setting (custom keyword / signature / IP whitelist) → **copy the full Webhook URL** (it contains `access_token=...`). A bot can only message a group it has been added to.

---

## 3. Configuration Guide (plugin.json config)

All configuration lives in the `config` section of the plugin's `plugin.json` (normally filled in by an admin through the host admin panel's plugin-config page, which is equivalent to editing `plugin.json`). The plugin **re-reads plugin.json on every call — changes take effect immediately, no restart needed**; "my change didn't apply" almost always means a wrong field name or a malformed value.

### 3.1 Configuration table

| Field | Required? | Where to get it (DingTalk consoles) | Notes |
|-------|-----------|-------------------------------------|-------|
| `app_key` | **Conditionally**: required for `dingtalk.app.*` and `dingtalk.contact.*` | **Developer Console** (open-dev.dingtalk.com) → App Development → DingTalk Apps → your "internal app" → app detail → **Credentials & Basic Information (凭证与基础信息)** → **Client ID**. Newer consoles label this *Client ID*; API params / older docs call it **AppKey** — same value. The label you actually see on screen is authoritative | App identity credential (used to fetch the token). Real values typically start with `ding` |
| `app_secret` | Same as above | Same **Credentials & Basic Information** → **Client Secret** (formerly **AppSecret**) — same value, rely on the label shown in your console | Secret paired with `app_key`; treat it like a password — do not leak or paste it into message text |
| `agent_id` | **Required for `dingtalk.app.*` (work notices) only**; not needed by the bot or contact look-up | The **`AgentId`** shown on the internal app's **detail page** in the Developer Console (a number; on some console versions it sits in the "Credentials & Basic Information" area — go by what your console actually shows). Note: **`AgentId` is a number**, distinct from AppKey/Client ID | Required by the work-notice API (`asyncsend_v2`); it is an **integer** in `plugin.json` — don't put a string or an AppKey here |
| `robot_webhook` | **Conditionally**: used by `dingtalk.robot.send` when `target` is omitted | DingTalk **client**: target group → Group Settings (群设置, "…") → Bots (机器人) → Add Bot → choose **Custom (自定义)** → after creation **copy the Webhook**, e.g. `https://oapi.dingtalk.com/robot/send?access_token=xxx` | Entry URL of the group bot. The URL **already contains an `access_token` — treat it as sensitive**: never echo it into messages/logs. The URL stops working once the bot is removed from the group |
| `robot_sign` | **Conditionally**: required when that bot's security setting is **signature (加签)** | The same bot's creation/settings page → the **SEC-prefixed string** under the "加签" (signature) security option; copy the whole string | Used for HMAC-SHA256 signing (algorithm in §5). If the bot instead uses **custom keywords**, do **not** configure a sign — make sure message text contains one of the keywords instead. If it uses an **IP whitelist**, allow the public egress IP of the host running the plugin |
| `default_sender` | No (default `企业助手`/"Enterprise Assistant") | Free text | Default **signature label** appended when the `sender` argument is omitted (added to the message as an audit trail) |
| `allowed_senders` | No (empty = unlimited) | Free text list | **Whitelist of sender signatures** (array of strings). When non-empty, the resolved `sender` (explicit or default) must match one of them or the call is rejected — prevents spoofed senders |
| `recipients` | No (empty by default) | Optional: member `userId` per §0; bot webhook same as `robot_webhook` | Optional "aliases": give frequent recipients names, then pass the `name` as `target` at call time (see 3.2) |

> Minimal config by use case:
> - Work notice to an individual: `app_key` + `app_secret` + `agent_id`
> - Mobile → userId / member details: `app_key` + `app_secret`
> - Group message via the default bot: `robot_webhook` (+ `robot_sign` if the bot is signed)
> - Address people by name: add `recipients`; restrict who may send: add `default_sender` + `allowed_senders`

### 3.2 `recipients` sub-format

An array of objects, each `{name, type, target}`:

```jsonc
{
  "name": "Zhang San",                               // the name you pass as `target` (case-sensitive)
  "type": "user",                                    // user = an individual member (`target` = userId)
  "target": "zhangsan"
}
{
  "name": "IT-Alert-Group",                          // the name you pass as `target` (case-sensitive)
  "type": "robot",                                   // robot = a group bot (`target` = full webhook URL)
  "target": "https://oapi.dingtalk.com/robot/send?access_token=xxx",
  "robot_sign": "SECxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"  // optional: that bot's own signing secret
}
```

> The fragments above are illustrative — in a real config they are two entries inside one array `recipients: [...]` (`user` and `robot` entries can be mixed, any count).

- `type` may only be `user` or `robot`; `target` must be non-empty. A missing `name`, a non-object entry (e.g. a number or a string), or a whole dict like `{"group name": {...}}` yields a precise error telling you which entry is wrong — fix the shape, no restart needed.
- `dingtalk.robot.send` resolves `target` in this order: empty → `config.robot_webhook` (+`config.robot_sign`); matches a `type=robot` name in `recipients` → that entry's own webhook/`robot_sign`; starts with `http(s)://` → used as a full webhook URL (signing secret taken from `config.robot_sign`).
- `recipients` is only an optional convenience. If you have no stable names, skip it and pass the `userId` / webhook URL directly.

---

## 4. Configuration Example (sanitized)

```jsonc
{
  "config": {
    "app_key": "dingxxxxxxxxxxxxxxxx",                 // Client ID / AppKey (starts with "ding")
    "app_secret": "REPLACE_WITH_YOUR_CLIENT_SECRET",   // keep it secret
    "agent_id": 1234567,                              // numeric AgentId (work notices)
    "robot_webhook": "https://oapi.dingtalk.com/robot/send?access_token=xxx", // placeholder; real token differs
    "robot_sign": "SECxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx", // placeholder; leave "" if the bot is not signed
    "default_sender": "IT-Ops-Assistant",
    "allowed_senders": ["IT-Ops-Assistant", "On-Call-Alerts"],
    "recipients": [
      { "name": "Zhang San", "type": "user", "target": "zhangsan" },
      { "name": "IT-Alert-Group", "type": "robot",
        "target": "https://oapi.dingtalk.com/robot/send?access_token=xxx",
        "robot_sign": "SECxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" }
    ]
  }
}
```

> ⚠️ Every webhook/sign value above is a placeholder. In production, paste the webhook you actually copied (with its real `access_token`) and the complete `SEC…` secret, and keep `plugin.json` valid JSON (no missing commas/quotes).

> **Credential recommendation — use the secret box**: `app_secret` (and `robot_webhook` / `robot_sign`) is sensitive and should not stay in plaintext in `plugin.json` long-term. Keep the placeholder `${app_secret}` in the file and store the real value in the plugin secret box (key name `app_secret`, owned by plugin `biz-dingtalk-connector`); the host resolves and injects it before the call. If it is not recorded / has been disabled, the call fails outright with "referenced secret is unavailable". See [service_plugins/README.md](../README.md#plugin-secret-box-config-placeholders) for the full convention.

---

## 5. Quick Start and Connectivity Checks

### 5.1 Validate the access_token (credentials + network first)

Request a token with `app_key`/`app_secret` (the same endpoint the `dingtalk.app.*` / `dingtalk.contact.*` methods use):

```bash
curl 'https://oapi.dingtalk.com/gettoken?appkey=dingxxxxxxxxxxxxxxxx&appsecret=<YOUR_APP_SECRET>'
```

Expected (`errcode=0` means OK):

```json
{ "errcode": 0, "errmsg": "ok", "access_token": "xxxxxxxx", "expires_in": 7200 }
```

- Non-zero returns usually mean a mistyped appkey/appsecret (beware of swapping Client ID/Secret with `AgentId`), or the app is not published yet. The token lives for 2 hours; the plugin caches it per process and refreshes it early, so no manual maintenance is needed.

### 5.2 Test-send via a group bot (validate the webhook channel)

For a bot **without** signing, POST directly:

```bash
curl -s 'https://oapi.dingtalk.com/robot/send?access_token=xxx' \
  -H 'Content-Type: application/json' \
  -d '{"msgtype":"text","text":{"content":"Connectivity test: DingTalk Connector"}}'
```

Expected: `{"errcode":0,"errmsg":"ok"}`. On errors, see §7.

### 5.3 Custom-bot "signature (加签)" flow — mandatory for signed bots

Signing appends `timestamp` and `sign` to the request. Algorithm (identical to the plugin's `dingtalk_utils.py`):

1. `string_to_sign = timestamp + "\n" + secret`, where `timestamp` is in **milliseconds**;
2. compute **HMAC-SHA256** of `string_to_sign` keyed by `secret` (the `SEC…` string);
3. **Base64**-encode the result;
4. **URL-encode** it (spaces become `+`) to get `sign`;
5. append `timestamp` and `sign` to the webhook URL and POST.

Generate with this Python snippet (matches the plugin implementation):

```python
import time, hmac, hashlib, base64, urllib.parse

secret = "SECxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"          # secret under Bot Security Settings → Signature
timestamp = str(round(time.time() * 1000))            # millisecond timestamp
string_to_sign = "{}\n{}".format(timestamp, secret)
sign = urllib.parse.quote_plus(base64.b64encode(
    hmac.new(secret.encode("utf-8"), string_to_sign.encode("utf-8"),
             digestmod=hashlib.sha256).digest()))
print("timestamp:", timestamp)
print("sign:", sign)
```

Then send:

```bash
curl -s 'https://oapi.dingtalk.com/robot/send?access_token=xxx&timestamp=<timestamp>&sign=<sign>' \
  -H 'Content-Type: application/json' \
  -d '{"msgtype":"text","text":{"content":"Connectivity test (signed)"}}'
```

Expected: `{"errcode":0,"errmsg":"ok"}`.

> The timestamp must be within 1 hour of DingTalk server time — keep the host clock in sync (NTP). The plugin signs automatically on every call; this section only lets you **verify your config/secret independently**.

### 5.4 End-to-end test-send

- Individual: `dingtalk.contact.search_user {"mobiles":"138..."}` to get the `userId` → then `dingtalk.app.send_text {"target":"<userId>","text":"hello"}`.
- Group: `dingtalk.robot.send {"target":"IT-Alert-Group","msgtype":"text","content":"hello"}` (omit `target` to use `config.robot_webhook`).

---

## 6. Official Documentation

Only real entry points are listed; doc titles/menu positions may change across DingTalk console versions — go by what the docs center actually shows:

| Purpose | Entry / doc name |
|---------|------------------|
| DingTalk Open Platform home / docs center | https://open.dingtalk.com/ |
| Developer Console (create app, credentials, permissions, release) | https://open-dev.dingtalk.com/ |
| DingTalk Admin Console (contact/member management, view `userId`) | https://oa.dingtalk.com/ |
| Basic concepts (Client ID/Secret, `AgentId`, `UserId` definitions & where to view them) | "基础概念" (Basic Concepts): https://open.dingtalk.com/document/dingstart/basic-concepts-beta |
| Obtaining the access token of an internal app | Search docs center for "获取企业内部应用的 accessToken" |
| Creating an internal app | https://open.dingtalk.com/document/development/create-an-h5-application-for-your-enterprise |
| Custom-bot security settings (signature/keywords/IP whitelist) | "自定义机器人安全设置" (Security settings for custom bots): https://open.dingtalk.com/document/robots/customize-robot-security-settings |
| Sending group messages with a custom bot (webhook API) | "自定义机器人发送群聊消息" (search the docs center) |
| Work-notice sending (the plugin's underlying `asyncsend_v2` API) | Search the docs center (e.g. "机器人发送群聊消息"/"工作通知" — older names may apply) |
| Getting a user's `userId` by mobile (the plugin's underlying `getbymobile` API) | Search the docs center for "通过手机号获取用户 userId" |
| API rate limits | "调用频次与限流" (API throttling) in the docs center |

> When the exact document path is uncertain, always fall back to the docs center at https://open.dingtalk.com/ and search by the doc name above.

---

## 7. FAQ

<details>
<summary><b>Q: The call returns a non-zero errcode (message contains errcode=…/errmsg=…)?</b></summary>

Common causes of non-zero business codes (as the plugin's own error text states): **permission not granted / version not published, wrong parameters, member outside the app's visible scope, or a mismatch in the bot's signature/keyword security settings**. Double-check the configuration, then retry — and **do not hammer the API** (you'll hit rate limits). The exact meaning of a code is up to DingTalk's global error-code documentation and the returned `errmsg`; the plugin does not translate or invent codes.
</details>

<details>
<summary><b>Q: Permission requested and config looks right, but still "no permission" / Forbidden?</b></summary>

Most likely the **version was never published** or the review is still pending: after requesting permissions for a new app you must publish a version under "Version Management & Release" (which may require an enterprise-admin review); only then do the permissions take effect. Also check that the target member is inside the app's **visible scope** (out of scope → not found / not delivered, which looks like "send succeeded but nobody received it").
</details>

<details>
<summary><b>Q: The bot is not in the group / group messages do nothing?</b></summary>

A bot can only message a group it has been added to; once removed from the group (or the group is dissolved) the old webhook stops working. Fix: re-add the bot (Custom) in the DingTalk client, copy the **new** webhook and update `config.robot_webhook` (or the matching `recipients` entry).
</details>

<details>
<summary><b>Q: Signature mismatch (errmsg contains "sign not match" / "invalid timestamp")?</b></summary>

- The `SEC…` secret was truncated or has stray spaces — copy it whole into `robot_sign`;
- Host clock drift > 1 hour makes the `timestamp` invalid — sync the clock (NTP);
- Bot security setting does not match the config: the bot actually uses **custom keywords** while you configured signing, or vice versa. A keyword bot's messages must **contain one of the configured keywords** (otherwise errmsg contains `keywords not in content`); only a signed bot needs `robot_sign`;
- If the bot uses an **IP whitelist**: allow the public egress IP of the host running this plugin.
</details>

<details>
<summary><b>Q: Rate limited (rejected after sending a lot)?</b></summary>

Each group custom bot is limited to roughly **20 messages per minute** (per DingTalk's official limits); exceeding it gets rejected — wait and retry. Work-notice, contact and token APIs also have their own app-level throttling, so avoid dense short retries. The plugin caches the token per process and refreshes early, so it won't trip the token endpoint's rate limit.
</details>

<details>
<summary><b>Q: I edited plugin.json but nothing changed?</b></summary>

The plugin **re-reads plugin.json on every call** — changes take effect immediately without a restart. If it doesn't, the JSON is malformed, a field name is misspelled, or the values were put in the wrong section (they must live under `config`). `recipients` entries are validated one by one and produce specific errors (which entry, what is missing).
</details>

<details>
<summary><b>Q: The send "succeeded" but an individual never received it?</b></summary>

Work notices are delivered asynchronously; the returned `task_id` only means DingTalk accepted the request. Typical causes: the member is outside the app's **visible scope**, the version is unpublished, or the `userId` is wrong (reverse-look-up it with `search_user` first, then confirm name/org with `user_info` before sending).
</details>

---

## 8. Common Misconceptions

1. **The personal `target` is a DingTalk `userId`** (e.g. `zhangsan`) — **not** an openid/unionid, and **not** a mobile number. Convert mobiles to `userId` first via `dingtalk.contact.search_user`.
2. **"Work notice" and "group custom-bot webhook" are two separate channels**: work notices go to individuals, bot webhooks go to groups; they are not interchangeable. Mixing them (a `user` name into `robot.send`, or a robot name into a work notice) produces a clear error telling you to switch channels.
3. **A custom-bot webhook already contains an `access_token`** — it is effectively a credential to your group. Never paste it into message text, logs, or share it casually; the plugin only echoes the bot's name/label, never the URL.
4. **`sender` is only a signature label** inside the message: it neither needs nor should contain a `userId`, and there is no "turn a userId into a name" logic. When `allowed_senders` is configured the final signature must match it, or the send is rejected.
5. **Don't promise "send as a specific user"**: the sending identity is always the app/bot; spoofing is guarded by the sender whitelist. Sending on a user's behalf is an OAuth authorization model that is out of this plugin's scope.
6. **"Permission requested" ≠ "permission effective"**: the app must have a published (reviewed) version. DingTalk-side changes take time — don't retry blindly before the version is live.
7. **DingTalk cannot reverse-look-up a `userId` by name or email** — only by mobile. A missing hit usually means the number is outside the app's visible scope or not activated (it lands in `not_found`).

---

## 9. Appendix: Call Protocol and File Structure

Methods are invoked through the host (MCP `local_service_call`): each method runs in an independent process, receives a single-line JSON argument on stdin, and prints exactly one JSON line on stdout. On failure, `msg` carries the reason and the process exits with code 1.

```
biz-dingtalk-connector/
├── plugin.json          # Plugin manifest (methods + config defaults — where configuration lives)
├── requirements.txt     # Dependency (requests>=2.25.0)
├── dingtalk_utils.py    # Shared module (config loading / token / signing / unified error handling)
├── send_text.py         # dingtalk.app.send_text
├── send_markdown.py     # dingtalk.app.send_markdown
├── robot_send.py        # dingtalk.robot.send
├── search_user.py       # dingtalk.contact.search_user
├── user_info.py         # dingtalk.contact.user_info
├── web_ui/index.html    # Debug panel (reached through the plugin-management entry)
├── skills/dingtalk-send-notice/SKILL.md  # Messaging skill guide
├── README.md            # This file (English)
└── README_ZH.md         # 中文文档（配置指南）
```
