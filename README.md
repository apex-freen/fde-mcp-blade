<div align="center">

# FDE MCP Blade

**The AI toolbox you deploy inside your customer's data center — an intranet AI tool-access & governance hub for FDEs and system integrators**

[![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](./LICENSE)
[![Docker](https://img.shields.io/badge/Docker-amd64-2496ED?logo=docker&logoColor=white)](./fde-mcp-blade)
[![MCP](https://img.shields.io/badge/MCP-2025--11--25_·_2026--07--28-7B61FF)](https://modelcontextprotocol.io)
[![Vue](https://img.shields.io/badge/Vue-3.4-42B883?logo=vuedotjs&logoColor=white)](./fde-mcp-blade-admin)
[![Live Demo](https://img.shields.io/badge/Live_Demo-fde.agent--plat.com-00B8A9?logo=googlechrome&logoColor=white)](https://fde.agent-plat.com)
[![QQ Group](https://img.shields.io/badge/QQ_Group-882419824-EB1923?logo=tencentqq&logoColor=white)](#feedback--beta-invite)

**English** | [中文](./README.zh-CN.md)

</div>

---

> **One-line pitch**: consolidate your enterprise systems into **one unified MCP tool entry point**, so AI agents from any platform can call enterprise capabilities under explicit permissions and full auditing — data never leaves your network, every action is logged, no agent-platform lock-in.

> 🌍 **Live demo**: <https://fde.agent-plat.com> (demo account `admin / admin123`, demo data only — do not store sensitive information; demo data may be reset at any time)

Other platforms make AI smarter; Blade makes AI *enter your company safely and stay accountable*. It does no reasoning orchestration and hosts no LLM — it occupies the layer that survives every hype cycle: the **tool-provisioning layer**.

| | |
|---|---|
| 🚀 **Fast to install** | One-command deployment; Docker + MariaDB is the whole stack; database auto-initialized on first start; runs on 1 core / 1 GB / 16 GB (verified on low-spec x86 hardware; linux/amd64 images today, arm64 in testing) |
| 🔒 **Tightly governed** | Five-layer security (authn · authz · expiry · bypass-proof · rate-limit) + 4-level risk grading + human approval for high-risk actions; credentials stay vaulted, never handed to the agent |
| 📋 **Fully auditable** | Operation / grant / token / sign-in audit trails end to end — replayable, exportable; even the export action itself is logged |
| 🧩 **Broadly connectable** | Standard MCP — Claude / Cursor / Coze / Dify / TRAE / WorkBuddy / ERNIE / your own agent all work; install a plugin = connect a system; OpenAPI-to-MCP conversion built in |
| 🏠 **Zero lock-in** | Purely local: zero SaaS dependency, zero data egress, zero subscription tiers; cloud access is optional and requires **explicit admin authorization** — authorized accounts are flagged as "cloud accounts" in the system, and the data-egress risk is acknowledged and owned by the admin |
| 🖥️ **Visible value** | Chinese-first admin console, 5 domains / 49 pages, bilingual UI, dark mode, Ctrl+K palette, value & cost dashboards |

## Screenshots

| Console workbench | Operation audit |
|---|---|
| ![Workbench](docs/screenshots/app-home.png) | ![Audit](docs/screenshots/m5-audit-oplog.png) |

| Skill library | Vector knowledge base |
|---|---|
| ![Skills](docs/screenshots/page-skill.png) | ![Knowledge base](docs/screenshots/page-vector.png) |

### Dashboards (driven by real call data)

| Value report | Cost panel |
|---|---|
| ![Value report](docs/screenshots/screen-report.jpg) | ![Cost panel](docs/screenshots/screen-cost.jpg) |

| FDE delivered value |
|---|
| ![FDE value](docs/screenshots/screen-fde.jpg) |

## Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│ Layer 1  Agents     Claude / Cursor / Coze / Dify / TRAE / yours  │
│                     — "how AI thinks" stays with agent platforms  │
└──────────────────────────────┬───────────────────────────────────┘
                               │  MCP standard (Streamable HTTP)
┌──────────────────────────────▼───────────────────────────────────┐
│ Layer 2  FDE MCP Blade (this product · single Rust binary)        │
│          Unified MCP entry · five-layer security · vaulted creds  │
│          Full audit trail · RBAC + PII masking · skills & KB      │
│          (same process serves the web console — no nginx)         │
└──────────────────────────────┬───────────────────────────────────┘
                               │  plugin engine (install = connect)
┌──────────────────────────────▼───────────────────────────────────┐
│ Layer 3  Systems    Feishu / DingTalk / WeCom / MES / ERP / CRM   │
│                     databases / RPA / MQTT devices / in-house     │
└──────────────────────────────────────────────────────────────────┘
```

## Quick start in 30 seconds

```bash
# 1. Clone (the deployment package lives in the fde-mcp-blade/ subdirectory)
git clone https://github.com/apex-freen/fde-mcp-blade.git
cd fde-mcp-blade/fde-mcp-blade

# 2. One-command install (guided: secrets → image pull → start → health check)
./install.sh
```

Or the manual two-liner:

```bash
echo "JWT_SECRET=$(openssl rand -base64 32)" > .env   # the only required variable
docker compose up -d
```

```bash
# 3. Verify
curl http://localhost:8018/health        # returns OK
# Open http://<device-ip>:8018 in a browser
# Default account: admin / admin123 (change it immediately after first sign-in)
# ⚠️ NEVER go to production with the default password — reset it right after first sign-in
```

**Requirements**: Docker 20.10+ / Compose v2; minimum 1 core / 1 GB / 16 GB, recommended 2 cores / 4 GB / 32 GB; linux/amd64 images today (arm64 in testing).

> 📖 **Full deployment guide** (both install methods, ports, backup & restore, upgrade & rollback, ops commands, troubleshooting): [`fde-mcp-blade/README.md`](./fde-mcp-blade/README.md).

## Four steps to your MVP (recommended order)

Don't let the 5-domain / 49-page console scare you — each step takes under 30 minutes and hand-verifies one selling point:

| # | 🎯 Pain first → what you try | How | What you'll see / what it proves |
|---|---|---|---|
| **1** | *After delivery, every little question comes back to you — the engineer becomes a 24/7 human helpline* → **Let the agent answer for you** (live demo · 5 min · zero install) | Sign in at <https://fde.agent-plat.com> (`admin` / `admin123`) → **Admin Center › Access & Authorization › MCP Tokens** → create a token → paste the MCP config into Claude / Cursor / Coze etc. → ask **"What's in the knowledge base?"** → check the trail under **Audit Center › Operation Audit** | The agent lists the system's capabilities one by one. ✔ Your customers' simple questions get answered by the agent, not by you; ✔ this very Q&A is already audited — the value dashboard now has its first datapoint |
| **2** | *Traditional platforms need environment reviews, approvals, a week of waiting; demos require hauling in your own server* → **Local deploy, local calls** (30 min) | Follow Quick start above — `install.ps1` on Windows, `install.sh` on Linux | The full system running on your own machine, data never leaves it. ✔ Fast install, zero SaaS dependency |
| **3** | *Customers dare not hand permissions to AI: full access is scary, full lockdown is useless* → **Install your first plugin, touch the agent's boundary** (Feishu / WeCom / DingTalk / intranet · 20 min) | Copy a plugin folder from the repo's `service_plugins/` (Feishu, WeCom, DingTalk, intranet API, etc.) into the deployment directory `fde-mcp-blade/data/service-plugins/` — the host auto-discovers and loads it, no restart → ask the agent **"Which users are in the system?"**: with PII masking on by default, phone numbers come back as 138\*\*\*\*5678 — sensitive fields the agent can't see → go to **Admin Center › Platform Capabilities › PII Masking**, disable the rule or whitelist it → ask again: full details → fill in the Feishu app credentials under **Plugin Config** and enable it (credentials go into the **Plugin Vault**, the agent never sees them) → have the agent message a user or a group directly | A message lands in your Feishu from "the agent"; the phone number's journey from masked to unmasked is a boundary you operated by hand. ✔ Install a plugin = connect a system; ✔ encryption & masking are on by default; ✔ you define the boundary |
| **4** | *Every new system = vendor scheduling + tens of thousands in customization; delivery can't scale* → **Write your own plugin from the template** (~half a day) | Model yours on the **plugin development standard** and existing plugins in the repo's `service_plugins/`, fill in your intranet system's address / APIs / credentials (install it under **Admin Center › Plugin Management**); for well-documented systems, enable **OpenAPI-to-MCP** there too — paste the doc URL and get an MCP Server in 10 minutes, zero code | Your own system shows up in the agent's tool list. ✔ No need to modify Blade or wait for us (the dev standard and official plugins live in the repo's service_plugins/ directory) |

## Official plugin pack (service_plugins/)

The repo ships a set of official plugins, **copy-to-install**: drop a plugin folder into the deployment directory `fde-mcp-blade/data/service-plugins/` and the host scans the directory in real time, auto-discovers and loads it — no restart. Credentials never live inside plugin files — put them in the console's **Plugin Vault** (`gis_secret`); the agent can never reach them.

| Plugin | Connects to | What it does |
|---|---|---|
| `biz-feishu-connector` | Feishu | Work notifications (text / Markdown), group bot push, directory lookup |
| `biz-wecom-connector` | WeCom | Same as above, plus the message-center convention method `notify.by_phone` (notify by phone number — auto-detected by the message center) |
| `biz-dingtalk-connector` | DingTalk | Work notifications, signed group bots, phone-to-userId lookup / member details |
| `gen-intranet-fetcher` | Intranet systems | HTTP / SOAP / MQTT data retrieval with built-in anti-injection sanitization and source labeling |
| `biz-dify-connector` | Dify knowledge base | Create datasets, upload documents, retrieve, Q&A |
| `gen-review-docs` | Delivery kit | Review-readiness pack: 8 static compliance documents |

Naming prefixes: `gen-` general-purpose / `biz-` business & enterprise scenarios. To write your own plugin, model it on [`service_plugins/plugin_develop_standard.md`](./service_plugins/plugin_develop_standard.md) and the existing plugins — `plugin.json` declares methods, parameters and risk levels (`normal` / `risk` / `auth` = human approval for high-risk / `disable`); declare `manual_avg_minutes` on a method and the value dashboard's human-equivalent hours compute themselves.

## Connect your AI (MCP)

1. Sign in to the console → **Admin Center › Access & Authorization › MCP Tokens** → create a token;
2. The result gives you a **copy-paste-ready MCP config plus a QR code** — no hand-assembling;
3. Paste it into Claude / Cursor / TRAE…, ask the AI to list its tools — you're connected.

```json
{
  "mcpServers": {
    "admin_abc12345": {
      "url": "http://192.168.1.10:8018/mcp",
      "headers": {
        "X-Apex-Local-Token": "Bearer <the token returned at creation>"
      }
    }
  }
}
```

> Note: **Apex** in the `X-Apex-Local-Token` header is an internal codename (the project was formerly named Apex MCP Bridge) — use it as-is, it just works.

- Endpoint `http://<device-ip>:8018/mcp`, Streamable HTTP (stdio is not supported);
- Supports both MCP `2025-11-25` (legacy) and the current official `2026-07-28`; the server detects the version automatically;
- Tokens are shown only once at creation and can be revoked with immediate effect;
- **Tool scope follows the token**: devices and services the token cannot touch don't even appear in the tool list.

## Feature overview

| Domain | Contents |
|---|---|
| **Workspace** | Dashboard, agents, devices, command palette (Ctrl+K) |
| **Administration** | Users / departments / RBAC, device grants, API tokens, files, plugin center, firmware |
| **Audit** | Operation / grant / token / sign-in logs, risk dashboard (column presets, virtual scrolling, export) |
| **Capability layer** | Vector knowledge base (drop a file, click sync, searchable), skill library (SKILL.md), shadow rehearsal, capability overview |
| **Dashboards** | Value report, cost panel, FDE value (human-equivalent minutes — numbers, not promises) |
| **Delivery kit** | Full Chinese admin console, bilingual UI (2200+ strings), dark mode, built-in knowledge base for self-service answers |

## Repository layout

```
fde-mcp-blade/
├── fde-mcp-blade/          # Deployment package: compose + install/ops/backup scripts + guides (EN/CN)
├── fde-mcp-blade-admin/    # Web console source (Vue 3.4 + Vite 5 + Arco Design)
├── service_plugins/        # Official plugin pack: Feishu / WeCom / DingTalk / intranet / Dify + plugin dev standard
├── docs/                   # Architecture diagram & screenshots
├── LICENSE                 # Apache 2.0
└── README.md / README.zh-CN.md
```

## Roadmap

- [x] Five-layer security + 4-level risk grading + human approval
- [x] 4 audit categories + replay + alerts + export
- [x] Shadow rehearsal, PII masking engine, RBAC + department isolation
- [x] Vector knowledge base + skill library + value / cost dashboards
- [x] One-command deploy + encrypted backup + ops scripts
- [x] Official plugin pack: Feishu / WeCom / DingTalk / intranet fetcher / Dify KB connectors + plugin dev standard
- [ ] Tamper-evident audit logs (hash chain / append-only store) — in design
- [ ] arm64 images — in testing
- [ ] Industry template packs (tools + workflow + SKILL + audit config, 7-module bundle) — detailed design done

## Feedback & beta invite

The project is in **beta** — join us:

- Enterprises: bring a real scenario; beta participation is **free**;
- FDEs / integrators: let's talk delivery methodology — the product is designed around your day job;
- Learners welcome too: start by getting this running on your own machine.

| Channel | |
|---|---|
| Live demo | <https://fde.agent-plat.com> (demo account `admin / admin123`) |
| QQ Group | `882419824` (developer community, responsive, no SLA) |
| Email | `448004147@qq.com` |
| Gitee | <https://gitee.com/freen/fde-mcp-blade> |
| GitHub | <https://github.com/apex-freen/fde-mcp-blade> |

If this looks valuable to you, a ⭐ Star is the best support an independent project can get.

## License

[Apache License 2.0](./LICENSE) — permissive, commercial-friendly, with an explicit patent grant.
