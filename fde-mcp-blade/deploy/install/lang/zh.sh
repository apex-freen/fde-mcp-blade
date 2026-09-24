#!/bin/bash
# 中文语言包

# 标题和欢迎信息
LANG_TITLE="FDE MCP Blade 安装程序"
LANG_WELCOME="欢迎使用 FDE MCP Blade 安装程序！"
LANG_LINE="=========================================="

# 语言选择
LANG_SELECT_TITLE="请选择安装语言 / Select language:"
LANG_CHINESE="中文 (Chinese)"
LANG_ENGLISH="英文 (English)"
LANG_PROMPT_CHOICE="请输入选择 / Enter choice: "

# 部署模式选择
LANG_MODE_TITLE="请选择部署模式:"
LANG_MODE_AUTO="自动部署模式（推荐）"
LANG_MODE_AUTO_DESC="- 自动启动内置数据库"
LANG_MODE_AUTO_DESC2="- 自动生成密码和密钥"
LANG_MODE_AUTO_DESC3="- 自动导入初始数据"
LANG_MODE_AUTO_DESC4="- 一键完成安装"
LANG_MODE_MANUAL="手动部署模式"
LANG_MODE_MANUAL_DESC="- 使用用户已有数据库"
LANG_MODE_MANUAL_DESC2="- 用户自行配置数据库连接"
LANG_MODE_MANUAL_DESC3="- 需要手动导入数据"
LANG_MODE_EXIT="退出"

# 更新模式
LANG_UPDATE_MODE="更新模式：跳过文件生成，拉取最新镜像并重启"
LANG_AUTO_YES_MODE="自动确认模式已启用"

# 环境检查
LANG_CHECK_ENV="正在检查环境..."
LANG_CHECK_DOCKER="检查 Docker..."
LANG_CHECK_DOCKER_RUNNING="检查 Docker 守护进程是否运行..."
LANG_CHECK_DOCKER_COMPOSE="检查 Docker Compose..."
LANG_CHECK_PORT="检查端口 {port}..."
LANG_CHECK_PASS="✓ 通过"
LANG_CHECK_FAIL="✗ 失败"
LANG_DOCKER_NOT_INSTALLED="Docker 未安装，请先安装 Docker"
LANG_DOCKER_NOT_RUNNING="Docker 守护进程未运行"
LANG_DOCKER_COMPOSE_NOT_INSTALLED="Docker Compose 未安装，请先安装"
LANG_DOCKER_COMPOSE_DETECTED_V1="检测到 docker-compose (v1)"
LANG_DOCKER_COMPOSE_DETECTED_V2="检测到 docker compose (v2)"
LANG_PORT_OCCUPIED="端口 {port} 已被占用（可在 .env 中改 SERVER_PORT）"
LANG_PORT_CHECK_TOOL_NONE="无法检查端口（未找到 ss/netstat/lsof），请手动确认"

# 镜像拉取
LANG_PULL_IMAGES="正在拉取 Docker 镜像..."
LANG_PULL_MARIADB="正在拉取 MariaDB 镜像..."
LANG_PULL_RETRY="拉取失败，第 %d/%d 次重试（%ds 后）..."
LANG_PULL_SUCCESS="镜像拉取成功"
LANG_PULL_FAIL="镜像拉取失败（已重试 %d 次）"

# 无线网卡检测
LANG_WIFI_DETECT="正在检测无线网卡..."
LANG_WIFI_INSTALL_IW="正在安装 iw 工具..."
LANG_WIFI_INSTALL_IW_FAIL="iw 工具安装失败，请手动安装：sudo apt install -y iw"
LANG_WIFI_IW_NOT_FOUND="未找到 iw 命令，跳过无线网卡检测"
LANG_WIFI_FOUND="检测到支持 AP 模式的无线网卡：%s"
LANG_WIFI_FOUND_DESC="已自动配置，如需修改请编辑 .env 文件中的 WIRELESS_IFACE"
LANG_WIFI_NOT_FOUND="未检测到支持 AP 模式的无线网卡"
LANG_WIFI_NOT_FOUND_DESC="无线配置功能将被禁用"
LANG_WIFI_NOT_FOUND_DESC2="如需使用，请插入支持 AP 模式的 USB 无线网卡，"
LANG_WIFI_NOT_FOUND_DESC3="然后在 .env 文件中设置 WIRELESS_IFACE=网卡名，"
LANG_WIFI_NOT_FOUND_DESC4="重启服务即可生效"

# 配置生成
LANG_GEN_CONFIG="正在生成配置文件..."
LANG_GEN_PASSWORD="正在生成随机密码..."
LANG_GEN_JWT="正在生成 JWT 密钥..."

# 数据库配置（手动模式）
LANG_DB_CONFIG_TITLE="请输入数据库配置:"
LANG_DB_HOST="请输入数据库地址: "
LANG_DB_PORT="请输入数据库端口 [3306]: "
LANG_DB_NAME="请输入数据库名 [apex_db]: "
LANG_DB_USER="请输入用户名 [apex_remote]: "
LANG_DB_PASSWORD="请输入密码: "

# 数据库验证
LANG_DB_VALIDATE="正在验证数据库连接..."
LANG_DB_CONNECT_SUCCESS="✓ 数据库连接成功"
LANG_DB_CONNECT_FAIL="✗ 数据库连接失败，请检查配置"

# SQL 导入（手动模式）
LANG_SQL_IMPORT_TITLE="是否自动导入 SQL 脚本？"
LANG_SQL_IMPORT_YES="是 (Y)"
LANG_SQL_IMPORT_NO="否 (N)"
LANG_SQL_IMPORT_PROMPT="请输入选择 [Y/n]: "
LANG_SQL_IMPORTING="正在导入 SQL 脚本..."
LANG_SQL_IMPORT_SUCCESS="✓ SQL 脚本导入成功"
LANG_SQL_IMPORT_MANUAL="请手动导入 SQL 脚本："

# 服务启动
LANG_START_SERVICE="正在启动服务..."
LANG_START_WAIT="等待服务启动..."
LANG_START_SUCCESS="✓ 服务启动成功"
LANG_START_FAIL="✗ 服务启动失败"

# 健康检查
LANG_HEALTH_CHECK="正在进行健康检查..."
LANG_HEALTH_SUCCESS="✓ 健康检查通过"
LANG_HEALTH_FAIL="✗ 健康检查失败"
LANG_HEALTH_TIMEOUT="健康检查超时，请查看日志"

# 安装完成
LANG_INSTALL_COMPLETE="安装完成！"
LANG_DB_CONFIG_INFO="【数据库配置】"
LANG_DB_ROOT_USER="根用户名"
LANG_DB_ROOT_PASSWORD="根密码"
LANG_DB_APP_USER="应用用户名"
LANG_DB_APP_PASSWORD="应用密码"
LANG_DB_NAME_LABEL="数据库名"
LANG_JWT_CONFIG_INFO="【JWT 配置】"
LANG_JWT_SECRET_LABEL="JWT_SECRET"
LANG_JWT_ISSUER_LABEL="JWT_ISSUER"
LANG_DEFAULT_ACCOUNT="【默认账号】"
LANG_DEFAULT_USERNAME="用户名"
LANG_DEFAULT_PASSWORD="密码"
LANG_CHANGE_PASSWORD="（首次登录请修改）"
LANG_CONFIG_SAVED="所有配置已保存到 .env 文件"
LANG_CONFIG_MODIFY_TIP="如需修改，请编辑 .env 文件后重新启动服务"
LANG_ACCESS_URL="访问地址"

# 安装后步骤指引
LANG_NEXT_STEPS="【后续步骤】"
LANG_NEXT_STEP1="在浏览器中打开上方「访问地址」"
LANG_NEXT_STEP2="使用 admin / admin123 登录"
LANG_NEXT_STEP3="进入设置页面修改默认密码"
LANG_NEXT_STEP4="在管理后台配置 MCP 云服务器"

# 常用命令
LANG_COMMON_COMMANDS="【常用命令】"
LANG_CMD_STATUS="查看状态"
LANG_CMD_LOGS="查看日志"
LANG_CMD_STOP="停止服务"
LANG_CMD_RESTART="重启服务"
LANG_CMD_UPDATE="更新到最新版本"

# 错误信息
LANG_ERROR_ENV_FILE_EXISTS=".env 文件已存在"
LANG_ERROR_OVERWRITE_PROMPT="是否覆盖？[Y/n]: "
LANG_ERROR_CANCEL="安装取消"
LANG_ERROR_UNKNOWN="未知错误"
LANG_ERROR_ENV_TEMPLATE_NOT_FOUND=".env_ 模板文件不存在"
LANG_ERROR_INVALID_CHOICE="无效选择"

# 提示信息
LANG_TIP_BACKUP="请妥善保存以下敏感配置："
LANG_TIP_AUTO_MODE="自动部署模式将使用内置 MariaDB 数据库"
LANG_TIP_MANUAL_MODE="手动部署模式需要您提供数据库连接信息"

# 帮助文本
LANG_HELP_USAGE="用法: $0 [-d <部署目录>] [-y] [-u] [-h]"
LANG_HELP_OPTIONS="选项:"
LANG_HELP_D="  -d, --dir     部署目录（默认: 当前目录）"
LANG_HELP_Y="  -y, --yes     自动确认所有提示（非交互模式）"
LANG_HELP_U="  -u, --update  更新模式（跳过配置生成，拉取镜像并重启）"
LANG_HELP_H="  -h, --help    显示此帮助信息"
LANG_HELP_DESIGN="设计原则:"
LANG_HELP_DESIGN1="  - 最少环境变量，自动生成密码和密钥"
LANG_HELP_DESIGN2="  - MCP 云配置存储在数据库中，可通过 Web UI 配置"
LANG_HELP_DESIGN3="  - 支持中文/英文界面"
LANG_HELP_EXAMPLES="示例:"
LANG_HELP_EXAMPLE1="  $0              # 交互式安装"
LANG_HELP_EXAMPLE2="  $0 -y           # 非交互自动安装"
LANG_HELP_EXAMPLE3="  $0 -u           # 更新已有部署"
LANG_HELP_EXAMPLE4="  $0 -d /opt/gis -y  # 安装到指定目录"
