---
name: wecom-send-notice
description: 向企业微信发企业通知/消息的完整指南：前置条件与配置格式核对、把成员手机号反查成 userid、用自建应用给成员发文本/Markdown、用群自定义机器人 webhook 往群里推送（多群）、发起人署名规则与常见报错处置。
  Use when 用户要求「通过企业微信发通知/发消息给某人或某个群/告警推送到企业微信」时取用本技能。
metadata:
  version: "1.0.0"
  author: biz-wecom-connector
allowed-tools:
  - wecom.app.send_text
  - wecom.app.send_markdown
  - wecom.robot.send
  - wecom.contact.search_user
  - wecom.contact.user_info
---

# 企业微信消息发送指南（企业微信连接服务）

> **调用方式（必读）**：本插件的方法统一通过 `local_service_call` 调用，参数里**必须带** `service_name: "biz-wecom-connector"`（即本技能的 `author`，也就是插件名）与 `method_name`（如 `wecom.app.send_text`），再加上各方法自己的参数（见下文）。缺 `service_name` 会被宿主直接拒绝。

## 0. 出发前必查（先分流，别直接发）

按顺序自查，任何一条不满足就先处理，不要带着问题去试发：

1. **配置已就绪**：`plugin.json` 的 `config.corp_id`/`config.app_secret` 非空（否则 app 消息与通讯录查询都报"缺少 config.corp_id"）；发应用消息还需要 `config.agent_id`（正整数）；推群机器人需要 `config.robot_webhook` 或 recipients 里配好 type=robot 项。
   —— 插件**每次调用都重读 plugin.json，改配置即时生效，无需重启**；"改了没生效"基本是格式写错而不是没重载。
2. **企业微信侧已开通**：管理后台创建了**自建应用**并填好可信 IP（`message/send` 要求应用配置的 IP 白名单放行调用方出口 IP）；"通讯录同步"类权限（含按手机号查 userid、查成员详情）由管理员在"通讯录"应用中授权；成员必须在应用的**可见范围**内。
3. **推群（wecom.robot.send）**：先在目标群里添加"**群机器人**"，复制其 **webhook 地址**填入 `config.robot_webhook`（或 recipients 的 type=robot 项）——webhook 无需 access_token、不受可信 IP 限制，但**任何人拿到该地址都能往群里推**，请按需开启"关键字/加签"防滥用。
4. **分清两件事**（重要）：
   - `target` = 收件人（成员 **userid** / recipients 预配名 / 群机器人名）；
   - `sender` = 消息里的**署名文字**（纯文字，不需要、也不该传任何 id）。

## 1. config.recipients 预配格式（用名字发消息时才需要看）

`recipients` 是**对象数组**，每一项是 `{name, type, target}`，示例：

```jsonc
"recipients": [
  { "name": "张三",     "type": "user",  "target": "zhangsan" },          // 个人：target 是成员 userid（应用消息用）
  { "name": "IT告警群", "type": "robot", "target": "https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=xxx" }  // 群：target 是自定义机器人 webhook（robot_send 用）
]
```

- `name` 就是你调用时填的 `target` 值，**大小写敏感**；`type` 只能是 `user`/`robot`；
- `type=user` 项供 `wecom.app.send_text/send_markdown` 引用（发成员）；`type=robot` 项供 `wecom.robot.send` 引用（发群），两类互不通用，张冠李戴会得到清晰报错；
- 任一项**不是对象**（写成数字/字符串等）会得到清晰报错：`config.recipients 应为数组 / 第 n 项应为对象 {name,type,target}`——按格式修即可，**无需重启**；
- `recipients` 只是"别名"便利，属于可选；拿不到稳定名字时**不要依赖它**（见 §2 最快路径）。

## 2. 最快路径：直填真实 userid，别依赖猜配置

- **群消息**：用 `wecom.robot.send`（企业微信群消息不走自建应用，走**群自定义机器人 webhook**）。target 留空默认推 `config.robot_webhook` 那个群；要多群推送，在 recipients 预配多个 type=robot 项后用名字指定。
- **成员消息**：手机号 → `wecom.contact.search_user {mobiles:"13800000000"}` 拿 **userid** → 直接填 target。企业微信**不支持按姓名检索成员**；没有手机号时请用户提供 userid 或让管理员在 recipients 预配。

## 3. target 语义：是 userid，不是 openid（重要）

- 企业微信**内部成员的收件标识是 userid**（管理员在通讯录里设置的账号，如 `zhangsan`），应用消息的 `touser` 只认 userid；
- 不要把微信/企业微信的 **openid** 当 target 用——openid 只对"微信用户/外部联系人"场景有效，对应用发消息不适用；收到 `invalid user` 之类报错先怀疑传了 openid 或 userid 不在应用可见范围；
- `wecom.contact.user_info {userid}` 可确认 userid 对应的姓名/部门/手机号后再发。

## 4. 署名 sender 规则

- `sender` 只是消息里的**署名文字**，不需要对应真实企业微信账号，更不需要 userid/openid；
- `sender` 只填**可读名**（张三 / 运维 / IT 值班）。**留空** → 用 `config.default_sender`；
- 若配置了 `config.allowed_senders` 白名单，最终署名必须命中，否则拒绝发送；
- 不要承诺"以某人的名义发送"——那是企业微信 OAuth 授权模型，超出本插件能力。

## 5. 发文本还是 Markdown

- 普通文字/简短提醒 → `wecom.app.send_text {target, text, sender?}`（成员）或 `wecom.robot.send {msgtype:"text", content, sender?}`（群）；
- **告警/结构化通知** → `wecom.app.send_markdown {target, text, sender?}`（成员）或 `wecom.robot.send {msgtype:"markdown", content, sender?}`（群）；
- 企业微信 markdown 只支持**部分语法**（标题 #、加粗 **、引用 >、链接、字体颜色等），**不支持表格/图片/横向分割线**，别按完整 Markdown 写；
- 每个方法的 sender 署名会自动追加到消息内容末尾，形成审计线索。

## 6. 常见报错速查表

| 报错/现象 | 含义 | 处置 |
|---|---|---|
| `errcode=60020 或 301002 不在可信 IP` / `invalid ip` | 应用未把调用方出口 IP 加进"企业可信 IP" | 管理后台 → 自建应用 → 企业可信 IP，加入服务器出口 IP 后生效 |
| `errcode=40014 invalid access_token` / `42001 token expired` | token 无效/过期 | 插件会自动重取 token，若持续报错说明 corp_id/secret 不对或 IP 未放行 |
| `errcode=40003 invalid userid` | userid 无效：不存在 / 传成了 openid / 成员不在应用可见范围 | 用 `search_user` 按手机号重新反查 userid；确认成员在应用可见范围 |
| `errcode=60011 无权限访问成员` | 应用无该成员的通讯录权限/不在可见范围 | 调整应用可见范围或"通讯录同步"授权 |
| `errcode=93000 webhook 地址不合法` / 群机器人没反应 | webhook 配错或带 key 的地址被改动 | 重新从群里复制完整 webhook 填到 config（改动即时生效） |
| 缺少 `config.corp_id` / `config.agent_id` | 凭证未填 | 管理员在 plugin.json 填写（即时生效） |
| `config.recipients 应为数组…` / `第 n 项应为对象…` | 预配格式写错 | 按 §1 修正；无需重启 |
| `署名 [x] 不在允许名单内` | sender 未命中 allowed_senders | 改传名单内署名，或让管理员加白名单 |
| `wecom.contact.user_info` 手机号带 `*`（如 138****） | 无通讯录授权时 mobile 脱敏 | 属预期；需明文手机号请由管理员在"通讯录"中给应用授通讯录权限 |
| 发送"成功"但成员没收到 | 成员不在应用可见范围 / 应用未发布上线 | 检查可见范围与应用状态 |

## 7. 示例

- 「通知 IT 告警群：磁盘使用率 92%」→ `wecom.robot.send {msgtype:"markdown", content:"**/data** 使用率 92%", sender:"运维"}`（target 留空用默认群；多群时 target 填 recipients 里 IT 告警群的名字）
- 「给张三（手机 13800000000）发条企业微信：下午三点开会」→ ① `wecom.contact.search_user {mobiles:"13800000000"}` 拿 userid → ② `wecom.app.send_text {target:"zhangsan", text:"下午三点开会"}`（不传 sender → 默认署名"企业助手"）
- 「确认李四的部门再发」→ `wecom.contact.user_info {userid:"lisi"}` → 用返回的 name/department 核对后走 `wecom.app.send_text`
