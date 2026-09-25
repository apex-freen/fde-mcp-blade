<!--
  biz-dify-connector — Dify Knowledge Base (RAG) Connector
  User-facing configuration guide (README)
-->
# biz-dify-connector

MCP connector plugin for **self-hosted Dify (Community/Enterprise Edition)** knowledge
bases (RAG): list/create datasets, add documents as text or by uploading a local file,
semantically retrieve chunks, and ask a published Dify app a question. Built on `requests`;
drop the folder into `service_plugins/` to install.

## Capabilities (phase 1)

| Method | Description | Risk | Underlying Dify API |
|---|---|---|---|
| `dify.dataset.create` | Create a dataset (knowledge base), returns `dataset_id` | risk | `POST /datasets` |
| `dify.dataset.list` | List datasets visible to the dataset API key (get `dataset_id`) | risk | `GET /datasets?page=&limit=` |
| `dify.doc.add_text` | Add a plain-text document to a dataset (async chunking + embedding) | risk | `POST /datasets/{dataset_id}/documents/create_by_text` |
| `dify.doc.upload` | Upload a local file from the host as a document (async indexing) | auth | `POST /datasets/{dataset_id}/documents/create_by_file` |
| `dify.dataset.retrieve` | Semantic search (RAG recall) against a dataset | normal | `POST /datasets/{dataset_id}/retrieve` |
| `dify.chat.ask` | One Q&A round with a published Dify app (blocking) | normal | `POST /chat-messages` |

All dataset methods use the **dataset API key**; `dify.chat.ask` uses the **app API key**.

## What to configure & where to get it

Edit the `config` block of `plugin.json` (admin action). Config is re-read on every call —
**changes take effect immediately, no restart needed**.

| `config` field | Required | Purpose | Where to get it |
|---|---|---|---|
| `base_url` | Yes | Self-hosted Dify **API** address — must include `/v1`, e.g. `http://192.168.x.x:3000/v1` | Dify console → "API Access" page shows the API server address |
| `dataset_api_key` | Yes | **Dataset API key** — decides which knowledge base this key can see/operate on | Dify console → Knowledge base (dataset) → its "API Access" → API key (**one key per dataset**; use the key from the dataset detail page) |
| `app_api_key` | Yes* | **App API key** — used only by `dify.chat.ask` | Dify console → App → "API Access" → API key (app must be published) |

\* Required only if you use `dify.chat.ask`.

### Prerequisites (in the Dify console)

- **Model providers configured**: an **Embedding model** (dataset indexing) plus a **system
  inference model** (apps / `chat.ask`) under Settings → Model Providers. Without an
  embedding model, documents stay `pending` / retrieval errors.
- **App published** under App → API Access before `dify.chat.ask` works; knowledge-base
  Q&A apps must also **link a knowledge base** in the app orchestration.
- **Dataset exists** before adding documents (`dify.dataset.create` or create it in console).
- **Indexing is async**: after `add_text`/`upload`, documents are `pending` and become
  `available` (a few seconds to tens of seconds; longer for large files). Retrieving
  immediately after adding often finds nothing — that is normal.

### Minimal config example

```jsonc
"config": {
  "base_url": "http://192.168.1.100:3000/v1",   // must include /v1
  "dataset_api_key": "dataset-xxx",             // e.g. dataset-xxxxxxxx
  "app_api_key": "app-xxx"                      // e.g. app-xxxxxxxx
}
```

> **Credential recommendation — use the secret box**: both API keys are sensitive credentials and should not stay in plaintext in `plugin.json` long-term. Keep placeholders in the file (e.g. `${dataset_api_key}`) and store the real values in the plugin secret box (key names matching the placeholders, owned by plugin `biz-dify-connector`); the host resolves and injects them before the call. **Create placeholders only for the keys you actually use** — leave unused keys empty (otherwise the whole plugin's calls fail due to the missing secret). See [service_plugins/README.md](../README.md#plugin-secret-box-config-placeholders) for the full convention.

## Quick connectivity check

List datasets (verifies reachability + base_url + key in one call):

```bash
curl -s "http://192.168.1.100:3000/v1/datasets?page=1&limit=20" \
  -H "Authorization: Bearer dataset-xxx"
```

A dataset array means the connection and key are OK (an empty array = reachable, but no
datasets under this key yet). Then verify retrieval:

```bash
curl -s -X POST "http://192.168.1.100:3000/v1/datasets/{dataset_id}/retrieve" \
  -H "Authorization: Bearer dataset-xxx" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "What is the reimbursement process?",
    "retrieval_model": {
      "search_method": "semantic_search",
      "reranking_enable": false,
      "top_k": 5,
      "score_threshold_enabled": false,
      "score_threshold": null
    }
  }'
```

## Common issues & pitfalls

- **401/403** — wrong key, key used for the wrong purpose (dataset key vs app key), key
  not paired with the `base_url` server, or no permission on the target dataset (a dataset
  key only covers its own dataset).
- **404** — wrong/removed `dataset_id`, or the key cannot see that dataset; re-check with
  `dify.dataset.list`.
- **Retrieval right after add/upload returns nothing** — async indexing not finished
  (`pending`); wait and confirm status via `dify.dataset.list`.
- **Documents stuck `pending`** — no Embedding model configured in Settings → Model
  Providers, or the file format cannot be parsed.
- **`dify.doc.upload` file errors** — `file_path` must be a readable **local absolute path
  on the host**; no relative paths, no remote URLs.
- **`chat.ask` app errors** — app not published, app key not used, or a knowledge-base Q&A
  app that has no knowledge base linked (it answers without RAG).

## Phase-2 roadmap (design notes only — not committed)

Phase 1 covers only self-hosted Dify. The roadmap targets "different RAG platforms →
different plugins, one unified method mental model": candidate phase-2 targets are RAGFlow
(complex document layout parsing; own API/auth/embedding model), cloud platforms (Alibaba
Bailian / Coze; cloud credentials and managed embedding), and direct vector stores
(Qdrant/Chroma; you do your own chunking + embedding + similarity). Keep per-platform
method prefixes (`dify.*` / `ragflow.*` / `bailian.*` / `vector.*`) with aligned semantics
(`dataset` / `doc` / `retrieve` / `chat`) so agents can migrate across platforms by only
switching the prefix and config. Also envisioned: orchestrating retrieval/notification
flows with the IM plugins (feishu/wecom/dingtalk), and phase-2 file-ingestion governance
(host-side file channel with a path whitelist) plus batching for large documents. See
[README_ZH.md](./README_ZH.md) for the full design notes (Chinese).

## Reference docs

- Dify docs: <https://docs.dify.ai>
- Method details & error quick reference: `skills/dify-kb-operate/SKILL.md`
