# gen-intranet-fetcher — 影子模式（Shadow Mode）设计方案

> 状态：**已按方案实现并通过本地 E2E 验证（HTTP/SOAP/MQTT 拦截 → 审批重放 → 归档 → 进出演练）**。
> 本文件保留为设计说明；实施以代码为准。若后续推广到其他插件，本文件可作为通用参考。

---

## 1. 背景与要解决的问题

宿主现有安全体系用 `risk_level`（normal / risk / auth / disable）管控 AI 调用：
- `auth` 虽可做“执行前人工审批”，但**没有“先演练、过审计、再上生产”的过渡态**；
- AI 一旦拿到授权，调用 `intra.http.request`（可 POST/PUT/DELETE）就是**直接真实打到内网、直接改状态**，中间没有任何“预演”。

要补的正是这句话描述的能力：**AI 在沙盒里跑真实流量只记录不执行 —— 先演练、过审计、再上生产**。

## 2. 目标与不做什么

目标：
1. 在插件 `plugin.json` 的 `config` 中提供一个**影子模式开关**，按插件独立控制；
2. 开启后，三个会产生真实网络副作用的方法（`intra.http.request` / `intra.soap.call` / `intra.mqtt.request`）**只记录、不真发**，调用方收到明确的“影子标记”响应；
3. 审核人可在插件 Web 控制台逐条查看记录，**批准后才真实执行**该条请求；驳回则归档；
4. 演练观察期结束后，从 Web 控制台**一键进入/退出演练模式**（内部原子改写 `plugin.json` 的 `config.shadow_mode`，编辑 plugin.json = 配置，立即生效、无需重启）；手动编辑 plugin.json 仍可作为等价兜底。

明确不做（本设计不包含）：
- 不做宿主级通用影子层（覆盖全部插件 / MQTT 设备通道）；留待试点验证后再议；
- 不做“转发到 shadow_url 影子服务器”的镜像沙盒（需要测试站，超出本插件自包含范围）；
- 不做自动批量重放（审批后每条立即真执行，不设后台补跑队列）；
- 不做 mock/模拟响应生成——拦截后不伪造“业务结果”，避免 AI 把演练结果当成真实数据。

## 3. 核心设计决策（已与需求方确认）

| 决策点 | 结论 |
|---|---|
| 落地范围 | 插件 `config` 增加影子模式开关，**按单插件控制**（试点本插件） |
| 影子语义 | **拦截记录 + 审批放行**：不真发；记录入影子日志；批准后才真实执行该条 |
| 目标场景 | **上线前演练观察**：先让 AI 在影子期暴露它的意图，人工审计通过后转生产 |
| 首批范围 | HTTP / SOAP / MQTT **三协议同批实现** |
| 审批语义 | **批准 = 立即真实执行**该条（force 重放，结果回写记录） |
| 记录清理 | 本期提供**归档已处理记录**按钮（非 pending 移入 archive 文件） |
| 模式切换入口 | 控制台**一键进入/退出演练**（原子改写 plugin.json config），手动编辑同样有效 |

## 4. 总体流程

### 4.1 演练期：AI 的一次“写”调用

```
AI / Web 控制台
   │ 调用 intra.http.request {site:erp, method:POST, body:{...}}
   ▼
host local_service_call（宿主：risk 解析 / 授权 / cmd_log 照常记录）
   ▼
http_request.py 解析目标、组装请求
   │
   ├─ config.shadow_mode == false ──▶ 照旧真实发送（现状不变）
   │
   └─ config.shadow_mode == true ──▶ 【拦截点】不发网络包
        │ 1. 写一条影子记录到 shadow_log/records.jsonl（status=pending）
        │ 2. 返回标记性成功：
        │    { code:0, data:{ shadow:true, record_id:"sh-…", status:"pending",
        │                      note:"影子演练模式：仅记录未执行，审批通过后才真实执行",
        │                      preview:{ source, method, target_url(脱敏) } } }
        ▼
   完成（AI 收到“演练标记”，不会误以为已真实生效）
```

要点：
- 返回 `code=0` 但带 `shadow:true` 标记 → 不让 AI 误判为失败而重试轰炸，也不让它误以为真实执行成功。
- 记录写入失败时**必须 fail-closed**：返回错误并中止，绝不静默放行真实执行。

### 4.2 审计与放行：审核人在 Web 控制台

```
影子演练 Tab（/plugin-web/gen-intranet-fetcher/）
   ├─ intra.shadow.status   → 模式开关状态、待审数量
   ├─ intra.shadow.list     → 待审/历史记录（脱敏展示）
   ├─ 批准执行  → intra.shadow.approve {record_id}     ★ 真实执行该条（force 重放）
   ├─ 驳回      → intra.shadow.reject   {record_id, note?}
   └─ 查看明细   → 请求方法/脱敏目标/脱敏参数
```

`intra.shadow.approve` 会把记录的原始参数按 **force 重放**（跳过影子拦截）真实发送一次，真实结果回写进该记录（status=approved + result），并原样返回给审批人；发送失败标记 `failed`，不做自动重试。

### 4.3 进入 / 退出演练（转生产）

审核人确认演练期记录无危险意图后，从控制台**一键切换**：

```
「影子演练」Tab 顶部开关
   ├─ 进入演练 → intra.shadow.set_mode {shadow_mode:true}   // 原子改写 config.shadow_mode=true
   └─ 退出演练 → intra.shadow.set_mode {shadow_mode:false}  // 原子改写 config.shadow_mode=false
        │
        ▼
   下一次调用立即真实执行（宿主每次调用都新起进程、重读 plugin.json，无需重启）
```

约定：
1. （可选）退出前对仍 pending 的记录逐条批准执行或驳回，保证无悬空请求；
2. 模式切换写 plugin.json 采用“临时文件 + 原子 rename”，与宿主既有 `update_plugin_config` 同一手法，避免读到半个文件；
3. 手动编辑 plugin.json `config.shadow_mode` 与 `intra.shadow.set_mode` 等价，两种入口都立即生效；
4. 退出演练后调用回到现状：真实执行 + cmd_log 审计 + risk 标记（写操作仍建议保持方法 risk_level = risk 及以上）。

## 5. plugin.json 变更

### 5.1 config 新增字段（编辑即生效，宿主不感知）

```jsonc
{
  "config": {
    // ……既有字段保持不动（default_site/default_timeout/max_body_chars/sites）……
    "shadow_mode":    false,       // true=影子演练（拦截记录）；false=生产（现状）
    "shadow_log_dir": "shadow_log" // 影子记录目录，相对插件根目录；可改
  }
}
```

约定：
- `shadow_mode=false` 时，所有影子逻辑零开销（只多一次布尔判断），行为与现状完全一致。
- 影子目录与 plugin.json 同级（同一卷），权限信任域相同（plugin.json 本就明文存站点凭证），不引入新的敏感面。

### 5.2 methods 新增 6 个管理方法

| 方法 | 作用 | 关键参数 | 默认 risk_level |
|---|---|---|---|
| `intra.shadow.status` | 影子模式开关状态 + 待审/历史计数 | 无 | `normal` |
| `intra.shadow.list` | 列出影子记录（脱敏），可按 status 过滤 | `status?`(pending/approved/rejected/failed), `limit?` | `risk` |
| `intra.shadow.approve` | **批准并真实执行**某条记录 | `record_id`(必填), `note?` | `risk`（只授权 admin） |
| `intra.shadow.reject` | 驳回记录并归档 | `record_id`(必填), `note?` | `risk`（只授权 admin） |
| `intra.shadow.set_mode` | **进入/退出演练模式**（原子改写 config.shadow_mode） | `shadow_mode`(bool 必填) | `risk`（只授权 admin） |
| `intra.shadow.archive` | **归档已处理记录**（approved/rejected/failed 移入 archive 文件） | 无 | `risk`（只授权 admin） |

权限约定：
- 6 个方法遵循宿主现有**方法级授权**机制：`shadow.approve / reject / set_mode / archive / list` 只应授权给 admin（宿主授权页操作），AI 侧默认拿不到；
- Web 控制台的演练管理入口默认仅对管理员会话显示；
- `approve` 是“人点击触发、系统真执行”，不属于 AI 自主调用路径——所以不需要 `auth` 级二次审批（避免“审批的审批”死循环），改为靠方法授权 + 高危限流兜底。

## 6. 影子记录：schema 与存储

- 位置：`<插件根>/shadow_log/records.jsonl`（一行一条，追加写 O_APPEND）。
- 单条记录结构：

```jsonc
{
  "id":         "sh-20260909-153012-3f9a",   // 时间戳+随机短码，全局唯一
  "ts":         "2026-09-09T15:30:12+08:00",
  "source":     "intra.http.request",        // intra.http.request | intra.soap.call | intra.mqtt.request
  "site":       "erp",                        // 命中的站点名（无则空）
  "http_method":"POST",                       // SOAP 为 "POST"，MQTT 为空
  "target_url": "http://192.168.1.10:8080/api/…",  // 已脱敏（凭证打 ***@），仅展示用
  "params":     { /* 本次调用原始参数全量，用于 force 重放；
                    与 plugin.json 同一信任域，不额外存明文凭证 */ },
  "status":     "pending",                    // pending | approved | rejected | failed
  "approver":   "",                           // 审批人（控制台会话填写，尽力而为）
  "approved_at": null,
  "note":       "",                           // 驳回/审批备注
  "result":     null                          // approve 真实执行后的完整响应（脱敏后落盘）
}
```

- 读改方式：`list` 全量扫文件按 status 过滤；`approve/reject` 先按 id 定位、改写状态后整体原子回写（临时文件 + rename）。
- 归档：`intra.shadow.archive` 把非 pending 记录逐行追加到 `records.archive.jsonl` 后原子重写主文件（仅留 pending），只做文件瘦身、不改状态语义，由控制台按钮手动触发。
- 规模假定为小量级（演练期记录有限）。

## 7. 代码改动点（全部在本插件目录内，宿主零改动）

### 7.1 `shadow_mode.py` —— 影子模式自包含公共模块（已实现，可跨插件拷贝）

> 重构说明：影子逻辑已从 intra_utils.py 整体抽离到**自包含的 `shadow_mode.py`**（协议输出/配置读取/脱敏/记录存储/拦截/归档/切模式全部内置，零依赖、不 import 任何插件 util）。
> intra_utils.py 已还原为纯 HTTP/SOAP/MQTT 请求辅助函数。接入其他插件见文末「推广接入指南」。

模块对外提供（供业务 handler 与本插件 6 个 shadow_*.py 使用）：
- `shadow_mode_enabled()`：读 config.shadow_mode（编辑即生效）；
- `shadow_force_active()`：审批重放环境变量 `PLUGIN_SHADOW_FORCE=1`（宿主进程环境继承，调用方无法伪造）；
- `shadow_log_dir()` / `shadow_records_path()` / `shadow_archive_path()` / `shadow_ensure_dir()`；
- `shadow_record_new_id()`：`sh-时间戳-随机短码`；
- `shadow_append_record()`：追加写 JSONL；
- `shadow_read_records()` / `shadow_find_record()` / `shadow_update_record()`：读、定位、原子回写；
- `shadow_atomic_rewrite()`：临时文件 + rename 通用原子写；
- `shadow_clean_params()`：剔除宿主并入的 config 顶层键，记录只存本次方法参数；
- `shadow_redact_params()` / `shadow_public()`：列表/明细脱敏视图；
- `shadow_try_record()`：拦截核心（开启且非 force → 写 pending 记录；否则返回 None）；
- `shadow_archive()` / `shadow_set_mode()`；
- 常量 `PLUGIN_SHADOW_FORCE`（影子逻辑现全部收敛于自包含模块 `shadow_mode.py`，见「推广接入指南」）。

### 7.2 三个请求 handler —— 拦截点（不改发送逻辑）

保持各 handler「解析 → 组装 → 发送」原结构不变，只在**目标/参数解析完成后、发起网络 I/O 之前**插入统一拦截：
1. 调 `shadow_try_record(method_name, params, preview)`；
2. 返回记录 → 输出带 `shadow:true` / `record_id` / preview 的影子标记（code=0），并 `return`，不进入发送段；
3. 返回 None（模式关闭或 force 环境变量）→ 照旧真实发送，与改造前行为一致；
4. 拦截段写入失败 → `output_json(-1, "...演练记录写入失败（已中止，未真实执行）...")`（fail-closed）；
5. MQTT 的 paho 懒加载移到拦截点之后：演练期无需安装/加载依赖即可记录。

新增文件：
- `shadow_status.py` / `shadow_list.py` / `shadow_reject.py` / `shadow_set_mode.py` / `shadow_archive.py`：对应 `intra.shadow.*` 管理方法；
- `shadow_approve.py` → `intra.shadow.approve`：取记录的原始 params，以**子进程重放**方式执行
  `python3 <原handler> <source方法>`，并在子进程环境设置 `PLUGIN_SHADOW_FORCE=1` 绕过拦截真实发送；
  code=0 → 记录标 approved + 结果回写；code!=0/超时/异常 → 记录标 failed（不自动重试）。

### 7.3 fail-closed 细则

- 影子模式下**记录写入失败**（目录不可写/磁盘满/JSON 序列化失败）→ 直接 `output_json(-1, "影子模式：演练记录写入失败，已中止本次调用（未真实执行）")`，保证“拦截不成功就绝不放行”。
- `approve` 真执行失败 → 记录标 `failed` 并回写错误信息，返回错误，不自动重试（防重复副作用）。

### 7.4 SOAP / MQTT 拦截差异

- SOAP：本质 HTTP POST，拦截点在 `requests.request` 之前；记录 `method/namespace/soap_action/params/raw_body` 原始参即可重放。
- MQTT：拦截点在**新建连接/发布之前**；只发布不等应答（无 response_topic）的调用同样拦截——它也是真实副作用。

## 8. Web 控制台（web_ui/index.html）

新增「影子演练」Tab（对管理员可见）：
- 顶部状态条 + 模式开关：当前模式（演练/生产）与待审数量（调 `intra.shadow.status`）；「进入演练 / 退出演练」按钮（调 `intra.shadow.set_mode`），切换成功后刷新状态；
- 记录表格：时间 / 来源方法 / HTTP 方法 / 脱敏目标 / 状态 / 操作；
  - `pending`：可展开查看脱敏明细（脱敏 params），操作：**批准执行** / **驳回**
  - `approved/rejected/failed`：只读展示（含真实执行结果）
- 「归档已处理记录」按钮（调 `intra.shadow.archive`）；
- 复用既有 `API_BASE = '/prod-api/biz/plugin_web/gen-intranet-fetcher/api/'` 桥接（JWT 会话已由宿主代理处理）。

## 9. SKILL.md 行为约定（skills/intra-fetch-intranet/SKILL.md）

AI 调用前若 `intra.shadow.status` 显示影子开启：
- 任何请求返回带 `shadow:true` 的记录 → 向用户明确汇报“本次为演练记录，未真实执行，待管理员批准”，**不得声称操作已生效**；
- 涉及删除/覆盖/转账类语义时仍按既有约定先向用户二次确认（演练不豁免语义安全）。

## 10. 安全与权限小结

| 维度 | 措施 |
|---|---|
| 谁在影子期会被“拦” | 所有能调用本插件方法的账号（AI 与 Web 控制台），全局生效，无死角 |
| 谁能审批/放行 | `intra.shadow.*` 方法级授权仅给 admin；控制台演练 Tab 仅管理员可见 |
| 敏感信息 | 记录落盘 = 原始调用参数（与 plugin.json 同信任域）；列表/明细展示一律脱敏（URL 凭证、headers/body 密钥键） |
| 拦截失败 | fail-closed：记录写失败即中止，绝不静默放行 |
| 宿主侧双重记录 | 影子期每次 handler 调用仍走宿主 cmd_log（方法名 + 入参），与影子记录互为印证 |
| 放行副作用 | approve 每次人工触发一次真执行，失败不自动重试；高频触发受宿主 risk 级高危限流约束 |

## 11. 边界与已知限制

- 无 mock：影子期调用方拿不到“业务数据”，只有演练标记——这是设计选择（防 AI 误信假数据）；
- 记录无调用者身份（宿主当前不把 user_id 传给插件），需靠宿主 cmd_log 关联调用者；
- 审批执行是“当时当下”的真执行，若想等“演练期结束后统一按新配置放行”属另一语义，本期不做；
- 影子记录文件无自动大小上限策略（提供手动归档按钮瘦身），目录满为操作级风险，非安全风险。

## 12. 里程碑建议（评审确认后按此实施）

1. **M1 地基**：config 字段 + 自包含 `shadow_mode.py`（set_mode/archive/原子写/拦截）+ 三协议 handler 拦截点 + `shadow_status / set_mode / reject / archive`（shadow_mode=false 默认，回归验证原行为不变）。
2. **M2 三协议闭环**：`shadow_approve` force 重放；本机起假站点验证 HTTP / SOAP / MQTT 各自“影子拦截不真发 → 批准后真发且结果回写”全链路。
3. **M3 控制台与收尾**：web_ui「影子演练」Tab（模式开关按钮 + 审批/驳回/归档）、SKILL.md 更新、README_ZH 增补（含授权步骤与演练操作清单）、真实内网站点演练。

## 13. 开放问题（已全部确认，见 §3 决策表）

实施前无需再确认的设计点均已在 §3 定稿；以下留作后续观察项（本期不做）：
1. 影子期记录量很大时的**自动**归档/保留策略（本期提供手动归档按钮）；
2. 宿主 cmd_log 关联调用者身份直接透传给插件（本期靠 cmd_log 人工关联）；
3. 影子模式推广到其他插件 / 宿主通用层（本期试点本插件）。

---

## 附录：推广接入指南（给其他插件加影子模式）

> 宿主约定每个插件**自包含、禁止插件间依赖**，因此“复用”采用**整文件拷贝**方式（与各插件自带 util 的既有惯例一致），不改宿主代码。

### 一、需要拷贝的通用文件（7 个，除标注外一字不改）

| 文件 | 是否需改 |
|---|---|
| `shadow_mode.py` | 否（自包含，唯一真相） |
| `shadow_status.py` / `shadow_list.py` / `shadow_reject.py` / `shadow_set_mode.py` / `shadow_archive.py` | 否 |
| `shadow_approve.py` | **是**：只改文首 `_HANDLER_BY_SOURCE` 映射表（本插件“方法名 → 处理器 py”）与重放方式（见下） |

### 二、接入四步

1. **拷文件**：上面 7 个 py 拷入目标插件目录（与 handler 同级）。
2. **plugin.json**：
   - `config` 增加：`"shadow_mode": false`、`"shadow_log_dir": "shadow_log"`；
   - `methods` 增加 6 条定义（照抄 gen-intranet-fetcher 的 `intra.shadow.*`，把方法名前缀换成该插件域，如 `feishu.shadow.status` …；`risk_level`：status=normal，其余 risk）。
3. **副作用 handler 插拦截点**：在该方法真正动手（发网络/删文件/写库/发布）前插入：

```python
from shadow_mode import shadow_try_record, output_json  # protocol 函数若插件 util 已有同名，用自家的也行

try:
    rec = shadow_try_record(方法名, params, {
        "site": 站点或空, "http_method": "POST 等或空", "target_url": 已脱敏目标或文件路径,
    })
except Exception as e:
    output_json(-1, f"影子模式：演练记录写入失败（本次调用已中止，未真实执行）: {e}")
if rec is not None:
    output_json(0, "ok", {
        "shadow": True, "record_id": rec["id"], "status": rec["status"],
        "preview": {...可读摘要...},
        "note": "影子演练模式：本次调用仅记录、未真实执行，待管理员批准后才会真实执行",
    })
    return
```

   - 只读、无副作用的方法（列表/查询类）不用插；
   - preview 的 `target_url` 对文件类可放文件路径/资源标识，仅展示用；
   - 同一 handler 多个写方法要重复插时，可包一层小函数/装饰器，样板即上述 8 行。
4. **shadow_approve.py 适配**：
   - 改 `_HANDLER_BY_SOURCE`，例如飞书：`{"feishu.im.send_text": "send_text.py", "feishu.im.send_card": "send_card.py"}`；
   - 默认重放方式 = 子进程 `python3 <handler> <方法名>` + `PLUGIN_SHADOW_FORCE=1`（与该插件业务 handler 的 stdin/stdout 一致）；
   - 若目标插件副作用不经过“再调一次 handler”就能复现（如函数式库），也可改重放分支直接调用其业务函数；记录状态机接口（find/update + approved/failed）保持不变。

### 三、建议与注意

- **命名**：管理方法统一 `<域>.shadow.*`，便于 AI/宿主识别。
- **权限**：list/approve/reject/set_mode/archive 只授权 admin；status 可给普通/AI 账号。
- **web_ui**：影子演练 Tab 可直接仿 gen-intranet-fetcher 的 [index.html 影子段]，桥接层 `API_BASE` 机制通用，仅方法名前缀不同。
- **SKILL**：指引 AI 操作前先调 `<域>.shadow.status`，收到 `shadow:true` 一律如实汇报“演练记录、未真实执行”。
- **安全不变式（不可丢）**：拦截写盘失败 → fail-closed 中止；force 环境变量只能由宿主侧 approve 子进程注入；展示/列表一律脱敏；管理方法不暴露给 AI。
- 若某插件的“真实副作用”在本机根本无法安全复现（如对接外部硬件的独占操作），批准重放仍会真实执行——接入前需确认 approve 语义对该插件可接受。
