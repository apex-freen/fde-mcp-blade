#!/bin/bash
# English language pack - Ops tool

LANG_TITLE="FDE MCP Blade - Ops Tool"
LANG_LINE="=========================================="

# Language selection
LANG_SELECT_TITLE="Select language / 请选择语言:"
LANG_CHINESE="中文 (Chinese)"
LANG_ENGLISH="English"
LANG_PROMPT_CHOICE="Enter choice: "

# Main menu
LANG_MENU_TITLE="Select operation:"
LANG_MENU_INIT="First Init (replace default password with random one)"
LANG_MENU_CHANGE_DB="Change Database Password"
LANG_MENU_CHANGE_JWT="Change JWT Secret"
LANG_MENU_STATUS="View Status"
LANG_MENU_EXIT="Exit"

# init flow
LANG_INIT_TITLE="First Init"
LANG_INIT_CREATING_ENV="Creating .env file..."
LANG_INIT_ALREADY_DONE="Password is no longer the default. No need to re-init."
LANG_INIT_USE_OTHER="To change password, select 'Change Database Password'"
LANG_INIT_GENERATING="Generating new passwords..."
LANG_INIT_UPDATING_DB="Updating database passwords..."
LANG_INIT_DB_NOT_RUNNING="MariaDB container is not running. Please run: docker compose up -d"
LANG_INIT_DB_CONN_FAIL="Cannot connect to MariaDB with default password (may have been changed)"
LANG_INIT_DB_UPDATED="Database password updated"
LANG_INIT_WRITING_ENV="Writing .env file..."
LANG_INIT_RESTARTING="Restarting services..."
LANG_INIT_DONE="Init complete!"
LANG_INIT_CREDENTIALS="New credentials (please save securely):"
LANG_INIT_BACKUP_WARN="Passwords saved to .env. Please backup this file!"

# change-db-pwd flow
LANG_CHDB_TITLE="Change Database Password"
LANG_CHDB_NO_ENV=".env not found. Please run init first."
LANG_CHDB_REDIRECT_INIT="Default password detected. Redirecting to init..."
LANG_CHDB_DB_NOT_RUNNING="MariaDB container is not running. Please run: docker compose up -d"
LANG_CHDB_VERIFYING="Verifying current password..."
LANG_CHDB_VERIFY_OK="Current password verified"
LANG_CHDB_VERIFY_FAIL="Cannot connect to MariaDB with current password"
LANG_CHDB_VERIFY_FAIL_HINT="Check MARIADB_ROOT_PASSWORD in .env"
LANG_CHDB_GENERATING="Generating new passwords and updating database..."
LANG_CHDB_UPDATED="Database password updated"
LANG_CHDB_WRITING="Writing .env and restarting services..."
LANG_CHDB_DONE="Password change complete!"
LANG_CHDB_NEW_CREDENTIALS="New passwords:"

# change-jwt flow
LANG_JWT_TITLE="Change JWT Secret"
LANG_JWT_GENERATING="Generating new JWT secret..."
LANG_JWT_RESTARTING="Writing .env and restarting app..."
LANG_JWT_DONE="JWT secret updated!"
LANG_JWT_WARN="WARNING: All issued tokens are now invalid. Users must re-login!"

# status
LANG_STATUS_TITLE="Configuration Status"
LANG_STATUS_NO_ENV=".env not found (using default password from docker-compose.yml)"
LANG_STATUS_UNINIT="Not initialized (still using default password)"
LANG_STATUS_INIT_HINT="Select 'First Init' to fix"
LANG_STATUS_INITED="Initialized"
LANG_STATUS_CONFIG="Current config (password masked):"
LANG_STATUS_DB_TEST="Database connection test"
LANG_STATUS_DB_OK="Connected"
LANG_STATUS_DB_FAIL="Connection failed"
LANG_STATUS_DB_NOT_RUNNING="Container not running"

# Common
LANG_EMPTY="(empty)"
LANG_DEFAULT="(default"
LANG_PRESS_ENTER="Press Enter to continue..."
LANG_DETECT_COMPOSE="Detecting Docker Compose..."
LANG_COMPOSE_NOT_FOUND="Docker Compose not found"
LANG_GOODBYE="Goodbye!"
