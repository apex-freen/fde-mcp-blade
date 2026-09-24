# FDE MCP Blade — Deployment & Usage Guide

> 中文版：[README.zh-CN.md](./README.zh-CN.md)

> An **AI agent tool-side control plane** deployed on your own premises: it consolidates enterprise systems into **one unified MCP tool entry point**, so AI agents can call devices and intranet services under explicit permissions and full auditing.
> Local-first by default — no data leaves your network.

This directory is the **deployment package**: image configuration plus ops scripts. It does not contain source code.

---

## 1. What's in this directory

| File | Purpose |
|------|---------|
| `docker-compose.yml` | Deployment manifest (Chinese comments): app + built-in MariaDB |
| `docker-compose_en.yml` | Same, with English comments |
| `.env_` | Environment variable template (**only `JWT_SECRET` is required**) |
| `install.sh` | One-command installer (Chinese / English UI) |
| `ops.sh` | Day-to-day ops (status, initialise passwords, rotate secrets) |
| `backup.sh` | Encrypted backup / restore |
| `deploy/` | Language packs used by the two scripts above (do not delete) |

**Dependencies**: Docker only. MariaDB is bundled in the manifest — no Redis, no message queue, no external MQTT broker needed.

---

## 2. Requirements

| Item | Minimum | Recommended |
|---|---|---|
| CPU | 1 core | 2 cores |
| RAM | 1 GB | 4 GB |
| Disk | 16 GB | 32 GB |
| Docker | 20.10+ | 24.0+ |
| Docker Compose | v2 (`docker compose`) | same |
| Architecture | linux/amd64 | — |

- Database and tables are created automatically on first start — no manual SQL import.
- If you enable local vector search (knowledge-base semantic search) or install many plugins, use the recommended specs.

---

## 3. Quick start

Enter this directory first:

```bash
cd fde-mcp-blade
```

### Option A — one-command installer (recommended)

```bash
./install.sh
```

It walks through: language → environment check → auto-generate DB passwords and JWT secret → pull images → start → health check → print the access URL and default account.
(Non-interactive: `./install.sh -y`. Upgrading an existing install: `./install.sh -u`.)

### Option B — plain Docker Compose

`JWT_SECRET` is mandatory (the container exits immediately without it — by design). The database passwords have fallback defaults in the manifest, but change them for production:

```bash
# Generate a JWT secret into .env
echo "JWT_SECRET=$(openssl rand -base64 32)" > .env

# Start
docker compose up -d
```

### Verify the installation

```bash
# Health check: "OK" means healthy
curl http://localhost:8018/health

# Container status
docker compose ps
```

Then open `http://<device-ip>:8018` in a browser to reach the console.

---

## 4. Sign-in and default account

| Item | Value |
|---|---|
| URL | `http://<device-ip>:8018` |
| Username | `admin` |
| Password | `admin123` |

> ⚠️ **Change the password immediately after the first sign-in.**
> For production, also run `bash ops.sh init` once to replace the fallback database passwords with random ones (it prints the new credentials — save them right away).

---

## 5. Ports

| Port | Purpose | Expose publicly? |
|---|---|:---:|
| `8018` | Console, business APIs, **MCP endpoint**, health check (all on one port) | ✅ Yes |
| `1883` | Embedded MQTT broker — **not mapped to the host by default**; if MQTT hardware devices are on site, add a `1883:1883` port mapping in docker-compose.yml | Manual |
| Database | Container-internal only, never published | ❌ No |

- To change the port: edit `SERVER_PORT` in `.env` and restart.
- Security advice: **expose only `8018` in production**; if the console is internet-facing, put it behind a reverse proxy with HTTPS.

---

## 6. Connecting AI clients (MCP)

The first-class interface is standard MCP, so any MCP-capable client works (Claude / Cursor / TRAE / Dify / your own agent).

**Steps**

1. Sign in to the console → open the **Tokens (API Token)** page → create a token;
2. The creation result gives you a **copy-paste-ready MCP config** plus a **QR code** (scan it from the client — no need to type the URL or token by hand);
3. Paste the config into your AI client and ask it to list tools — you're connected.

**What the config looks like**

```json
{
  "mcpServers": {
    "admin_abc12345": {
      "url": "http://192.168.1.10:8018/mcp",
      "headers": {
        "X-Apex-Local-Token": "Bearer <the token returned when the token was created>"
      }
    }
  }
}
```

**Technical details**

| Item | Description |
|---|---|
| Endpoint | `http://<device-ip>:8018/mcp` |
| Transport | Streamable HTTP (POST; **stdio is not supported** — configure it as a remote HTTP MCP server) |
| Auth | Header `X-Apex-Local-Token: Bearer <token>`; the token is shown only once at creation, can be revoked at any time and takes effect immediately |
| Protocol versions | Supports both MCP `2025-11-25` and the current official `2026-07-28`; the server detects the version automatically, no client-side setting needed |
| Tool scope | Only the devices and services **this token is authorised for** are exposed — unauthorised ones are not even listed |

---

## 7. Data and backup

### Where data lives

Everything is under `data/` in this directory — deleting it means losing your data:

| Directory | Content |
|---|---|
| `data/mariadb` | Database files |
| `data/config` | Runtime configuration |
| `data/uploads` | Uploaded files |
| `data/service-plugins` | Plugin packages (copy a folder in = install) |
| `data/service-plugin-configs` | Per-deployment plugin configs |
| `data/skill-lib` | Skill library |
| `data/knowledge-lib` | Knowledge-base documents |
| `data/web` | Frontend pages (replace files and reload — no restart) |
| `data/logs` | Logs |
| `data/plugins-venv` | Plugin Python dependencies (rebuildable) |

### Backup and restore

```bash
bash backup.sh backup              # one-command backup
bash backup.sh list                # list existing backups
bash backup.sh restore <file>      # restore (double confirmation + automatic pre-restore backup)
```

- **What is backed up**: the database + `.env` + `data/{config, uploads, service-plugins, service-plugin-configs, skill-lib, knowledge-lib}`.
- **Encryption**: AES-256-CBC with the key file `./backups/.backup_key` (generated on first use).
  ⚠️ **Keep the key file separate from the backup files** — otherwise the encryption is meaningless.
- **Retention**: the latest 7 backups, rotated automatically.
- **Recommended**: back up before every upgrade, permission/menu batch change, or plugin swap.

---

## 8. Upgrade / roll back / uninstall

```bash
# 1) Back up first
bash backup.sh backup

# 2) Upgrade to the latest image
docker compose pull && docker compose up -d
```

- **Roll back**: `bash backup.sh restore <file>` to restore the data, then set the image tag back to the previous version and `docker compose up -d`.
- **Uninstall**:

```bash
docker compose down
rm -rf data          # ⚠️ deletes all data — back up first
```

---

## 9. Day-to-day operations

```bash
bash ops.sh                # interactive menu (Chinese / English)
bash ops.sh status         # config status + database connectivity (read-only, most used)
bash ops.sh init           # first-time init: random DB passwords and JWT secret, then recreate
bash ops.sh change-db-pwd  # change the database password
bash ops.sh change-jwt     # rotate the JWT secret
```

> ⚠️ `change-jwt` invalidates **all issued tokens immediately** (users must sign in again, API tokens must be re-issued). Run it inside a maintenance window.

Other useful commands:

```bash
docker compose ps            # container status
docker compose logs -f       # follow logs
docker compose restart       # restart
docker compose down          # stop
```

---

## 10. Troubleshooting

| Symptom | Cause and fix |
|---|---|
| Container restarts in a loop / won't start | Usually an empty `JWT_SECRET` in `.env`; check `docker compose logs fde-mcp-blade` |
| Console won't open / APIs return 404 | The console and APIs live under the `/prod-api` prefix; the root path serves the frontend. Enter via `http://<ip>:8018/`, don't open bare paths like `/login` |
| Port 8018 already in use | Change `SERVER_PORT` in `.env` and restart |
| 401 on sign-in / 403 on actions | 401 = not signed in or token expired (rotating the JWT secret invalidates everyone — just sign in again); 403 = signed in but the role lacks that permission |
| Plugin installed but not working | Check the plugin's `plugin.json` is valid and its `requirements.txt` dependencies were installed; plugin methods are invisible to normal users until you grant **service authorisation** in the console |
| Plugin config change has no effect | Use the console's "Plugin Config" page (it writes `service-plugin-configs/<plugin>.json`); editing the plugin package directly gets overwritten |
| Knowledge-base document update not visible | Click "Re-sync" in the console after dropping the file; sync is **add-only**, so renaming a file creates a second entry — edit the content in place instead |
| Slow image pulls | Configure a Docker registry mirror on this host and retry |

---

## 11. Feedback

- Developer chat group (QQ): `882419824`
- Email: `448004147@qq.com`

> This is a developer group for usage questions; there is no ticketing system and no SLA commitment.

---

## 12. Third-party components and licenses

This deployment package and its image include the following third-party components, each distributed under its own license:

| Component | License | Notes |
|---|---|---|
| **BAAI bge-small-zh-v1.5** (embedding model) | **MIT** | Bundled in the image at `/app/models/bge-small-zh-v1.5`. Provenance, checksums and conversion source: `models/bge-small-zh-v1.5/SOURCE.txt`; full license text: `LICENSE` in the same directory |
| **MariaDB 11** | GPLv2 | Runs as a separate container from the official `mariadb:11` image; not linked with this product's code |

> The MIT license requires the copyright notice and permission notice to be retained on redistribution — those files ship inside the image alongside the model directory.
