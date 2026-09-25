<p align="center">
  <img src="https://img.shields.io/badge/plugin-biz--wecom--connector-00b894?style=flat-square" alt="biz-wecom-connector">
  <img src="https://img.shields.io/badge/api%20version-plugin.gis%2Fv1-6c5ce7?style=flat-square" alt="API Version">
  <img src="https://img.shields.io/badge/version-0.1.0-blue?style=flat-square" alt="Version">
  <img src="https://img.shields.io/badge/server-qyapi.weixin.qq.com-orange?style=flat-square" alt="WeCom">
  <img src="https://img.shields.io/badge/runtime-python3%20%2B%20requests-3776AB?style=flat-square" alt="Python">
</p>

# WeCom Connector (biz-wecom-connector)

A WeCom (WeChat Work / 企业微信) connector plugin: send **text / Markdown application messages** to **members** via a self-built app, push to **group chats** through **group custom-robot webhooks** (multiple groups supported), and query the **address book** (reverse-lookup a member's `userid` from a mobile number, or fetch member details by `userid`). Member identifiers are always **userid** (never openid); a send target can be either a raw userid or a pre-configured name from `config.recipients`. Sender attribution uses a readable name plus a `config.allowed_senders` whitelist to prevent impersonation.

The plugin runs on the gis / apex-mcp-bridge plugin system and speaks the unified JSON protocol (`{"code":0,"msg":"ok","data":...}`; a non-zero `code` means failure with the reason in `msg`). **The latest `plugin.json` is read on every call — configuration changes take effect immediately, no restart needed.**

## Table of Contents

- [1. Introduction & Capability List](#1-introduction--capability-list)
- [2. ★Configuration Guide★ (Core)](#2-configuration-guide-core)
- [3. Example Configuration](#3-example-configuration)
- [4. Official Reference Docs](#4-official-reference-docs)
- [5. Quick Start / Connectivity Checks](#5-quick-start--connectivity-checks)
- [6. FAQ](#6-faq)
- [7. Common Misconceptions](#7-common-misconceptions)

## 1. Introduction & Capability List

| Method | Risk Level | What it does |
|---|---|---|
| `wecom.app.send_text` | `normal` | Sends a plain-text application message to a **member** (`target` = the member's userid, or a `config.recipients` name of `type=user`) |
| `wecom.app.send_markdown` | `normal` | Same as above, sending an application Markdown message (WeCom supports only a Markdown subset — no tables/images) |
| `wecom.robot.send` | `normal` | Pushes text / markdown into a **group** via a **group custom-robot webhook** (empty `target` → the default group in `config.robot_webhook`; or a `recipients` name of `type=robot`, enabling multiple groups) |
| `wecom.contact.search_user` | `risk` | Reverse-looks-up a member **userid from a mobile number** (comma-separated, ≤ 50 per call; hits go to `user_list`, misses to `not_found` with `errcode/errmsg`) |
| `wecom.contact.user_info` | `risk` | Fetches **member details by userid** (name / department / mobile / email / position, etc.; mobile may be masked, e.g. `138****`, without contact permission) |

> The levels above are the plugin's **factory defaults**. They can be changed in the host admin panel: `disable` to turn a method off, `auth` (HITL) for human approval, or downgrade/upgrade as needed.

All methods are `sync` with a 30s timeout. Except for `wecom.robot.send`, the four other methods require `config.corp_id` + `config.app_secret` (used to obtain an access_token); the two application-message methods additionally require a positive-integer `config.agent_id`.

## 2. ★Configuration Guide★ (Core)

### 2.1 First, tell the two delivery "channels" apart

- **Application messages** (`wecom.app.send_text` / `send_markdown`): delivered to **an individual member** through the `message/send` API. They need `corp_id/app_secret/agent_id`, and the self-built app's **trusted-IP whitelist must include the outbound public IP** of the server running this plugin. The recipient identifier is the member **userid**.
- **Group-robot pushes** (`wecom.robot.send`): delivered **into a group** via a group "custom robot" webhook. **No access_token is needed and there is no trusted-IP restriction** — but anyone who holds the webhook URL can push to that group, so enable keyword / signature protection if you care about abuse.

### 2.2 One-time setup on the WeCom side (done by a WeCom enterprise admin)

1. **Create a self-built app** and collect three credentials:
   - **Corp ID (`corp_id`)** = Admin console → **My Enterprise → Enterprise Info** (我的企业 → 企业信息), the Corp ID at the bottom (`ww`-prefixed);
   - **Secret & AgentId** = Admin console → **App Management → Self-built → App Details** (应用管理 → 自建 → 应用详情); the Secret can be reset there if leaked.
2. **Configure "Trusted IP"** = in the app's detail page, add the **outbound public IP of the server running this plugin** to the trusted-IP whitelist (required for application messages; otherwise you get `errcode=60020 / 301002 invalid ip`).
3. **Set the app's visible scope** = in the app's detail page, include the target members/departments (members outside the scope will not receive application messages).
4. **Grant address-book read permission**: reverse-looking-up a userid from a mobile (`user/getuserid`) and reading member details (`user/get`) need contact read permission, granted to the app by an admin in the "Address Book" (通讯录) module of the console.
5. **Create a group robot (only needed for group pushes)** = in the target group, top-right `…` → **Add Group Robot** → **copy the Webhook URL** (shaped like `https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=xxx`) → put it into `config.robot_webhook` (or into a `type=robot` entry of `recipients`).

### 2.3 `config` fields (`plugin.json`)

| Field | Required | Where to get it | Description |
|---|---|---|---|
| `corp_id` | **Conditionally required**: needed by application messages and contact queries | Admin console → My Enterprise → Enterprise Info (我的企业 → 企业信息) → Corp ID (`ww`-prefixed) | Paired with `app_secret` to obtain the access_token; can stay empty if you only use group-robot pushes (`wecom.robot.send`) |
| `app_secret` | **Conditionally required**: same as `corp_id` | App Management → Self-built → App Details → Secret (regenerable) | Sensitive credential — do not leak; a wrong value fails with `40001/40013` or a gettoken error |
| `agent_id` | **Conditionally required**: only for application messages | App Management → Self-built → App Details → AgentId | Positive integer; required by `wecom.app.send_text` / `send_markdown` |
| `robot_webhook` | **Conditionally required**: only when using `wecom.robot.send` without `recipients` multi-group entries | Target group → top-right `…` → Add Group Robot → copy Webhook URL | Shaped like `https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=xxx`; may be omitted if you configure `type=robot` entries in `recipients` |
| `default_sender` | No (default `"企业助手"`) | — (any readable name of your own) | The signature used when `sender` is omitted; a readable name only (e.g. "on-call"), never an id |
| `allowed_senders` | No | — (whitelist of names allowed to sign) | Array of strings; **once set (non-empty)**, the final signature must match the list or sending is rejected (anti-impersonation) |
| `recipients` | No | — (optional recipient aliases) | Array of `{name,type,target}` objects; `type=user` entries are referenced by application messages, `type=robot` entries by group pushes — the two kinds are not interchangeable (see 2.4) |

Notes:
- "Required" above means **required for the relevant feature**: `corp_id` + `app_secret` cover 4 of the 5 methods (all but the group-robot push); `agent_id` only drives application messages; `robot_webhook` only drives the default group push.
- "Visible scope / trusted IP / contact permission" are **WeCom-side settings**, not `plugin.json` fields — complete them in the admin console.
- Changes take effect immediately: every invocation starts a fresh process that reads the latest `plugin.json`, so **no restart is needed**; if a change "doesn't work", it is almost always a format error (e.g. a trailing comma in the JSON).

### 2.4 `recipients` format (optional; only needed when sending "by name")

```jsonc
"recipients": [
  { "name": "Zhang San", "type": "user",  "target": "zhangsan" },   // type=user: target is a member userid, used by app messages
  { "name": "IT-alert-group", "type": "robot", "target": "https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=xxx" } // type=robot: target is a webhook, used by robot.send
]
```

- `name` is the value you pass as `target` when calling; it is **case-sensitive**; `type` must be `user` or `robot`;
- if any entry is **not an object** (a number/string, etc.), you get a clear error — `config.recipients should be an array` / `entry n should be an object {name,type,target}` — fix the format and retry, no restart needed;
- `recipients` is only an optional convenience "alias". If you do not have stable names, **do not depend on it** — passing the real userid directly (mobile → reverse-lookup via `wecom.contact.search_user`) is the fastest path.

## 3. Example Configuration

Sanitized sample values below — replace them with your enterprise's real credentials:

```jsonc
{
  "config": {
    "corp_id": "ww8f1e2a3b4c5d6e7f",                      // ← your Corp ID (My Enterprise → Enterprise Info, ww-prefixed)
    "app_secret": "AbCdEfGhIjKlMnOpQrStUvWxYz0123456789",  // ← your self-built app Secret (App Details page)
    "agent_id": 1000002,                                   // ← your self-built app AgentId (positive integer)
    "robot_webhook": "https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=6a9b8c7d1e2f3a4b5c6d7e8f9a0b1c2d", // ← optional: default group robot (key=xxx is a placeholder)
    "default_sender": "企业助手",                            // ← optional: default sender signature
    "allowed_senders": ["张三", "运维值班", "企业助手"],       // ← optional: signature whitelist; once set it is enforced
    "recipients": [                                        // ← optional: recipient aliases
      { "name": "张三",     "type": "user",  "target": "zhangsan" },
      { "name": "IT告警群", "type": "robot", "target": "https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=6a9b8c7d1e2f3a4b5c6d7e8f9a0b1c2d" }
    ]
  }
}
```

> **Credential recommendation — use the secret box**: `app_secret` (and the key inside `robot_webhook`) is a sensitive credential and should not stay in plaintext in `plugin.json` long-term. Keep the placeholder `${app_secret}` in the file and store the real value in the plugin secret box (key name `app_secret`, owned by plugin `biz-wecom-connector`); the host resolves and injects it before the call. If it is not recorded / has been disabled, the call fails outright with "referenced secret is unavailable". See [service_plugins/README.md](../README.md#plugin-secret-box-config-placeholders) for the full convention.

## 4. Official Reference Docs

- **WeCom Developer Center (main entrance)**: <https://developer.work.weixin.qq.com/>
  - Docs you can look up there (names listed for reference; exact anchors follow the official site): **Obtaining access_token (获取 access_token)**, **Sending application messages / message push (发送应用消息)**, **Group robot configuration guide (群机器人配置说明)**, **Address-book member management (通讯录成员管理)** — including "get userid by mobile" and "read member" — etc.
- **WeCom Admin Console** (where credentials / apps / group robots are configured): <https://work.weixin.qq.com/wework_admin/frame>

## 5. Quick Start / Connectivity Checks

Follow the "**verify credentials with curl first, then send a test message**" order, so that a misconfiguration is not mistaken for a plugin bug.

**① Verify `corp_id` + `app_secret` (obtain an access_token)**

```bash
curl -s "https://qyapi.weixin.qq.com/cgi-bin/gettoken?corpid=ww8f1e2a3b4c5d6e7f&corpsecret=AbCdEfGhIjKlMnOpQrStUvWxYz0123456789"
```

Expect `{"errcode":0,"errmsg":"ok","access_token":"...","expires_in":7200}`.
- `errcode=40013` (invalid corpid) / `40001` (invalid secret) → credentials are wrong;
- `errcode=60020` or an IP-whitelist hint → the app's trusted-IP whitelist does not include this machine's outbound IP.

**② Verify an application message (to a member; needs trusted IP + visible scope)**

```bash
curl -s -X POST "https://qyapi.weixin.qq.com/cgi-bin/message/send?access_token=THE_TOKEN_FROM_STEP_1" \
  -H "Content-Type: application/json" \
  -d '{"touser":"zhangsan","msgtype":"text","agentid":1000002,"text":{"content":"hello from biz-wecom-connector"}}'
```

Expect `{"errcode":0,"errmsg":"ok","msgid":"..."}`. After that, drive `wecom.app.send_text / send_markdown` from the host side (they fetch the token and append the sender signature automatically).

**③ Verify a group-robot webhook (into a group; no token needed)**

```bash
curl -s -X POST "https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=6a9b8c7d1e2f3a4b5c6d7e8f9a0b1c2d" \
  -H "Content-Type: application/json" \
  -d '{"msgtype":"text","text":{"content":"hello from biz-wecom-connector"}}'
```

Expect `{"errcode":0,"errmsg":"ok"}`; `errcode=93000` means the webhook URL is invalid (incomplete copy / altered key).

> A bundled web debug panel (`web_ui/index.html`) exists: if the host mounts the plugin Web UI, open it via the plugin-management entry `/plugin-web/biz-wecom-connector/` to try each method manually.

## 6. FAQ

| Symptom / error | Meaning | Fix |
|---|---|---|
| `errcode=60020` / `301002` / `invalid ip` | The app's "trusted IP" whitelist does not include the caller's outbound IP | Admin console → self-built app → trusted-IP whitelist: add this machine's outbound public IP |
| `errcode=40014 invalid access_token` / `42001 token expired` | Invalid / expired token | The plugin re-fetches tokens automatically; persistent errors mean corp_id/secret are wrong or the IP is not whitelisted |
| `errcode=40003 invalid userid` | Invalid userid: does not exist / an openid was passed / member outside the app's visible scope | Re-resolve the userid from the mobile via `search_user`; confirm the member is in the visible scope |
| `errcode=60011 no permission to access member` | The app lacks contact permission for that member / member outside visible scope | Adjust the app's visible scope or contact authorization |
| `errcode=93000` / group robot is silent | Invalid webhook URL (incomplete copy / altered key) | Re-copy the full webhook from the target group and update the config |
| `wecom.contact.user_info` returns a masked mobile (`138****`) | No contact permission; mobile is masked | Expected behavior; ask an admin to grant contact permission for clear numbers |
| Send reports success but the member receives nothing | Member outside the app's visible scope / app not visible to the member | Check "App Details → Visible Scope" and the app status |
| `signature [x] not in the allowed list` | `sender` did not match the `allowed_senders` whitelist | Pass an allowed signature, or ask an admin to extend the whitelist |
| `missing config.corp_id` / `missing config.agent_id` / `missing group robot webhook` | The corresponding credential is not configured | Fill it in per §2.3 (takes effect immediately, no restart) |

More detail is available in the bundled skill doc `skills/wecom-send-notice/SKILL.md` (error quick-reference table).

## 7. Common Misconceptions

1. **For messages to an individual member, `target` is the in-enterprise userid (employee account, e.g. `zhangsan`) — not openid.** The `touser` of WeCom application messages only accepts userid; openid applies only to "WeChat users / external contacts". When you see an `invalid user`-style error, first suspect that an openid was passed as the userid, or that the member is outside the app's visible scope. WeCom also does **not support looking members up by name** — mobile → `search_user` reverse-lookup is the correct approach.
2. **"Group notifications" go through the group-robot webhook, which is a different channel from "application messages" — don't mix them up.** Application messages (`wecom.app.send_text` / `send_markdown`) go to individual members and need an access_token plus trusted-IP whitelisting; group pushes (`wecom.robot.send`) go into a group via a webhook with no token and no trusted-IP restriction. In `recipients`, `type=user` and `type=robot` entries are not interchangeable: using a user entry to push to a group (or a robot entry to message a member) yields a clear error — use each for its own channel.
3. **`sender` is just the "signature text" inside the message — not an account identifier.** Pass a readable name only (e.g. "on-call"), never a userid/openid; and do not promise "send on behalf of X" — that requires WeCom's OAuth authorization model, which is beyond this plugin's capability.
4. **A webhook URL equals push permission.** Anyone holding the URL can push to that group, so never paste the full key-bearing address into public channels; enable keyword / signature protection in the group-robot settings if needed.

---

> Note: WeCom member identifiers and syntax limits are subject to the latest official docs. This file only covers the plugin's actual capabilities and makes no promise beyond the list above.
