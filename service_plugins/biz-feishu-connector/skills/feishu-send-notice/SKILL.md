---
name: feishu-send-notice
description: 向飞书发企业通知/消息的完整指南：前置条件与配置格式核对、把用户手机号/邮箱转成 open_id、往个人或群发文本/卡片、发起人署名规则与常见报错处置。
  Use when 用户要求「通过飞书发通知/发消息给某人或某个群/告警推送到飞书」时取用本技能。
metadata:
  version: "1.1.0"
  author: biz-feishu-connector
allowed-tools:
  - feishu.im.send_text
  - feishu.im.send_card
  - feishu.contact.search_user
  - feishu.contact.user_info
  - feishu.contact.departments
---

# 飞书消息发送指南（企业飞书连接服务）

> **调用方式（必读）**：本插件的方法统一通过 `local_service_call` 调用，参数里**必须带** `service_name: "biz-feishu-connector"`（即本技能的 `author`，也就是插件名）与 `method_name`（如 `feishu.im.send_text`），再加上各方法自己的参数（见下文）。缺 `service_name` 会被宿主直接拒绝。

## 0. 出发前必查（先分流，别直接发）

按顺序自查，任何一条不满足就先处理，不要带着问题去试发：

1. **配置已就绪**：`plugin.json` 的 `config.app_id` 非空，且 `config.app_secret` 已由管理员录入**插件密钥箱**（文件里是占位符 `${app_secret}`，属正常现象，不要要求用户把密钥写进文件）；若打算用"预配名字"发消息，先核对 `config.recipients` 格式（见 §1）。
   —— 插件**每次调用都重读 plugin.json，改配置即时生效，无需重启**；"改了没生效"基本是格式写错而不是没重载。
2. **飞书侧已开通**：自建应用已开机器人；`im:message:send_as_bot`、`contact:user.base:readonly` 权限已申请并**发布**（部分需企业管理员审核）。
3. **发群消息**：机器人已被拉进目标群；**发个人消息**：对方在机器人"可用范围"内。
4. **分清两件事**（重要）：
   - `target` = 收件人（需要对方的 open_id / 群 chat_id）；
   - `sender` = 消息里的署名（纯文字，**不需要、也不该传 open_id**）。

## 1. config.recipients 预配格式（用名字发消息时才需要看）

`recipients` 是**对象数组**，每一项是 `{name, type, target}`，示例：

```jsonc
"recipients": [
  { "name": "张三",  "type": "user", "target": "ou_xxxx" },   // 个人：target 是 open_id
  { "name": "IT告警群", "type": "chat", "target": "oc_xxxx" }  // 群：  target 是 chat_id
]
```

- `name` 就是你调用时填的 `target` 值，**大小写敏感**；`type` 只能是 `user`/`chat`；`target` 是字符串 id；
- 任一项**不是对象**（比如写成数字/字符串，或整个配成了 `{"群名":{...}}` 的字典）会得到清晰报错：
  `config.recipients 应为数组 / 第 n 项应为对象 {name,type,target}`——按上面格式修即可，**无需重启**；
- `recipients` 只是"别名"便利，属于可选；拿不到稳定名字时**不要依赖它**（见 §2 最快路径）。

## 2. 最快路径：直填真实 ID，别依赖猜配置

- **群消息首选**：`target` 直接用 `oc_` 开头的 **chat_id**（发送前确认机器人在该群）。只有确实拿不到 chat_id、且对方在 `recipients` 里有预配名字时才用名字；**群名发送失败就立即回退索要/使用 chat_id，不要反复让用户改配置**。
- **个人消息**：手机号/邮箱 → `feishu.contact.search_user` 拿 `ou_` open_id → 直接填 target。飞书**不支持按姓名检索**；没有手机号/邮箱时先用 `feishu.contact.departments` 浏览组织，再请用户提供可检索条件。

## 3. 署名 sender 规则（重要）

- 消息**发送身份永远是机器人**（飞书界面显示为应用机器人），`sender` 只是消息里的**署名文字**，不需要对应真实飞书用户，更不需要 open_id；
- `sender` 只填**可读名**（张三 / 运维 / IT 值班）。**留空** → 用 `config.default_sender`；**误填了 `ou_` open_id** → 插件会自动反查该用户姓名并以此署名（返回 `sender_auto: true`），反查失败回退默认署名——`ou_`/`oc_` **永不进入消息文案**；
- 若配置了 `config.allowed_senders` 白名单，最终署名（姓名）必须命中，否则拒绝发送；
- 不要承诺"以某人的名义发送"——那是 OAuth 授权模型，超出本插件能力。

## 4. 发文本还是卡片

- 普通文字/简短提醒 → `feishu.im.send_text {receive_type, target, text, sender?}`；
- **重要告警/结构化通知** → `feishu.im.send_card {receive_type, target, title?, md, sender?}`（正文自动追加"发起人"行）。
- 发卡片到用户前先 `search_user` 拿 open_id；可再用 `user_info` 确认身份再发。

## 5. 常见报错速查表

| 报错/现象 | 含义 | 处置 |
|---|---|---|
| `code=230001 invalid receive_id`（chat） | chat_id 无效：不存在 / 机器人不在该群 / 应用未发布 | 核实是否为 `oc_` 真实群 ID；把机器人拉进群；确认带 `im:message:send_as_bot` 的版本已发布 |
| `code=230001 invalid receive_id`（user） | open_id 无效或对方不在机器人可用范围 | 用 `search_user` 重新反查目标 open_id |
| 缺少 `config.app_id` | App ID 未填 | 管理员在 plugin.json 的 `config.app_id` 填写（即时生效） |
| `引用的密钥 ${app_secret} 不可用` | 密钥箱中未录入 / 已停用 | 管理员在密钥箱（`/biz/gis_secret`）录入归属本插件的 `app_secret` 并启用；**不要把密钥写进 plugin.json** |
| `config.recipients 应为数组…` / `第 n 项应为对象…` | 预配格式写错 | 按 §1 修正；无需重启 |
| `署名 [x] 不在允许名单内` | sender 未命中 allowed_senders | 改传名单内署名，或让管理员加白名单 |
| 权限类 code（如 99991400 等非 0 业务码） | scope 未申请/未发布 | 找企业管理员申请并发布，**不要反复重试** |
| 发送"成功"但对方没收到 | 机器人不在群 / 对方不在可用范围 | 检查群成员与机器人可用范围 |

## 6. 示例

- 「通知 IT 告警群：磁盘使用率 92%」→ 拿群 `oc_` id 直填：`feishu.im.send_card {receive_type:"chat", target:"oc_xxx", title:"存储告警", md:"**/data** 使用率 92%", sender:"运维"}`
- 「给张三（手机 13800000000）发条飞书消息：下午三点开会」→ ① `feishu.contact.search_user {mobiles:"13800000000"}` 拿 `ou_` → ② `feishu.im.send_text {receive_type:"user", target:"ou_xxx", text:"下午三点开会"}`（不传 sender → 默认署名）
