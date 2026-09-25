---
name: dingtalk-send-notice
description: 向钉钉发企业通知/消息的完整指南：前置条件与配置格式核对、把手机号换成钉钉 userId、给成员发工作通知（文本/Markdown）、向群自定义机器人 webhook 推送消息、发起人署名规则与常见报错处置。
  Use when 用户要求「通过钉钉发通知/发消息给某人或某个群/告警推送到钉钉」时取用本技能。
metadata:
  version: "1.0.0"
  author: biz-dingtalk-connector
allowed-tools:
  - dingtalk.app.send_text
  - dingtalk.app.send_markdown
  - dingtalk.robot.send
  - dingtalk.contact.search_user
  - dingtalk.contact.user_info
---

# 钉钉消息发送指南（企业钉钉连接服务）

> **调用方式（必读）**：本插件的方法统一通过 `local_service_call` 调用，参数里**必须带** `service_name: "biz-dingtalk-connector"`（即本技能的 `author`，也就是插件名）与 `method_name`（如 `dingtalk.app.send_text`），再加上各方法自己的参数（见下文）。缺 `service_name` 会被宿主直接拒绝。

## 0. 出发前必查（先分流，别直接发）

按顺序自查，任何一条不满足就先处理，不要带着问题去试发：

1. **通道要选对（最重要）**：
   - **发个人（工作通知）** → `dingtalk.app.send_text` / `dingtalk.app.send_markdown`，需要 `config.app_key` + `config.app_secret` + `config.agent_id` 齐全；
   - **发群** → 只能走群自定义机器人 `dingtalk.robot.send`（webhook），**不需要** app_key/app_secret；工作通知接口无法发群。
2. **配置已就绪**：`plugin.json` 的 `config.app_key`/`config.app_secret`/`config.agent_id`（个人）或 `config.robot_webhook`（+`config.robot_sign`，群机器人）非空；若打算用"预配名字"发消息，先核对 `config.recipients` 格式（见 §1）。
   —— 插件**每次调用都重读 plugin.json，改配置即时生效，无需重启**；"改了没生效"基本是格式写错而不是没重载。
3. **钉钉侧已开通**：企业自建应用已申请相关权限并**发布版本**（部分需企业管理员审核）；**添加群机器人**：在目标群里「设置 → 机器人 → 添加机器人」，复制 webhook（含 access_token）；若安全设置选了**加签**，把 secret 填入 `config.robot_sign`（或 recipients 对应项的 `robot_sign`）。
4. **分清楚几个标识**（重要）：
   - **userId** = 钉钉组织内成员标识（如 `zhangsan`），是 `dingtalk.app.send_*` 和 `user_info` 认的收件人，可先 `dingtalk.contact.search_user` 用手机号换；
   - **webhook URL** = 群机器人入口，内含 access_token，属敏感凭证，**不要把它写进消息文案/回显**；
   - `sender` = 消息里的署名（纯文字，**不需要、也不该传 userId**）。

## 1. config.recipients 预配格式（用名字发消息时才需要看）

`recipients` 是**对象数组**，每一项是 `{name, type, target}`，示例：

```jsonc
"recipients": [
  // 个人成员：target = 钉钉 userId（不是 open_id）
  { "name": "张三", "type": "user", "target": "zhangsan" },
  // 群机器人：target = 完整 webhook URL；加签机器人的 secret 可放在各自的 robot_sign（可选）
  { "name": "IT告警群", "type": "robot", "target": "https://oapi.dingtalk.com/robot/send?access_token=xxx",
    "robot_sign": "SECxxxxxxxx" }
]
```

- `name` 就是你调用时填的 `target` 值，**大小写敏感**；`type` 只能是 `user`（个人，工作通知用）/ `robot`（群机器人，robot.send 用）；`target` 是字符串；
- 任一项**不是对象**（比如写成数字/字符串，或整个配成了 `{"群名":{...}}` 的字典）会得到清晰报错：
  `config.recipients 应为数组 / 第 n 项应为对象 {name,type,target}`——按上面格式修即可，**无需重启**；
- `recipients` 只是"别名"便利，属于可选；拿不到稳定名字时**不要依赖它**（见 §3 最快路径）。

## 2. 通道选择细则

- **dingtalk.app.send_text / send_markdown（工作通知，发个人）**：`target` = userId 或 recipients 里 `type=user` 的名字；正文 `text`（markdown 还可带 `title`，默认"企业通知"）。用户在钉钉里收到的是**应用工作通知**。
- **dingtalk.robot.send（发群）**：`target` 留空 = `config.robot_webhook`（+`config.robot_sign`）；或填 recipients 里 `type=robot` 的机器人名（用各自 `robot_sign`）；或直接填完整 webhook URL。`msgtype` = `text` | `markdown`，`content` 为正文。群里显示的是**机器人**发的消息。
- 若传了**不匹配的预配名**（如把 `type=robot` 的名字传给工作通知、或把成员名传给 robot.send），插件会报错并提示应走另一通道。

## 3. 最快路径：把手机号换成 userId，别猜配置

- 拿到目标手机号 → `dingtalk.contact.search_user {mobiles:"138..."}` 拿 `userId` → 直接填 `target`；
- 钉钉**不支持按姓名/邮箱反查**；只有手机号能换 userId。号码没匹配到会出现在返回的 `not_found` 里（可能不在应用可见范围或号码未激活）；
- 发消息前可先用 `dingtalk.contact.user_info {userid:".."}` 确认姓名/部门再发。

## 4. 署名 sender 规则（重要）

- 消息**发送身份恒为应用/机器人**，`sender` 只是消息里的**署名文字**，不需要对应真实钉钉用户，更不需要 userId；
- `sender` 只填**可读名**（张三 / 运维 / IT 值班）。**留空** → 用 `config.default_sender`（默认"企业助手"）。钉钉个人标识是 **userId**，不是 open_id——**不存在**"传 userId 自动换成姓名"的逻辑，乱传 ID 只会把 ID 当作署名文字；
- 若配置了 `config.allowed_senders` 白名单（非空），最终署名必须命中，否则拒绝发送（防冒用）；
- 不要承诺"以某人的名义发送"——那是 OAuth 授权模型，超出本插件能力。

## 5. 文本还是 Markdown

- 普通文字/简短提醒 → `dingtalk.app.send_text {target, text, sender?}`（个人）或 `dingtalk.robot.send {msgtype:"text", content, sender?}`（群）；
- **重要告警/结构化通知** → 个人用 `dingtalk.app.send_markdown {target, text, title?, sender?}`，群用 `dingtalk.robot.send {msgtype:"markdown", content, title?, sender?}`。
- 发个人前先 `search_user` 拿 userId；可再用 `user_info` 确认身份再发。

## 6. 常见报错速查表

| 报错/现象（errmsg 特征） | 含义 | 处置 |
|---|---|---|
| 缺少 `config.app_key` / `config.app_secret` | 凭证未填 | 管理员在 plugin.json 填写（即时生效） |
| `config.agent_id 未配置或为 0` | 工作通知没配 AgentId | 钉钉开放平台应用详情查 AgentId 填入（app.* 方法必需；robot.send 不需要） |
| 缺少机器人目标 / robot_webhook 为空 | robot.send 没配置 webhook | 填 `config.robot_webhook` 或传 recipients 机器人名/完整 URL |
| errmsg 含 `sign not match` / `timestamp` | 加签校验失败 | 核对 `robot_sign`（或该机器人的 `robot_sign`）与群机器人"加签"密钥一致；确认服务器时间同步 |
| errmsg 含 `keywords not in content` | 机器人安全设置是"自定义关键字"，内容未含关键字 | 在正文里带上已设关键字，或让管理员改安全设置 |
| 发送"成功"但个人没收到 | 成员不在应用可见范围 / 版本未发布 | 开放平台设置可见范围并发布版本；用 search_user 复核 userId 归属 |
| errmsg 含 `no permission` / `Forbidden` / 权限类非 0 码 | 权限未申请/未发布 | 找企业管理员申请并发布，**不要反复重试** |
| `config.recipients 应为数组…` / `第 n 项应为对象…` / `type 无效` | 预配格式写错 | 按 §1 修正；无需重启 |
| `署名 [x] 不在允许名单内` | sender 未命中 allowed_senders | 改传名单内署名，或让管理员加白名单 |

## 7. 示例

- 「通知 IT 告警群：磁盘使用率 92%」→ 若群已配机器人且加了加签 secret：`dingtalk.robot.send {target:"IT告警群", msgtype:"markdown", title:"存储告警", content:"**/data** 使用率 92%", sender:"运维"}`（若该机器人没开加签则别带 sign 配置）
- 「给张三（手机 13800000000）发条钉钉通知：下午三点开会」→ ① `dingtalk.contact.search_user {mobiles:"13800000000"}` 拿 `userId` → ② `dingtalk.app.send_text {target:"<userId>", text:"下午三点开会"}`（不传 sender → 默认署名）
