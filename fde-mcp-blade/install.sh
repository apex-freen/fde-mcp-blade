#!/bin/bash
set -e

# ============================================================
# FDE MCP Blade - 一键部署脚本
# ============================================================
# 默认行为: 自动部署内置 MariaDB + 应用服务
#
# 设计原则: 最少环境变量，所有配置通过 Web UI 完成
#   - MARIADB_ROOT_PASSWORD / MARIADB_PASSWORD / JWT_SECRET 自动生成
#   - MCP 云配置存储在数据库 gis_sys_config 表中
#   - 支持中文/英文界面（默认英文）
#
# 用法:
#   ./install.sh                    # 交互式安装
#   ./install.sh -y                 # 非交互自动安装
#   ./install.sh -u                 # 更新已有部署
#   ./install.sh -d /opt/gis -y     # 安装到指定目录
# ============================================================

# 脚本所在目录
SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" &>/dev/null && pwd)
cd "$SCRIPT_DIR"

# ── 颜色定义 ──────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# ── 默认配置 ──────────────────────────────────────────────
LANG_CHOICE="en"
AUTO_YES=false
UPDATE_MODE=false
LANG_DIR="$SCRIPT_DIR/deploy/install/lang"
COMPOSE_CMD=""

# ── 帮助信息 ──────────────────────────────────────────────
show_help() {
    echo -e "${CYAN}${LANG_TITLE}${NC}"
    echo ""
    echo -e "${LANG_HELP_USAGE}"
    echo ""
    echo -e "${YELLOW}${LANG_HELP_OPTIONS}${NC}"
    echo -e "${LANG_HELP_D}"
    echo -e "${LANG_HELP_Y}"
    echo -e "${LANG_HELP_U}"
    echo -e "${LANG_HELP_H}"
    echo ""
    echo -e "${YELLOW}${LANG_HELP_DESIGN}${NC}"
    echo -e "${LANG_HELP_DESIGN1}"
    echo -e "${LANG_HELP_DESIGN2}"
    echo -e "${LANG_HELP_DESIGN3}"
    echo ""
    echo -e "${YELLOW}${LANG_HELP_EXAMPLES}${NC}"
    echo -e "${LANG_HELP_EXAMPLE1}"
    echo -e "${LANG_HELP_EXAMPLE2}"
    echo -e "${LANG_HELP_EXAMPLE3}"
    echo -e "${LANG_HELP_EXAMPLE4}"
    exit 0
}

# ── 语言选择 ──────────────────────────────────────────────
show_language_menu() {
    echo -e "${BLUE}${LANG_LINE}${NC}"
    echo -e "${BLUE}${LANG_TITLE}${NC}"
    echo -e "${BLUE}${LANG_LINE}${NC}"
    echo ""
    echo -e "${YELLOW}${LANG_SELECT_TITLE}${NC}"
    echo ""
    echo "  [1] ${LANG_CHINESE}"
    echo "  [2] ${LANG_ENGLISH}"
    echo ""
    read -p "${LANG_PROMPT_CHOICE}" CHOICE
    case "$CHOICE" in
        1) LANG_CHOICE="zh" ;;
        2) LANG_CHOICE="en" ;;
        *) LANG_CHOICE="en" ;;  # 默认英文
    esac
    load_language
}

load_language() {
    if [[ -f "$LANG_DIR/${LANG_CHOICE}.sh" ]]; then
        source "$LANG_DIR/${LANG_CHOICE}.sh"
    else
        source "$LANG_DIR/en.sh"
    fi
}

# ── 读取 .env 中的 SERVER_PORT（默认 8018）─────────────────
server_port() {
    local p
    p=$(grep -E '^SERVER_PORT=' .env 2>/dev/null | tail -1 | cut -d= -f2 | tr -d '"[:space:]')
    echo "${p:-8018}"
}

# ── 打印函数 ──────────────────────────────────────────────
print_info()  { echo -e "${BLUE}[INFO]${NC} $1"; }
print_success() { echo -e "${GREEN}[OK]${NC} $1"; }
print_warn()  { echo -e "${YELLOW}[WARN]${NC} $1"; }
print_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# ── 端口检查（ss → netstat → lsof 三级降级）───────────────
check_port() {
    local port=$1
    local in_use=false

    if command -v ss &> /dev/null; then
        if ss -ltn 2>/dev/null | grep -qE ":${port}\s"; then
            in_use=true
        fi
    elif command -v netstat &> /dev/null; then
        if netstat -ltn 2>/dev/null | grep -qE ":${port}\s"; then
            in_use=true
        fi
    elif command -v lsof &> /dev/null; then
        if lsof -iTCP:${port} -sTCP:LISTEN &>/dev/null; then
            in_use=true
        fi
    else
        print_warn "${LANG_PORT_CHECK_TOOL_NONE}"
        return 0
    fi

    if [ "$in_use" = true ]; then
        print_error "${LANG_PORT_OCCUPIED}"
        echo -e "${YELLOW}  解决方式：停止占用端口的服务，或修改 .env 中的 SERVER_PORT${NC}"
        return 1
    fi
    print_success "${LANG_CHECK_PORT}"
    return 0
}

# ── 环境检查 ──────────────────────────────────────────────
check_environment() {
    echo -e "\n${YELLOW}${LANG_CHECK_ENV}${NC}"

    # 检查 Docker
    print_info "${LANG_CHECK_DOCKER}"
    if ! command -v docker &> /dev/null; then
        print_error "${LANG_DOCKER_NOT_INSTALLED}"
        exit 1
    fi
    print_success "Docker $(docker --version | cut -d' ' -f3 | tr -d ',')"

    # 检查 Docker 是否运行
    print_info "${LANG_CHECK_DOCKER_RUNNING}"
    if ! docker info &> /dev/null; then
        print_error "${LANG_DOCKER_NOT_RUNNING}"
        exit 1
    fi
    print_success "${LANG_CHECK_PASS}"

    # 检查 Docker Compose（v2 → v1 降级）
    print_info "${LANG_CHECK_DOCKER_COMPOSE}"
    if docker compose version &> /dev/null; then
        COMPOSE_CMD="docker compose"
        print_success "${LANG_DOCKER_COMPOSE_DETECTED_V2}"
    elif command -v docker-compose &> /dev/null; then
        COMPOSE_CMD="docker-compose"
        print_success "${LANG_DOCKER_COMPOSE_DETECTED_V1}"
    else
        print_error "${LANG_DOCKER_COMPOSE_NOT_INSTALLED}"
        exit 1
    fi

    # 检查端口（默认 8018，可在 .env 中改 SERVER_PORT）
    check_port 8018 || exit 1
}

# ── 安装 iw 工具 ──────────────────────────────────────────
ensure_iw() {
    if command -v iw &> /dev/null; then
        return 0
    fi

    print_info "${LANG_WIFI_INSTALL_IW}"

    # 尝试使用 apt 安装
    if command -v apt &> /dev/null; then
        local sudo_cmd=""
        if [ "$(id -u)" -ne 0 ]; then
            if command -v sudo &> /dev/null; then
                sudo_cmd="sudo"
            else
                print_warn "${LANG_WIFI_INSTALL_IW_FAIL}"
                return 1
            fi
        fi

        if $sudo_cmd apt-get update -qq > /dev/null 2>&1 && \
           $sudo_cmd apt-get install -y -qq iw > /dev/null 2>&1; then
            if command -v iw &> /dev/null; then
                print_success "iw $(iw --version 2>&1 | head -1)"
                return 0
            fi
        fi
    fi

    print_warn "${LANG_WIFI_INSTALL_IW_FAIL}"
    return 1
}

# ── 无线网卡检测 ──────────────────────────────────────────
# 返回值：全局变量 WIRELESS_IFACE_DETECTED
detect_wireless_iface() {
    echo -e "\n${YELLOW}${LANG_WIFI_DETECT}${NC}"

    WIRELESS_IFACE_DETECTED=""

    # 确保 iw 工具可用
    if ! ensure_iw; then
        print_warn "${LANG_WIFI_IW_NOT_FOUND}"
        return 0
    fi

    # 获取所有无线接口
    local interfaces
    interfaces=$(iw dev 2>/dev/null | grep "^[[:space:]]*Interface" | awk '{print $2}')

    if [[ -z "$interfaces" ]]; then
        print_warn "${LANG_WIFI_NOT_FOUND}"
        echo -e "${YELLOW}  ${LANG_WIFI_NOT_FOUND_DESC}${NC}"
        echo -e "${YELLOW}  ${LANG_WIFI_NOT_FOUND_DESC2}${NC}"
        echo -e "${YELLOW}  ${LANG_WIFI_NOT_FOUND_DESC3}${NC}"
        echo -e "${YELLOW}  ${LANG_WIFI_NOT_FOUND_DESC4}${NC}"
        return 0
    fi

    # 遍历每个接口，检查是否支持 AP 模式
    local iw_list_output
    iw_list_output=$(iw list 2>/dev/null)

    for iface in $interfaces; do
        # 提取该接口对应的 phy 段，检查是否支持 AP
        if echo "$iw_list_output" | grep -A 50 "Wiphy" | grep -q "AP"; then
            # 再次确认该接口支持 AP
            if iw list 2>/dev/null | grep -q "\* AP"; then
                WIRELESS_IFACE_DETECTED="$iface"
                print_success "$(printf "${LANG_WIFI_FOUND}" "$iface")"
                echo -e "${GREEN}  ${LANG_WIFI_FOUND_DESC}${NC}"
                return 0
            fi
        fi
    done

    # 找到无线网卡但都不支持 AP
    print_warn "${LANG_WIFI_NOT_FOUND}"
    echo -e "${YELLOW}  ${LANG_WIFI_NOT_FOUND_DESC}${NC}"
    echo -e "${YELLOW}  ${LANG_WIFI_NOT_FOUND_DESC2}${NC}"
    echo -e "${YELLOW}  ${LANG_WIFI_NOT_FOUND_DESC3}${NC}"
    echo -e "${YELLOW}  ${LANG_WIFI_NOT_FOUND_DESC4}${NC}"
}

# ── 密码和密钥生成 ────────────────────────────────────────
generate_password() {
    openssl rand -base64 16 | tr -d '+/=' | head -c 16
}

generate_jwt_secret() {
    openssl rand -base64 32
}

# ── 带重试的镜像拉取（指数退避）───────────────────────────
retry_pull() {
    local image=$1
    local max_retry=${2:-3}
    local retry=0
    local delay=5

    while [ $retry -lt $max_retry ]; do
        retry=$((retry + 1))
        if docker pull "$image"; then
            return 0
        fi
        if [ $retry -lt $max_retry ]; then
            printf "${YELLOW}${LANG_PULL_RETRY}${NC}\n" "$retry" "$max_retry" "$delay"
            sleep "$delay"
            delay=$((delay * 2))
        fi
    done
    return 1
}

# ── 拉取镜像 ──────────────────────────────────────────────
pull_images() {
    echo -e "\n${YELLOW}${LANG_PULL_IMAGES}${NC}"

    print_info "${LANG_PULL_MARIADB}"
    if ! retry_pull "mariadb:11" 3; then
        print_error "$(printf "${LANG_PULL_FAIL}" 3)"
        exit 1
    fi
    print_success "mariadb:11 ${LANG_PULL_SUCCESS}"
}

# ── 生成环境变量 ──────────────────────────────────────────
generate_env() {
    echo -e "\n${YELLOW}${LANG_GEN_CONFIG}${NC}"

    if [[ -f ".env" ]]; then
        print_warn "${LANG_ERROR_ENV_FILE_EXISTS}"
        if [ "$AUTO_YES" = true ]; then
            print_info "${LANG_AUTO_YES_MODE}"
        else
            read -p "${LANG_ERROR_OVERWRITE_PROMPT}" OVERWRITE
            if [[ "$OVERWRITE" != "Y" && "$OVERWRITE" != "y" ]]; then
                print_info "${LANG_ERROR_CANCEL}"
                exit 0
            fi
        fi
    fi

    if [[ ! -f ".env_" ]]; then
        print_error "${LANG_ERROR_ENV_TEMPLATE_NOT_FOUND}"
        exit 1
    fi

    print_info "${LANG_GEN_PASSWORD}"
    MARIADB_ROOT_PASSWORD=$(generate_password)
    MARIADB_PASSWORD=$(generate_password)

    print_info "${LANG_GEN_JWT}"
    JWT_SECRET=$(generate_jwt_secret)

    cat .env_ > .env

    sed -i "s/MARIADB_ROOT_PASSWORD=\"your-root-password\"/MARIADB_ROOT_PASSWORD=\"$MARIADB_ROOT_PASSWORD\"/g" .env
    sed -i "s/MARIADB_PASSWORD=\"your-gis-remote-password\"/MARIADB_PASSWORD=\"$MARIADB_PASSWORD\"/g" .env
    sed -i "s/JWT_SECRET=\"your-super-secret-key-that-is-at-least-32-bytes-long\"/JWT_SECRET=\"$JWT_SECRET\"/g" .env
    sed -i "s/WIRELESS_IFACE=\"\"/WIRELESS_IFACE=\"$WIRELESS_IFACE_DETECTED\"/g" .env

    export MARIADB_ROOT_PASSWORD MARIADB_PASSWORD JWT_SECRET WIRELESS_IFACE_DETECTED
}

# ── 生成手动模式的 .env ───────────────────────────────────
generate_env_manual() {
    echo -e "\n${YELLOW}${LANG_GEN_CONFIG}${NC}"

    echo -e "${YELLOW}${LANG_DB_CONFIG_TITLE}${NC}"
    read -p "${LANG_DB_HOST}" DB_HOST
    read -p "${LANG_DB_PORT}" DB_PORT
    read -p "${LANG_DB_NAME}" DB_NAME
    read -p "${LANG_DB_USER}" DB_USER
    read -p "${LANG_DB_PASSWORD}" DB_PASS

    DB_PORT=${DB_PORT:-3306}
    DB_NAME=${DB_NAME:-apex_db}
    DB_USER=${DB_USER:-apex_remote}
    DATABASE_URL="mysql://${DB_USER}:${DB_PASS}@${DB_HOST}:${DB_PORT}/${DB_NAME}"
    JWT_SECRET=$(generate_jwt_secret)

    cat .env_ > .env

    sed -i "s/^# DATABASE_URL=/DATABASE_URL=\"$DATABASE_URL\"/g" .env
    sed -i "s/MARIADB_ROOT_PASSWORD=\"your-root-password\"/MARIADB_ROOT_PASSWORD=\"$(generate_password)\"/g" .env
    sed -i "s/MARIADB_PASSWORD=\"your-gis-remote-password\"/MARIADB_PASSWORD=\"$DB_PASS\"/g" .env
    sed -i "s/JWT_SECRET=\"your-super-secret-key-that-is-at-least-32-bytes-long\"/JWT_SECRET=\"$JWT_SECRET\"/g" .env
    sed -i "s/WIRELESS_IFACE=\"\"/WIRELESS_IFACE=\"$WIRELESS_IFACE_DETECTED\"/g" .env

    export DB_HOST DB_PORT DB_NAME DB_USER DB_PASS JWT_SECRET WIRELESS_IFACE_DETECTED
}

# ── 数据库验证（手动模式）────────────────────────────────
validate_database() {
    echo -e "\n${YELLOW}${LANG_DB_VALIDATE}${NC}"

    if command -v mysql &> /dev/null; then
        if mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASS" -e "SELECT 1" &> /dev/null; then
            print_success "${LANG_DB_CONNECT_SUCCESS}"
            return 0
        fi
    else
        if docker run --rm -i mariadb:11 mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASS" -e "SELECT 1" &> /dev/null; then
            print_success "${LANG_DB_CONNECT_SUCCESS}"
            return 0
        fi
    fi
    print_error "${LANG_DB_CONNECT_FAIL}"
    return 1
}

# ── SQL 导入（手动模式）──────────────────────────────────
import_sql_scripts() {
    echo -e "\n${YELLOW}${LANG_SQL_IMPORT_TITLE}${NC}"
    echo "  ${LANG_SQL_IMPORT_YES}"
    echo "  ${LANG_SQL_IMPORT_NO}"
    read -p "${LANG_SQL_IMPORT_PROMPT}" IMPORT_CHOICE

    if [[ "$IMPORT_CHOICE" == "Y" || "$IMPORT_CHOICE" == "y" || "$IMPORT_CHOICE" == "" ]]; then
        echo -e "\n${YELLOW}${LANG_SQL_IMPORTING}${NC}"
        SQL_DIR="$SCRIPT_DIR/sql"
        if [[ -d "$SQL_DIR" ]]; then
            for sql_file in "$SQL_DIR"/*.sql; do
                if [[ -f "$sql_file" ]]; then
                    echo "  $(basename "$sql_file")..."
                    mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" < "$sql_file"
                fi
            done
            print_success "${LANG_SQL_IMPORT_SUCCESS}"
        else
            print_warn "SQL directory not found: $SQL_DIR"
            echo -e "${YELLOW}${LANG_SQL_IMPORT_MANUAL}${NC}"
            echo "  mysql -h $DB_HOST -u $DB_USER -p $DB_NAME < sql/*.sql"
        fi
    else
        echo -e "${YELLOW}${LANG_SQL_IMPORT_MANUAL}${NC}"
        echo "  mysql -h $DB_HOST -u $DB_USER -p $DB_NAME < sql/*.sql"
    fi
}

# ── 启动服务 ──────────────────────────────────────────────
start_services() {
    local MODE="$1"

    echo -e "\n${YELLOW}${LANG_START_SERVICE}${NC}"

    # 更新模式：先清理旧容器和网络
    if [ "$UPDATE_MODE" = true ]; then
        print_info "Cleaning up old containers and networks..."
        $COMPOSE_CMD down --remove-orphans
    fi

    # 拉取最新镜像
    print_info "Pulling latest images..."
    $COMPOSE_CMD pull

    if [[ "$MODE" == "auto" ]]; then
        $COMPOSE_CMD up -d --remove-orphans
    else
        $COMPOSE_CMD up -d --remove-orphans fde-mcp-blade
    fi

    # 更新模式：清理旧版本残留镜像
    if [ "$UPDATE_MODE" = true ]; then
        print_info "Cleaning up dangling images..."
        docker image prune -f 2>/dev/null || true
    fi

    echo -e "${YELLOW}${LANG_START_WAIT}${NC}"
    sleep 30
}

# ── 健康检查 ──────────────────────────────────────────────
health_check() {
    echo -e "\n${YELLOW}${LANG_HEALTH_CHECK}${NC}"

    local MAX_WAIT=60
    local WAIT_COUNT=0
    local PORT=$(server_port)

    while [ $WAIT_COUNT -lt $MAX_WAIT ]; do
        if curl -s -o /dev/null -w "%{http_code}" "http://localhost:${PORT}/health" | grep -q "200"; then
            print_success "${LANG_HEALTH_SUCCESS}"
            return 0
        fi
        sleep 2
        WAIT_COUNT=$((WAIT_COUNT + 2))
    done

    print_error "${LANG_HEALTH_TIMEOUT}"
    $COMPOSE_CMD logs fde-mcp-blade
    return 1
}

# ── 部署结果展示 ──────────────────────────────────────────
show_install_complete() {
    local MODE="$1"
    local SERVER_IP=$(hostname -I 2>/dev/null | awk '{print $1}' || echo "localhost")

    echo -e "\n${GREEN}${LANG_LINE}${NC}"
    echo -e "${GREEN}  ${LANG_INSTALL_COMPLETE}${NC}"
    echo -e "${GREEN}${LANG_LINE}${NC}"
    echo ""

    if [[ "$MODE" == "auto" ]]; then
        echo -e "${YELLOW}${LANG_TIP_BACKUP}${NC}"
        echo ""
        echo -e "${BLUE}${LANG_DB_CONFIG_INFO}${NC}"
        echo -e "  ${LANG_DB_NAME_LABEL}: apex_db"
        echo -e "  ${LANG_DB_ROOT_USER}: root"
        echo -e "  ${LANG_DB_ROOT_PASSWORD}: ${MARIADB_ROOT_PASSWORD}"
        echo -e "  ${LANG_DB_APP_USER}: apex_remote"
        echo -e "  ${LANG_DB_APP_PASSWORD}: ${MARIADB_PASSWORD}"
        echo ""
    fi

    echo -e "${BLUE}${LANG_JWT_CONFIG_INFO}${NC}"
    echo -e "  ${LANG_JWT_SECRET_LABEL}: ${JWT_SECRET}"
    echo -e "  ${LANG_JWT_ISSUER_LABEL}: ${JWT_ISSUER:-fde-mcp-blade}"
    echo ""

    echo -e "${BLUE}${LANG_DEFAULT_ACCOUNT}${NC}"
    echo -e "  ${LANG_DEFAULT_USERNAME}: admin"
    echo -e "  ${LANG_DEFAULT_PASSWORD}: admin123 ${LANG_CHANGE_PASSWORD}"
    echo ""

    echo -e "${LANG_CONFIG_SAVED}"
    echo -e "${LANG_CONFIG_MODIFY_TIP}"
    echo ""
    echo -e "${LANG_ACCESS_URL}: ${GREEN}http://${SERVER_IP}:$(server_port)${NC}"
    echo ""

    echo -e "${CYAN}${LANG_NEXT_STEPS}${NC}"
    echo -e "  1. ${LANG_NEXT_STEP1}"
    echo -e "  2. ${LANG_NEXT_STEP2}"
    echo -e "  3. ${LANG_NEXT_STEP3}"
    echo -e "  4. ${LANG_NEXT_STEP4}"
    echo ""

    echo -e "${CYAN}${LANG_COMMON_COMMANDS}${NC}"
    echo -e "  ${LANG_CMD_STATUS}:  ${BLUE}$COMPOSE_CMD ps${NC}"
    echo -e "  ${LANG_CMD_LOGS}:    ${BLUE}$COMPOSE_CMD logs -f${NC}"
    echo -e "  ${LANG_CMD_STOP}:     ${BLUE}$COMPOSE_CMD down${NC}"
    echo -e "  ${LANG_CMD_RESTART}: ${BLUE}$COMPOSE_CMD restart${NC}"
    echo -e "  ${LANG_CMD_UPDATE}:   ${BLUE}$0 -u${NC}"
    echo ""
    echo -e "${GREEN}${LANG_LINE}${NC}"
}

# ── 部署模式菜单 ──────────────────────────────────────────
show_mode_menu() {
    echo -e "\n${BLUE}${LANG_LINE}${NC}"
    echo -e "${YELLOW}${LANG_MODE_TITLE}${NC}"
    echo -e "${BLUE}${LANG_LINE}${NC}"
    echo ""
    echo "  [1] ${LANG_MODE_AUTO}"
    echo "      ${LANG_MODE_AUTO_DESC}"
    echo "      ${LANG_MODE_AUTO_DESC2}"
    echo "      ${LANG_MODE_AUTO_DESC3}"
    echo "      ${LANG_MODE_AUTO_DESC4}"
    echo ""
    echo "  [2] ${LANG_MODE_MANUAL}"
    echo "      ${LANG_MODE_MANUAL_DESC}"
    echo "      ${LANG_MODE_MANUAL_DESC2}"
    echo "      ${LANG_MODE_MANUAL_DESC3}"
    echo ""
    echo "  [3] ${LANG_MODE_EXIT}"
    echo ""
    read -p "${LANG_PROMPT_CHOICE}" MODE_CHOICE

    case "$MODE_CHOICE" in
        1) deploy_auto ;;
        2) deploy_manual ;;
        3) echo -e "${RED}${LANG_ERROR_CANCEL}${NC}"; exit 0 ;;
        *) print_error "${LANG_ERROR_INVALID_CHOICE}"; show_mode_menu ;;
    esac
}

# ── 自动部署 ──────────────────────────────────────────────
deploy_auto() {
    print_info "${LANG_TIP_AUTO_MODE}"

    check_environment
    # 【对外发布版】无线网卡(AP 模式)检测已去掉：容器镜像内 host-management 功能已禁用，此处不再调用
    # detect_wireless_iface
    generate_env
    pull_images
    start_services "auto"

    if health_check; then
        show_install_complete "auto"
    else
        print_error "${LANG_START_FAIL}"
        exit 1
    fi
}

# ── 手动部署 ──────────────────────────────────────────────
deploy_manual() {
    print_info "${LANG_TIP_MANUAL_MODE}"

    check_environment
    # 【对外发布版】同上：不再调用 detect_wireless_iface
    generate_env_manual

    if ! validate_database; then
        print_error "${LANG_ERROR_CANCEL}"
        exit 1
    fi

    import_sql_scripts
    start_services "manual"

    if health_check; then
        show_install_complete "manual"
    else
        print_error "${LANG_START_FAIL}"
        exit 1
    fi
}

# ── 更新模式 ──────────────────────────────────────────────
deploy_update() {
    print_info "${LANG_UPDATE_MODE}"

    check_environment

    if [ "$AUTO_YES" = false ]; then
        read -p "Continue update? (y/N): " CONFIRM
        if [[ "$CONFIRM" != "y" && "$CONFIRM" != "Y" ]]; then
            print_error "${LANG_ERROR_CANCEL}"
            exit 0
        fi
    fi

    pull_images
    start_services "auto"

    if health_check; then
        echo -e "${GREEN}${LANG_START_SUCCESS}${NC}"
    else
        print_error "${LANG_START_FAIL}"
        exit 1
    fi
}

# ── 主程序入口 ────────────────────────────────────────────
main() {
    # 解析 CLI 参数
    while [[ $# -gt 0 ]]; do
        case $1 in
            -d|--dir)
                cd "$2" || exit 1
                shift 2
                ;;
            -y|--yes)
                AUTO_YES=true
                shift
                ;;
            -u|--update)
                UPDATE_MODE=true
                shift
                ;;
            -h|--help)
                LANG_CHOICE="en"
                load_language
                show_help
                ;;
            *)
                print_error "Unknown argument: $1"
                exit 1
                ;;
        esac
    done

    # 默认语言为英文
    LANG_CHOICE="en"
    load_language

    # 显示欢迎信息
    echo -e "${BLUE}${LANG_LINE}${NC}"
    echo -e "${BLUE}  ${LANG_TITLE}${NC}"
    echo -e "${BLUE}${LANG_LINE}${NC}"
    echo -e "${GREEN}  ${LANG_WELCOME}${NC}"
    echo ""

    # 更新模式：跳过语言和模式选择
    if [ "$UPDATE_MODE" = true ]; then
        deploy_update
        exit 0
    fi

    # 语言选择 → 部署模式选择
    show_language_menu
    show_mode_menu
}

main "$@"
