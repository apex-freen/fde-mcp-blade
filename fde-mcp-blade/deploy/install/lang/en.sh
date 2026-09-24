#!/bin/bash
# English language pack

# Title and welcome messages
LANG_TITLE="FDE MCP Blade Installer"
LANG_WELCOME="Welcome to FDE MCP Blade Installer!"
LANG_LINE="=========================================="

# Language selection
LANG_SELECT_TITLE="Please select installation language:"
LANG_CHINESE="\u4e2d\u6587 (Chinese)"
LANG_ENGLISH="English"
LANG_PROMPT_CHOICE="Enter choice: "

# Deployment mode selection
LANG_MODE_TITLE="Please select deployment mode:"
LANG_MODE_AUTO="Auto Deployment Mode (Recommended)"
LANG_MODE_AUTO_DESC="- Auto start built-in database"
LANG_MODE_AUTO_DESC2="- Auto generate passwords and keys"
LANG_MODE_AUTO_DESC3="- Auto import initial data"
LANG_MODE_AUTO_DESC4="- One-click installation"
LANG_MODE_MANUAL="Manual Deployment Mode"
LANG_MODE_MANUAL_DESC="- Use existing database"
LANG_MODE_MANUAL_DESC2="- Configure database connection manually"
LANG_MODE_MANUAL_DESC3="- Need to import data manually"
LANG_MODE_EXIT="Exit"

# Update mode
LANG_UPDATE_MODE="Update Mode: skipping file generation, pulling latest images and restarting"
LANG_AUTO_YES_MODE="Auto-confirm mode enabled"

# Environment checks
LANG_CHECK_ENV="Checking environment..."
LANG_CHECK_DOCKER="Checking Docker..."
LANG_CHECK_DOCKER_RUNNING="Checking if Docker daemon is running..."
LANG_CHECK_DOCKER_COMPOSE="Checking Docker Compose..."
LANG_CHECK_PORT="Checking port {port}..."
LANG_CHECK_PASS="\u2713 Passed"
LANG_CHECK_FAIL="\u2717 Failed"
LANG_DOCKER_NOT_INSTALLED="Docker is not installed, please install Docker first"
LANG_DOCKER_NOT_RUNNING="Docker daemon is not running"
LANG_DOCKER_COMPOSE_NOT_INSTALLED="Docker Compose is not installed, please install first"
LANG_DOCKER_COMPOSE_DETECTED_V1="Detected docker-compose (v1)"
LANG_DOCKER_COMPOSE_DETECTED_V2="Detected docker compose (v2)"
LANG_PORT_OCCUPIED="Port {port} is already occupied (change SERVER_PORT in .env)"
LANG_PORT_CHECK_TOOL_NONE="Cannot check port (ss/netstat/lsof not found), please verify manually"

# Image pulling
LANG_PULL_IMAGES="Pulling Docker images..."
LANG_PULL_MARIADB="Pulling MariaDB image..."
LANG_PULL_RETRY="Pull failed, retry %d/%d (%ds delay)..."
LANG_PULL_SUCCESS="Image pull successful"
LANG_PULL_FAIL="Image pull failed (retried %d times)"

# Wireless detection
LANG_WIFI_DETECT="Detecting wireless interfaces..."
LANG_WIFI_INSTALL_IW="Installing iw tool..."
LANG_WIFI_INSTALL_IW_FAIL="Failed to install iw, please install manually: sudo apt install -y iw"
LANG_WIFI_IW_NOT_FOUND="iw command not found, skipping wireless detection"
LANG_WIFI_FOUND="Wireless interface with AP mode support found: %s"
LANG_WIFI_FOUND_DESC="Auto-configured. To change, edit WIRELESS_IFACE in .env file"
LANG_WIFI_NOT_FOUND="No wireless interface with AP mode support detected"
LANG_WIFI_NOT_FOUND_DESC="Wireless configuration features will be disabled"
LANG_WIFI_NOT_FOUND_DESC2="To enable, plug in a USB wireless adapter that supports AP mode,"
LANG_WIFI_NOT_FOUND_DESC3="then set WIRELESS_IFACE=<iface_name> in .env file,"
LANG_WIFI_NOT_FOUND_DESC4="and restart the service"

# Configuration generation
LANG_GEN_CONFIG="Generating configuration files..."
LANG_GEN_PASSWORD="Generating random passwords..."
LANG_GEN_JWT="Generating JWT secret..."

# Database configuration (manual mode)
LANG_DB_CONFIG_TITLE="Please enter database configuration:"
LANG_DB_HOST="Enter database host: "
LANG_DB_PORT="Enter database port [3306]: "
LANG_DB_NAME="Enter database name [apex_db]: "
LANG_DB_USER="Enter username [apex_remote]: "
LANG_DB_PASSWORD="Enter password: "

# Database validation
LANG_DB_VALIDATE="Validating database connection..."
LANG_DB_CONNECT_SUCCESS="\u2713 Database connection successful"
LANG_DB_CONNECT_FAIL="\u2717 Database connection failed, please check configuration"

# SQL import (manual mode)
LANG_SQL_IMPORT_TITLE="Auto import SQL scripts?"
LANG_SQL_IMPORT_YES="Yes (Y)"
LANG_SQL_IMPORT_NO="No (N)"
LANG_SQL_IMPORT_PROMPT="Enter choice [Y/n]: "
LANG_SQL_IMPORTING="Importing SQL scripts..."
LANG_SQL_IMPORT_SUCCESS="\u2713 SQL scripts imported successfully"
LANG_SQL_IMPORT_MANUAL="Please import SQL scripts manually:"

# Service start
LANG_START_SERVICE="Starting services..."
LANG_START_WAIT="Waiting for services to start..."
LANG_START_SUCCESS="\u2713 Services started successfully"
LANG_START_FAIL="\u2717 Failed to start services"

# Health check
LANG_HEALTH_CHECK="Performing health check..."
LANG_HEALTH_SUCCESS="\u2713 Health check passed"
LANG_HEALTH_FAIL="\u2717 Health check failed"
LANG_HEALTH_TIMEOUT="Health check timed out, please check logs"

# Installation complete
LANG_INSTALL_COMPLETE="Installation completed!"
LANG_DB_CONFIG_INFO="[Database Configuration]"
LANG_DB_ROOT_USER="Root Username"
LANG_DB_ROOT_PASSWORD="Root Password"
LANG_DB_APP_USER="Application Username"
LANG_DB_APP_PASSWORD="Application Password"
LANG_DB_NAME_LABEL="Database Name"
LANG_JWT_CONFIG_INFO="[JWT Configuration]"
LANG_JWT_SECRET_LABEL="JWT_SECRET"
LANG_JWT_ISSUER_LABEL="JWT_ISSUER"
LANG_DEFAULT_ACCOUNT="[Default Account]"
LANG_DEFAULT_USERNAME="Username"
LANG_DEFAULT_PASSWORD="Password"
LANG_CHANGE_PASSWORD="(Please change after first login)"
LANG_CONFIG_SAVED="All configurations saved to .env file"
LANG_CONFIG_MODIFY_TIP="To modify, edit .env file and restart services"
LANG_ACCESS_URL="Access URL"

# Post-install next steps
LANG_NEXT_STEPS="[Next Steps]"
LANG_NEXT_STEP1="Open the \"Access URL\" shown above in your browser"
LANG_NEXT_STEP2="Login with admin / admin123"
LANG_NEXT_STEP3="Go to Settings to change the default password"
LANG_NEXT_STEP4="Configure MCP cloud server in the admin panel"

# Common commands
LANG_COMMON_COMMANDS="[Common Commands]"
LANG_CMD_STATUS="View status"
LANG_CMD_LOGS="View logs"
LANG_CMD_STOP="Stop services"
LANG_CMD_RESTART="Restart services"
LANG_CMD_UPDATE="Update to latest version"

# Error messages
LANG_ERROR_ENV_FILE_EXISTS=".env file already exists"
LANG_ERROR_OVERWRITE_PROMPT="Overwrite? [Y/n]: "
LANG_ERROR_CANCEL="Installation cancelled"
LANG_ERROR_UNKNOWN="Unknown error"
LANG_ERROR_ENV_TEMPLATE_NOT_FOUND=".env_ template file not found"
LANG_ERROR_INVALID_CHOICE="Invalid choice"

# Tips
LANG_TIP_BACKUP="Please save the following sensitive configurations:"
LANG_TIP_AUTO_MODE="Auto deployment mode will use built-in MariaDB database"
LANG_TIP_MANUAL_MODE="Manual deployment mode requires you to provide database connection information"

# Help text
LANG_HELP_USAGE="Usage: $0 [-d <deploy_dir>] [-y] [-u] [-h]"
LANG_HELP_OPTIONS="Options:"
LANG_HELP_D="  -d, --dir     Deployment directory (default: current directory)"
LANG_HELP_Y="  -y, --yes     Auto-confirm all prompts (non-interactive mode)"
LANG_HELP_U="  -u, --update  Update mode (skip config generation, pull images and restart)"
LANG_HELP_H="  -h, --help    Show this help message"
LANG_HELP_DESIGN="Design principles:"
LANG_HELP_DESIGN1="  - Minimal environment variables, auto-generate passwords and keys"
LANG_HELP_DESIGN2="  - MCP cloud configuration is stored in database, configurable via Web UI"
LANG_HELP_DESIGN3="  - Supports Chinese/English interface"
LANG_HELP_EXAMPLES="Examples:"
LANG_HELP_EXAMPLE1="  $0              # Interactive installation"
LANG_HELP_EXAMPLE2="  $0 -y           # Non-interactive auto installation"
LANG_HELP_EXAMPLE3="  $0 -u           # Update existing deployment"
LANG_HELP_EXAMPLE4="  $0 -d /opt/gis -y  # Install to specific directory"
