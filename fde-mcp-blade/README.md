# FDE MCP Blade — Deployment & Usage Guide

> 中文版：[README.zh-CN.md](./README.zh-CN.md)

> An **AI agent tool-side control plane** deployed on your own premises: it consolidates enterprise systems into **one unified MCP tool entry point**, so AI agents can call devices and intranet services under explicit permissions and full auditing.
> Local-first by default — no data leaves your network.

This directory is the **deployment package**: image configuration plus ops scripts. It does not contain source code.

> **Platform policy**: **real deliveries are always Linux** — install in section 3, backup / upgrade / day-to-day ops in sections 7–9.
> **Windows is for demos only** (Docker Desktop, section 11): `install.sh` / `ops.sh` / `backup.sh` are bash scripts and cannot run there.

---

## 1. What's in this directory

| File | Purpose |
|------|---------|
| `docker-compose.yml` | Deployment manifest · **China** (Chinese comments): image from Alibaba Cloud ACR, AliCloud PyPI mirror; app + built-in MariaDB |
| `docker-compose_en.yml` | Deployment manifest · **Global** (English comments): image from Docker Hub, official PyPI |
| `.env_` | Environment variable template (**only `JWT_SECRET` is required**) |
| `install.sh` | One-command installer (Chinese / English UI) |
| `install.ps1` | Windows installer (Docker Desktop, meant for a local trial; UI is English) |
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
- **Windows is for demos only**: Docker Desktop (WSL2 backend) can run this package's linux/amd64 images — full steps in section 11. Deliveries are always Linux.

---

## 3. Linux deployment

Enter this directory first:

```bash
cd fde-mcp-blade
```

### Option A — one-command installer (recommended)

```bash
bash install.sh              # non-interactive: bash install.sh -y
```

It walks through: language → **image source** → **host address** → environment check → auto-generate DB passwords and JWT secret → pull images → start → health check → print the access URL and default account.
(Upgrading an existing install: `bash install.sh -u`.)

**How to pick the image source (important)**

| Option | Image served from | Use when |
|---|---|---|
| `[1]` China | Alibaba Cloud ACR (public repo, no login) | Networks in mainland China — **pick this on site in China** |
| `[2]` Global | Docker Hub | Networks outside mainland China; Docker Hub is often unreachable from China |

- The choice is saved as `COMPOSE_FILE` in `.env`, so `install.sh -u`, `ops.sh` and manual `docker compose` commands all follow it — no `-f` needed.
- `-y` skips this menu and defaults to **China**; to use Docker Hub, install interactively and pick `[2]`, or edit `.env` directly.
- Note: the database image `mariadb:11` is only published on Docker Hub, so from mainland China you may still need to pre-import it or configure a registry mirror on the host.

**Host address (affects tokens and QR codes)**

- The installer detects the IP of the host's default route (skipping `docker0` / bridges / virtual NICs) and asks you to confirm it; it is then saved as `HOST_HOSTNAME` in `.env`. Press Enter to accept the detected value, or type another IP / hostname.
- Why it matters: when a token is created, the local MCP URL is built as `http://<HOST_HOSTNAME>:<port>/mcp` and embedded in the token and its QR code — so **the scanning client must be able to reach this address**. `localhost` or a container name is useless here.
- The access URL printed at the end of the install uses the same value, so both stay consistent.
- ⚠️ The address is **baked into a token when it is created**: after changing IP or subnet, update `.env` and run `docker compose up -d`, then **re-generate tokens** — existing tokens still carry the old address.
- With `-y` this confirmation is skipped and the detected value is used.

> **Prerequisite**: your user must be in the `docker` group (`sudo usermod -aG docker $USER`, then log in again).
> **Do not run `sudo bash install.sh`**: it would leave `.env` and `data/` owned by root, and later `ops.sh` / `backup.sh` / `docker compose` runs as a normal user would fail with permission errors. The script calls `sudo` itself when it needs to.

### Option B — plain Docker Compose

`JWT_SECRET` is mandatory (the container exits immediately without it — by design). The database passwords have fallback defaults in the manifest, but change them for production:

```bash
# Generate a JWT secret into .env
echo "JWT_SECRET=$(openssl rand -base64 32)" > .env

# Start
docker compose up -d
```

> Without `-f`, `docker-compose.yml` is used (China · Alibaba Cloud ACR). Outside mainland China use:
> `docker compose -f docker-compose_en.yml up -d`.

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
| `1883` | Embedded MQTT broker (listening inside the container). **Device capability is not enabled in this version, so the port is not published**; add the `1883` mapping in `docker-compose.yml` if you need it | ❌ Not for now |
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
- **Encryption**: AES-256-CBC with the key file `./backups/.backup_key` (**created once on the first backup; every backup shares that single key** — it is not one key per backup).
  ⚠️ **Keep the key file separate from the backup files** — otherwise the encryption is meaningless; conversely, if the key is lost, **none of the backups can be decrypted**.
  ⚠️ **Never delete or replace `.backup_key`**: if you do, the next backup **silently creates a new key** and **every earlier backup becomes undecryptable** (the script gives no warning).
- **Retention**: `apex-backup-*` is rotated automatically, keeping the latest 7; backup files and `.backup_key` both live in `./backups/`.
  ⚠️ The `pre-restore-*` file auto-created before a restore is **not rotated and never deleted automatically** — it keeps piling up; remove it yourself once it is no longer needed: `rm -f backups/pre-restore-*.tar.gz.enc`
- **Recommended**: back up before every upgrade, permission/menu batch change, or plugin swap.

---

## 8. Upgrade / roll back / uninstall

```bash
# 1) Back up first
bash backup.sh backup

# 2) Upgrade to the latest image
docker compose pull && docker compose up -d
```

- The image source is recorded as `COMPOSE_FILE` in `.env`, so the `docker compose` commands above and `bash install.sh -u` follow it automatically — no `-f` needed.
- **Deployments upgraded from an older package** (no `COMPOSE_FILE` in `.env`) fall back to the default `docker-compose.yml` (China · Alibaba Cloud ACR). If this host is outside mainland China, add `COMPOSE_FILE="docker-compose_en.yml"` to `.env` before upgrading.

- **Roll back**: `bash backup.sh restore <file>` to restore the data, then set the image tag back to the previous version and `docker compose up -d`.
- **Uninstall** (stop + clear data, **images kept**):

```bash
docker compose down
rm -rf data          # ⚠️ deletes all data — back up first
```

**Full removal (including images — do it manually, step by step)**

> This package **deliberately ships no one-click uninstall / image-delete script or flag**, so a slip of the finger can't wipe images or data. Run the steps below by hand when you really need it.

```bash
# 1) Stop services and remove containers + network (./data is untouched)
docker compose down

# 2) Delete images: check which image source you installed with, then delete that app image (either one)
docker image rm crpi-qlruqqugcjs2bo3w.cn-shanghai.personal.cr.aliyuncs.com/fde-mcp-blade/fde-mcp-blade:latest  # China (Alibaba Cloud ACR)
docker image rm apexf/fde-mcp-blade:latest                                                                    # Global (Docker Hub)
docker image rm mariadb:11    # ⚠️ if other projects on this host use mariadb:11, they will re-pull it later

# 3) Delete data and configuration (make sure you have a backup!)
rm -rf data backups .env      # data = business data; backups = backup files and key; .env = DB passwords and JWT secret

# 4) Delete the deployment directory itself
cd .. && rm -rf fde-mcp-blade
```

> For a temporary stop use `docker compose stop` (containers kept, `docker compose start` resumes); `docker compose down` removes containers and the network but leaves `./data` alone.

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
docker compose stop          # stop (containers kept, `start` resumes)
docker compose down          # stop and remove containers + network (data and images kept)
```

---

## 10. Troubleshooting

| Symptom | Cause and fix |
|---|---|
| Container restarts in a loop / won't start | Usually an empty `JWT_SECRET` in `.env`; check `docker compose logs fde-mcp-blade` |
| `bash install.sh` reports command not found / permission denied | The file is missing or lost its executable bit: run it as `bash install.sh`, and make sure the package was copied **completely** (including dotfiles such as `.env_` — SFTP clients hide them by default) |
| Console won't open / APIs return 404 | The console and APIs live under the `/prod-api` prefix; the root path serves the frontend. Enter via `http://<ip>:8018/`, don't open bare paths like `/login` |
| Port 8018 already in use | Change `SERVER_PORT` in `.env` and restart |
| 401 on sign-in / 403 on actions | 401 = not signed in or token expired (rotating the JWT secret invalidates everyone — just sign in again); 403 = signed in but the role lacks that permission |
| Plugin installed but not working | Check the plugin's `plugin.json` is valid and its `requirements.txt` dependencies were installed; plugin methods are invisible to normal users until you grant **service authorisation** in the console |
| Plugin config change has no effect | Use the console's "Plugin Config" page (it writes `service-plugin-configs/<plugin>.json`); editing the plugin package directly gets overwritten |
| Knowledge-base document update not visible | Click "Re-sync" in the console after dropping the file; sync is **add-only**, so renaming a file creates a second entry — edit the content in place instead |
| Slow or failing image pulls | First check `COMPOSE_FILE` in `.env` matches your network: China → `docker-compose.yml` (Alibaba Cloud ACR), elsewhere → `docker-compose_en.yml` (Docker Hub). Then retry with `docker compose pull`. `mariadb:11` only exists on Docker Hub, so from mainland China configure a `registry-mirrors` accelerator for Docker (or pre-pull it elsewhere and `docker tag` it as `mariadb:11`) and retry |
| Token / QR code shows `localhost` or the client cannot connect | Set `HOST_HOSTNAME` in `.env` to the host's LAN IP (the address clients can reach), run `docker compose up -d`, then **re-generate the token** — existing tokens carry the address the token was created with |

---

## 11. Windows walkthrough (Docker Desktop)

> **For demos and hands-on trials only** — running the system on Windows to see how it works or to show it to someone.
> **Real deliveries are always Linux.** `install.sh` / `ops.sh` / `backup.sh` are bash scripts and cannot run on Windows, so this chapter gives the replacements.

### 11.1 Install Docker Desktop first

1. Download **Docker Desktop for Windows** from the Docker website and install it, keeping **WSL 2** selected (the first install usually asks for a reboot — continue after it).
2. Start Docker Desktop and wait until it shows **Engine running** (the first start takes a while).
3. Verify in PowerShell:

```powershell
docker --version
docker compose version
```

> The detailed Docker Desktop setup (OS requirements, WSL2 kernel update, registry mirrors, ...) is out of scope for this package; if you get stuck, search for `Docker Desktop Windows install` or `WSL2 kernel update` (DeepSeek / ChatGPT / the official docs all work).
> 4 GB RAM or more recommended; below 2 GB the containers will not start.

### 11.2 One-command install (recommended)

From the deployment package directory:

```powershell
powershell -ExecutionPolicy Bypass -File .\install.ps1
```

It checks Docker / docker compose / the port, asks for the image source (1 China ACR / 2 Global Docker Hub), detects and confirms this host's address (saved as `HOST_HOSTNAME`), builds `.env` from `.env_` (random DB passwords + JWT secret), runs `docker compose pull && up -d`, does a health check and prints the access URL and account.

Parameters: `-ImageSource cn|global`, `-HostAddress <ip-or-hostname>`, `-Yes` (accept all defaults, no prompts).

> On a re-run with an existing `.env` the script asks whether to overwrite: **answer `N` to keep the existing `.env` and continue** (this is the path after editing `SERVER_PORT` / `HOST_HOSTNAME` by hand).

> If Windows refuses it as "not digitally signed": the file carries the mark of the web from the archive — run `Unblock-File .\install.ps1` once first.
> The script's output is **English on purpose**: Windows PowerShell 5.1 reads BOM-less scripts as ANSI, so Chinese text would be garbled.

### 11.3 Manual install (without the script)

Copy `.env_` to `.env` and fill in at least these two; leave the rest untouched for now:

| Key | Value |
|---|---|
| `JWT_SECRET` | Required. Generate it in PowerShell: `[Convert]::ToBase64String([byte[]](1..32 \| % { Get-Random -Max 256 }))` |
| `HOST_HOSTNAME` | This machine's **LAN IP** (e.g. `192.168.1.50`). Otherwise tokens/QR codes contain `localhost` and other machines cannot connect |

For production also change `MARIADB_ROOT_PASSWORD` / `MARIADB_PASSWORD` (the manifest ships fallback passwords). Then start:

```powershell
docker compose up -d      # without -f this uses docker-compose.yml (China · Alibaba Cloud ACR)
```

### 11.4 Reaching it from other machines

Allow **inbound TCP 8018** in Windows Defender Firewall: Advanced settings → Inbound Rules → New Rule → Port → TCP → 8018 → Allow.

Then browse to `http://<this machine's LAN IP>:8018` and sign in as `admin` / `admin123`.

### 11.5 Windows troubleshooting

| Symptom | What to do |
|---|---|
| Script reports `Cannot talk to the Docker daemon` (or `failed to connect to the docker API at npipe://...`) | Docker Desktop is not running, or still starting. Wait until it shows **Engine running**, then run the script again |
| Script reports `Port 8018 is already in use` | Only a **LISTENING** line in `netstat -ano \| findstr :8018` counts (an `ESTABLISHED` line is this machine connecting out, not a listener). If it really is taken, stop that program or set another `SERVER_PORT` in `.env` and re-run |
| Script rejected as "not digitally signed" | Run `Unblock-File .\install.ps1`, then run it again (or use `powershell -ExecutionPolicy Bypass -File .\install.ps1`) |
| Other machines / phones cannot open it | ① `HOST_HOSTNAME` in `.env` must be this machine's **LAN** IP (not `127.0.0.1`); ② allow inbound TCP 8018 in the firewall |
| Image pull fails | Check `COMPOSE_FILE` in `.env` matches your network (China `docker-compose.yml` / elsewhere `docker-compose_en.yml`); if it is `mariadb:11` failing, see 11.6 below |
| Token address unchanged after editing `HOST_HOSTNAME` | The address is **baked in when a token is created** — re-generate the token |
| Container keeps restarting | Usually an empty `JWT_SECRET` in `.env`; check `docker compose logs fde-mcp-blade` |

### 11.6 Pulling images fails in mainland China: configure a registry mirror

The app image comes from Alibaba Cloud ACR (reachable from China), but the **database image `mariadb:11` only exists on Docker Hub**, which is often unreachable there. Pick one of the two workarounds.

**Option 1 — configure a registry mirror (one-time; then every Docker Hub image goes through it)**

Windows (Docker Desktop): Docker icon → **Settings** → **Docker Engine**, **replace the whole JSON block** with the content below (Docker Desktop ships a `builder` section by default; pasting just one line into it easily drops a comma and raises `Expected ',' or '}'`), then click **Apply & restart**:

```json
{
  "registry-mirrors": [
    "https://docker.1ms.run",
    "https://docker.m.daocloud.io"
  ],
  "builder": {
    "gc": {
      "defaultKeepStorage": "20GB",
      "enabled": true
    }
  },
  "experimental": false
}
```

Linux / NAS: edit `/etc/docker/daemon.json` (create it if missing) with the same `registry-mirrors` block, then `sudo systemctl restart docker`.

> `registry-mirrors` is an **array — list several** and Docker tries them in order, so keeping more than one is more robust.
> To add your personal Alibaba Cloud address, append one more entry (**and remember the comma**): `"https://xxxx.mirror.aliyuncs.com"` — get it under "Alibaba Cloud → Container Registry (ACR) → 镜像工具 / 镜像加速器" (free).
>
> **What I measured** (anonymous registry API, 2026-09 — public mirrors come and go):
>
> | Mirror | Result |
> |---|---|
> | Alibaba Cloud personal accelerator address | Most reliable; needs an Alibaba Cloud account (could not test) |
> | `docker.1ms.run` | Works; lists the `11` tag of `mariadb` |
> | `docker.m.daocloud.io` | Works; serves the `library/mariadb:11` manifest (tag listing is disabled, pulling by tag is fine) |
> | Tsinghua `docker.mirrors.tuna.tsinghua.edu.cn` | **Discontinued** (unreachable; their docker help page 404s too) |
> | USTC `docker.mirrors.ustc.edu.cn`, NetEase `hub-mirror.c.163.com`, `registry.docker-cn.com`, `docker.1panel.live` | All dead (unreachable) |
> | Tencent Cloud `mirror.ccs.tencentyun.com` | Unreachable (internal to Tencent Cloud only) |
> | Nanjing University `docker.nju.edu.cn` | 403 access denied |
>
> Verify with `docker pull mariadb:11`; once that works, re-run `bash install.sh` / `.\install.ps1`.

**Option 2 — pull it yourself and re-tag (when you would rather not touch the Docker config)**

```powershell
docker pull docker.1ms.run/library/mariadb:11
docker tag docker.1ms.run/library/mariadb:11 mariadb:11
docker compose up -d
```

> Use this with a **manual `docker compose up -d`**: with the local tag present, compose will not pull. The install script's `docker compose pull` still checks Docker Hub, so don't re-run the script right after this unless the mirror is configured.

### 11.7 Upgrade / backup / uninstall

`ops.sh` and `backup.sh` are bash scripts and do not run on Windows — use these instead:

```powershell
# Upgrade
docker compose pull; docker compose up -d

# Backup: stop, then copy the whole data directory (database, uploads, config)
docker compose stop
Copy-Item -Recurse -Force .\data ".\data-backup-$(Get-Date -Format yyyyMMdd)"
docker compose start
```

Uninstall (images kept):

```powershell
docker compose down
Remove-Item -Recurse -Force .\data        # ⚠️ deletes all data — back up first
```

Full removal (including images — manual steps only, no one-click):

```powershell
docker compose down
docker image rm crpi-qlruqqugcjs2bo3w.cn-shanghai.personal.cr.aliyuncs.com/fde-mcp-blade/fde-mcp-blade:latest  # China (Alibaba Cloud ACR)
docker image rm apexf/fde-mcp-blade:latest                                                                    # Global (Docker Hub)
docker image rm mariadb:11                    # ⚠️ other projects on this host using it will be affected
Remove-Item -Recurse -Force .\data, .\backups, .\.env
cd ..; Remove-Item -Recurse -Force .\fde-mcp-blade
```

---

## 12. Feedback

- Developer chat group (QQ): `882419824`
- Email: `448004147@qq.com`

> This is a developer group for usage questions; there is no ticketing system and no SLA commitment.

---

## 13. Third-party components and licenses

This deployment package and its image include the following third-party components, each distributed under its own license:

| Component | License | Notes |
|---|---|---|
| **BAAI bge-small-zh-v1.5** (embedding model) | **MIT** | Bundled in the image at `/app/models/bge-small-zh-v1.5`. Provenance, checksums and conversion source: `models/bge-small-zh-v1.5/SOURCE.txt`; full license text: `LICENSE` in the same directory |
| **MariaDB 11** | GPLv2 | Runs as a separate container from the official `mariadb:11` image; not linked with this product's code |

> The MIT license requires the copyright notice and permission notice to be retained on redistribution — those files ship inside the image alongside the model directory.
