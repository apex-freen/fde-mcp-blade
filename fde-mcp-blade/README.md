# FDE MCP Blade —— 部署与使用说明

> English version: [README.en.md](./README.en.md)

> 部署在客户本地的 **AI 智能体工具侧中控平台**：把企业内系统收敛为**统一的 MCP 工具入口**，让 AI 在既定权限与审计约束下调用设备与内网服务。
> 默认纯本地运行，数据不出内网。

本目录是**部署包**，只包含运行所需的镜像配置与运维脚本，不含源码。

---

## 一、目录里有什么

| 文件 | 作用 |
|------|------|
| `docker-compose.yml` | 部署编排（中文注释）：应用 + 内置 MariaDB 两个服务 |
| `docker-compose_en.yml` | 同上，英文注释 |
| `.env_` | 环境变量模板（**只有 `JWT_SECRET` 是必填项**） |
| `install.sh` | 一键安装脚本（中文/英文界面） |
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

---

## 三、快速开始

先进入本目录：

```bash
cd fde-mcp-blade
```

### 方式 A：一键安装（推荐）

```bash
./install.sh
```

脚本会引导你完成：选择语言 → 检查环境 → 自动生成数据库密码与 JWT 密钥 → 拉取镜像 → 启动 → 健康检查 → 打印访问地址与账号。
（静默安装用 `./install.sh -y`；升级已有部署用 `./install.sh -u`。）

### 方式 B：只用 Docker Compose

`JWT_SECRET` 必须设置（留空容器会立即退出，这是刻意的安全设计）。其余口令不配也能起来（用编排里的兜底值，生产请改）：

```bash
# 生成 JWT 密钥并写入 .env
echo "JWT_SECRET=$(openssl rand -base64 32)" > .env

# 启动
docker compose up -d
```

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
| `1883` | 内嵌 MQTT Broker（现场有 MQTT 硬件设备时才用） | 按需 |
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
- **加密**：AES-256-CBC，密钥文件 `./backups/.backup_key`（首次自动生成）。
  ⚠️ **密钥文件必须与备份文件分开保管**，否则加密形同虚设。
- **保留**：最近 7 份，自动轮转。
- **建议**：每次升级、批量改权限/菜单、更换插件之前先备份一次。

---

## 八、升级 / 回滚 / 卸载

```bash
# 1) 升级前先备份
bash backup.sh backup

# 2) 升级到最新镜像
docker compose pull && docker compose up -d
```

- **回滚**：`bash backup.sh restore <备份文件>` 恢复数据，并把镜像 tag 改回上一版本后 `docker compose up -d`。
- **卸载**：

```bash
docker compose down
rm -rf data          # ⚠️ 删除全部数据，请先备份
```

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
docker compose down          # 停止
```

---

## 十、常见问题

| 现象 | 原因与处理 |
|---|---|
| 容器反复重启 / 起不来 | 最常见是 `.env` 里 `JWT_SECRET` 为空；`docker compose logs fde-mcp-blade` 查看具体原因 |
| 管理台打不开 / 接口 404 | 管理台与接口都在 `/prod-api` 前缀下，根路径是前端静态页；请从 `http://<IP>:8018/` 进，不要直接访问 `/login` 这类裸路径 |
| 8018 端口被占用 | 改 `.env` 的 `SERVER_PORT` 后重启 |
| 登录 401 / 操作 403 | 401 = 未登录或令牌失效（换过 JWT 密钥后必然全员失效，重新登录即可）；403 = 已登录但该角色没有该权限 |
| 插件装了不生效 | 确认插件目录里 `plugin.json` 合法、`requirements.txt` 依赖已装上；方法对普通用户默认不可见，需在管理台做**服务授权** |
| 改了插件配置没反应 | 请走管理台「插件配置」页（写的是 `service-plugin-configs/<插件名>.json`），直接改插件包会被覆盖 |
| 知识库文档改了没变化 | 放好文档后需在管理台点一次「重新同步」；同步**只增不删**，改文件名等于新增一篇，请就地改内容 |
| 镜像拉取慢 | 可为本机 Docker 配置镜像加速器后重试 |

---

## 十一、问题反馈

- 开发者交流群（QQ）：`882419824`
- 邮箱：`448004147@qq.com`

> 这是开发者群，供使用与交流，没有工单系统与 SLA 承诺。
