<!--
  biz-dify-connector —— Dify 知识库连接服务（RAG）
  设计文档 / 对接说明 (2026-09-08)
-->
# biz-dify-connector —— Dify 知识库连接服务（RAG）

> 对接**自托管 Dify（社区版/企业版）**知识库/RAG 的连接插件：把 Dify 的知识库（数据集）检索、文档写入与已发布应用对话能力，以 MCP 方法形式暴露给 AI 智能体。面向已自托管 Dify 的团队，把公司内部文档沉淀为可检索知识库并赋能智能体问答。拷贝文件夹到 `service_plugins/` 即安装。

| 项 | 值 |
|---|---|
| 插件 ID | `biz-dify-connector` |
| 服务类型 | `dify-rag` |
| Python | ≥ 3.8 |
| 主要依赖 | `requests`（PyPI） |
| 协议 | MCP 插件标准（stdin 传参 / stdout 返回 JSON） |
| 调用方式 | 每次调用重读 `plugin.json`，**改配置即时生效，无需重启** |

---

## 一、简介与一期方法清单

本插件是"Rust 宿主 → 自托管 Dify"的桥：所有方法由插件进程**主动外呼** Dify 的 HTTP API，无需公网入站、无需端口映射；唯一硬性要求是运行插件进程的宿主机能**内网/网络访问 `config.base_url`**。

```
AI 智能体 / 前端
   │  MCP 调用 dify.xxx
   ▼
apex-mcp-bridge (宿主) ──启动──> python3 <handler>.py <方法名>
                                     │ stdin: {"参数"}
                                     ▼
                               dify_utils.py（公共模块：config / 鉴权头 / 统一响应 / 错误处理）
                                     │ HTTPS（Authorization: Bearer <API Key>）
                                     ▼
                          自托管 Dify（http://192.168.x.x:3000/v1）
```

### 一期方法清单（6 个）

| 方法 | 一句话说明 | risk_level | 底层 Dify API |
|---|---|---|---|
| `dify.dataset.create` | 新建知识库（数据集），返回 `dataset_id` 供后续加文档/检索 | `risk` | `POST /datasets` |
| `dify.dataset.list` | 列出当前数据集 API Key 可见的全部知识库（拿 `dataset_id`/文档数） | `risk` | `GET /datasets?page=&limit=` |
| `dify.doc.add_text` | 把一段纯文本作为新文档写入知识库（Dify 后台异步切块+embedding） | `risk` | `POST /datasets/{dataset_id}/documents/create_by_text` |
| `dify.doc.upload` | 把宿主机本地文件上传建文档（异步解析/切块/索引） | `auth` | `POST /datasets/{dataset_id}/documents/create_by_file` |
| `dify.dataset.retrieve` | 对知识库做语义检索（RAG 召回），返回命中片段 | `normal` | `POST /datasets/{dataset_id}/retrieve` |
| `dify.chat.ask` | 调用已发布 Dify 应用完成一次对话问答（blocking） | `normal` | `POST /chat-messages` |

risk_level 语义：`normal`＝高频读/问答、影响可逆；`risk`＝涉及写操作或组织知识资产，留审计痕迹；`auth`＝代表管理员授权的文件写入动作，需宿主侧 HITL 批准。

> 注：所有知识库类方法走**数据集 API Key**（可被调用参数 `api_key` 临时覆盖）；`dify.chat.ask` 走**应用 API Key**。二者不能混用，详见 §三。

---

## 二、前置条件（在 Dify 后台完成，一次性）

以下任何一条不满足都会导致对应方法报错，先核对再调用：

1. **自托管 Dify 服务在跑、宿主机可达**：`config.base_url` 是本机/内网可达的地址（Dify 后台「API 访问」页会显示该 API 服务器地址）；
2. **模型与 embedding 已配置**：在 Dify「设置 → 模型供应商」至少配好一个 **Embedding 模型**（供知识库切块索引），并配好**系统推理模型**（供应用/`chat.ask` 使用）——缺 embedding 时文档会一直 `pending`/索引失败、检索直接报错；
3. **应用需发布**：`dify.chat.ask` 调用的应用必须在 Dify「应用 → API 访问」页**发布**后才可用；知识库问答类应用还须在应用编排里**关联了知识库**；
4. **知识库需先建好**：有可写的知识库（本插件 `dify.dataset.create` 或 Dify 后台创建）之后，才能 `dify.doc.add_text` / `dify.doc.upload` 加文档；新建的空库本身检索不到内容；
5. **文档索引是异步的**：add/upload 返回后文档状态多为 `pending`，需等 Dify 后台解析/切块/embedding 完成后变 `available`（部分版本文案为 `completed`）才可被检索到——**小文档通常几秒~几十秒，大文档更久**。刚加完立刻检索常召回不到，属正常。

---

## 三、配置指南（★ 核心）

在 `plugin.json` 的 `config` 段编辑三项（管理员操作）。插件每次调用都重读该文件，**保存即生效，无需重启**。

### config 来源速查（用户向）

| config 字段 | 必填 | 作用 | 从哪里获取 |
|---|---|---|---|
| `base_url` | 是 | 自托管 Dify 的 **API 服务地址**（注意要带 `/v1` 前缀），如 `http://192.168.x.x:3000/v1` | Dify 后台「API 访问」页显示的 API 服务器地址 |
| `dataset_api_key` | 是 | **数据集（知识库）API Key**：决定本 Key 能看见/操作哪一个库 | Dify 后台 →「知识库（数据集）」→ 该库的「API 访问」→「API 密钥」。**每知识库一个 Key**，建议取知识库详情里的「数据集 API 密钥」 |
| `app_api_key` | 是* | **应用 API Key**：仅 `dify.chat.ask` 使用 | Dify 后台 →「应用」→ 该应用的「API 访问」→「API 密钥」。应用需已发布 |

\* `app_api_key` 仅当要使用 `dify.chat.ask` 时必须；只用知识库类方法可不填，但建议三项齐备。

要点：

- **Key 决定可见范围**：`dataset_api_key` 只对**它所属的那一个知识库**生效——`dify.dataset.list` 只列出该 Key 可见的库，加文档/检索也只能作用于该 Key 名下的库；拿库 A 的 Key 去操作库 B 会得到 403/404；
- **两类 Key 不可混用**：知识库类方法必须用数据集 Key，`dify.chat.ask` 必须用应用 Key；用数据集 Key 调 `/chat-messages` 会 401；
- 任一方法都可用调用参数 `api_key` 临时覆盖默认 Key（如临时换另一个数据集/应用调试），不改 `plugin.json`。

### 最小配置示例

```jsonc
"config": {
  "base_url": "http://192.168.1.100:3000/v1",   // 自托管 Dify API 地址，必须带 /v1
  "dataset_api_key": "dataset-xxx",             // 知识库（数据集）API Key，脱敏示例：dataset-xxxxxxxx
  "app_api_key": "app-xxx"                      // 应用 API Key，脱敏示例：app-xxxxxxxx
}
```

> **凭证建议走密钥箱**：两个 API Key 均属敏感凭据，不建议长期明文留在 `plugin.json`。可在文件中保留占位符（如 `${dataset_api_key}`），把真实值录入插件密钥箱（键名与占位符一致，归属插件 `biz-dify-connector`），由宿主在调用前解析注入；**只为实际使用的 Key 建占位符**，未使用的 Key 留空即可（否则会因密钥缺失而整插件调用失败）。完整约定见 [service_plugins/README_ZH.md](../README_ZH.md#插件密钥箱配置占位符)。

---

## 四、快速开始 / 连通性验证

### 1) 连通性 + 列知识库（GET）

用 curl 直接列出当前数据集 Key 可见的知识库，一步同时验证「服务可达 + base_url 正确 + Key 有效」：

```bash
curl -s "http://192.168.1.100:3000/v1/datasets?page=1&limit=20" \
  -H "Authorization: Bearer dataset-xxx"
```

- 返回含数据集数组 → 通路与 Key 均正常；`document_count` 可用于确认库里已有完成索引的文档；
- 返回空数组 → 通路正常但该 Key 名下还没有知识库（先用 `dify.dataset.create` 建库）；
- 可加查询参数（`page` / `limit`）分页。

### 2) 检索连通性（POST retrieve）

```bash
curl -s -X POST "http://192.168.1.100:3000/v1/datasets/{dataset_id}/retrieve" \
  -H "Authorization: Bearer dataset-xxx" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "报销流程是什么",
    "retrieval_model": {
      "search_method": "semantic_search",
      "reranking_enable": false,
      "top_k": 5,
      "score_threshold_enabled": false,
      "score_threshold": null
    }
  }'
```

返回 `records[]`（每段含命中文本 `content`、相关度 `score`、来源文档名、`metadata`）即检索链路正常。`{dataset_id}` 取上一步 list 结果。

### 3) 生效方式

改动 `config` 后**即时生效，无需重启**——任何方法下一次调用即读到新配置。

---

## 五、常见问题与误区

| 现象/报错 | 含义 | 处置 |
|---|---|---|
| `HTTP 401` | API Key 错 / 未授权 | 分清 Key 用途：知识库方法=`dataset_api_key`、`chat.ask`=`app_api_key`，去 Dify 对应「API 访问」页重新生成；Key 与 `base_url` 服务器不配对也会 401 |
| `HTTP 403` | 无权限 | 数据集 Key 粒度只属一个库，跨库操作会被拒；确认 Key 与目标知识库匹配 |
| `HTTP 404` | 资源不存在 | `dataset_id` 不存在/已删除/写成了文档或应用 ID，或该 Key 看不到那个库——用 `dify.dataset.list` 重新确认 |
| 刚 `add_text`/`upload` 完检索不到 | **异步索引未完成**（文档还在 `pending`） | 稍候几秒~几十秒（大文档更久），用 `dify.dataset.list` 确认文档/库状态后再检索；这不是 bug |
| 文档一直 `pending` / 检索报向量错误 | 知识库**没配 embedding 模型**，或格式无法解析 | 到 Dify「设置 → 模型供应商」配置 Embedding 模型；换 `.txt`/`.md` 重传验证 |
| `upload` 报文件不存在/不可读 | `file_path` 不是宿主机本地绝对路径 | `file_path` 必须是（运行插件的）宿主机/Dify 主机上的本地路径、文件存在且可读；**不要传相对路径、不要传远端 URL** |
| `chat.ask` 报"未发布"/`no permission` | 应用没发布、或没用应用 Key | 到 Dify「应用 → API 访问」发布应用并取 `app_api_key` |
| `chat.ask` 只"裸答"不召回知识 | 知识库问答应用**没关联知识库** | 在应用编排里关联目标知识库再发布 |
| 检索空结果 | 库里没有已完成索引的文档（`document_count=0` 或全 `pending`） | 先 list 确认，等文档 `available` 再检索 |
| 未配 embedding 就大量传文档 | 全部卡 `pending` 白等 | 先配好 embedding 再批量导入 |
| `HTTP 429` / `413` / `500` | 限流 / 请求体过大 / 服务端异常（模型供应商欠费也表现为 5xx） | 稍后重试 / 精简文本或分批上传 / 查 Dify 后台模型供应商状态与日志 |

其他约定：

- **`dataset_id` 不是文档/应用 ID**——它来自 `dify.dataset.list` 或 `dify.dataset.create` 的返回；
- 检索 `top_k` 默认 5、最大 20，本期固定走 `semantic_search`、不开 rerank 与 score 阈值（Rerank 调参留待二期）；
- 换 embedding 模型或改切块规则等**会触发已有文档重新索引**，期间旧文档检索行为以 Dify 后台为准。

---

## 六、二期扩展规划（设计备忘，非本期承诺）

> 本节为**路线图与设计备忘**，仅作后续迭代参考，**不构成本期交付承诺**，也未排期。

### 6.1 一期边界

一期仅覆盖**自托管 Dify（社区版/企业版）**，通过其知识库 API 与应用对话 API 提供 dataset/doc/retrieve/chat 四类语义。不同 RAG 平台对应**不同插件**，但对 AI 智能体暴露**统一方法心智**是本方向的总体路线。

### 6.2 二期候选平台与适配点（构想）

| 候选 | 定位 | 主要适配点 | 建议方法前缀 |
|---|---|---|---|
| **RAGFlow** | 复杂文档版面/深度解析（PDF、表格、扫描件） | 另一套自托管 API 形态与鉴权；文档解析/切块/embedding 参数不同 | `ragflow.*` |
| **云平台：阿里云百炼 / 扣子(Coze)** | 免运维的托管 RAG 与 Bot | 云 API/凭证体系（AK/令牌而非自托管 Key）；知识库与 bot 为平台侧概念；embedding 由平台托管 | `bailian.*` / `coze.*` |
| **向量库直连：Qdrant / Chroma** | 完全自控的向量存储 | 无"文档/切块/检索服务"，需自行切块并接 embedding（如 bge/one-api）后写向量、自行做相似度召回 | `vector.*` |

**设计建议**：新增平台时**方法命名保持平台前缀**（`dify.*`/`ragflow.*`/`bailian.*`/`vector.*`），且**方法语义跨平台对齐**（`dataset` 建/列、`doc` 增、`retrieve` 召回、`chat` 问答），config 沿用"`base_url` + 凭证 Key"分平台条目——这样 AI 智能体只需记住一套方法心智，跨平台迁移时仅需换前缀与 config。

### 6.3 与 IM 插件协同（构想）

与三个 IM 连接插件（`biz-feishu-connector` / `biz-wecom-connector` / `biz-dingtalk-connector`）协同：由**宿主侧编排组合调用**（插件间不直接互调），把「知识库检索/文档入库完成」的结果经对应 IM 插件的消息方法**推送**到群或用户，形成「文档入库完成 → 通知」或「检索 → 生成 → 推送」的流水线。

### 6.4 文件上传治理与性能（构想）

- **上传治理**：一期 `dify.doc.upload` 由管理员授权直接读取宿主机路径；二期考虑宿主侧**文件通道 + 白名单路径**（如仅允许 `/data/dify-import/` 下文件），降低任意路径读写的暴露面；
- **性能**：大文档/大批量采用**分批 add/upload**，注意 Dify 异步索引吞吐与 `413`/`429` 限制；可在宿主侧做任务队列 + 状态轮询（用 `dify.dataset.list` 查文档是否 `available`）后再进入检索环节。

---

## 七、参考资料

- Dify 官方文档（自托管部署、后台设置、知识库/应用 API）：https://docs.dify.ai
- 本插件方法实现与报错速查：`skills/dify-kb-operate/SKILL.md`
- 公共模块 `dify_utils.py`：config 读取、鉴权头、统一响应与错误映射
- 插件开发标准与宿主约定：项目根 `README.md` / `README.en.md` 及宿主侧文档

---

## 八、影子演练模式（shadow 演练）

`plugin.json` 的 `config.shadow_mode=true` 时，本插件有真实外部副作用的 4 个方法（`dify.dataset.create` / `dify.doc.add_text` / `dify.doc.upload` / `dify.chat.ask`）**只写影子记录、绝不真发**：调用会先落一条 pending 记录到 `<插件根>/shadow_log/records.jsonl` 再返回 `shadow:true`，待管理员用 `dify.shadow.approve`（force 重放）批准后才真实执行；纯查询（`dify.dataset.list` / `dify.dataset.retrieve`）不受影响。管理用 `dify.shadow.status/list/reject/set_mode/archive` 可查开关与记录、驳回、进出演练模式、归档已处理记录；`PLUGIN_SHADOW_FORCE=1`（宿主侧子进程）可强制放行。影子记录参数中的 API Key/token 等密钥键一律脱敏展示，不落明文。
