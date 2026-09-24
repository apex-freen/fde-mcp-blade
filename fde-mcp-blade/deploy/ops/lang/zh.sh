#!/bin/bash
# 中文语言包 - 运维工具

LANG_TITLE="FDE MCP Blade - 运维工具"
LANG_LINE="=========================================="

# 语言选择
LANG_SELECT_TITLE="请选择语言 / Select language:"
LANG_CHINESE="中文 (Chinese)"
LANG_ENGLISH="英文 (English)"
LANG_PROMPT_CHOICE="请输入选择: "

# 主菜单
LANG_MENU_TITLE="请选择操作:"
LANG_MENU_INIT="首次初始化（随机密码替换默认密码）"
LANG_MENU_CHANGE_DB="修改数据库密码"
LANG_MENU_CHANGE_JWT="修改 JWT 密钥"
LANG_MENU_STATUS="查看配置状态"
LANG_MENU_EXIT="退出"

# init 流程
LANG_INIT_TITLE="首次初始化"
LANG_INIT_CREATING_ENV="创建 .env 文件..."
LANG_INIT_ALREADY_DONE="密码已经不是默认值，无需重复初始化。"
LANG_INIT_USE_OTHER="如需改密，请选择「修改数据库密码」"
LANG_INIT_GENERATING="正在生成新密码..."
LANG_INIT_UPDATING_DB="正在修改数据库密码..."
LANG_INIT_DB_NOT_RUNNING="MariaDB 容器未运行，请先执行: docker compose up -d"
LANG_INIT_DB_CONN_FAIL="无法用默认密码连接 MariaDB（可能已被修改过）"
LANG_INIT_DB_UPDATED="数据库密码已更新"
LANG_INIT_WRITING_ENV="正在写入 .env 文件..."
LANG_INIT_RESTARTING="正在重启服务..."
LANG_INIT_DONE="初始化完成！"
LANG_INIT_CREDENTIALS="新凭据（请妥善保存）:"
LANG_INIT_BACKUP_WARN="密码已保存到 .env，请备份此文件！"

# change-db-pwd 流程
LANG_CHDB_TITLE="修改数据库密码"
LANG_CHDB_NO_ENV=".env 不存在，请先初始化"
LANG_CHDB_REDIRECT_INIT="检测到仍在使用默认密码，将初始化..."
LANG_CHDB_DB_NOT_RUNNING="MariaDB 容器未运行，请先执行: docker compose up -d"
LANG_CHDB_VERIFYING="正在验证当前密码..."
LANG_CHDB_VERIFY_OK="当前密码验证通过"
LANG_CHDB_VERIFY_FAIL="无法用当前密码连接 MariaDB"
LANG_CHDB_VERIFY_FAIL_HINT="请检查 .env 中的 MARIADB_ROOT_PASSWORD 是否正确"
LANG_CHDB_GENERATING="正在生成新密码并更新数据库..."
LANG_CHDB_UPDATED="数据库密码已更新"
LANG_CHDB_WRITING="写入 .env 并重启服务..."
LANG_CHDB_DONE="密码修改完成！"
LANG_CHDB_NEW_CREDENTIALS="新密码:"

# change-jwt 流程
LANG_JWT_TITLE="修改 JWT 密钥"
LANG_JWT_GENERATING="正在生成新 JWT 密钥..."
LANG_JWT_RESTARTING="写入 .env 并重启应用..."
LANG_JWT_DONE="JWT 密钥已更新！"
LANG_JWT_WARN="警告: 所有已签发的 token 立即失效，用户需重新登录！"

# status
LANG_STATUS_TITLE="配置状态"
LANG_STATUS_NO_ENV=".env 不存在（将使用 docker-compose.yml 中的默认密码）"
LANG_STATUS_UNINIT="未初始化（仍在使用默认密码）"
LANG_STATUS_INIT_HINT="请选择「首次初始化」"
LANG_STATUS_INITED="已初始化"
LANG_STATUS_CONFIG="当前配置（密码脱敏）:"
LANG_STATUS_DB_TEST="数据库连接测试"
LANG_STATUS_DB_OK="连接正常"
LANG_STATUS_DB_FAIL="连接失败"
LANG_STATUS_DB_NOT_RUNNING="容器未运行"

# 通用提示
LANG_EMPTY="(空)"
LANG_DEFAULT="(默认"
LANG_PRESS_ENTER="按回车键继续..."
LANG_DETECT_COMPOSE="检测 Docker Compose..."
LANG_COMPOSE_NOT_FOUND="未检测到 docker compose"
LANG_GOODBYE="再见！"
