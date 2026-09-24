#!/bin/bash
set -e

# ============================================================
# FDE MCP Blade - 运维工具
# ============================================================
# 交互模式:  bash ops.sh
# 命令行模式: bash ops.sh init|change-db-pwd|change-jwt|status
# ============================================================

SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" &>/dev/null && pwd)
cd "$SCRIPT_DIR"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

COMPOSE_CMD=""
MARIA_CONTAINER="fde-mcp-blade-mariadb"
APP_CONTAINER="fde-mcp-blade"
ENV_FILE="$SCRIPT_DIR/.env"
DEFAULT_PWD="Apex1234"
# .env_ 模板里的占位符：保持未修改（= 未初始化）时也允许执行 init
PLACEHOLDER_PWD="your-root-password"
PLACEHOLDER_APP_PWD="your-gis-remote-password"
LANG_DIR="$SCRIPT_DIR/deploy/ops/lang"
LANG_CHOICE="en"

# ── 加载语言包 ────────────────────────────────────────────
load_language() {
    if [[ -f "$LANG_DIR/${LANG_CHOICE}.sh" ]]; then
        source "$LANG_DIR/${LANG_CHOICE}.sh"
    else
        source "$LANG_DIR/en.sh"
    fi
}

# ── 语言选择 ──────────────────────────────────────────────
show_language_menu() {
    load_language
    echo ""
    echo -e "${BLUE}${LANG_LINE}${NC}"
    echo -e "${BLUE}  ${LANG_TITLE}${NC}"
    echo -e "${BLUE}${LANG_LINE}${NC}"
    echo ""
    echo -e "${YELLOW}${LANG_SELECT_TITLE}${NC}"
    echo ""
    echo "  [1] ${LANG_CHINESE}"
    echo "  [2] ${LANG_ENGLISH}"
    echo ""
    read -p "${LANG_PROMPT_CHOICE}" choice
    case "$choice" in
        1) LANG_CHOICE="zh" ;;
        2) LANG_CHOICE="en" ;;
        *) LANG_CHOICE="en" ;;
    esac
    load_language
}

# ── 主菜单 ────────────────────────────────────────────────
show_main_menu() {
    while true; do
        echo ""
        echo -e "${BLUE}${LANG_LINE}${NC}"
        echo -e "${BLUE}  ${LANG_TITLE}${NC}"
        echo -e "${BLUE}${LANG_LINE}${NC}"
        echo ""
        echo -e "${YELLOW}${LANG_MENU_TITLE}${NC}"
        echo ""
        echo "  [1] ${LANG_MENU_INIT}"
        echo "  [2] ${LANG_MENU_CHANGE_DB}"
        echo "  [3] ${LANG_MENU_CHANGE_JWT}"
        echo "  [4] ${LANG_MENU_STATUS}"
        echo "  [0] ${LANG_MENU_EXIT}"
        echo ""
        read -p "${LANG_PROMPT_CHOICE}" choice

        case "$choice" in
            1) cmd_init;    echo ""; echo -e "${YELLOW}${LANG_PRESS_ENTER}${NC}"; read ;;
            2) cmd_change_db_pwd; echo ""; echo -e "${YELLOW}${LANG_PRESS_ENTER}${NC}"; read ;;
            3) cmd_change_jwt;    echo ""; echo -e "${YELLOW}${LANG_PRESS_ENTER}${NC}"; read ;;
            4) cmd_status;  echo ""; echo -e "${YELLOW}${LANG_PRESS_ENTER}${NC}"; read ;;
            0) echo -e "${GREEN}${LANG_GOODBYE}${NC}"; echo ""; exit 0 ;;
            *) echo -e "${RED}无效选择${NC}" ;;
        esac
    done
}

# ── 检测 docker compose 命令 ──────────────────────────────
detect_compose() {
    if docker compose version &>/dev/null; then
        COMPOSE_CMD="docker compose"
    elif command -v docker-compose &>/dev/null; then
        COMPOSE_CMD="docker-compose"
    else
        echo -e "${RED}${LANG_COMPOSE_NOT_FOUND}${NC}"
        exit 1
    fi
}

# ── 读取 .env 中的值 ─────────────────────────────────────
read_env() {
    local key=$1
    grep "^${key}=" "$ENV_FILE" 2>/dev/null | head -1 | cut -d'=' -f2- | tr -d '"' | tr -d "'"
}

# ── 写/更新 .env 中指定键的值 ─────────────────────────────
write_env() {
    local key=$1
    local val=$2
    if grep -q "^${key}=" "$ENV_FILE" 2>/dev/null; then
        sed -i "s|^${key}=.*|${key}=${val}|" "$ENV_FILE"
    else
        echo "${key}=${val}" >> "$ENV_FILE"
    fi
}

# ── 是否"未初始化"：空值 / compose 兜底口令 / .env_ 模板占位符 均视为未初始化 ──
is_uninitialized() {
    local root="$1" app="$2"
    [[ -z "$root" || "$root" == "$DEFAULT_PWD" || "$root" == "$PLACEHOLDER_PWD" \
       || -z "$app"  || "$app"  == "$DEFAULT_PWD" || "$app" == "$PLACEHOLDER_APP_PWD" ]]
}

# ── 当前生效的 root 口令：.env 里有就用（含模板占位符），没有则用 compose 兜底 ──
effective_root_pwd() {
    local p
    p="$(read_env MARIADB_ROOT_PASSWORD)"
    [[ -z "$p" ]] && p="$DEFAULT_PWD"
    printf '%s' "$p"
}

# ── 生成随机密码 ──────────────────────────────────────────
gen_password() {
    openssl rand -base64 16 | tr -d '+/=' | head -c 16
}

# ── 生成随机 JWT 密钥 ─────────────────────────────────────
gen_jwt() {
    openssl rand -base64 32
}

# ── 检查 MariaDB 是否在运行 ──────────────────────────────
check_mariadb_running() {
    docker ps --format '{{.Names}}' 2>/dev/null | grep -q "^${MARIA_CONTAINER}$"
}

# ── 在 MariaDB 中执行 SQL ────────────────────────────────
mariadb_exec() {
    local root_pwd=$1
    local sql=$2
    # 用 MYSQL_PWD 传密码：避免密码出现在容器内进程列表（与 backup.sh 一致）
    docker exec -e MYSQL_PWD="$root_pwd" "$MARIA_CONTAINER" mariadb -uroot -e "$sql" 2>&1
}

# ============================================================
# 命令: status
# ============================================================
cmd_status() {
    echo ""
    echo -e "${GREEN}========== ${LANG_STATUS_TITLE} ==========${NC}"
    echo ""

    if [ ! -f "$ENV_FILE" ]; then
        echo -e "${YELLOW}${LANG_STATUS_NO_ENV}${NC}"
        echo ""
        return
    fi

    local root_pwd=$(read_env "MARIADB_ROOT_PASSWORD")
    local app_pwd=$(read_env "MARIADB_PASSWORD")
    local jwt=$(read_env "JWT_SECRET")
    local server_port=$(read_env "SERVER_PORT")

    mask() {
        local s="$1"
        if [ -z "$s" ]; then echo "${LANG_EMPTY}"; return; fi
        if [ ${#s} -le 8 ]; then echo "$s"; return; fi
        echo "${s:0:4}****${s: -4}"
    }

    if is_uninitialized "$root_pwd" "$app_pwd"; then
        echo -e "${YELLOW}[${LANG_STATUS_UNINIT}]${NC}"
        echo -e "        ${LANG_STATUS_INIT_HINT}"
    else
        echo -e "${GREEN}[${LANG_STATUS_INITED}]${NC}"
    fi
    echo ""

    echo -e "${YELLOW}${LANG_STATUS_CONFIG}${NC}"
    echo "  MARIADB_ROOT_PASSWORD = $(mask "$root_pwd")"
    echo "  MARIADB_PASSWORD      = $(mask "$app_pwd")"
    echo "  JWT_SECRET            = $(mask "$jwt")"
    if [ -z "$server_port" ]; then
        echo "  SERVER_PORT           = 8018 ${LANG_DEFAULT}"
    else
        echo "  SERVER_PORT           = ${server_port}"
    fi
    echo ""

    if check_mariadb_running; then
        echo -e "${YELLOW}${LANG_STATUS_DB_TEST}:${NC}"
        if mariadb_exec "$root_pwd" "SELECT 1;" &>/dev/null; then
            echo -e "  MariaDB: ${GREEN}${LANG_STATUS_DB_OK}${NC}"
        else
            echo -e "  MariaDB: ${RED}${LANG_STATUS_DB_FAIL}${NC}"
        fi
    else
        echo -e "  MariaDB: ${YELLOW}${LANG_STATUS_DB_NOT_RUNNING}${NC}"
    fi
    echo ""
}

# ============================================================
# 命令: init
# ============================================================
cmd_init() {
    echo ""
    echo -e "${GREEN}========== ${LANG_INIT_TITLE} ==========${NC}"
    echo ""

    detect_compose

    if [ ! -f "$ENV_FILE" ]; then
        echo "[1/4] ${LANG_INIT_CREATING_ENV}"
        cat > "$ENV_FILE" <<EOF
MARIADB_ROOT_PASSWORD=${DEFAULT_PWD}
MARIADB_PASSWORD=${DEFAULT_PWD}
JWT_SECRET=
SERVER_PORT=8018
EOF
    fi

    local current_root=$(read_env "MARIADB_ROOT_PASSWORD")
    local current_app=$(read_env "MARIADB_PASSWORD")

    if ! is_uninitialized "$current_root" "$current_app"; then
        echo -e "${YELLOW}${LANG_INIT_ALREADY_DONE}${NC}"
        echo -e "${YELLOW}${LANG_INIT_USE_OTHER}${NC}"
        echo ""
        return
    fi

    echo "[2/4] ${LANG_INIT_GENERATING}"
    local NEW_ROOT=$(gen_password)
    local NEW_APP=$(gen_password)
    local NEW_JWT=$(gen_jwt)

    echo "[3/4] ${LANG_INIT_UPDATING_DB}"
    if ! check_mariadb_running; then
        echo -e "${RED}${LANG_INIT_DB_NOT_RUNNING}${NC}"
        return
    fi

    if ! mariadb_exec "$(effective_root_pwd)" "SELECT 1;" &>/dev/null; then
        echo -e "${RED}${LANG_INIT_DB_CONN_FAIL}${NC}"
        return
    fi

    mariadb_exec "$(effective_root_pwd)" "ALTER USER 'root'@'%' IDENTIFIED BY '${NEW_ROOT}';"
    mariadb_exec "$NEW_ROOT" "ALTER USER 'apex_remote'@'%' IDENTIFIED BY '${NEW_APP}';"
    mariadb_exec "$NEW_ROOT" "FLUSH PRIVILEGES;"
    echo -e "  ${GREEN}${LANG_INIT_DB_UPDATED}${NC}"

    echo "[4/4] ${LANG_INIT_WRITING_ENV}"
    write_env "MARIADB_ROOT_PASSWORD" "$NEW_ROOT"
    write_env "MARIADB_PASSWORD" "$NEW_APP"
    write_env "JWT_SECRET" "$NEW_JWT"

    echo ""
    echo -e "${YELLOW}${LANG_INIT_RESTARTING}${NC}"
    $COMPOSE_CMD down
    $COMPOSE_CMD up -d

    echo ""
    echo -e "${GREEN}========== ${LANG_INIT_DONE} ==========${NC}"
    echo ""
    echo -e "${YELLOW}${LANG_INIT_CREDENTIALS}${NC}"
    echo "  MARIADB_ROOT_PASSWORD = ${NEW_ROOT}"
    echo "  MARIADB_PASSWORD      = ${NEW_APP}"
    echo "  JWT_SECRET            = ${NEW_JWT}"
    echo ""
    echo -e "${RED}${LANG_INIT_BACKUP_WARN}${NC}"
    echo ""
}

# ============================================================
# 命令: change-db-pwd
# ============================================================
cmd_change_db_pwd() {
    echo ""
    echo -e "${GREEN}========== ${LANG_CHDB_TITLE} ==========${NC}"
    echo ""

    if [ ! -f "$ENV_FILE" ]; then
        echo -e "${RED}${LANG_CHDB_NO_ENV}${NC}"
        return
    fi

    local current_root=$(read_env "MARIADB_ROOT_PASSWORD")
    local current_app=$(read_env "MARIADB_PASSWORD")

    if is_uninitialized "$current_root" "$current_app"; then
        echo -e "${YELLOW}${LANG_CHDB_REDIRECT_INIT}${NC}"
        cmd_init
        return
    fi

    detect_compose

    if ! check_mariadb_running; then
        echo -e "${RED}${LANG_CHDB_DB_NOT_RUNNING}${NC}"
        return
    fi

    echo "[1/3] ${LANG_CHDB_VERIFYING}"
    if ! mariadb_exec "$(effective_root_pwd)" "SELECT 1;" &>/dev/null; then
        echo -e "${RED}${LANG_CHDB_VERIFY_FAIL}${NC}"
        echo -e "       ${LANG_CHDB_VERIFY_FAIL_HINT}"
        return
    fi
    echo -e "  ${GREEN}${LANG_CHDB_VERIFY_OK}${NC}"

    echo "[2/3] ${LANG_CHDB_GENERATING}"
    local NEW_ROOT=$(gen_password)
    local NEW_APP=$(gen_password)

    mariadb_exec "$current_root" "ALTER USER 'root'@'%' IDENTIFIED BY '${NEW_ROOT}';"
    mariadb_exec "$NEW_ROOT" "ALTER USER 'apex_remote'@'%' IDENTIFIED BY '${NEW_APP}';"
    mariadb_exec "$NEW_ROOT" "FLUSH PRIVILEGES;"
    echo -e "  ${GREEN}${LANG_CHDB_UPDATED}${NC}"

    echo "[3/3] ${LANG_CHDB_WRITING}"
    write_env "MARIADB_ROOT_PASSWORD" "$NEW_ROOT"
    write_env "MARIADB_PASSWORD" "$NEW_APP"

    $COMPOSE_CMD down
    $COMPOSE_CMD up -d

    echo ""
    echo -e "${GREEN}========== ${LANG_CHDB_DONE} ==========${NC}"
    echo ""
    echo -e "${YELLOW}${LANG_CHDB_NEW_CREDENTIALS}${NC}"
    echo "  MARIADB_ROOT_PASSWORD = ${NEW_ROOT}"
    echo "  MARIADB_PASSWORD      = ${NEW_APP}"
    echo ""
}

# ============================================================
# 命令: change-jwt
# ============================================================
cmd_change_jwt() {
    echo ""
    echo -e "${GREEN}========== ${LANG_JWT_TITLE} ==========${NC}"
    echo ""

    detect_compose

    echo "[1/2] ${LANG_JWT_GENERATING}"
    local NEW_JWT=$(gen_jwt)

    echo "[2/2] ${LANG_JWT_RESTARTING}"
    write_env "JWT_SECRET" "$NEW_JWT"
    # 必须用 up -d 重建容器：compose restart 不会重读 .env，环境变量不会更新（密钥等于没换）
    $COMPOSE_CMD up -d "$APP_CONTAINER"

    echo ""
    echo -e "${GREEN}========== ${LANG_JWT_DONE} ==========${NC}"
    echo ""
    echo -e "${RED}${LANG_JWT_WARN}${NC}"
    echo ""
}

# ============================================================
# 入口
# ============================================================
case "${1:-}" in
    init)
        LANG_CHOICE="en"; load_language; cmd_init ;;
    change-db-pwd)
        LANG_CHOICE="en"; load_language; cmd_change_db_pwd ;;
    change-jwt)
        LANG_CHOICE="en"; load_language; cmd_change_jwt ;;
    status)
        LANG_CHOICE="en"; load_language; cmd_status ;;
    -h|--help|help)
        echo ""
        echo "用法: bash ops.sh [命令]"
        echo ""
        echo "命令:"
        echo "  init             首次初始化"
        echo "  change-db-pwd    修改数据库密码"
        echo "  change-jwt       修改 JWT 密钥"
        echo "  status           查看配置状态"
        echo ""
        echo "无参数时进入交互菜单"
        echo ""
        ;;
    "")
        # 默认交互模式
        show_language_menu
        show_main_menu
        ;;
    *)
        echo -e "${RED}未知命令: $1${NC}"
        echo "使用: bash ops.sh  进入交互菜单"
        echo "或:   bash ops.sh init|change-db-pwd|change-jwt|status"
        exit 1
        ;;
esac
