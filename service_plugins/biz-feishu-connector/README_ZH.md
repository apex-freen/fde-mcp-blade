<!--
  biz-feishu-connector —— 企业飞书连接服务
  设计文档 / 对接说明 (2026-09-08)
-->
# biz-feishu-connector —— 企业飞书连接服务

> 对接 [飞书开放平台](https://open.feishu.cn)（自建应用），把飞书能力以 MCP 工具形式暴露给 AI 智能体/前端：
> **消息通知推送 + 通讯录查询 + 日历日程**。拷贝文件夹到 `service_plugins/` 即安装。

| 项 | 值 |
|---|---|
| 插件 ID | `biz-feishu-connector` |
| 场景前缀 | `biz-`（企业） |
| 服务类型 | `feishu-connector` |
| Python | ≥ 3.8 |
| 主要依赖 | `lark-oapi`（飞书官方 SDK，PyPI） |
| 协议 | MCP 插件标准（stdin 传参 / stdout 返回 JSON） |

---

## 一、可行性结论

**可以对接，且与现有插件框架完全匹配。** 本框架本质是"Rust 宿主 → 外部服务"的桥（内网 HTTP/SOAP、DLNA 皆如此），飞书只是一个走 HTTPS 的云服务，模式一致：

```
AI 智能体 / 前端
   │  MCP 调用 feishu.xxx
   ▼
apex-mcp-bridge (Rust) ──启动──> python3 <handler>.py <方法名>
                                        │ stdin: {"参数"}
                                        ▼
                                  feishu_utils.py（公共模块）
                                        │ lark-oapi / HTTPS
                                        ▼
                             open.feishu.cn（飞书开放平台）
```

**运行前提（唯一硬性要求）**：运行 bridge 的主机必须能**出站访问 `open.feishu.cn:443`**（标准 HTTPS）。无需公网入站、无需端口映射、无需固定 IP——所有调用都是插件主动向外发起。

**快速验证连通性**（在 NAS 上执行）：

```bash
curl -s -X POST https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal \
  -H "Content-Type: application/json" \
  -d '{"app_id":"cli_xxx","app_secret":"xxx"}'
```

能返回 `{"code":0,"tenant_access_token":"t-..."}` 即通路正常。

---

## 二、前置准备（一次性，在飞书侧完成）

1. 在 [飞书开放平台](https://open.feishu.cn/app) →「创建企业自建应用」，获得 `app_id` / `app_secret`；
2. 应用内开启**机器人**能力；
3. 申请权限（scope，见下节），**发布应用版本**（需企业管理员审核通过后权限才生效）；
4. 把机器人拉进需要推送消息的群，或确认其在目标用户"可用范围"内；
5. `app_id` 填入本插件 `plugin.json` 的 `config.app_id`；`app_secret` **不要写进文件**，改为录入「插件密钥箱」后，在 `config.app_secret` 保留占位符 `${app_secret}`（见下文「凭证管理」）。

> 注意：应用从"创建"到"权限生效"通常需要走一次**发布审核**；仅测试可用「沙箱/测试企业」环境。

---

## 三、身份模型：谁是发送人（重要）

这是本插件设计中最关键的一点，先厘清概念：

### 3.1 飞书只认两种发送身份，插件无法伪造

| 身份 | 换取方式 | 消息显示 | 适用 |
|---|---|---|---|
| **机器人** | `app_id`+`app_secret` 换 `tenant_access_token` | 显示为应用机器人（名字/头像在飞书后台设置） | ✅ 本插件默认采用 |
| **真人用户** | 该用户在飞书内 OAuth 授权后换 `user_access_token` | 显示为该用户本人 | ❌ 不适合"即调即弃"的插件进程模型 |

结论：**插件一律以机器人身份发送**。飞书在协议层面不允许应用冒充真人发消息（以真人名义必须本人授权），因此不存在"我怎么标记成某某"的问题——你不需要标记，也不能伪造，消息天然署名机器人。

### 3.2 "谁发起"是业务概念，须显式传入

本插件宿主（MCP stdin 协议）**不提供隐式"当前登录用户"上下文**，因此"这条通知是张三要求发的"必须由调用方显式声明：

- 每个发送类方法提供可选参数 `sender`（如 `"张三"`、`"运维"`），缺省取 `config.default_sender`；
- 插件把 `sender` 作为**署名**写入消息文本或卡片头部（如 `📢 张三 · NAS 存储告警`）；
- 防冒用：若配置了 `config.allowed_senders` 白名单，`sender` 必须命中名单，否则拒绝执行（机制参考 hom-message-board 的 `members` 校验）；
- 宿主侧可结合方法 `risk_level`（见下）对该类调用做审计/授权，形成"谁在什么级别下发了什么"的完整链路。

### 3.3 给"某个人"发消息的标识：`open_id`，不是姓名

- 飞书个人收件人标识为 `open_id`（**应用视角**的用户 ID，同一用户在两个应用里 open_id 不同）；
- 获取 `open_id` 的途径：
  1. 调用 `feishu.contact.search_user`（按姓名/手机号/邮箱 → 返回 `open_id`，需 `contact:user.base:readonly` 权限）；
  2. 在 `config.recipients` 预配常用收件人（`{"name":"张三","type":"user","target":"<open_id>"}`），调用时用名字即可；
- 群收件人标识为 `chat_id`，同样可预配，或由 `feishu.im.search_chat` 查询。

> 后续演进：可在插件内维护"**本系统用户 ↔ open_id 匹配表**"，让 `target`/`sender` 直接用本系统用户名解析，并做更强的身份校验（见文末附录，仅设计，本期不开发）。

---

## 四、能力清单与权限（scope）

| 方法 | 功能 | 所需权限(scope) | 默认 risk_level | 一期 |
|---|---|---|---|---|
| `feishu.im.send_text` | 给指定用户/群发纯文本 | `im:message:send_as_bot` | `normal` | ✅ |
| `feishu.im.send_card` | 发富文本/交互卡片（标题、Markdown 正文、署名栏） | `im:message:send_as_bot` | `normal` | ✅ |
| `feishu.contact.search_user` | 按手机号/邮箱反查用户（飞书不支持按姓名检索） | `contact:user.base:readonly` | `risk` | ✅ |
| `feishu.contact.user_info` | 按 `open_id` 查单个用户详情 | `contact:user.base:readonly` | `risk` | ✅ |
| `feishu.contact.departments` | 列部门及成员（组织架构速查） | `contact:user.base:readonly` + `contact:department.base:readonly` | `risk` | ✅ |
| `feishu.calendar.create_event` | 为用户/群建日程（会议、提醒） | `calendar:calendar` 等日历权限 | `auth` | ✅ |
| `feishu.calendar.list_events` | 查某日历近期日程 | 日历只读权限 | `risk` | ✅ |
| `feishu.bitable.query/add` | 多维表格读写（当轻量数据库） | 多维表格相关权限 | `risk` | 二期 |
| `feishu.docs.read` | 读云文档正文 | 云文档权限 | `risk` | 二期 |
| `feishu.event.*` | 被动接收消息/事件（交互机器人） | 事件订阅 | `auth` | 不做（见第六节） |

- 高频限制参考：发消息同一群 5 QPS、接口全局 1000 次/分钟；
- 部分敏感权限需**企业管理员审核**，申请时按需最小化，勿全量勾选。

---

## 五、plugin.json 与代码结构（草案）

```
biz-feishu-connector/
├── plugin.json          # 清单（manifest/info/runtime/methods/config）
├── requirements.txt     # lark-oapi>=1.0
├── feishu_utils.py      # 公共模块：读 config、tenant_access_token 缓存、统一响应
├── send_text.py         # feishu.im.send_text
├── send_card.py         # feishu.im.send_card
├── search_user.py       # feishu.contact.search_user
├── user_info.py         # feishu.contact.user_info
├── departments.py       # feishu.contact.departments
├── create_event.py      # feishu.calendar.create_event
├── list_events.py       # feishu.calendar.list_events
├── skills/              # 智能体技能（宿主自动注入索引，正文按需 skill_get）
│   ├── feishu-send-notice/SKILL.md     # 发消息指南（前提条件+查人+发文本/卡片）
│   └── feishu-calendar-event/SKILL.md  # 日历日程指南（建日程/查日程）
├── web_ui/index.html    # 可视化调试面板：前提条件核对提示/发消息/查人/日历操作（不消耗 Token）
├── README_ZH.md         # 本文档
└── README.md
```

### config 段（管理员在 plugin.json 中编辑，即时生效）

```jsonc
"config": {
  "app_id": "cli_xxxxxxxx",              // 飞书自建应用 App ID
  "app_secret": "${app_secret}",         // 只写占位符；真实值存在密钥箱（见「凭证管理」）
  "domain": "feishu",                    // feishu 国内版；国际版改 lark
  "default_sender": "企业助手",            // 缺省发起人署名
  "allowed_senders": ["张三", "运维"],    // 可选：允许的发起人白名单（防冒用）
  "recipients": [                        // 可选：常用收件人，调用用 name 即可
    { "name": "张三", "type": "user",  "target": "ou_xxxx" },
    { "name": "IT告警群", "type": "chat", "target": "oc_xxxx" }
  ],
  "calendar_id": ""                      // 可选：日历 id（feishu_ 开头），calendar 方法缺省用此值
}
```

> token 说明：`tenant_access_token` 有效期约 2 小时，`feishu_utils.py` 内做内存缓存（单次调用进程短命，缓存仅单次有效；SDK 会自行续期逻辑，二次调用自动重新换取即可，可接受）。

### 凭证管理（密钥箱）

`app_secret` 属敏感凭证，**不写入 `plugin.json`**：文件里保留占位符 `${app_secret}`，真实值由宿主在调用前从数据库「密钥箱」解析后注入（键名为 `app_secret`，归属插件 `biz-feishu-connector`）。

- 管理接口：`/biz/gis_secret`（仅管理员；列表**永不返回值**）
- 或直接写库：

```sql
INSERT INTO gis_secret (secret_key, plugin_name, secret_value, description, status, created_by, updated_by, data_sta)
VALUES ('app_secret', 'biz-feishu-connector', '<飞书 App Secret>', '飞书自建应用 App Secret', '1', 'admin', 'admin', 'A');
```

- 未录入 / 已停用时，调用会**直接失败**并提示「引用的密钥 ${app_secret} 不可用」，不会静默降级；
- 作用域仅限本插件：其他插件无法引用该密钥；
- 完整约定见 [service_plugins/README_ZH.md](../README_ZH.md#插件密钥箱配置占位符)。

### 方法 inputSchema 要点（发送类示例）

```
feishu.im.send_text
  receive_type: "user" | "chat"     必填
  target:       收件人（user 填 open_id/手机号；chat 填 chat_id/群名；可匹配 config.recipients 里的 name）
  text:         消息文本                必填
  sender:       发起人署名（可选，默认 config.default_sender，白名单校验）

feishu.im.send_card
  在 send_text 基础上增加 title / md（Markdown 正文），卡片头部自动带署名栏
```

统一返回格式遵循插件标准：`{"code":0,"msg":"ok","data":{...}}`；失败 `code:-1` 且 `msg` 描述具体原因（如"权限不足，请检查 im:message:send_as_bot 是否已开通并发布"）。

### risk_level 设计

| 级别 | 方法 | 理由 |
|---|---|---|
| `normal` | 发文本/卡片 | 常见高频、影响可逆（推送消息） |
| `risk` | 通讯录查询 | 涉及组织信息，留审计痕迹 |
| `auth` | 建日程 | 代表企业对外动作，需 HITL 批准 |
| `disable` | 视企业策略关闭 | 如不需要可整体关闭 |

---

## 六、明确不做（二期再议）

- **被动接收飞书消息/事件（交互机器人）**：需要 WS 长连接常驻进程或公网 HTTPS 回调，与本框架"每次调用起新进程、即调即弃"模型冲突；如需，得让宿主持有常驻 sidecar 进程，属架构级改动。一期只做"主动外呼 + 主动查询"。
- **以真人名义发送**：需该用户 OAuth 授权（`user_access_token`），流程不适合短进程插件，且涉及个人授权管理，超出一期范围。

---

## 附录：系统用户 ↔ open_id 映射表（补充设计，本期不开发）

> 本附录仅为**设计记录**，供后续迭代参考，**不在本期开发范围**。本期仍按第三节方案：`target` 用 open_id/chat_id，`sender` 用字符串署名 + 白名单。

### 目的

把本系统（apex-mcp-bridge 管理端登录用户 / 业务署名）与飞书账号建立一一映射，解决两件事：

1. **发消息给"本系统的某个人"** —— `target` 直接传系统用户名，自动解析成其飞书 `open_id`，替代手工查 open_id / 维护 recipients；
2. **身份校验从"字符串白名单"升级为"账号级"** —— `sender` 传系统用户名时，要求该用户名存在于映射表（且与宿主审计的调用方一致），比字符串比对更可信。

### 为何独立建表而非加列

映射是**两个身份体系之间的一行一用户关系**（user_name ↔ open_id），不属于现有任何业务表（留言、文件等）的属性；塞进业务表会造成每张表都要冗余这张映射并污染业务记录。故按同库新建 `feishu_user_map` 表，沿用插件"首次调用自动建表"约定（参考 hom-message-board）。

### 表结构草案

```sql
CREATE TABLE IF NOT EXISTS feishu_user_map (
  id          INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_name   VARCHAR(64)  NOT NULL COMMENT '本系统用户标识（管理端登录名/业务署名）',
  open_id     VARCHAR(128) NOT NULL COMMENT '飞书 open_id（应用维度，一期实际使用）',
  union_id    VARCHAR(128) DEFAULT NULL COMMENT '飞书 union_id（开发者维度，跨应用稳定，预留）',
  user_id     VARCHAR(128) DEFAULT NULL COMMENT '飞书企业内 user_id（租户维度，预留）',
  phone       VARCHAR(32)  DEFAULT NULL COMMENT '绑定时输入的手机号（查 open_id 的依据）',
  source      VARCHAR(16)  NOT NULL DEFAULT 'admin' COMMENT '绑定来源：admin=管理端绑定 / user=自助绑定(二期)',
  status      TINYINT      NOT NULL DEFAULT 1 COMMENT '1=启用 0=停用',
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  remark      VARCHAR(255) DEFAULT NULL,
  UNIQUE KEY uk_user_name (user_name),
  UNIQUE KEY uk_open_id   (open_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='本系统用户与飞书 open_id 映射表';
```

### 设计要点

1. **一用户 ↔ 一飞书账号**：`user_name`、`open_id` 均唯一约束，避免一对多造成"发给谁"歧义；
2. **三级 ID 分层**：一期只用 `open_id`（应用维度）；`union_id` 在同一开发者下的多个应用间稳定，`user_id` 在企业内稳定——均预留，便于将来支持国际版/多应用或账号迁移，绑定数据不返工；
3. **绑定途径（后续设计）**：
   - `admin`（管理端）：输入系统用户名 + 手机号 → 调 `feishu.contact.search_user` 反查 `open_id` → 写入/更新；
   - `user` 自助（依赖事件订阅能力，远期）：机器人私聊发验证/授权，回调后回写；
   - 停用走 `status=0`（保留记录便于审计），不物理删除；
4. **本期不实现**：对应方法（如 `feishu.identity.bind/list`）不排期；一期 send 方法 `target` 仍为 open_id/chat_id。

---

## 七、验证与测试

1. **连通性**：`curl` 打 token 接口（见第一节）；
2. **发机器人消息到测试群**：管理端把机器人拉进测试群，调用 `feishu.im.send_text`（`receive_type=chat`）验证；
3. **个人消息**：先 `feishu.contact.search_user` 用自己手机号查出 `open_id`，再发 `receive_type=user`；
4. **web_ui 调试面板**（[web_ui/index.html](web_ui/index.html)）：通过插件管理入口或 `/plugin-web/biz-feishu-connector/` 访问，内置前提条件核对提示，可直观完成发文本/发卡片、手机号反查用户、查用户详情、列子部门、建日程/查日程，无需消耗 Token。

---

## 配置来源速查（用户向）

在 [飞书开放平台](https://open.feishu.cn) 用企业管理员账号进入「开发者后台 → 企业自建应用 → <你的应用>」：

| config 字段 | 必填 | 从哪里获取 |
|---|---|---|
| `app_id` | 是 | 应用详情 →「凭证与基础信息」→ App ID（`cli_` 开头） |
| `app_secret` | 是 | 同一页 → App Secret（仅创建/重置时可见）。**不要写进 plugin.json**：录入密钥箱，文件留 `${app_secret}` |
| `domain` | 否 | 国内版固定 `feishu`（国际版暂不支持） |
| `default_sender` | 否 | 自定义默认署名，如"企业助手" |
| `allowed_senders` | 否 | 允许的发起人姓名数组（防冒用白名单） |
| `recipients` | 否 | 常用收件人别名数组 `[{name,type,target}]`；`target` 是 open_id(`ou_`)/chat_id(`oc_`)，通过「机器人拉进群 → 用插件 `feishu.im.group_list`（若已加）或 `search_user`」取得 |
| `calendar_id` | 否 | 日历 id（`feishu_` 开头），一般来自你订阅/可写的日历 |

飞书后台还需：**开启机器人**能力；在「权限管理」申请并**发布版本**后才生效（个人消息需对方在应用可用范围；发群需机器人已在该群）。

**最小可用配置示例：**

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

连通性验证：`curl -s -X POST https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal -H "Content-Type: application/json" -d '{"app_id":"cli_..","app_secret":".."}'`，返回 `code:0` 即配置无误。改配置即时生效，无需重启。

---

## 八、参考资料

- 官方 SDK：https://pypi.org/project/lark-oapi/ （GitHub: larksuite/oapi-sdk-python）
- 发送消息 API：https://open.feishu.cn/document/server-docs/im-v1/message/create
- 开放平台首页：https://open.feishu.cn
- 插件开发标准：../../plugin_develop_standard.md 与 ../../README_ZH.md

---

## 九、影子演练模式

进入演练：`config.shadow_mode=true`（或管理方法 `feishu.shadow.set_mode`）。演练期 `feishu.im.send_text` / `feishu.im.send_card` / `feishu.calendar.create_event` 只记录意图到 `shadow_log/records.jsonl`、返回 `shadow:true` + `record_id`，**绝不真发**（记录写失败即 fail-closed 中止）。
管理方法：`feishu.shadow.status`（查模式/计数）、`.list`（脱敏记录，仅管理员）、`.approve`（批准后真实执行一次）、`.reject` / `.archive` / `.set_mode`。退出演练：置 `false` 或调 `set_mode:false`，原行为不变。
