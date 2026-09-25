<p align="center">
  <img src="https://img.shields.io/badge/plugin-Intranet-00b894?style=flat-square" alt="Intranet">
  <img src="https://img.shields.io/badge/api%20version-plugin.gis%2Fv1-6c5ce7?style=flat-square" alt="API Version">
  <img src="https://img.shields.io/badge/version-1.0.0-blue?style=flat-square" alt="Version">
  <img src="https://img.shields.io/badge/python-%E2%89%A53.10-3776AB?logo=python&style=flat-square" alt="Python">
  <img src="https://img.shields.io/badge/protocol-HTTP%2FSOAP%2FMQTT-orange?style=flat-square" alt="Protocol">
</p>

# 内网服务信息获取（gen-intranet-fetcher）

通过 **HTTP(S) REST / SOAP / MQTT** 协议访问内网（局域网）服务并返回结果的通用插件。
把多个内网地址预配置为「站点」（`config.sites`），调用时按站点名直接请求，也可每次临时指定 `url`。

## 目录

- [协议支持矩阵（重要）](#协议支持矩阵重要)
- [快速开始](#快速开始)
- [配置说明](#配置说明)
- [API 参考](#api-参考)
- [影子演练模式](#影子演练模式)
- [可视化 Web 控制台](#可视化-web-控制台)
- [文件结构](#文件结构)
- [常见问题](#常见问题)

## 协议支持矩阵（重要）

> 宿主（apex-mcp-bridge）执行插件的方式是：**每次调用启动一个全新 Python 进程 → 通过 stdin 传入参数 → 同步等待一次 stdout 响应 → 进程结束**。
> 因此本插件只适合「一次性请求 → 一次性响应」的协议模型，不适合长连接/双向推送场景。

| 协议 | 支持情况 | 说明 |
|------|---------|------|
| **HTTP / HTTPS** | ✅ 已实现 | REST 通用请求（GET/POST/PUT/PATCH/DELETE/HEAD/OPTIONS），内网信息获取最常用，也是本插件的核心能力 |
| **SOAP 1.1 / 1.2** | ✅ 已实现 | 本质是 HTTP POST + XML SOAP Envelope；自动组包（method + namespace + params）并解析响应；识别 SOAP Fault |
| **MQTT** | ✅ 受限实现 | MQTT 是发布/订阅协议而非请求-响应，只能按「发布到请求主题 → 订阅应答主题并等待（带超时）」的一次性短连接模式使用，要求对端服务遵循该约定；依赖 `paho-mqtt` |
| **CoAP** | ❌ 暂不支持 | 采用 UDP 的物联网轻量协议，**内网生态少见、场景不普及**，暂无实际使用需求，故暂不实现（后续有需求再评估） |
| **gRPC** | ❌ 暂不支持 | **内网微服务场景相对少见**；且仅有服务地址并不足以发起调用，需要 proto 定义或服务端开启 Server Reflection，工程成本高，故暂不实现 |
| **WebSocket** | ❌ 暂不支持 | **双向长连接 + 服务端主动推送**，与宿主「每调用一个进程、短生命周期、同步等待一次响应」的模型冲突；本插件定位是「给地址 → 取一次结果」，故不实现。若确实需要与 WebSocket 服务交互，应使用具备常驻连接能力的独立网关/客户端 |

## 快速开始

1. 将本文件夹拷贝到主程序插件目录：

   ```bash
   cp -r gen-intranet-fetcher/ /path/to/apex-mcp-bridge/service_plugins/
   ```

2. 在**管理后台 → 插件管理 → 配置**中（或直接编辑 `plugin.json`），把要访问的内网地址写入 `config.sites`（编辑保存后**立即生效，无需重启**，每次调用都会重读配置）：

   ```jsonc
   {
     "config": {
       "default_site": "nas",              // 可选：默认站点，调用时可不传 site
       "default_timeout": 10,              // 默认超时（秒）
       "max_body_chars": 200000,           // 响应体最大返回字符数，超出截断
       "sites": [
         {
           "name": "nas",
           "type": "http",
           "url": "http://192.168.1.105",
           "desc": "内网 NAS",
           "headers": { "X-From": "gis" }   // 可选：站点级默认请求头
           // "auth": { "username": "u", "password": "p" }  // 可选 Basic 认证
         },
         {
           "name": "router-status",
           "type": "http",
           "url": "http://192.168.1.1:8080/api/status",
           "desc": "路由器状态接口"
         },
         {
           "name": "ws-soap",
           "type": "soap",
           "url": "http://192.168.1.50:5000/ws",
           "desc": "内网 SOAP WebService"
         },
         {
           "name": "iot-broker",
           "type": "mqtt",
           "url": "mqtt://192.168.1.20:1883",
           "desc": "MQTT 网关",
           "options": {
             "request_topic": "gw/req",
             "response_topic": "gw/resp",
             "qos": 0
           }
         }
       ]
     }
   }
   ```

3. 测试调用：`intra.site.list {}` 应能看到上面配置的站点。

## 配置说明

| 字段 | 层级 | 类型 | 必填 | 默认 | 说明 |
|------|------|------|------|------|------|
| `sites` | `config` | array | 否 | `[]` | 预配置的内网站点数组（见下表） |
| `default_site` | `config` | string | 否 | `""` | 默认站点名；调用时既不传 `site` 也不传 `url` 则使用它 |
| `default_timeout` | `config` | int | 否 | `10` | 默认超时（秒） |
| `max_body_chars` | `config` | int | 否 | `200000` | 响应体最大返回字符数，超出会截断并置 `truncated=true` |

每个站点：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `name` | string | 是 | 唯一标识，方法调用时用 `site` 参数引用 |
| `type` | string | 是 | `http` / `soap` / `mqtt` |
| `url` | string | 是 | 内网地址。http 可带路径，如 `http://ip:8080/api/status`；mqtt 形如 `mqtt://ip:1883`（`mqtts://` 走 TLS） |
| `desc` | string | 否 | 说明，便于站点列表识别 |
| `headers` | object | 否 | 站点级默认请求头（http/soap） |
| `auth` | object | 否 | `{"username":"u","password":"p"}`（http/soap/mqtt 通用） |
| `timeout` | int | 否 | 站点级超时（秒） |
| `options` | object | 否 | 协议级参数，目前 MQTT 支持：`request_topic`/`response_topic`/`qos`/`username`/`password`/`wait_timeout`/`client_id` |

## API 参考

所有方法经 `local_service_call` 调用，参数经 stdin JSON 传入，stdout 返回统一格式 `{"code":0,"msg":"ok","data":{...}}`。

### intra.site.list

列出预配置的内网站点（敏感信息已脱敏）。

| 属性 | 值 |
|------|-----|
| 风险等级 | `normal` |
| 超时 | 15s |

**参数**：无。**返回**：`sites`（每项含 name/type/protocol/url/desc、headers 键名列表、has_auth、options 脱敏值）、`total`、`default_site`。

### intra.http.request

对内网 HTTP(S) 服务发起一次通用请求（核心方法）。

| 属性 | 值 |
|------|-----|
| 风险等级 | `normal` |
| 超时 | 60s |

**参数**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `site` | string | 二选一 | 站点名（`intra.site.list` 可查）；不传则用 `default_site` |
| `url` | string | 二选一 | 完整内网地址；给出后以它为准，site 只继承请求头/认证 |
| `path` | string | 否 | 在基础地址后追加的路径 |
| `method` | string | 否 | 默认 GET；GET/POST/PUT/PATCH/DELETE/HEAD/OPTIONS |
| `headers` | object | 否 | 自定义请求头 |
| `params` | object | 否 | URL 查询参数 |
| `body` | string/object | 否 | 对象自动 JSON 序列化；字符串原样发送 |
| `content_type` | string | 否 | 请求体类型 |
| `timeout` | int | 否 | 超时秒数 |
| `username`/`password` | string | 否 | Basic 认证（未传则用站点 auth / 地址 user:pass@） |
| `insecure_ssl` | bool | 否 | 跳过 HTTPS 证书校验（自签名内网） |
| `follow_redirects` | bool | 否 | 默认 true |
| `max_body_chars` | int | 否 | 本次响应体截断长度 |

**返回**：`status`、`reason`、`ok`（是否 2xx）、`request_url`/`final_url`（已脱敏）、`redirected`、`headers`（白名单）、`content_type`、`charset`、`size_bytes`、`body_text`（截断）、`truncated`、`json`（若响应可解析为 JSON）、`json_parsed`、`binary`、`elapsed_ms`。
注意：**收到任意 HTTP 响应（含 404/500）都算调用成功（code=0）**，业务是否成功看 `data.ok` 与状态码；只有连不上/超时才返回错误。

### intra.soap.call

调用内网 SOAP WebService（SOAP 1.1/1.2）。

| 属性 | 值 |
|------|-----|
| 风险等级 | `normal` |
| 超时 | 60s |

**参数**：`site`/`url`（端点）、`method`（操作名，必填，除非用 raw_body）、`namespace`、`soap_action`、`soap_version`(1/2)、`params`（入参对象，支持标量/嵌套对象/数组）、`raw_body`（高级：直接给 SOAP Body XML）、`headers`/`timeout`/`username`/`password`/`insecure_ssl`/`max_body_chars`。

**返回**：`status`、`ok`、`content_type`、`body_xml`（原始响应，截断）、`truncated`、`parsed`（XML 转结构：`{响应元素名: {...}}`，同名元素升为数组）。
服务端返回 **SOAP Fault** 时按业务错误报出 faultcode/faultstring。

### intra.mqtt.request

通过 MQTT 做一次「请求-应答」调用（一次性短连接模式）。

| 属性 | 值 |
|------|-----|
| 风险等级 | `normal` |
| 超时 | 60s |

**参数**：`site`/`url`（broker，形如 `mqtt://ip:1883`）、`request_topic`（必填）、`response_topic`（留空 = 只发布不等回复）、`payload`（字符串或对象，对象自动 JSON）、`qos`、`username`/`password`、`wait_timeout`（等待应答秒数）。

**返回**：`broker`、`request_topic`、`response_topic`、`published`、`publish_rc`、`payload`、`messages`（每项含 topic/payload/qos/retain）、`message_count`、`waited_ms`、`timed_out`（超时未收到回复时 messages 为空并有 hint 提示）。
依赖 `paho-mqtt`；未安装时返回明确的「依赖缺失」错误。

## 影子演练模式

> **场景**：给 AI/新会话「上线前演练观察」——先让它在影子期暴露全部请求意图，人工审计通过后再转生产。
> 影子期里 `intra.http.request / intra.soap.call / intra.mqtt.request` **只记录、不真实执行**（不发网络包），
> 审核人批准某条记录后，该条才被真实执行一次。

### 1. 两种开关入口（立即生效，无需重启）

| 入口 | 操作 |
|---|---|
| Web 控制台「影子演练」Tab | 「进入演练 / 退出演练」按钮（调 `intra.shadow.set_mode`） |
| 编辑 plugin.json | `config.shadow_mode` 置 `true`/`false`（与上面等价） |

### 2. 演练期发生了什么

1. 任何 HTTP/SOAP/MQTT 请求进到插件后，在**发送前**被拦截：完整记录（方法、脱敏目标、原始参数）到 `shadow_log/records.jsonl`，标记 `pending`；
2. 调用方（AI/控制台）收到带 `shadow:true` + `record_id` 的响应——AI 应如实告知用户「演练记录、未真实执行」，不得声称已生效；
3. 记录写盘失败会直接报错并中止调用（fail-closed：拦截不成功就绝不放行真实执行）。

### 3. 管理方法（默认只应授权给管理员）

| 方法 | 作用 |
|---|---|
| `intra.shadow.status` | 查询当前模式、记录目录与各状态计数（`normal`，可给 AI 感知模式） |
| `intra.shadow.list` | 列出记录（脱敏），`status`/`limit` 过滤 |
| `intra.shadow.approve` | **批准并立即真实执行**一条 pending 记录（子进程 force 重放；成功标 `approved` 并回写结果，失败标 `failed` 不自动重试） |
| `intra.shadow.reject` | 驳回记录（可填原因） |
| `intra.shadow.archive` | 归档已处理记录（approved/rejected/failed → `records.archive.jsonl`） |
| `intra.shadow.set_mode` | 进入/退出演练模式（原子改写 `config.shadow_mode`） |

授权方式沿用宿主方法级授权：`list / approve / reject / archive / set_mode` 只授权给 admin；
`intra.shadow.status` 可授权给 AI 账号（或直接让 AI 按 SKILL 提示先查状态）。

### 4. 转生产检查清单

1. 「影子演练」Tab 查看全部 pending 记录，逐条 **批准执行** 或 **驳回**，避免悬空请求；
2. 确认记录中的写操作意图（POST/PUT/DELETE、写主题）均符合预期；
3. 点「退出演练」（或改 `shadow_mode=false`）→ 下一次调用立即真实执行；
4. 生产调用照常写入宿主审计日志（cmd_log）并受 `risk_level` 管控，建议写类方法保持 `risk` 及以上。

> 安全说明：影子记录落在插件目录（与 plugin.json 同信任域）；控制台/`list` 一律返回脱敏视图；
> 审批重放通过宿主进程环境变量强制，AI/Web 调用方无法自行伪造「强制真实执行」。

## 可视化 Web 控制台

自带 Web 界面（`web_ui/index.html`），从插件管理列表的可视化入口进入，零 Token 消耗即可：
- 查看已配置内网站点（点击站点自动填入对应请求面板）
- HTTP / SOAP / MQTT 三个标签页发起请求并查看结构化结果
- 「影子演练」标签页：查看当前模式、进入/退出演练、逐条批准执行/驳回记录、归档已处理记录
- 「协议支持说明」页内附支持矩阵
- 右侧实时调用日志（每次请求 = 一次插件方法调用）

## 文件结构

```
gen-intranet-fetcher/
├── plugin.json              # 插件清单（方法 + config.sites 站点配置）
├── requirements.txt          # 依赖：requests（HTTP/SOAP）、paho-mqtt（MQTT）
├── intra_utils.py            # 公共模块（配置/站点/地址/认证/脱敏）
├── site_list.py              # intra.site.list 处理器
├── http_request.py           # intra.http.request 处理器
├── soap_call.py              # intra.soap.call 处理器
├── mqtt_request.py           # intra.mqtt.request 处理器
├── web_ui/
│   └── index.html            # 可视化控制台
├── skills/
│   └── intra-fetch-intranet/
│       └── SKILL.md          # AI 操作技能
├── README.md                 # English documentation
└── README_ZH.md              # 本文件（中文）
```

## 常见问题

<details>
<summary><b>Q: 调用后报「缺少依赖 paho-mqtt」？</b></summary>

只有 `intra.mqtt.request` 需要该库。请管理员在服务器执行 `pip install paho-mqtt`
（本项目插件运行在 `.plugins-venv` 时用 `.plugins-venv/bin/pip install paho-mqtt`）。
HTTP/SOAP 仅依赖 `requests`。
</details>

<details>
<summary><b>Q: 修改 plugin.json 的 sites 后需要重启吗？</b></summary>

不需要。每次方法调用都会启动全新 Python 进程并重读 `plugin.json`，保存即生效。
</details>

<details>
<summary><b>Q: 报「未找到内网站点 [xxx]」？</b></summary>

说明该名字不在 `config.sites` 中。先用 `intra.site.list` 查看可用站点名，或在配置里补上该站点；
临时访问可用 `url` 参数直接给完整地址。
</details>

<details>
<summary><b>Q: 请求内网 HTTPS 自签名证书报错？</b></summary>

加 `insecure_ssl:true`（仅跳过校验，不影响数据内容）；生产内网建议配置正式证书或把 CA 加入信任链。
</details>

<details>
<summary><b>Q: 为什么 CoAP / gRPC / WebSocket 不支持？</b></summary>

见上方[协议支持矩阵](#协议支持矩阵重要)：CoAP、gRPC 在内网较少见且分别依赖重协议栈/服务端反射；WebSocket 是双向长连接，与本插件「一次调用 = 一次短进程 + 同步响应」的模型冲突。
</details>

<details>
<summary><b>Q: 安全上有什么注意？</b></summary>

本插件会按配置访问内网地址：请只把可信的内网服务加入 `config.sites`；站点 `auth`/URL 中的密码不会在站点列表与回显中泄露（自动脱敏）；`http_request` 默认不跟随 cookie 之外的危险行为，响应头回显仅保留白名单字段。
</details>
本插件会按配置访问内网地址：请只把可信的内网服务加入 `config.sites`；站点 `auth`/URL 中的密码不会在站点列表与回显中泄露（自动脱敏）；`http_request` 默认不跟随 cookie 之外的危险行为，响应头回显仅保留白名单字段。
</details>
