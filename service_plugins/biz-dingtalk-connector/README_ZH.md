<!--
  ┌─────────────────────────────────────────────────────┐
  │  apex-mcp-bridge 插件 README 模板（中文）            │
  │  biz-dingtalk-connector —— 面向用户的配置指南        │
  └─────────────────────────────────────────────────────┘
-->
<p align="center">
  <img src="https://img.shields.io/badge/plugin-biz--dingtalk--connector-3370ff?style=flat-square" alt="plugin">
  <img src="https://img.shields.io/badge/api%20version-plugin.gis%2Fv1-6c5ce7?style=flat-square" alt="API Version">
  <img src="https://img.shields.io/badge/version-0.1.0-blue?style=flat-square" alt="Version">
  <img src="https://img.shields.io/badge/python-3-3776AB?logo=python&style=flat-square" alt="Python">
  <img src="https://img.shields.io/badge/server-oapi.dingtalk.com-orange?style=flat-square" alt="Server">
</p>

# 企业钉钉连接服务（biz-dingtalk-connector）

面向钉钉开放平台（`oapi.dingtalk.com`）的连接插件：把消息通过钉钉发给**个人**（应用工作通知）或**群**（群自定义机器人 webhook），并能用手机号反查 `userId`、按 `userId` 查成员详情。

本文是**面向使用/管理员的配置指南**：重点讲清每一项配置从钉钉哪里拿、怎么填、常见坑。所有字段名、方法名、签名算法均以本插件 `plugin.json` 与代码为准，不超出插件实际能力做承诺。

> 本插件运行在 apex-mcp-bridge 之上。关于插件系统的整体架构与调用方式，请参阅宿主项目文档。

## 目录

- [一、能力方法清单](#一能力方法清单)
- [二、两条通道与钉钉侧前置准备](#二两条通道与钉钉侧前置准备)
- [三、★ 配置指南（plugin.json config）★](#三-配置指南pluginjson-config)
- [四、配置示例（脱敏）](#四配置示例脱敏)
- [五、快速开始 / 连通性验证](#五快速开始--连通性验证)
- [六、官方参考文档](#六官方参考文档)
- [七、常见问题（FAQ）](#七常见问题faq)
- [八、常见误区提醒](#八常见误区提醒)
- [九、附：调用协议与文件结构](#九附调用协议与文件结构)

---

## 零、先认识几个标识（别混）

| 标识 | 是什么 | 在哪看 |
|------|--------|--------|
| `userId` | 企业内成员的**个人标识**（如 `zhangsan`），是"发工作通知/查详情"认的收件人 | 钉钉管理后台「通讯录→成员管理」点成员查看；或用本插件 `dingtalk.contact.search_user` 按手机号反查 |
| `openid / unionid` | 其它体系标识，**本插件不认**，别往里填 | — |
| `AgentId` | 企业自建应用的**数字**标识，发工作通知必需 | 开发者后台→应用详情（见 §三） |
| `AppKey/AppSecret`（新版标注 **Client ID / Client Secret**） | 应用身份凭证，用于换 `access_token` | 开发者后台→应用详情→凭证与基础信息（见 §三） |
| 机器人 `webhook` | 群自定义机器人入口 URL，**本身含 access_token，属敏感凭证** | 目标群→群设置→机器人（见 §三） |

---

## 一、能力方法清单

全部方法：`mode=sync`、默认超时 30s；成功返回 `{"code":0,"msg":"ok","data":{...}}`，失败返回 `{"code":-1,"msg":"原因","data":null}`。

| 方法 | 通道 / 底层接口 | 默认 `risk_level` | 一句话说明 |
|------|------------------|------------------|-----------|
| `dingtalk.app.send_text` | 工作通知发个人（`topapi/message/corpconversation/asyncsend_v2`） | `normal` | 以自建应用身份给指定成员发**纯文本**消息（收件人=钉钉 `userId`） |
| `dingtalk.app.send_markdown` | 同上（工作通知） | `normal` | 发 **Markdown 富文本**消息，可带 `title`（默认「企业通知」） |
| `dingtalk.robot.send` | 群自定义机器人（`robot/send` webhook，支持加签） | `normal` | 向**群**推 text/markdown（发群的唯一通道）；**不需要** app 凭证 |
| `dingtalk.contact.search_user` | 通讯录（`topapi/v2/user/getbymobile`） | `risk` | 按**手机号**反查 `userId`（一次最多 20 个，逗号分隔） |
| `dingtalk.contact.user_info` | 通讯录（`topapi/v2/user/get`） | `risk` | 按 `userId` 查成员详情（姓名/手机号/部门等），发通知前确认收件人用 |

> **关于 `risk_level`**：上表为插件出厂默认值。管理员可在宿主管理界面调整：`disable` 关闭、`auth` 需人工审批、`risk`→`normal` 降级等。`risk` 级别方法涉及通讯录隐私查询，调用会留审计痕迹。

插件**不提供**的能力（别预期）：不接收/监听消息回调（只推不收）；不做 OAuth「以某人的身份发送」；钉钉不支持按姓名/邮箱反查用户，只能按手机号。

---

## 二、两条通道与钉钉侧前置准备

### 2.1 记住两条通道

| 想干什么 | 走的通道 | 需要配置 | 谁收到 |
|----------|----------|----------|--------|
| 发给**某个人** | 工作通知（`dingtalk.app.*`） | `app_key` + `app_secret` + `agent_id` | 个人在钉钉收到「工作通知」 |
| 发给**某个群** | 群自定义机器人 webhook（`dingtalk.robot.send`） | `robot_webhook`（加签则 +`robot_sign`） | 群里显示为机器人发的消息 |

- **工作通知发不了群**；**机器人 webhook 也发不了个人**（它只认 webhook，不认 userId）。把群里用的配置拿去发个人、或个人 userId 拿去发群，都会报错。
- `dingtalk.contact.*`（通讯录查询）只要 `app_key`/`app_secret`，不需要 `agent_id`。

### 2.2 钉钉侧三件事（需企业管理员/开发者配合）

1. **建企业自建应用**：开发者后台 → 应用开发 → 钉钉应用 → 创建「企业内部应用」。
2. **开权限 + 发布版本**：
   - 在应用详情 → **权限管理** 申请相关权限：发工作通知需消息类权限；按手机号查人 / 查成员详情需通讯录读取类权限（手机号查询属敏感权限，部分需企业管理员审批）。
   - 在应用详情 → **版本管理与发布** 发布版本，经企业管理员审核后权限才生效。**只有发布后**，工作通知/通讯录接口才可用。
   - 目标成员须在该应用的**可见范围**内，否则查不到也收不到。
3. **给群加自定义机器人**：需在企业成员的**钉钉客户端**操作（管理后台加不了群机器人）：目标群 → 群设置 → 机器人 → 添加机器人 → 选「自定义（通过 Webhook 接入自定义服务）」→ 安全设置**至少选一种**（自定义关键字 / 加签 / IP 白名单）→ 完成后**复制 Webhook 完整地址**（含 `access_token=...`）。机器人只有加进了群，才能给该群发消息。

---

## 三、★ 配置指南（plugin.json config）★

插件的全部配置在插件目录 `plugin.json` 的 `config` 节（通常由管理员在宿主管理界面的插件配置页填写，与直接编辑 `plugin.json` 等效）。插件**每次调用都会重读 plugin.json，修改即时生效，无需重启**；"改了没生效"多半是字段名/格式写错。

### 3.1 配置总表

| 字段 | 是否必填 | 从哪里获取（钉钉侧位置） | 说明 |
|------|----------|--------------------------|------|
| `app_key` | **条件必填**：用 `dingtalk.app.*` 或 `dingtalk.contact.*` 时必须 | **开发者后台**（open-dev.dingtalk.com）→ 应用开发 → 钉钉应用 → 你的「企业内部应用」→ 应用详情 → **凭证与基础信息** → **Client ID**。注：新版后台标注为 Client ID，接口参数/旧版文档称 **AppKey**，两者是同一个值；字段实际标注以你后台看到的为准 | 应用身份凭证（取 token 用）。示例以 `ding` 开头 |
| `app_secret` | 同上 | 同上一行的**凭证与基础信息** → **Client Secret**（旧称 **AppSecret**），两者同一值，以实际标注为准 | 与 `app_key` 配套的密钥，**等同密码，勿泄露**；请勿明文写进消息文案 |
| `agent_id` | **仅 `dingtalk.app.*`（工作通知）必填**；机器人/通讯录查询不需要 | 企业内部应用在开发者后台**应用详情页标注的 `AgentId`**（数字；部分后台版本显示在「凭证与基础信息」区域，位置以实际标注为准）。注意：**AgentId 是数字**，不是 AppKey/Client ID | 工作通知（asyncsend_v2）必需；`plugin.json` 里是整数，别填成字符串或 AppKey |
| `robot_webhook` | **条件必填**：`dingtalk.robot.send` 不传 `target` 时使用 | 钉钉**客户端**：目标群 → 群设置（右上角…）→ 机器人 → 添加机器人 → 选「自定义」→ 创建后**复制 Webhook**，形如 `https://oapi.dingtalk.com/robot/send?access_token=xxx` | 群机器人入口 URL，**URL 内已含 access_token，属敏感凭证**：不要回显、不要写进消息/日志；机器人被移出群后该地址失效 |
| `robot_sign` | **条件必填**：当该机器人安全设置选了「**加签**」时 | 同一机器人的创建/设置页，安全设置「加签」一栏下的 **SEC 开头的字符串**，整段复制 | 用于 HMAC-SHA256 加签（算法见 §五）。若机器人安全设置是「自定义关键字」，则**不要**配 sign，改保证消息正文包含关键字；若选的是「IP 白名单」，则需放行运行插件服务器的公网出口 IP |
| `default_sender` | 否（默认 `企业助手`） | 自定义 | 不传 `sender` 参数时的默认**署名文字**（会附在消息末尾形成审计线索） |
| `allowed_senders` | 否（默认空=不限制） | 自定义 | **发起人署名白名单**（字符串数组）。非空时，本次调用的 `sender`（或默认署名）必须命中，否则拒绝发送——防冒用 |
| `recipients` | 否（默认空） | 可选：成员 `userId` 从 §零 获取；机器人 webhook 同 `robot_webhook` | 「别名」便利配置：给常用收件人起名字，调用时 `target` 直接写名字即可（见 3.2） |

> 使用场景 → 最小配置速查：
> - 给个人发工作通知：`app_key` + `app_secret` + `agent_id`
> - 手机号查 userId / 查成员详情：`app_key` + `app_secret`
> - 给群发消息（默认机器人）：`robot_webhook`（加签机器人再配 `robot_sign`）
> - 想用"名字"发信：加 `recipients`；想限制发起人：加 `default_sender` + `allowed_senders`

### 3.2 `recipients` 子格式

对象数组，每项 `{name, type, target}`：

```jsonc
{
  "name": "张三",                                    // 调用时 target 填的名字（大小写敏感）
  "type": "user",                                    // user=个人成员（target 填 userId）
  "target": "zhangsan"
}
{
  "name": "IT告警群",                                // 调用时 target 填的名字（大小写敏感）
  "type": "robot",                                   // robot=群机器人（target 填完整 webhook）
  "target": "https://oapi.dingtalk.com/robot/send?access_token=xxx",
  "robot_sign": "SECxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"  // 可选：该机器人自己的加签密钥
}
```

> 上为片段示意，完整时应是同一数组 `recipients: [...]` 里的两项（`user` 与 `robot` 可混排，数量不限）。

- `type` 只能是 `user` 或 `robot`；`target` 必须非空；缺 `name`、写成字典/数字等都会得到明确报错（按报错改即可，无需重启）。
- `robot.send` 的 `target` 解析顺序：留空 → `config.robot_webhook`(+`config.robot_sign`)；命中 `recipients` 里 `type=robot` 的名字 → 用该项自己的 webhook/`robot_sign`；以 `http(s)://` 开头 → 当作完整 webhook URL（加签 secret 取 `config.robot_sign`）。
- `recipients` 只是可选的"别名"；没有稳定名字时不依赖它，直接传 userId / webhook URL 即可。

---

## 四、配置示例（脱敏）

```jsonc
{
  "config": {
    "app_key": "dingxxxxxxxxxxxxxxxx",                 // Client ID / AppKey（以 ding 开头）
    "app_secret": "替换为你的ClientSecret",             // 请勿外泄
    "agent_id": 1234567,                              // 数字 AgentId（工作通知用）
    "robot_webhook": "https://oapi.dingtalk.com/robot/send?access_token=xxx", // 仅示意，实际为完整 token
    "robot_sign": "SECxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx", // 占位；未开加签则留空 ""
    "default_sender": "IT运维助手",
    "allowed_senders": ["IT运维助手", "值班告警"],
    "recipients": [
      { "name": "张三", "type": "user", "target": "zhangsan" },
      { "name": "IT告警群", "type": "robot",
        "target": "https://oapi.dingtalk.com/robot/send?access_token=xxx",
        "robot_sign": "SECxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" }
    ]
  }
}
```

> ⚠️ 以上 `webhook`/`sign` 均为占位演示。真实配置时请把「复制」到的完整 webhook（含真实 access_token）与完整 SEC 密钥原样填入，并保证 `plugin.json` 是合法 JSON（逗号、引号别丢）。

> **凭证建议走密钥箱**：`app_secret`（及 `robot_webhook` / `robot_sign`）属敏感凭据，不建议长期明文留在 `plugin.json`。可在文件中保留占位符 `${app_secret}`，把真实值录入插件密钥箱（键名 `app_secret`，归属插件 `biz-dingtalk-connector`），由宿主在调用前解析注入；未录入 / 已停用时调用会直接失败并提示「引用的密钥不可用」。完整约定见 [service_plugins/README_ZH.md](../README_ZH.md#插件密钥箱配置占位符)。

---

## 五、快速开始 / 连通性验证

### 5.1 验 access_token（先验凭证与网络）

用 `app_key`/`app_secret` 请求 token 接口（与插件 `dingtalk.app.*`、`dingtalk.contact.*` 同款）：

```bash
curl 'https://oapi.dingtalk.com/gettoken?appkey=dingxxxxxxxxxxxxxxxx&appsecret=<你的AppSecret/ClientSecret>'
```

期望返回（`errcode=0` 即通）：

```json
{ "errcode": 0, "errmsg": "ok", "access_token": "xxxxxxxx", "expires_in": 7200 }
```

- 返回非 0：多为 appkey/appsecret 抄错（注意别把 Client ID/Secret 与 AgentId 填反），或应用未发布。token 有效期 2 小时，插件在进程内缓存、过期前自动刷新，无需人工维护。

### 5.2 试发群机器人（先验证 webhook 通道）

**未开加签**的机器人，直接 POST：

```bash
curl -s 'https://oapi.dingtalk.com/robot/send?access_token=xxx' \
  -H 'Content-Type: application/json' \
  -d '{"msgtype":"text","text":{"content":"连通性测试：企业钉钉连接服务"}}'
```

期望：`{"errcode":0,"errmsg":"ok"}`。若报错见 §七。

### 5.3 自定义机器人「加签」流程（开了加签的机器人必须）

加签即对请求附加 `timestamp` 与 `sign` 两个参数。算法（插件 `dingtalk_utils.py` 同款）：

1. `string_to_sign = timestamp + "\n" + secret`，其中 `timestamp` 为**毫秒**时间戳；
2. 以 `secret`（SEC 开头那串）为密钥对 `string_to_sign` 做 **HMAC-SHA256**；
3. 对结果做 **Base64** 编码；
4. 再 **URL 编码**（空格编码为 `+`），得到 `sign`；
5. 把 `timestamp`、`sign` 拼到 webhook URL 后请求。

可用下列 Python 片段生成（与插件实现一致）：

```python
import time, hmac, hashlib, base64, urllib.parse

secret = "SECxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"          # 机器人安全设置-加签 里的密钥
timestamp = str(round(time.time() * 1000))            # 毫秒时间戳
string_to_sign = "{}\n{}".format(timestamp, secret)
sign = urllib.parse.quote_plus(base64.b64encode(
    hmac.new(secret.encode("utf-8"), string_to_sign.encode("utf-8"),
             digestmod=hashlib.sha256).digest()))
print("timestamp:", timestamp)
print("sign:", sign)
```

再试发：

```bash
curl -s 'https://oapi.dingtalk.com/robot/send?access_token=xxx&timestamp=<上一步timestamp>&sign=<上一步sign>' \
  -H 'Content-Type: application/json' \
  -d '{"msgtype":"text","text":{"content":"连通性测试（加签）"}}'
```

期望：`{"errcode":0,"errmsg":"ok"}`。

> 时间戳与钉钉服务器时间误差须在 1 小时以内——请保证运行插件的主机时钟已同步（NTP）。插件每次调用会自动完成加签，本节只是为了让你**独立验证**配置/密钥是否正确。

### 5.4 端到端试发

- 个人：先 `dingtalk.contact.search_user {"mobiles":"138..."}` 拿 `userId` → 再 `dingtalk.app.send_text {"target":"<userId>","text":"你好"}`。
- 群：`dingtalk.robot.send {"target":"IT告警群","msgtype":"text","content":"你好"}`（`target` 留空则走 `config.robot_webhook`）。

---

## 六、官方参考文档

仅列真实入口；文档名/菜单位置随钉钉版本可能变化，请以文档中心实际标题为准：

| 用途 | 入口 / 文档名 |
|------|----------------|
| 钉钉开放平台首页 / 文档中心 | https://open.dingtalk.com/ |
| 开发者后台（建应用、凭证、权限、发布） | https://open-dev.dingtalk.com/ |
| 企业管理后台（通讯录成员管理，查 `userId`） | https://oa.dingtalk.com/ |
| 基础概念（Client ID/Secret、AgentId、UserId 定义与查看路径） | 「基础概念」：https://open.dingtalk.com/document/dingstart/basic-concepts-beta |
| 企业内部应用如何获取 access_token | 「获取企业内部应用的 accessToken」 |
| 创建企业内部应用 | https://open.dingtalk.com/document/development/create-an-h5-application-for-your-enterprise |
| 群自定义机器人安全设置（加签/关键字/IP 白名单） | 「自定义机器人安全设置」：https://open.dingtalk.com/document/robots/customize-robot-security-settings |
| 群自定义机器人发消息（webhook 接口） | 「自定义机器人发送群聊消息」（在开放平台文档中心搜索该名） |
| 工作通知发送（插件 `asyncsend_v2` 底层接口） | 文档中心搜索「机器人发送群聊消息」/「工作通知」（旧版名）等，以实际标题为准 |
| 通过手机号获取用户 userId（插件 `getbymobile` 底层接口） | 文档中心搜索「通过手机号获取用户 userId」 |
| 调用频次与限流 | 「调用频次与限流」（文档中心搜索） |

> 不确定精确文档路径时，一律回到开放平台首页 https://open.dingtalk.com/ 的文档中心，按上表文档名检索。

---

## 七、常见问题（FAQ）

<details>
<summary><b>Q: 调用返回 errcode 非 0（报错文案带 errcode=…/errmsg=…）？</b></summary>

钉钉业务码非 0 的常见原因（插件报错原文提示）：**权限未开通/版本未发布、参数有误、成员不在可见范围、机器人加签或关键字安全设置不匹配**。请核对配置后再试，**不要反复密集重试**（会触发限流）。具体码含义以钉钉全局错误码文档 / 返回的 `errmsg` 为准，本插件不翻译、不编造具体码。
</details>

<details>
<summary><b>Q: 权限已申请/配置也对了，还是提示无权限（no permission / Forbidden）？</b></summary>

大概率是**版本未发布**或**审核未通过**：新建应用申请权限后，必须在「版本管理与发布」发布版本（部分需企业管理员在管理后台审核），发布后权限才生效。另外检查目标成员是否在该应用**可见范围**内（不在范围→查不到/收不到，表现为"发送成功但对方没收到"）。
</details>

<details>
<summary><b>Q: 机器人不在群 / 发群没反应？</b></summary>

机器人只有被加进目标群才能向该群发消息；机器人被移出群或群被解散后，原 webhook 即失效。处置：在钉钉客户端重新「添加机器人（自定义）」，复制**新的** webhook 更新到 `config.robot_webhook`（或 `recipients` 对应项）。
</details>

<details>
<summary><b>Q: 加签参数错误（errmsg 含 sign not match / invalid timestamp）？</b></summary>

- `SEC` 密钥没抄全 / 多抄了空格——整段复制并核对 `robot_sign`；
- 服务器时间偏差超 1 小时（`timestamp` 无效）——同步主机时钟（NTP）；
- 机器人安全设置与配置不一致：机器人实际是「自定义关键字」却配了加签，或反之。关键字机器人的消息必须**包含已设关键字**（否则 errmsg 含 `keywords not in content`），加签机器人才需要 `robot_sign`；
- 若机器人配了 IP 白名单：放行运行本插件服务器的**公网出口 IP**。
</details>

<details>
<summary><b>Q: 限频（发多了被拒）？</b></summary>

群自定义机器人每个约 **每分钟 20 条**（以钉钉官方限制为准），超限会被拒绝，稍等再发；工作通知 / 通讯录 / 取 token 等接口也各有应用级频控，避免短时间密集重试。插件进程内缓存 token（提前刷新），不会因反复取 token 触发限流。
</details>

<details>
<summary><b>Q: 改了 plugin.json 不生效？</b></summary>

插件**每次调用都重读** plugin.json，改配置即时生效、无需重启。不生效基本是 JSON 格式错 / 字段名拼错 / 值写进了错误的节（必须在 `config` 节下）。`recipients` 逐项校验，格式错误会给出具体报错（第几项、缺什么）。
</details>

<details>
<summary><b>Q: 发送"成功"但个人没收到？</b></summary>

工作通知是异步投递，返回 `task_id` 只代表钉钉已受理。收不到通常是：成员不在应用**可见范围**、版本未发布、或 `userId` 填错（可先 `search_user` 按手机号反查，再用 `user_info` 确认姓名部门再发）。
</details>

---

## 八、常见误区提醒

1. **个人 `target` 填的是钉钉 `userId`**（如 `zhangsan`），**不是 openid/unionid**，也不能直接填手机号；手机号需先经 `dingtalk.contact.search_user` 换成 `userId`。
2. **「工作通知」与「群自定义机器人 webhook」是两条独立渠道**：工作通知发个人、机器人 webhook 发群，互不通用；把预配名/参数混用会收到明确报错（插件会提示应改走另一通道）。
3. **自定义机器人 webhook 内已含 access_token**，等于"群门口的门禁凭证"，属敏感信息：不要把它写进消息文案、日志或回显给无关人员；插件对 webhook 只回显机器人名字/标签，不打印 URL。
4. **`sender` 只是消息里的署名文字**：不需要、也不该传 userId；不存在"传 userId 自动换成姓名"的逻辑。配置了 `allowed_senders` 白名单时署名必须命中，否则拒绝发送。
5. **不要承诺"以某人的名义发送"**：本插件发送身份恒为应用/机器人，署名防冒用靠白名单；"代用户发消息"是 OAuth 授权模型，超出本插件能力。
6. **权限"申请了"不等于"生效了"**：需发布版本（新版应用发布走审核）。钉钉侧生效需要时间，别在没发布时反复试发。
7. **钉钉不支持按姓名/邮箱反查 userId**：只能按手机号；查不到可能是不在应用可见范围或号码未激活（会出现在 `not_found` 中）。

---

## 九、附：调用协议与文件结构

方法经宿主（MCP `local_service_call`）调用：每个方法独立进程运行，stdin 收单行 JSON 参数，stdout 返回唯一一行 JSON。失败时 `msg` 携带原因，进程退出码为 1。

```
biz-dingtalk-connector/
├── plugin.json          # 插件清单（manifest + 方法定义 + config 默认值 = 配置所在）
├── requirements.txt     # 依赖（requests>=2.25.0）
├── dingtalk_utils.py    # 公共模块（config 读取 / token / 签名 / 统一错误处理）
├── send_text.py         # dingtalk.app.send_text
├── send_markdown.py     # dingtalk.app.send_markdown
├── robot_send.py        # dingtalk.robot.send
├── search_user.py       # dingtalk.contact.search_user
├── user_info.py         # dingtalk.contact.user_info
├── web_ui/index.html    # 调试面板（插件管理入口访问）
├── skills/dingtalk-send-notice/SKILL.md  # 消息发送技能指南
├── shadow_mode.py       # 影子演练模式公共模块（config.shadow_mode / shadow_log_dir）
├── shadow_status.py / shadow_list.py / shadow_approve.py / shadow_reject.py / shadow_set_mode.py / shadow_archive.py  # dingtalk.shadow.* 管理方法
├── README.md            # English documentation
└── README_ZH.md         # 本文件（中文）
```

## 十、影子演练模式

- 将 `config.shadow_mode` 设为 `true` 即进入演练：`dingtalk.app.send_text` / `dingtalk.app.send_markdown` / `dingtalk.robot.send` 三个对外发消息方法只把调用记录到 `<插件目录>/<shadow_log_dir(默认 shadow_log)>/records.jsonl` 并返回 `shadow:true`，**绝不真实发送**（含取 access_token 前即拦截）；改回 `false` 恢复真实执行。管理方法 `dingtalk.shadow.status/list/approve/reject/set_mode/archive` 用于查看记录、批准（真发重放）/驳回/切换开关/归档；记录仅存方法参数、不含 `plugin.json` config 凭证。
