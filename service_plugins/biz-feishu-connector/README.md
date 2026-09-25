<!--
  biz-feishu-connector —— Enterprise Feishu Connector
  User-facing configuration guide (README)
-->
# biz-feishu-connector

Enterprise **Feishu (Lark CN)** connector plugin for apex-mcp-bridge: send IM notifications (text / interactive card) to users or groups, look up contacts, and manage calendar events — all through MCP tools, skills, and a web debug UI.

## What to configure & where to get it

Log in to the [Feishu Open Platform](https://open.feishu.cn) as an enterprise admin →
`Developer Console → Enterprise self-built app → <your app>`:

| `plugin.json` config | Required | Where to get it |
|---|---|---|
| `app_id` | Yes | App page → "Credentials & Basic Info" → App ID (starts `cli_`) |
| `app_secret` | Yes | Same page → App Secret (shown only at creation/reset). **Do not put it in plugin.json**: store it in the secret box and keep `${app_secret}` in the file |
| `domain` | No | `feishu` for CN (Lark intl not yet supported) |
| `default_sender` | No | Default signature line, e.g. `企业助手` |
| `allowed_senders` | No | Array of permitted sender names (anti-spoofing whitelist) |
| `recipients` | No | Alias list `[{name,type,target}]`; `target` = open_id (`ou_`) or chat_id (`oc_`) |
| `calendar_id` | No | Calendar id (starts `feishu_`); only app-writable/subscribed calendars work |

Feishu-side prerequisites: enable **bot capability**; apply for scopes in "Permission
Management" (`im:message:send_as_bot`, `contact:user.base:readonly`, calendar scopes)
and **publish a version** for them to take effect. The bot must be added to any target
group; recipients must be inside the bot's availability scope.

### Minimal config example

```jsonc
"config": {
  "app_id": "cli_xxxxxxxxxxxxxxxx",
  "app_secret": "${app_secret}",
  "domain": "feishu",
  "default_sender": "企业助手",
  "allowed_senders": ["张三", "运维"],
  "recipients": [
    { "name": "IT告警群", "type": "chat", "target": "oc_xxxx" }
  ],
  "calendar_id": ""
}
```

Config edits take effect immediately — no restart needed.

### Credential Management (Secret Box)

`app_secret` is a sensitive credential and is **not written into `plugin.json`**: the file keeps the placeholder `${app_secret}`, and the host resolves the real value from the database "secret box" before the call and injects it (key name `app_secret`, owned by plugin `biz-feishu-connector`).

- Admin API: `/biz/gis_secret` (administrators only; the list **never returns values**)
- Or write directly to the database:

```sql
INSERT INTO gis_secret (secret_key, plugin_name, secret_value, description, status, created_by, updated_by, data_sta)
VALUES ('app_secret', 'biz-feishu-connector', '<Feishu App Secret>', 'Feishu self-built app App Secret', '1', 'admin', 'admin', 'A');
```

- If it is not recorded / has been disabled, the call **fails outright** with "referenced secret ${app_secret} is unavailable" — it never degrades silently;
- The scope is limited to this plugin: other plugins cannot reference this secret;
- See [service_plugins/README.md](../README.md#plugin-secret-box-config-placeholders) for the full convention.

## Quick connectivity check

```bash
curl -s -X POST https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal \
  -H "Content-Type: application/json" \
  -d '{"app_id":"cli_..","app_secret":".."}'
```

`code: 0` + `tenant_access_token` means credentials & network are OK.

## Identity model (important)

- All messages are sent **as the bot app** (`tenant_access_token`); you cannot impersonate a
  real person (that would require their OAuth `user_access_token`).
- `sender` is only a readable **signature line** (e.g. `张三` / `运维`). Leave empty →
  `config.default_sender`; if you mistakenly pass an `ou_` open_id it is auto-resolved to a
  real name (`sender_auto: true`) — raw IDs never appear in message text.
- To message a person you need their **open_id** (`ou_`), obtained via
  `feishu.contact.search_user` (mobile/email) or the `recipients` alias list.

## Capabilities

| Method | Description | Risk |
|---|---|---|
| `feishu.im.send_text` | Send plain text to a user/group | normal |
| `feishu.im.send_card` | Send interactive card (title + Markdown + signature) | normal |
| `feishu.contact.search_user` | Resolve users by mobile/email (Feishu has no name search) | risk |
| `feishu.contact.user_info` | User details by open_id | risk |
| `feishu.contact.departments` | List child departments | risk |
| `feishu.calendar.create_event` | Create a calendar event (tenant-scope limits apply) | auth |
| `feishu.calendar.list_events` | List calendar events | risk |

## Reference docs

- Feishu Open Platform: <https://open.feishu.cn>
- Send message API: <https://open.feishu.cn/document/server-docs/im-v1/message/create>
- Official Python SDK `lark-oapi`: <https://pypi.org/project/lark-oapi/>

For architecture, phase-2 design notes and the user↔open_id mapping table draft, see
[README_ZH.md](./README_ZH.md) (Chinese). Debug console: `web_ui/index.html`
(served at `/plugin-web/biz-feishu-connector/`).
