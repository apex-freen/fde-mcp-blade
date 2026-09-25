---
name: dify-kb-operate
description: 操作自托管 Dify 知识库（RAG）的完整指南：前置条件与配置核对（base_url/两类 API Key/embedding）、如何拿到 dataset_id、按文本建文档还是本机文件上传的分流、语义检索 top_k 调参、常见报错（401/404/embedding 未配置/pending）处置。
  Use when 用户要求「检索公司/团队知识库」「把某段文本或某个文件加进知识库」「让 Dify 应用回答一个问题」「知识库问答/文档召回」时取用本技能。
metadata:
  version: "1.0.0"
  author: biz-dify-connector
allowed-tools:
  - dify.dataset.create
  - dify.dataset.list
  - dify.doc.add_text
  - dify.doc.upload
  - dify.dataset.retrieve
  - dify.chat.ask
---

# Dify 知识库操作指南（Dify 知识库连接服务）

> **调用方式（必读）**：本插件的方法统一通过 `local_service_call` 调用，参数里**必须带** `service_name: "biz-dify-connector"`（即本技能的 `author`，也就是插件名）与 `method_name`（如 `dify.doc.upload`），再加上各方法自己的参数（见下文）。缺 `service_name` 会被宿主直接拒绝。

## 0. 出发前必查（先分流，别直接调）

按顺序自查，任何一条不满足就先处理：

1. **plugin.json 配置就绪**：`config.base_url`（自托管 Dify 的 API 地址，形如 `http://192.168.x.x/v1`）、`config.dataset_api_key`、`config.app_api_key` 三项非空，否则任何方法都报"缺少 config.base_url / config.dataset_api_key / config.app_api_key"。插件每次调用都重读 plugin.json，**改配置即时生效，无需重启**。
2. **三类前置必须满足**（缺哪个就报哪个错，不要带着问题硬调）：
   - **Dify 服务在跑且宿主可访问**：`base_url` 是本机/内网可达的自托管地址（Dify 后台「API 访问」页会显示该 API 服务器地址）；
   - **模型与 embedding 已配**：在 Dify 后台「设置 → 模型供应商」至少配好一个 **Embedding 模型**（还要有对话/推理模型给 chat.ask 用）——没配 embedding 时，文档会一直 pending/索引失败、检索直接报错；
   - **知识库里有已完成索引的文档**：新建空知识库检索不到任何内容（见 §2 拿 dataset_id、§3 加文档、§5 pending 速查）。
3. **Key 用途分清**（两类 Key 不能混用）：
   - `dataset_api_key`（知识库 API Key，Dify「知识库 → API 访问」页生成）：除 `dify.chat.ask` 外全部方法用；
   - `app_api_key`（应用 API Key，Dify「应用 → API 访问」页生成）：仅 `dify.chat.ask` 用，且要求该应用**已发布**、已配置模型，知识库问答类应用还须在应用编排里**关联了知识库**。
   - 任一方法都可用调用参数 `api_key` 临时覆盖默认 Key（如临时换另一个数据集/应用调试）。

## 1. 拿 dataset_id（一切加文档/检索的前提）

`dify.dataset.list` 直接列出当前数据集 Key 可见的全部知识库，返回每条含 `dataset_id` / `name` / `document_count`：

```
dify.dataset.list {page?:1, limit?:20}
```

没有目标知识库时先用 `dify.dataset.create {name:"..."}` 建一个，返回里的 `dataset_id` 就是后续 `dify.doc.add_text` / `dify.doc.upload` / `dify.dataset.retrieve` 要填的 dataset_id。

## 2. 加文档：文本 vs 本机文件（分流）

- **内容在手头、是文字**（规范、FAQ、纪要、说明、话术等）→ `dify.doc.add_text {dataset_id, name, text}`，纯文本最省事，切块交给 Dify 默认规则；
- **内容在宿主机一个文件里**（.txt/.md/.pdf/.docx 等 Dify 可解析格式，需要保留原文档形态/批量导入）→ `dify.doc.upload {dataset_id, file_path}`。file_path 是**宿主机本地绝对路径**（管理员授权使用），文件不存在/不可读会明确报错；不要传相对路径、不要传远端 URL；
- 两者都是**异步索引**：返回后文档状态多为 `pending`，需等 Dify 后台解析/切块/embedding 完成后变 `available` 才能被检索到（小文件通常几秒到几十秒）。**刚加完立刻检索常常召回不到，属正常**，稍候再查（见 §5）。

## 3. 检索（RAG 召回）

`dify.dataset.retrieve {dataset_id, query, top_k?}`：

- `top_k` 默认 5、最大 20。需要"材料齐全"的综述场景可调到 8~10；只要"最相关的一段"用 3 就够；调太大噪音会变多；
- 返回 records[]，每段含 `content`（命中文本）、`score`（相关度，越大越相关）、`document_name`（来源文档）、`metadata`；
- 走的是 `semantic_search`（不开 rerank 与 score 阈值）。若 Dify 后台额外配了 Rerank 模型、又需要精排，属二期调参范围，本期固定为关闭 rerank。

## 4. 应用对话问答

`dify.chat.ask {query, conversation_id?}`（用 app_api_key）：

- 只答不忆 → 不带 conversation_id（新会话）；连续追问 → 把上次返回的 `conversation_id` 带回即可延续上下文；
- 报错先看是不是三类：**应用未发布**（在 Dify「应用 → API 访问」页发布后才可用）、**应用没配模型**、**知识库问答应用没关联知识库**；
- 注意：chat.ask 用的是「应用」Key，**不能拿知识库 dataset_api_key 去调**（会 401）。

## 5. 报错速查表

| 报错/现象 | 含义 | 处置 |
|---|---|---|
| `HTTP 401`（鉴权失败） | API Key 错/未授权 | 检查用的是哪个 Key：知识库方法=dataset_api_key、chat.ask=app_api_key，去 Dify 对应「API 访问」页重新生成；Key 与 base_url 配错也会 401 |
| `HTTP 404`（资源不存在） | dataset_id 错：不存在/已删除/输成文档 ID | 用 `dify.dataset.list` 重新确认 dataset_id |
| 文档一直 `pending` / `indexing` 不变可用 | Dify 后台**未配置 embedding 模型**，或文档格式无法解析 | 在 Dify「设置 → 模型供应商」配置 Embedding 模型；换 .txt/.md 重传验证 |
| 检索报 embedding/向量错误，或空结果 | 知识库里没有已完成索引的文档；或 embedding 服务不可用 | 先 list 确认 document_count>0，等文档 available 再检索 |
| `HTTP 400` | 请求体不合法：dataset_id 含非法字符、text 为空、name 过长等 | 按必填参数重查（name/dataset_id/text/query 非空） |
| `HTTP 429` | 限流 | 稍后重试 |
| `HTTP 500/503` | Dify 服务端内部错误/服务不可用（模型供应商欠费/Key 失效也会表现为 5xx） | 到 Dify 后台看模型供应商状态与日志 |
| chat.ask 报 `app 未发布` / `no permission` | 应用没发布、或没用 app_api_key | 到 Dify「应用 → API 访问」发布应用并取 app_api_key |

## 6. 常见误区

- **dataset 两个 Key 互换使用** → 一定 401；记住"知识库操作=数据集 Key，应用问答=应用 Key"；
- **刚上传/创建完立刻检索** → 文档还在 pending，召回不到不是 bug；
- **把 dataset_id 记错成文档/应用 ID** → 404；
- **让 chat.ask 去答一个没关联任何知识库的应用** → 它只会"裸答"，不经过 RAG；
- **在没配 embedding 的环境里大量传文档** → 全部卡 pending 白等。

## 7. 示例

- 「把这段《会议室使用规范》加进知识库」→ 先 `dify.dataset.list` 拿 dataset_id，再 `dify.doc.add_text {dataset_id, name:"会议室使用规范", text:"<正文>"}`
- 「检索报销流程」→ `dify.dataset.retrieve {dataset_id, query:"报销流程是什么", top_k:5}`，把召回片段喂给大模型组织回答
- 「问公司的 Dify 应用一个问题并多轮追问」→ `dify.chat.ask {query:"下午的会改到几点？", conversation_id:"<上次返回的 conversation_id>"}`
- 「上传本地 PDF 建文档」→ `dify.doc.upload {dataset_id, file_path:"/home/user/share/产品手册.pdf"}`（须为宿主机绝对路径，管理员授权）
