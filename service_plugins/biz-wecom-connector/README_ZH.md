<p align="center">
  <img src="https://img.shields.io/badge/plugin-biz--wecom--connector-00b894?style=flat-square" alt="biz-wecom-connector">
  <img src="https://img.shields.io/badge/api%20version-plugin.gis%2Fv1-6c5ce7?style=flat-square" alt="API Version">
  <img src="https://img.shields.io/badge/version-0.1.0-blue?style=flat-square" alt="Version">
  <img src="https://img.shields.io/badge/server-qyapi.weixin.qq.com-orange?style=flat-square" alt="WeCom">
  <img src="https://img.shields.io/badge/runtime-python3%20%2B%20requests-3776AB?style=flat-square" alt="Python">
</p>

# 企业微信连接服务（biz-wecom-connector）

面向企业微信（WeCom / 企业微信）的连接插件：**自建应用**给「成员」发文本 / Markdown **应用消息**、**群自定义机器人 webhook** 向群推送（支持多群）、以及**通讯录查询**（按手机号反查 userid、按 userid 查成员详情）。成员标识一律使用 **userid**（不是 openid）；发送目标既可直接填 userid，也可引用 `config.recipients` 中预配的名字。发起人署名走「可读名 + `config.allowed_senders` 白名单」，防止冒用他人名义发送。

本插件运行在 gis / apex-mcp-bridge 插件体系之上，遵循统一 JSON 协议（`{"code":0,"msg":"ok","data":...}`，`code` 非 0 为失败、原因在 `msg`）。**每次调用都会读取最新 `plugin.json`，配置改动即时生效，无需重启。**

## 目录

- [一、简介与能力方法清单](#一简介与能力方法清单)
- [二、★配置指南★（核心）](#二配置指南核心)
- [三、配置示例](#三配置示例)
- [四、官方参考文档](#四官方参考文档)
- [五、快速开始 / 连通性验证](#五快速开始--连通性验证)
- [六、常见问题](#六常见问题)
- [七、用户常见误区提醒](#七用户常见误区提醒)

## 一、简介与能力方法清单

| 方法名 | 风险等级 | 一句话说明 |
|---|---|---|
| `wecom.app.send_text` | `normal` | 以自建应用身份给**成员**发纯文本应用消息（`target` = 成员 userid 或 `config.recipients` 中 `type=user` 的预配名） |
| `wecom.app.send_markdown` | `normal` | 同上，给成员发应用 Markdown 消息（企业微信只支持部分 Markdown 语法，不支持表格/图片） |
| `wecom.robot.send` | `normal` | 通过**群自定义机器人 webhook** 向群推送 text / markdown（`target` 留空 = 默认群 `config.robot_webhook`，或填 `recipients` 中 `type=robot` 的预配名，支持多群） |
| `wecom.contact.search_user` | `risk` | 按**手机号反查成员 userid**（多个用英文逗号分隔，单次最多 50 个；查到的进 `user_list`，查不到的进 `not_found`） |
| `wecom.contact.user_info` | `risk` | 按 **userid 查成员详情**（姓名/部门/手机号/邮箱/职位等；无通讯录授权时手机号可能脱敏如 `138****`） |

> 上表为插件**出厂默认** risk_level，可在宿主管理界面按需调整：`disable` 关闭 / `auth`（HITL）需人工审批 / 降为 `normal` / 升为 `risk`。

所有方法均 `sync` 同步调用、超时 30s。除 `wecom.robot.send` 外的四个方法都需要 `config.corp_id` + `config.app_secret`（用于获取 access_token）；其中发应用消息（前两个方法）还需要正整数 `config.agent_id`。

## 二、★配置指南★（核心）

### 2.1 先分清两条「消息渠道」

- **应用消息**（`wecom.app.send_text` / `send_markdown`）：发给**成员个人**。走企业微信 `message/send` 接口，需要 `corp_id/app_secret/agent_id`，且自建应用的「企业可信 IP」必须放行运行本插件所在服务器的出口公网 IP；收件标识是成员 **userid**。
- **群机器人推送**（`wecom.robot.send`）：发进**群**。走群「自定义机器人」的 webhook 地址，**不需要 access_token、不受可信 IP 限制**；但任何人拿到该地址都能往群里推，请按需开启「关键字 / 加签」防滥用。

### 2.2 企业微信侧一次性准备（需企业管理员操作）

1. **创建自建应用**并拿到三样凭证（企业 ID、Secret、AgentId）：
   - **企业 ID（corp_id）**＝管理后台「我的企业 → 企业信息」页面底部的企业 ID（`ww` 开头）；
   - **应用 Secret 与 AgentId**＝「应用管理 → 自建 → 应用详情」页（Secret 泄露可点「重置」）。
2. **配置「企业可信 IP」**＝在「应用详情」页把运行本插件服务器的**出口公网 IP** 加入可信 IP（发应用消息必需，否则报 `errcode=60020 / 301002 invalid ip`）。
3. **设置应用可见范围**＝「应用详情」页把目标成员/部门加入可见范围（成员不在可见范围内会收不到应用消息）。
4. **授权通讯录读取权限**：按手机号反查 userid（`user/getuserid`）与查成员详情（`user/get`）依赖通讯录读取权限，由管理员在管理后台「通讯录」模块为自建应用授权。
5. **创建群机器人（推群才需要）**＝在目标群右上角 `…` → **添加群机器人** → 创建后**复制 Webhook 地址**（形如 `https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=xxx`）→ 填入 `config.robot_webhook`（或 `recipients` 中 `type=robot` 的项）。

### 2.3 `config` 字段说明（plugin.json）

| 字段 | 是否必填 | 从哪里获取 | 说明 |
|---|---|---|---|
| `corp_id` | **条件必填**：应用消息与通讯录查询必需 | 企业微信管理后台「我的企业 → 企业信息」→ 企业 ID（`ww` 开头） | 与 `app_secret` 配合换取 access_token；仅用群机器人推送（`wecom.robot.send`）时可留空 |
| `app_secret` | **条件必填**：同 `corp_id` | 「应用管理 → 自建 → 应用详情」→ Secret（可重置） | 敏感凭据，勿外泄；写错会报 `40001/40013` 或 token 获取失败 |
| `agent_id` | **条件必填**：仅发应用消息时 | 「应用管理 → 自建 → 应用详情」→ AgentId | 正整数；`wecom.app.send_text/send_markdown` 必需 |
| `robot_webhook` | **条件必填**：用 `wecom.robot.send` 且不发 recipients 多群时 | 目标群 → 右上角 `…` → 添加群机器人 → 复制 Webhook 地址 | 形如 `https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=xxx`；配了 `recipients` 的 `type=robot` 项后此字段可省略 |
| `default_sender` | 否（默认 `"企业助手"`） | —（本企业自定义署名文字） | 调用时不传 `sender` 时的默认署名；只填可读名（如「运维值班」），不是任何 id |
| `allowed_senders` | 否 | —（本企业可用的署名白名单） | 字符串数组；**一旦配置（非空）**，最终署名必须命中名单，否则拒绝发送（防冒用） |
| `recipients` | 否 | —（收件人「别名」预配，可选） | `{name,type,target}` 对象数组；`type=user` 供应用消息引用、`type=robot` 供群推送引用，两类互不通用（见 2.4） |

补充说明：
- 上表「必填」均指**按需必填**：corp_id + app_secret 覆盖 5 个方法中的 4 个（除群机器人推送）；agent_id 只管发应用消息；robot_webhook 只管推默认群。
- 「可见范围 / 企业可信 IP / 通讯录授权」属于**企业微信侧配置**，不在 plugin.json 中，需要在管理后台完成。
- 配置改动即时生效：插件每次调用都以全新进程读取最新 `plugin.json`，**无需重启**；「改了没生效」基本都是格式写错（如 JSON 末尾多逗号）。

### 2.4 `recipients` 预配格式（可选，用「名字」发消息时才需要）

```jsonc
"recipients": [
  { "name": "张三",     "type": "user",  "target": "zhangsan" },  // type=user：target 为成员 userid，供 app 消息用
  { "name": "IT告警群", "type": "robot", "target": "https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=xxx" } // type=robot：target 为 webhook，供 robot.send 用
]
```

- `name` 即调用时填的 `target` 值，**大小写敏感**；`type` 只能是 `user` / `robot`；
- 任一项**不是对象**（写成数字/字符串等）会报清晰错误：`config.recipients 应为数组` / `第 n 项应为对象 {name,type,target}`——按格式修正即可，无需重启；
- `recipients` 只是可选「别名」，拿不到稳定名字时**不要依赖它**——个人直接填真实 userid（手机号 → `wecom.contact.search_user` 反查）是最快路径。

## 三、配置示例

以下为**脱敏示例值**，请替换为你企业的真实凭证：

```jsonc
{
  "config": {
    "corp_id": "ww8f1e2a3b4c5d6e7f",                      // ← 你的企业 ID（管理后台「我的企业 → 企业信息」，ww 开头）
    "app_secret": "AbCdEfGhIjKlMnOpQrStUvWxYz0123456789",  // ← 你的自建应用 Secret（应用详情页）
    "agent_id": 1000002,                                   // ← 你的自建应用 AgentId（正整数）
    "robot_webhook": "https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=6a9b8c7d1e2f3a4b5c6d7e8f9a0b1c2d", // ← 可选：默认群机器人（key=xxx 为示意）
    "default_sender": "企业助手",                            // ← 可选：默认署名
    "allowed_senders": ["张三", "运维值班", "企业助手"],       // ← 可选：署名白名单，配置后必须命中
    "recipients": [                                        // ← 可选：收件人别名
      { "name": "张三",     "type": "user",  "target": "zhangsan" },
      { "name": "IT告警群", "type": "robot", "target": "https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=6a9b8c7d1e2f3a4b5c6d7e8f9a0b1c2d" }
    ]
  }
}
```

> **凭证建议走密钥箱**：`app_secret`（及 `robot_webhook` 里的 key）属敏感凭据，不建议长期明文留在 `plugin.json`。可在文件中保留占位符 `${app_secret}`，把真实值录入插件密钥箱（键名 `app_secret`，归属插件 `biz-wecom-connector`），由宿主在调用前解析注入；未录入 / 已停用时调用会直接失败并提示「引用的密钥不可用」。完整约定见 [service_plugins/README_ZH.md](../README_ZH.md#插件密钥箱配置占位符)。

## 四、官方参考文档

- **企业微信开发者中心（总入口）**：<https://developer.work.weixin.qq.com/>
  - 在开发者中心内可检索以下文档（入口以官网实际目录为准，此处仅列文档名）：**获取 access_token**、**发送应用消息 / 消息推送**、**群机器人配置说明**、**通讯录成员管理**（按手机号获取 userid、读取成员）等。
- **企业微信管理后台**（配置凭证 / 应用 / 群机器人的地方）：<https://work.weixin.qq.com/wework_admin/frame>

## 五、快速开始 / 连通性验证

推荐按「**先 curl 验证凭证 → 再试发**」的顺序排查，避免把「配置错」误判成「插件 bug」。

**① 验证 corp_id + app_secret（获取 access_token）**

```bash
curl -s "https://qyapi.weixin.qq.com/cgi-bin/gettoken?corpid=ww8f1e2a3b4c5d6e7f&corpsecret=AbCdEfGhIjKlMnOpQrStUvWxYz0123456789"
```

预期返回 `{"errcode":0,"errmsg":"ok","access_token":"...","expires_in":7200}`。
- `errcode=40013`（invalid corpid）/ `40001`（invalid secret）→ 凭证填错；
- `errcode=60020` 或提示 ip 不在白名单 → 「企业可信 IP」未放行本机出口 IP。

**② 验证应用消息（发给成员，需可信 IP + 可见范围）**

```bash
curl -s -X POST "https://qyapi.weixin.qq.com/cgi-bin/message/send?access_token=上一步拿到的TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"touser":"zhangsan","msgtype":"text","agentid":1000002,"text":{"content":"hello from biz-wecom-connector"}}'
```

预期返回 `{"errcode":0,"errmsg":"ok","msgid":"..."}`。随后即可在宿主侧调用 `wecom.app.send_text / send_markdown`（方法内部自动取 token、追加署名）。

**③ 验证群机器人 webhook（推群，无需 token）**

```bash
curl -s -X POST "https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=6a9b8c7d1e2f3a4b5c6d7e8f9a0b1c2d" \
  -H "Content-Type: application/json" \
  -d '{"msgtype":"text","text":{"content":"hello from biz-wecom-connector"}}'
```

预期返回 `{"errcode":0,"errmsg":"ok"}`；`errcode=93000` 说明 webhook 地址不合法（复制不完整 / key 被改动）。

> 本插件内置一个 Web 调试面板（`web_ui/index.html`）：若宿主挂载了插件 Web UI，可通过插件管理入口 `/plugin-web/biz-wecom-connector/` 打开，在界面上手工试发各方法。

## 六、常见问题

| 现象 / 报错 | 含义 | 处置 |
|---|---|---|
| `errcode=60020` / `301002` / `invalid ip` | 应用「企业可信 IP」未放行调用方出口 IP | 管理后台 → 自建应用 → 企业可信 IP，加入本机出口公网 IP |
| `errcode=40014 invalid access_token` / `42001 token expired` | token 无效 / 过期 | 插件会自动重取 token；持续报错说明 corp_id/secret 不对或 IP 未放行 |
| `errcode=40003 invalid userid` | userid 无效：不存在 / 传成了 openid / 成员不在应用可见范围 | 用 `search_user` 按手机号重新反查；确认成员在可见范围内 |
| `errcode=60011 无权限访问成员` | 应用无该成员通讯录权限 / 不在可见范围 | 调整应用可见范围或通讯录授权 |
| `errcode=93000` / 群机器人没反应 | webhook 地址不合法（复制不完整 / key 被改动） | 从目标群重新复制完整 webhook 填入配置 |
| `wecom.contact.user_info` 手机号带 `*`（如 `138****`） | 无通讯录授权，mobile 脱敏 | 属预期；需明文请管理员给应用授通讯录权限 |
| 发送返回成功但成员没收到 | 成员不在应用可见范围 / 应用未对成员可见 | 检查「应用详情 → 可见范围」与应用状态 |
| `署名 [x] 不在允许名单内` | sender 未命中 `allowed_senders` 白名单 | 改传名单内署名，或让管理员加白名单 |
| `缺少 config.corp_id` / `缺少 config.agent_id` / `缺少群机器人 webhook` | 对应凭证未配置 | 按上文 §2.3 补齐（即时生效，无需重启） |

更多细节可参考技能文档 `skills/wecom-send-notice/SKILL.md` 中的「常见报错速查表」。

## 七、用户常见误区提醒

1. **给「成员个人」发的 `target` 是企业内 userid（员工账号，如 `zhangsan`），不是 openid。** 企业微信应用消息的 `touser` 只认 userid；openid 仅适用于「微信用户 / 外部联系人」场景。收到 `invalid user` 一类报错时，先怀疑把 openid 当成了 userid，或该成员不在应用可见范围。企业微信也**不支持按姓名检索成员**——手机号 → `search_user` 反查 userid 才是正确姿势。
2. **「群通知」走群机器人 webhook，与「应用消息」是两条不同渠道，不可混用。** 应用消息（`wecom.app.send_text/send_markdown`）发给成员个人、需要 access_token 与可信 IP；群推送（`wecom.robot.send`）进群、走 webhook、无需 token 也不受可信 IP 限制。`recipients` 里 `type=user` 与 `type=robot` 两类互不通用：拿 user 项去推群 / 拿 robot 项去发成员会得到明确报错——请对号入座。
3. **`sender` 只是消息里的「署名文字」，不是账号标识。** 只填可读名（张三 / 运维值班），不要传 userid/openid；也不要承诺「以某人的名义发送」——那是企业微信 OAuth 授权模型，超出本插件能力。
4. **webhook 地址等于推送权限。** 任何拿到该 URL 的人都能往群里推，勿把含 key 的完整地址贴到公开渠道；可在群机器人设置里开启「关键字 / 加签」防护。

---

> 注：企业微信成员标识与语法限制等以官方最新文档为准；本文件仅覆盖插件实际能力，未承诺超出上文清单的功能。

---

## 八、影子演练模式（Shadow Mode，管理用）

- 置 `plugin.json` 的 `config.shadow_mode=true`（或调用 `wecom.shadow.set_mode`）进入**演练**：`wecom.app.send_text` / `wecom.app.send_markdown` / `wecom.robot.send` 在发起任何外部网络请求（含获取 access_token / 发消息 / webhook 推送）**之前**被拦截，只把请求写成一条 `pending` 记录（默认存于插件目录 `shadow_log/records.jsonl`，可改 `config.shadow_log_dir`），返回 `{"shadow":true,"record_id":...,"status":"pending"}`，绝不真发。记录写入失败时调用 fail-closed（中止，不静默放行）。
- 管理方法：`wecom.shadow.status`（查开关/统计）、`wecom.shadow.list`（列脱敏记录）、`wecom.shadow.approve`（批准后以 `PLUGIN_SHADOW_FORCE=1` 子进程重放**真实执行**一次）、`wecom.shadow.reject`（驳回）、`wecom.shadow.set_mode`（进出演练）、`wecom.shadow.archive`（归档已处理记录）。只读查询 `wecom.contact.search_user / user_info` 不受影子模式影响。
- 退出演练（`config.shadow_mode=false` 或 `wecom.shadow.set_mode` 传 `false`）后原行为不变、立即恢复真实发送。approve 属高风险操作，宿主侧应仅授权给管理员。
