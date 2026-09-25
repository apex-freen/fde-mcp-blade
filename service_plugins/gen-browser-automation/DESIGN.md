# gen-browser-automation — 设计方案（未实现，仅设计）

> 状态：**仅设计占位，未编写任何插件代码**。本文件用于后续按方案实施。
> 插件名（目录名 = manifest.name）：`gen-browser-automation`（gen- 通用前缀）
> 方法域建议：`browser.*`

## 1. 目标与不做什么

- 目标：让宿主侧的 AI 能“像人一样”在浏览器里操作内网系统——打开页面 → 看页面内容 → 点按钮/填表单/下拉选择 → 提取数据返回，并且浏览器登录态、页面状态在多步操作之间保持。
- 明确不做：本插件不内置 LLM、不做“一句话任务自治执行”（那是 browser-use 库模式，见 §7 备选）；AI 决策由宿主已有的大模型完成，插件只提供“眼睛/手”（浏览器能力 + 每步返回可读快照）。

## 2. 核心约束（为什么不能直接做成普通插件）

宿主（apex-mcp-bridge）执行模型：

```
python3 <handler.py> <method_name>   # 每次调用全新进程
stdin → 参数 JSON
stdout → 单行 {code,msg,data}
```

- 每次调用进程即起即灭 ⇒ **无状态**；浏览器会话（登录态/DOM/多步位置）无法跨调用保留。
- ⇒ 需要一个**常驻的浏览器中继进程**（类似 gen-dmc-to-mcp 的 `ssdp_relay.py` 模式）持有真实浏览器，插件方法只是它上面的薄客户端。

## 3. 总体架构（方案 A：常驻浏览器中继 + 细粒度方法）

```
宿主 AI（决策：读快照→决定点哪里）
   │  MCP 工具调用 browser.open / browser.snapshot / browser.click ...
   ▼
插件 handler（browser_*.py，每调用一个短进程）
   │  localhost/lan HTTP 短命令（同步请求-响应）
   ▼
browser_relay.py（常驻守护，唯一持有 Playwright/Chromium 的进程）
   │  内部维持：当前页面、标签、cookie/登录态
   ▼
目标内网系统（浏览器访问，无头/有头均可）
```

关键点：
1. 状态只存在于 relay，插件方法无状态；
2. 每次方法返回「该步结果 + 页面可访问性快照摘要」，供 AI 决策下一步；
3. 截图（可选）辅助 AI 视觉判断，但主通道是结构化快照（省 token、稳定）。

## 4. 目录结构（计划）

```
gen-browser-automation/
├── plugin.json              # manifest + 方法定义 + config（sites 白名单/超时）
├── requirements.txt          # playwright、requests
├── browser_utils.py          # 公共：relay 地址发现、HTTP 调用、响应规范化
├── browser_status.py         # browser.relay.status —— 中继/浏览器存活检查
├── browser_open.py           # browser.page.open
├── browser_snapshot.py       # browser.page.snapshot
├── browser_click.py          # browser.page.click
├── browser_fill.py           # browser.page.fill
├── browser_select.py         # browser.page.select
├── browser_extract.py        # browser.page.extract
├── browser_screenshot.py     # browser.page.screenshot
├── browser_close.py          # browser.page.close / session 清理
├── browser_relay.py          # ★ 常驻守护（宿主机/指定机运行，不进插件目录也行）
├── web_ui/
│   └── index.html            # 可视化：连接状态/当前 URL/快照预览/截图查看
├── skills/
│   └── browser-operate/
│       └── SKILL.md          # AI 操作技能（逐步决策规范）
├── README.md / README_ZH.md
└── DESIGN.md                 # 本文件
```

## 5. 方法定义草案（plugin.json methods）

> 命名 `browser.<对象>.<动作>`；除 relay.status 外，所有方法都依赖中继在线。

| 方法 | 作用 | 关键参数 | 风险 |
|---|---|---|---|
| `browser.relay.status` | 中继与浏览器是否可用、当前页面 URL/标题 | 无 | normal |
| `browser.page.open` | 打开 URL（或切到已开标签） | `url`（或 `site` 白名单名） | normal |
| `browser.page.snapshot` | 返回当前页结构化快照（见 §6） | `max_nodes` | normal |
| `browser.page.click` | 点击元素 | `selector`(或用 `by_text`) | risk |
| `browser.page.fill` | 输入框填值 | `selector`, `value`, `clear_first` | risk |
| `browser.page.select` | 下拉选择 | `selector`, `value`/`label` | risk |
| `browser.page.extract` | 提取页面数据 | `selector`/`pattern`, `format`(text/json/table) | normal |
| `browser.page.screenshot` | 截图返回（base64，截断保护） | `selector`/全页, `max_bytes` | normal |
| `browser.page.close` | 关闭标签/清会话 | `all` | risk |

- 所有写类操作默认 `risk_level: "risk"`（审计重点标记），用户可调 `auth` 甚至 `disable`；
- 目标地址来源严格二选一：`config.sites` 白名单站点名，或 AI 在本次对话中被授权后传入的明确 `url`。

## 6. Snapshot 快照格式（AI 决策的“眼睛”，核心设计）

每个页面方法返回 `data.page_snapshot`，控制长度但信息完整：

```json
{
  "url": "http://192.168.1.10/login",
  "title": "系统登录",
  "ready_state": "complete",
  "viewport": "1920x1080",
  "elements": [
    { "id": "e12", "tag": "BUTTON", "text": "登录", "role": "button",
      "visible": true, "ref": "btn:text=登录" },
    { "id": "e7", "tag": "INPUT", "placeholder": "用户名", "role": "textbox",
      "ref": "input[placeholder=用户名]" }
  ],
  "tables": [ { "caption": "今日报表", "headers": ["单号","金额"], "rows": 20, "preview": 3 } ],
  "dialogs": null,
  "hint": null
}
```

- `ref` 为可直接回填给 click/fill 的稳定定位串（优先可访问性标签而非裸 xpath，抗页面变动）；
- `tables` 只给结构摘要 + 前几行预览，完整数据交给 `extract` 按需拉取；
- 超过 `max_nodes` 截断并提示，防止 token 爆炸。

## 7. 备选方案 B：browser-use 自治执行（本设计不采用，记录备查）

- 一个方法如 `browser.task.run {task:"打开报表系统并导出 XX"}`，插件内置 LLM 循环自动操作到完成；
- 需要 plugin.json config 增加 `llm_base_url/api_key/model`，并依赖 `browser-use` 库；
- 优点：一次调用、无需宿主逐步指挥；缺点：决策不透明、中途失败难干预、需外部模型 key、截图质量决定成功率、token 消耗不可控。
- 结论：若宿主侧 AI 已在 chat 层具备决策能力，方案 A 更贴合现有架构（复用现有技能机制），B 仅在“宿主 AI 拿不到浏览器能力”时作为兜底。

## 8. 中继 REST 接口草案（browser_relay.py）

`POST /cmd` 统一入口，body：`{"cmd":"open|snapshot|click|fill|select|extract|screenshot|close|status", ...params}`；
响应统一 `{"code":0,"msg":"ok","data":{...}}`（与插件协议一致，便于 relay 直接透传）。

| cmd | 说明 |
|---|---|
| `status` | 浏览器进程/当前标签状态 |
| `open` | goto 指定 URL，等 networkidle/domcontentloaded |
| `snapshot` | 产 §6 快照 |
| `click` / `fill` / `select` | 按 ref/selector 操作，失败返回可见元素提示 |
| `extract` | 文本/JSON/表格抓取，支持分页点击“下一页”参数 |
| `screenshot` | 截图（PNG→base64） |
| `close` | 关标签/整体清理（可选会话隔离：每次 AI 任务前 `session.new`，结束时销毁，防脏状态串扰） |

守护方式：与 dlna 的 `ssdp_relay_manage.sh` 类似提供启动/状态/停止脚本；只允许绑定内网/本机地址 + 简单 token 鉴权（防内网任意调用）。

## 9. config 设计草案

```jsonc
{
  "manifest": { "serverUrl": "192.168.1.100" },  // 中继所在主机 IP（可编辑）
  "config": {
    "relay_port": 17951,
    "relay_token": "browser-relay-token-001",   // 调用鉴权
    "headless": true,
    "default_wait_ms": 500,
    "max_nodes": 120,          // snapshot 元素上限
    "screenshot_max_bytes": 300000,
    "extract_max_rows": 500,
    "default_timeout": 30,
    "allowed_hosts": [         // 安全：仅允许访问的域名/IP（严格模式）
      "192.168.1.10",
      "oa.example.com"
    ],
    "sites": [                 // 可选：命名站点（登录页等），与 dlna 风格一致
      { "name": "erp", "type": "http", "url": "http://192.168.1.10", "desc": "内网 ERP" }
    ]
  }
}
```

## 10. Skill 设计草案（skills/browser-operate/SKILL.md）

流程（约束 AI 逐步操作，不许跳步）：
1. `browser.relay.status` 确认可用；不可用 → 告知用户需启动中继/安装 Chromium；
2. `browser.page.open`（只允许白名单 host 或用户明确授权 URL）；
3. 循环：`browser.page.snapshot` → 依据快照决策：
   - 出现登录框 → `fill` 用户名/密码（凭据来自 config 或用户提供，**禁止让用户把密码明文发群里/日志**）→ `click 登录`；
   - 目标数据在表格/分页 → `extract` 抓取；
4. 用户目标达成 → 用结构化数据汇报，必要时 `screenshot` 佐证；
5. 结束 `browser.page.close` 清会话。

约束条款：不访问白名单外站点；遇到验证码/双因子 → 停下询问用户（不可乱试）；操作“删除/提交/转账”类按钮前必须向用户二次确认；快照信息不足时用 `extract`/`screenshot` 补充，不得盲目猜测 selector 连点。

## 11. 部署前置与拓扑

- 依赖：`pip install playwright && playwright install chromium`（约 150MB + 系统依赖库），requirements.txt 声明；
- 拓扑 1（本机）：插件进程与 relay 同机 → relay 绑 127.0.0.1；
- 拓扑 2（Docker，类似 dlna）：插件在容器、浏览器在宿主机 → relay 绑宿主内网 IP，manifest.serverUrl 指向它；
- 无图形环境用 `headless=true`；调试阶段可 `headless=false` + VNC 观察。

## 12. 已知风险与局限（写进 README FAQ）

- 依赖安装重：需要 Chromium 及系统库，首次部署需管理员操作；
- 高级交互受限：原生拖拽、非常规手势、受控下载流、flash 类页面不支持；
- 页面改版会导致 selector 失效（快照用语义 ref 缓解，仍需人工抽查）；
- 验证码/SSO/双因子必须人类介入；登录凭据管理要遵循宿主既有安全约定；
- 高权限：建议把写类方法风险设为 `risk/auth`，白名单严格化。

## 13. 里程碑建议（将来实施时）

1. M1：relay 骨架（起 Chromium、/cmd status/open/snapshot、token 鉴权）＋ `browser.relay.status`；
2. M2：click/fill/select + snapshot 返回闭环，用本地测试页验证；
3. M3：extract（文本/表格/分页）+ screenshot；
4. M4：skill + web_ui + README，真实内网站点验证；
5. M5：会话隔离、权限收敛、FAQ 完善。

## 14. 开放问题（实施前需确认）

- 运行拓扑：插件进程与浏览器同机还是跨机（影响 relay 绑定与 token 暴露面）；
- 是否允许在浏览器内保存登录态长期复用（cookie 持久化）还是每次任务干净会话；
- 快照优先中文页面元素文案做定位是否够用（是否需要引入 DOM id/name 兜底）；
- 目标系统主要是老式 iframe 页面还是现代 SPA（影响等待策略）。
