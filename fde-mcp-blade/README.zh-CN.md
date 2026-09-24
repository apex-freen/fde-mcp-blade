# FDE MCP Blade —— 部署与使用说明

> English version: [README.md](./README.md)

> 部署在客户本地的 **AI 智能体工具侧中控平台**：把企业内系统收敛为**统一的 MCP 工具入口**，让 AI 在既定权限与审计约束下调用设备与内网服务。
> 默认纯本地运行，数据不出内网。

本目录是**部署包**，只包含运行所需的镜像配置与运维脚本，不含源码。

> **平台口径**：**正式交付一律 Linux** —— 安装见 §三，备份 / 升级 / 日常运维见 §七~§九。
> **Windows 只用于演示体验**（Docker Desktop，见 §十一）：`install.sh` / `ops.sh` / `backup.sh` 都是 bash 脚本，Windows 上跑不了。

---

## 一、目录里有什么

| 文件 | 作用 |
|------|------|
| `docker-compose.yml` | 部署编排 · **国内**（中文注释）：镜像来自阿里云 ACR，PyPI 走阿里云；应用 + 内置 MariaDB |
| `docker-compose_en.yml` | 部署编排 · **国外**（英文注释）：镜像来自 Docker Hub，PyPI 走官方 |
| `.env_` | 环境变量模板（**只有 `JWT_SECRET` 是必填项**） |
| `install.sh` | 一键安装脚本（中文/英文界面） |
| `install.ps1` | Windows 安装脚本（Docker Desktop，本地试用用；界面为英文） |
| `ops.sh` | 日常运维脚本（查看状态、初始化口令、改密码、换 JWT 密钥） |
| `backup.sh` | 备份 / 恢复脚本（加密） |
| `deploy/` | 上面两个脚本用到的中英文语言包（不要删） |

**依赖**：只需 Docker。数据库（MariaDB）已内置于编排文件，不需要另外准备 Redis、消息队列或独立 MQTT Broker。

---

## 二、环境要求

| 项 | 最低 | 推荐 |
|---|---|---|
| CPU | 1 核 | 2 核 |
| 内存 | 1 GB | 4 GB |
| 磁盘 | 16 GB | 32 GB |
| Docker | 20.10+ | 24.0+ |
| Docker Compose | v2（`docker compose`） | 同左 |
| 架构 | linux/amd64 | — |

- 首次启动会自动建库建表，无需手工导入 SQL。
- 启用本地向量检索（知识库语义搜索）与多插件安装时，请按推荐配置给资源。
- **Windows 演示体验**：Docker Desktop（WSL2 后端）可运行本包的 linux/amd64 镜像，完整步骤见 §十一；**交付不用 Windows**。

---

## 三、Linux 部署

先进入本目录：

```bash
cd fde-mcp-blade
```

### 方式 A：一键安装（推荐）

```bash
bash install.sh              # 静默安装：bash install.sh -y
```

脚本会引导你完成：选择语言 → **选择镜像来源** → **确认本机地址** → 检查环境 → 自动生成数据库密码与 JWT 密钥 → 拉取镜像 → 启动 → 健康检查 → 打印访问地址与账号。
（升级已有部署用 `bash install.sh -u`。）

**镜像来源怎么选（重要）**

| 选项 | 镜像来自 | 适用 |
|---|---|---|
| `[1]` 国内 | 阿里云 ACR（公开仓库，免登录） | 国内网络 —— **国内现场选这个** |
| `[2]` 国外 | Docker Hub | 海外网络；国内网络经常拉取不到 |

- 选择会写进 `.env` 的 `COMPOSE_FILE`，之后 `install.sh -u`、`ops.sh`、手工 `docker compose` 命令都自动沿用，不用再指定 `-f`。
- `-y` 不弹这个菜单，默认按**国内**处理；要国外镜像请交互式运行选 `[2]`，或直接改 `.env`。
- 注意：数据库镜像 `mariadb:11` 目前只有 Docker Hub 一个来源，国内网络若拉不动它，需要预先导入镜像或给本机 Docker 配加速。

**本机地址（影响令牌与二维码）**

- 安装时脚本会探测本机默认路由出口的 IP（自动跳过 `docker0` / 网桥 / 虚拟网卡），让你确认后写入 `.env` 的 `HOST_HOSTNAME`；直接回车即用探测值，也可以改成其它 IP 或主机名。
- 它的用途：生成令牌时把本地 MCP 地址拼成 `http://<HOST_HOSTNAME>:<端口>/mcp` 写进令牌与二维码，所以**扫码的客户端必须能访问这个地址** —— 填成 `localhost` 或容器名就没用了。
- 安装完成页打印的「访问地址」用的是同一个值，两处口径一致。
- ⚠️ 地址在**生成令牌时就写死**：换 IP / 换网段后要改 `.env` 并 `docker compose up -d`，**已发出的令牌里仍是旧地址**，需要重新生成令牌。
- `-y` 不弹这步确认，直接采用探测值。

> **前置**：当前用户需在 `docker` 组（`sudo usermod -aG docker $USER` 后重新登录）。
> **不要用 `sudo bash install.sh`**：会让 `.env` 与 `data/` 变成 root 属主，之后以普通用户跑 `ops.sh` / `backup.sh` / `docker compose` 会报权限错误；脚本内部需要提权时会自行调用 `sudo`。

### 方式 B：只用 Docker Compose

`JWT_SECRET` 必须设置（留空容器会立即退出，这是刻意的安全设计）。其余口令不配也能起来（用编排里的兜底值，生产请改）：

```bash
# 生成 JWT 密钥并写入 .env
echo "JWT_SECRET=$(openssl rand -base64 32)" > .env

# 启动
docker compose up -d
```

> 不带 `-f` 时用的是 `docker-compose.yml`（国内 · 阿里云 ACR）。海外网络请改用：
> `docker compose -f docker-compose_en.yml up -d`。

### 怎么确认装好了

```bash
# 健康检查：返回 OK 即正常
curl http://localhost:8018/health

# 查看容器状态
docker compose ps
```

浏览器打开 `http://<设备IP>:8018` 即可看到管理台。

---

## 四、登录与默认账号

| 项 | 值 |
|---|---|
| 地址 | `http://<设备IP>:8018` |
| 用户名 | `admin` |
| 密码 | `admin123` |

> ⚠️ **首次登录后请立即修改密码。**
> 生产部署建议再执行一次 `bash ops.sh init`，把数据库兜底口令换成随机值（会打印一次新凭据，请立即保存）。

---

## 五、端口说明

| 端口 | 用途 | 是否需要对外 |
|---|---|:---:|
| `8018` | 管理台、业务接口、**MCP 端点**、健康检查（同一个端口） | ✅ 需要 |
| `1883` | 内嵌 MQTT Broker（容器内监听）。**当前版本未开放设备接入，故未映射到宿主机**；需要时自行在 `docker-compose.yml` 增加 `1883` 端口映射 | ❌ 暂不需要 |
| 数据库 | 仅在容器内部访问，不对外暴露 | ❌ 不需要 |

- 换端口：改 `.env` 里的 `SERVER_PORT` 后重启。
- 安全建议：**生产环境只暴露 `8018`**；管理台对公网开放时请放在反向代理 + HTTPS 后面。

---

## 六、接入 AI（MCP）

本系统对外的第一等接口是标准 MCP，任何支持 MCP 的客户端（Claude / Cursor / TRAE / Dify / 自研 Agent 等）都能接。

**操作步骤**

1. 登录管理台 → 打开**令牌（API Token）**页面 → 新建令牌；
2. 创建成功后页面会直接给出**可复制粘贴的 MCP 配置**和**二维码**（手机/客户端扫码即接入，无需手工填地址和令牌）；
3. 把配置粘进你的 AI 客户端，让它先列出工具，就接通了。

**配置长这样**

```json
{
  "mcpServers": {
    "admin_abc12345": {
      "url": "http://192.168.1.10:8018/mcp",
      "headers": {
        "X-Apex-Local-Token": "Bearer <创建令牌时返回的令牌>"
      }
    }
  }
}
```

**技术要点**

| 项 | 说明 |
|---|---|
| 端点 | `http://<设备IP>:8018/mcp` |
| 传输方式 | Streamable HTTP（POST 调用；**不支持 stdio**，按"远程 HTTP MCP Server"配置） |
| 鉴权 | 请求头 `X-Apex-Local-Token: Bearer <令牌>`；令牌只在创建时展示一次，可随时撤销，撤销后立即失效 |
| 协议版本 | 同时支持 MCP `2025-11-25` 与官方现行版本 `2026-07-28`，服务端自动识别，客户端无需配置 |
| 工具范围 | 只暴露当前令牌**有权限**的设备与服务；没有权限的连列表都看不到 |

---

## 七、数据与备份

### 数据放在哪

所有数据都在本目录的 `data/` 下，删掉即丢失：

| 目录 | 内容 |
|---|---|
| `data/mariadb` | 数据库文件 |
| `data/config` | 运行时配置 |
| `data/uploads` | 上传文件 |
| `data/service-plugins` | 插件包（拷贝文件夹即安装） |
| `data/service-plugin-configs` | 插件实例配置 |
| `data/skill-lib` | 技能库 |
| `data/knowledge-lib` | 知识库文档 |
| `data/web` | 前端页面（替换文件刷新即生效） |
| `data/logs` | 日志 |
| `data/plugins-venv` | 插件 Python 依赖（可自动重建） |

### 备份与恢复

```bash
bash backup.sh backup              # 一键备份
bash backup.sh list                # 查看现有备份
bash backup.sh restore <备份文件>   # 恢复（二次确认 + 自动预备份）
```

- **备份内容**：数据库 + `.env` + `data/{config, uploads, service-plugins, service-plugin-configs, skill-lib, knowledge-lib}`。
- **加密**：AES-256-CBC，密钥文件 `./backups/.backup_key`（**首次备份时生成一份，之后所有备份共用这一把** —— 不是"一备份一密钥"）。
  ⚠️ **密钥文件必须与备份文件分开保管**，否则加密形同虚设；反过来，密钥丢了则**所有备份都解不开**。
  ⚠️ **不要删除或更换 `.backup_key`**：删掉后下次备份会**静默生成一把新密钥**，**此前的备份从此无法解密**（脚本不会提示）。
- **保留**：`apex-backup-*` 自动轮转，只保留最近 7 份；备份文件与 `.backup_key` 同在 `./backups/` 目录下。
  ⚠️ 恢复前自动生成的那份 `pre-restore-*` **不参与轮转、不会自动删除**，会一直累积，请自行清理（确认不再需要后）：`rm -f backups/pre-restore-*.tar.gz.enc`
- **建议**：每次升级、批量改权限/菜单、更换插件之前先备份一次。

---

## 八、升级 / 回滚 / 卸载

```bash
# 1) 升级前先备份
bash backup.sh backup

# 2) 升级到最新镜像
docker compose pull && docker compose up -d
```

- 镜像来源记在 `.env` 的 `COMPOSE_FILE` 里，上面的 `docker compose` 与 `bash install.sh -u` 都会自动沿用，不需要再加 `-f`。
- **从旧包升级来的部署**（`.env` 里还没有 `COMPOSE_FILE`）会退回默认的 `docker-compose.yml`（国内 · 阿里云 ACR）；海外部署请在 `.env` 里补一行 `COMPOSE_FILE="docker-compose_en.yml"` 再升级。

- **回滚**：`bash backup.sh restore <备份文件>` 恢复数据，并把镜像 tag 改回上一版本后 `docker compose up -d`。
- **卸载**（停服务 + 清数据，**镜像保留**）：

```bash
docker compose down
rm -rf data          # ⚠️ 删除全部数据，请先备份
```

**彻底卸载（要删镜像，需手动逐条执行）**

> 本包**刻意不提供一键卸载 / 一键删镜像**的脚本或参数，就是怕手滑把镜像或数据误删；需要时请按下面几步手动执行。

```bash
# 1) 停服务并删除容器与网络（./data 目录不受影响）
docker compose down

# 2) 删镜像：先确认安装时选的镜像来源，再删对应的应用镜像（二选一）
docker image rm crpi-qlruqqugcjs2bo3w.cn-shanghai.personal.cr.aliyuncs.com/fde-mcp-blade/fde-mcp-blade:latest  # 国内（阿里云 ACR）
docker image rm apexf/fde-mcp-blade:latest                                                                    # 国外（Docker Hub）
docker image rm mariadb:11    # ⚠️ 本机其它项目若也在用 mariadb:11，删掉后它们下次要重新拉取

# 3) 删数据与配置（确认已备份！）
rm -rf data backups .env      # data=业务数据；backups=备份文件与备份密钥；.env=数据库口令与 JWT 密钥

# 4) 删部署目录本体
cd .. && rm -rf fde-mcp-blade
```

> 只是临时停机请用 `docker compose stop`（容器保留，`docker compose start` 可恢复）；`docker compose down` 会删掉容器和网络，但不碰 `./data`。

---

## 九、日常运维命令

```bash
bash ops.sh                # 交互式菜单（中文/英文可选）
bash ops.sh status         # 查看配置状态 + 数据库连通性（只读，最常用）
bash ops.sh init           # 首次初始化：生成随机库密码与 JWT 密钥并重建容器
bash ops.sh change-db-pwd  # 修改数据库密码
bash ops.sh change-jwt     # 更换 JWT 密钥
```

> ⚠️ `change-jwt` 会让**所有已签发的令牌立即失效**（用户需重新登录、API 令牌需重新签发），请在维护窗口执行。

其他常用：

```bash
docker compose ps            # 容器状态
docker compose logs -f       # 实时日志
docker compose restart       # 重启
docker compose stop          # 停止（保留容器，start 可恢复）
docker compose down          # 停止并删除容器与网络（数据与镜像保留）
```

---

## 十、常见问题

| 现象 | 原因与处理 |
|---|---|
| 容器反复重启 / 起不来 | 最常见是 `.env` 里 `JWT_SECRET` 为空；`docker compose logs fde-mcp-blade` 查看具体原因 |
| `bash install.sh` 报 command not found / 权限不足 | 说明文件没拷全或丢了可执行位：用 `bash install.sh` 执行（不依赖可执行位），并确认交付包已**完整拷贝**（含 `.env_` 等点文件 —— SFTP 客户端默认不显示隐藏文件） |
| 管理台打不开 / 接口 404 | 管理台与接口都在 `/prod-api` 前缀下，根路径是前端静态页；请从 `http://<IP>:8018/` 进，不要直接访问 `/login` 这类裸路径 |
| 8018 端口被占用 | 改 `.env` 的 `SERVER_PORT` 后重启 |
| 登录 401 / 操作 403 | 401 = 未登录或令牌失效（换过 JWT 密钥后必然全员失效，重新登录即可）；403 = 已登录但该角色没有该权限 |
| 插件装了不生效 | 确认插件目录里 `plugin.json` 合法、`requirements.txt` 依赖已装上；方法对普通用户默认不可见，需在管理台做**服务授权** |
| 改了插件配置没反应 | 请走管理台「插件配置」页（写的是 `service-plugin-configs/<插件名>.json`），直接改插件包会被覆盖 |
| 知识库文档改了没变化 | 放好文档后需在管理台点一次「重新同步」；同步**只增不删**，改文件名等于新增一篇，请就地改内容 |
| 镜像拉取慢 / 拉不到 | 先看 `.env` 里的 `COMPOSE_FILE` 是否匹配当前网络：国内应为 `docker-compose.yml`（阿里云 ACR），海外为 `docker-compose_en.yml`（Docker Hub）；改完执行 `docker compose pull` 重试。`mariadb:11` 只有 Docker Hub 来源，国内需给 Docker 配 `registry-mirrors` 镜像加速（或在能访问的网络里先拉好、`docker tag` 成 `mariadb:11`）后重试 |
| 令牌 / 二维码里的地址是 `localhost` 或客户端连不上 | 改 `.env` 的 `HOST_HOSTNAME` 为本机内网 IP（客户端能访问的那个地址），`docker compose up -d` 后**重新生成令牌** —— 旧令牌里写死了生成时的地址 |

---

## 十一、Windows 演示体验（Docker Desktop）

> **仅用于演示 / 体验**：在 Windows 上把系统跑起来看效果、给人演示。
> **正式交付一律用 Linux** —— `install.sh` / `ops.sh` / `backup.sh` 都是 bash 脚本，Windows 上跑不了，本章给的都是替代做法。

### 11.1 先装 Docker Desktop

1. 到 Docker 官网下载 **Docker Desktop for Windows** 安装包，安装时保持勾选 **WSL 2**（首次装 WSL2 会提示重启，重启后继续）。
2. 启动 Docker Desktop，等状态变成 **Engine running**（首次启动比较慢）。
3. 打开 PowerShell 验证：

```powershell
docker --version
docker compose version
```

> Docker Desktop 本身的详细安装步骤（系统版本要求、WSL2 内核更新、镜像加速器等）本包不展开；遇到问题请自行搜索，关键词：`Docker Desktop Windows 安装`、`WSL2 内核更新`（DeepSeek / ChatGPT / 官方文档都可以）。
> 内存建议 ≥ 4 GB，低于 2 GB 时容器起不来。

### 11.2 一键安装（推荐）

在部署包目录下执行：

```powershell
powershell -ExecutionPolicy Bypass -File .\install.ps1
```

脚本依次做：检查 Docker / docker compose / 端口 → 选镜像来源（1 国内 ACR / 2 国外 Docker Hub）→ 探测并确认本机地址（写入 `HOST_HOSTNAME`）→ 从 `.env_` 生成 `.env`（随机数据库口令 + JWT 密钥）→ `docker compose pull && up -d` → 健康检查 → 打印访问地址与账号。

常用参数：`-ImageSource cn|global`、`-HostAddress <IP 或主机名>`、`-Yes`（全部取默认值，不交互）。

> 重跑时若 `.env` 已存在，脚本会问是否覆盖：**回答 `N` 就沿用现有 `.env` 继续装**（手工改过 `SERVER_PORT` / `HOST_HOSTNAME` 后走这条路）。

> 若提示"无法加载文件…未进行数字签名"：文件从压缩包解出来带了网络标记，先执行一次 `Unblock-File .\install.ps1` 再运行。
> 脚本界面是**英文**：Windows PowerShell 5.1 会把无 BOM 的脚本按 ANSI 读，中文会乱码，所以刻意只写英文。

### 11.3 手工安装（不用脚本）

把 `.env_` 复制成 `.env`，至少填这两项，其余可先不动：

| 键 | 填什么 |
|---|---|
| `JWT_SECRET` | 必填。PowerShell 里生成：`[Convert]::ToBase64String([byte[]](1..32 \| % { Get-Random -Max 256 }))` |
| `HOST_HOSTNAME` | 本机**局域网 IP**（如 `192.168.1.50`）。不填的话令牌/二维码里是 `localhost`，别的机器连不上 |

生产环境再改掉 `MARIADB_ROOT_PASSWORD` / `MARIADB_PASSWORD`（不填会走编排里的兜底口令）。然后启动：

```powershell
docker compose up -d      # 不带 -f 用 docker-compose.yml（国内 · 阿里云 ACR）
```

### 11.4 让别的机器能访问

在 Windows Defender 防火墙放行**入站 TCP 8018**：高级设置 → 入站规则 → 新建规则 → 端口 → TCP → 8018 → 允许。

之后用 `http://<本机局域网 IP>:8018` 访问，账号 `admin` / `admin123`。

### 11.5 Windows 常见问题

| 现象 | 处理 |
|---|---|
| 脚本报 `Cannot talk to the Docker daemon`（或 `failed to connect to the docker API at npipe://...`） | Docker Desktop 没启动，或还在启动中。等它显示 **Engine running** 后再跑一次 |
| 脚本报 `Port 8018 is already in use` | 只有 `netstat -ano \| findstr :8018` 里的 **LISTENING** 行才算占用（`ESTABLISHED` 是本机主动连出去的，不算）。确实被占用就停掉那个程序，或改 `.env` 的 `SERVER_PORT` 后重跑 |
| 脚本报"未进行数字签名" | `Unblock-File .\install.ps1` 后重跑（或用 `powershell -ExecutionPolicy Bypass -File .\install.ps1`） |
| 其它机器 / 手机打不开 | ①`.env` 的 `HOST_HOSTNAME` 要填本机**局域网** IP（不是 `127.0.0.1`）；②防火墙放行入站 TCP 8018 |
| 镜像拉不动 | 检查 `.env` 的 `COMPOSE_FILE` 是否匹配网络（国内 `docker-compose.yml` / 国外 `docker-compose_en.yml`）；若是 `mariadb:11` 拉不动，见下面 11.6 |
| 改了 `HOST_HOSTNAME` 但令牌里的地址没变 | 地址是**生成令牌时写死**的，需要重新生成令牌 |
| 容器反复重启 | 多数是 `.env` 里 `JWT_SECRET` 为空；`docker compose logs fde-mcp-blade` 看具体原因 |

### 11.6 国内拉不到镜像时：给 Docker 配国内镜像仓库

应用镜像来自阿里云 ACR（国内可直连），但**数据库镜像 `mariadb:11` 只有 Docker Hub 一个来源**，国内网络经常拉不动。两种解法，选一个。

**解法一：配镜像加速器（一次配置，之后所有 Docker Hub 镜像都走加速）**

Windows（Docker Desktop）：Docker 图标 → **Settings** → **Docker Engine**，把里面那段 JSON **整段替换**成下面的内容（Docker Desktop 默认自带 `builder` 那一段，只复制一行插进去很容易漏掉逗号、报 `Expected ',' or '}'`），然后点 **Apply & restart**：

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

Linux / NAS：编辑 `/etc/docker/daemon.json`（没有就新建），写入上面的 `registry-mirrors` 段，再 `sudo systemctl restart docker`。

> `registry-mirrors` 是**数组，可以写多个**，Docker 会依次尝试，把能用的都放上更稳。
> 想再加阿里云的专属加速地址，就在数组里补一行（**记得给上一行末尾补逗号**）：`"https://xxxx.mirror.aliyuncs.com"` —— 地址在「登录阿里云 → 容器镜像服务（ACR）→ 左侧『镜像工具 / 镜像加速器』」免费领取。
>
> **各源实测情况**（2026-09 用匿名 registry API 探的，公共源存活变化很快，仅供参考）：
>
> | 源 | 实测结果 |
> |---|---|
> | 阿里云个人专属加速地址 | 最稳；需登录阿里云控制台获取（无账号无法实测） |
> | `docker.1ms.run` | 可用，能列出 `mariadb` 的 `11` tag |
> | `docker.m.daocloud.io` | 可用，能取到 `library/mariadb:11` 的 manifest（tags 列举被禁用，不影响按 tag 拉取） |
> | 清华 `docker.mirrors.tuna.tsinghua.edu.cn` | **已停止**（连不上，清华 mirrors 站的 docker 帮助页也是 404） |
> | 中科大 `docker.mirrors.ustc.edu.cn`、网易 `hub-mirror.c.163.com`、`registry.docker-cn.com`、`docker.1panel.live` | 均已失效（连不上） |
> | 腾讯云 `mirror.ccs.tencentyun.com` | 连不上（仅腾讯云内网可用） |
> | 南大 `docker.nju.edu.cn` | 403 拒绝访问 |
>
> 配好先验一下：`docker pull mariadb:11`，能下来就说明生效 —— 之后重跑 `bash install.sh` / `.\install.ps1` 即可。

**解法二：手工拉一份再打回原名（不想动 Docker 配置时用）**

```powershell
docker pull docker.1ms.run/library/mariadb:11
docker tag docker.1ms.run/library/mariadb:11 mariadb:11
docker compose up -d
```

> 这一招要配合**手工 `docker compose up -d`**：本地已有同名 tag，compose 就不会再去拉。脚本里的 `docker compose pull` 仍会去 Docker Hub 核对，所以别在这之后直接重跑 install 脚本（除非你先把加速器配好）。

### 11.7 升级 / 备份 / 卸载

`ops.sh`、`backup.sh` 是 bash 脚本，Windows 上不可用，用下面这些替代：

```powershell
# 升级
docker compose pull; docker compose up -d

# 备份：停服后复制整个 data 目录（数据库、上传文件、配置都在这里）
docker compose stop
Copy-Item -Recurse -Force .\data ".\data-backup-$(Get-Date -Format yyyyMMdd)"
docker compose start
```

卸载（保留镜像）：

```powershell
docker compose down
Remove-Item -Recurse -Force .\data        # ⚠️ 删除全部数据，请先备份
```

彻底卸载（要删镜像，同样只给手动步骤，不提供一键）：

```powershell
docker compose down
docker image rm crpi-qlruqqugcjs2bo3w.cn-shanghai.personal.cr.aliyuncs.com/fde-mcp-blade/fde-mcp-blade:latest  # 国内（阿里云 ACR）
docker image rm apexf/fde-mcp-blade:latest                                                                    # 国外（Docker Hub）
docker image rm mariadb:11                    # ⚠️ 本机其它项目若也在用，会被一并删掉
Remove-Item -Recurse -Force .\data, .\backups, .\.env
cd ..; Remove-Item -Recurse -Force .\fde-mcp-blade
```

---

## 十二、问题反馈

- 开发者交流群（QQ）：`882419824`
- 邮箱：`448004147@qq.com`

> 这是开发者群，供使用与交流，没有工单系统与 SLA 承诺。

---

## 十三、第三方组件与许可

本部署包与其镜像内含以下第三方组件，各自按其许可条款分发：

| 组件 | 许可 | 说明 |
|------|------|------|
| **BAAI bge-small-zh-v1.5**（向量检索模型） | **MIT** | 已内置在镜像中（`/app/models/bge-small-zh-v1.5`）。出处、文件校验值与转换来源见 `models/bge-small-zh-v1.5/SOURCE.txt`，许可全文见同目录 `LICENSE` |
| **MariaDB 11** | GPLv2 | 以独立容器运行（官方 `mariadb:11` 镜像），未与本产品代码链接 |

> MIT 许可要求：再分发时须保留版权声明与许可文本 —— 对应文件已随镜像内的模型目录一并提供。
