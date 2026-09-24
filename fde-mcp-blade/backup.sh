#!/bin/bash
# ============================================================
# FDE MCP Blade - 备份 / 恢复工具（简单版 v1）
# ============================================================
# 用法:
#   bash backup.sh backup                 一键备份
#   bash backup.sh list                   查看现有备份
#   bash backup.sh restore <备份文件>      恢复（二次确认 + 自动预备份）
#   bash backup.sh help                   帮助
#
# 备份范围（最小集）:
#   apex_db 数据库 + ./data/{config,uploads,service-plugins,service-plugin-configs,skill-lib,knowledge-lib} + .env
# 加密: openssl aes-256-cbc -pbkdf2，密钥 ./backups/.backup_key（首次自动生成）
# 保留: 最近 7 份，自动轮转
# 设计依据: 《17 过评审包模板设计》§7.1
# ============================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" &>/dev/null && pwd)"
cd "$SCRIPT_DIR"

# ── 配置 ──────────────────────────────────────────────────
BACKUP_DIR="$SCRIPT_DIR/backups"
KEY_FILE="$BACKUP_DIR/.backup_key"
ENV_FILE="$SCRIPT_DIR/.env"
DATA_DIR="$SCRIPT_DIR/data"
KEEP=7

MARIA_CONTAINER="fde-mcp-blade-mariadb"
APP_CONTAINER="fde-mcp-blade"
DB_NAME="apex_db"

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; NC='\033[0m'

info() { echo -e "${GREEN}[备份]${NC} $*"; }
warn() { echo -e "${YELLOW}[警告]${NC} $*"; }
err()  { echo -e "${RED}[错误]${NC} $*" >&2; }
step() { echo -e "${BLUE}==>${NC} $*"; }

# ── 读取 .env 中的值 ──────────────────────────────────────
read_env() {
    local key=$1
    [[ -f "$ENV_FILE" ]] || return 0
    grep "^${key}=" "$ENV_FILE" 2>/dev/null | head -1 | cut -d'=' -f2- | tr -d '"' | tr -d "'"
}

# ── 前置检查 ──────────────────────────────────────────────
require_docker() {
    command -v docker &>/dev/null || { err "未找到 docker 命令"; exit 1; }
}

require_mariadb() {
    require_docker
    if ! docker ps --format '{{.Names}}' 2>/dev/null | grep -qx "$MARIA_CONTAINER"; then
        err "MariaDB 容器未运行: $MARIA_CONTAINER"
        err "请先启动: docker compose up -d"
        exit 1
    fi
}

db_root_pwd() {
    local pwd
    pwd="$(read_env MARIADB_ROOT_PASSWORD)"
    if [[ -z "$pwd" ]]; then
        pwd="$(read_env MARIADB_PASSWORD)"
    fi
    if [[ -z "$pwd" ]]; then
        err "未能从 .env 读取 MARIADB_ROOT_PASSWORD / MARIADB_PASSWORD"
        exit 1
    fi
    printf '%s' "$pwd"
}

# ── 加密密钥（首次自动生成） ──────────────────────────────
ensure_key() {
    mkdir -p "$BACKUP_DIR"
    if [[ ! -f "$KEY_FILE" ]]; then
        openssl rand -base64 32 > "$KEY_FILE"
        chmod 600 "$KEY_FILE"
        warn "已生成加密密钥: $KEY_FILE"
        warn "请把 .env 与该密钥文件【与备份分开保管】，否则加密形同虚设。"
    fi
}

# ── 轮转：只保留最近 KEEP 份 apex-backup-* ────────────────
rotate_backups() {
    local files
    files=$(ls -1t "$BACKUP_DIR"/apex-backup-*.tar.gz.enc 2>/dev/null || true)
    [[ -z "$files" ]] && return 0
    local total
    total=$(echo "$files" | wc -l)
    if (( total > KEEP )); then
        echo "$files" | tail -n +$((KEEP + 1)) | while read -r f; do
            rm -f "$f"
            info "轮转删除旧备份: $(basename "$f")"
        done
    fi
}

# ── 执行备份（prefix 默认 apex-backup，恢复前用 pre-restore） ──
do_backup() {
    local prefix="${1:-apex-backup}"
    local ts staging pkg enc
    ts="$(date +%Y%m%d-%H%M%S)"
    staging="$(mktemp -d)"
    pkg="$(mktemp)".pkg
    enc="$BACKUP_DIR/${prefix}-${ts}.tar.gz.enc"

    # 1) 数据库 dump（热备，不停服）
    step "导出数据库 $DB_NAME ..."
    local pwd
    pwd="$(db_root_pwd)"
    if ! docker exec -e MYSQL_PWD="$pwd" "$MARIA_CONTAINER" \
            sh -c "exec mariadb-dump --single-transaction --databases $DB_NAME" \
            > "$staging/db.sql"; then
        err "数据库导出失败"
        rm -rf "$staging" "$pkg"
        exit 1
    fi
    [[ -s "$staging/db.sql" ]] || { err "数据库导出为空"; rm -rf "$staging" "$pkg"; exit 1; }
    info "db.sql $(du -h "$staging/db.sql" | cut -f1)"

    # 2) 收集文件（最小集）
    step "收集文件 ..."
    [[ -f "$ENV_FILE" ]] && cp -a "$ENV_FILE" "$staging/env" && info "env"
    local d
    for d in config uploads service-plugins service-plugin-configs skill-lib knowledge-lib; do
        if [[ -d "$DATA_DIR/$d" ]]; then
            cp -a "$DATA_DIR/$d" "$staging/$d"
            info "$d"
        else
            warn "跳过不存在的目录: data/$d"
        fi
    done

    # 3) 打包 + 加密
    step "打包并加密 ..."
    tar czf "$pkg" -C "$staging" .
    openssl enc -aes-256-cbc -pbkdf2 -iter 100000 -salt \
        -pass file:"$KEY_FILE" -in "$pkg" -out "$enc"

    rm -rf "$staging" "$pkg"
    info "备份完成: ${BLUE}$enc${NC}  ($(du -h "$enc" | cut -f1))"
}

# ── 命令: backup ──────────────────────────────────────────
cmd_backup() {
    require_mariadb
    ensure_key
    do_backup "apex-backup"
    rotate_backups
}

# ── 命令: list ────────────────────────────────────────────
cmd_list() {
    if [[ ! -d "$BACKUP_DIR" ]] || [[ -z "$(ls -A "$BACKUP_DIR"/*.enc 2>/dev/null || true)" ]]; then
        echo "暂无备份（$BACKUP_DIR）"
        return 0
    fi
    echo -e "${YELLOW}备份列表（保留最近 $KEEP 份）:${NC}"
    ls -lht "$BACKUP_DIR"/*.tar.gz.enc 2>/dev/null | awk '{printf "  %-8s %s %s  %s\n", $5, $6, $7, $9}'
}

# ── 命令: restore ─────────────────────────────────────────
cmd_restore() {
    local file="${1:-}"
    [[ -n "$file" ]] || { err "用法: bash backup.sh restore <备份文件>"; exit 1; }
    [[ -f "$file" ]] || { err "备份文件不存在: $file"; exit 1; }

    echo -e "${RED}════════════ 危险操作确认 ════════════${NC}"
    echo "  将用以下备份【覆盖】当前数据:"
    echo "    $file"
    echo "  覆盖范围: 数据库 $DB_NAME + data/{config,uploads,service-plugins} + .env"
    echo "  恢复前会自动创建一份预备份（pre-restore-*）。"
    echo -e "${RED}═══════════════════════════════════════${NC}"
    read -r -p "确认请输入 YES 后回车: " ans
    [[ "$ans" == "YES" ]] || { warn "已取消"; exit 0; }

    require_mariadb
    ensure_key

    # 1) 自动预备份
    step "恢复前预备份 ..."
    do_backup "pre-restore"
    rotate_backups

    # 2) 解密解包
    step "解密并解包 ..."
    local tmp
    tmp="$(mktemp -d)"
    openssl enc -d -aes-256-cbc -pbkdf2 -salt \
        -pass file:"$KEY_FILE" -in "$file" -out "$tmp/pkg.tar.gz"
    mkdir -p "$tmp/unpack"
    tar xzf "$tmp/pkg.tar.gz" -C "$tmp/unpack"

    # 3) 停应用（保留数据库运行）
    step "停止应用容器 $APP_CONTAINER ..."
    docker stop "$APP_CONTAINER" >/dev/null 2>&1 || warn "应用容器未运行，跳过停止"

    # 4) 导入数据库
    step "导入数据库 ..."
    local pwd
    pwd="$(db_root_pwd)"
    docker exec -i -e MYSQL_PWD="$pwd" "$MARIA_CONTAINER" mariadb -uroot < "$tmp/unpack/db.sql"
    info "数据库导入完成"

    # 5) 恢复文件
    step "恢复文件 ..."
    if [[ -f "$tmp/unpack/env" ]]; then
        cp -a "$tmp/unpack/env" "$ENV_FILE"
        info ".env 已恢复"
    fi
    local d
    for d in config uploads service-plugins service-plugin-configs skill-lib knowledge-lib; do
        if [[ -d "$tmp/unpack/$d" ]]; then
            rm -rf "$DATA_DIR/$d"
            mkdir -p "$(dirname "$DATA_DIR/$d")"
            cp -a "$tmp/unpack/$d" "$DATA_DIR/$d"
            info "data/$d 已恢复"
        fi
    done
    rm -rf "$tmp"

    # 6) 启动应用
    step "启动应用容器 $APP_CONTAINER ..."
    docker start "$APP_CONTAINER" >/dev/null 2>&1 || warn "请手动启动: docker compose up -d"

    info "恢复完成。建议校验: 登录 + 插件列表 + 历史会话。"
}

# ── 帮助 ──────────────────────────────────────────────────
cmd_help() {
    cat <<'EOF'
FDE MCP Blade - 备份 / 恢复工具（简单版 v1）

用法:
  bash backup.sh backup                  一键备份（数据库 + 关键文件 + .env）
  bash backup.sh list                    查看现有备份
  bash backup.sh restore <备份文件>       恢复（二次确认 + 自动预备份）

说明:
  - 备份范围（最小集）: apex_db + data/{config,uploads,service-plugins,service-plugin-configs,skill-lib,knowledge-lib} + .env
  - 加密:      openssl aes-256-cbc -pbkdf2，密钥 ./backups/.backup_key（首次自动生成）
  - 保留:      最近 7 份自动轮转（仅对 apex-backup-* 生效）
  - 排除:      data/logs、data/plugins-venv、data/mariadb（可重建/可另存）

解密查看（需要时）:
  openssl enc -d -aes-256-cbc -pbkdf2 -salt -pass file:./backups/.backup_key \
    -in ./backups/apex-backup-xxx.tar.gz.enc -out x.tar.gz && tar tzf x.tar.gz

安全提醒:
  .env 与 ./backups/.backup_key 必须与备份文件【分开保管】。
EOF
}

# ── 入口 ──────────────────────────────────────────────────
case "${1:-}" in
    backup)          cmd_backup ;;
    list)            cmd_list ;;
    restore)         cmd_restore "${2:-}" ;;
    -h|--help|help|"") cmd_help ;;
    *)               err "未知命令: $1"; echo; cmd_help; exit 1 ;;
esac
