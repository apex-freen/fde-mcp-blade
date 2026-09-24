<#
FDE MCP Blade - Windows installer (Docker Desktop)

Covers the same ground as `install.sh` auto mode, for a local Windows trial:
  1. checks Docker Desktop / docker compose / port
  2. builds .env from .env_ (random DB passwords + JWT secret)
  3. detects this machine's LAN address and confirms it -> HOST_HOSTNAME
  4. picks the image source (China ACR / Global Docker Hub) -> COMPOSE_FILE + PIP_INDEX_URL
  5. docker compose pull + up -d, then health check

Usage:
  powershell -ExecutionPolicy Bypass -File .\install.ps1
  powershell -ExecutionPolicy Bypass -File .\install.ps1 -ImageSource global -Yes
  powershell -ExecutionPolicy Bypass -File .\install.ps1 -HostAddress 192.168.1.50

Notes:
  - Output is English on purpose: Windows PowerShell 5.1 reads BOM-less files as ANSI,
    so Chinese literals would be garbled.
  - Built-in-database auto mode only. To use an existing external database, edit .env
    (set DATABASE_URL) and run `docker compose up -d fde-mcp-blade` yourself.
  - No manual/external-database mode, no language menu, no update mode (-u) here.
  - If .env already exists, declining the overwrite keeps the existing file and the script
    continues (that is the path to take after editing SERVER_PORT / HOST_HOSTNAME by hand).
#>
[CmdletBinding()]
param(
    # Image source: cn = Alibaba Cloud ACR + Aliyun PyPI, global = Docker Hub + official PyPI
    [ValidateSet('cn', 'global')]
    [string]$ImageSource,
    # Address clients will use to reach this host (LAN IP or hostname)
    [string]$HostAddress,
    # Non-interactive: use detected/default values for every prompt
    [switch]$Yes
)

# NOTE: keep this at 'Continue'. In Windows PowerShell 5.1 a native command writing to
# stderr (e.g. `docker info` when Docker Desktop is not running) would otherwise become a
# terminating NativeCommandError and abort the script before our own checks run.
$ErrorActionPreference = 'Continue'
Set-Location -LiteralPath $PSScriptRoot

$ComposeFileName = 'docker-compose.yml'
$PipIndexUrl = 'https://mirrors.aliyun.com/pypi/simple/'
$ServerPort = 8018
# Cold start (DB init + app boot) can take a while on Windows; install.sh waits ~90s in total
$MaxWaitSeconds = 120

function Write-Info  { param([string]$Message) Write-Host "[INFO] $Message" -ForegroundColor Cyan }
function Write-Ok    { param([string]$Message) Write-Host "[OK] $Message" -ForegroundColor Green }
function Write-Note  { param([string]$Message) Write-Host "[WARN] $Message" -ForegroundColor Yellow }
function Write-Err   { param([string]$Message) Write-Host "[ERROR] $Message" -ForegroundColor Red }

# --- Docker / port checks ------------------------------------------------
function Test-Docker {
    Write-Info 'Checking Docker...'
    if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
        Write-Err 'Docker CLI not found. Install Docker Desktop and make sure it is on PATH.'
        exit 1
    }
    # stderr is piped away on purpose: we only care about the exit code here
    & docker info --format '{{.ServerVersion}}' 2>&1 | Out-Null
    if ($LASTEXITCODE -ne 0) {
        Write-Err 'Cannot talk to the Docker daemon. Start Docker Desktop and wait until its status shows "Engine running", then run this script again.'
        exit 1
    }
    Write-Ok (& docker --version)

    Write-Info 'Checking docker compose (v2)...'
    & docker compose version 2>&1 | Out-Null
    if ($LASTEXITCODE -ne 0) {
        Write-Err 'docker compose v2 not available. Update Docker Desktop.'
        exit 1
    }
    Write-Ok (& docker compose version)
}

function Test-PortInUse {
    param([int]$Port)
    try {
        # SilentlyContinue: "no matching objects" is the expected error when the port is free
        $conn = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
        if ($conn) { return $true }
        return $false
    } catch { }

    # Fallback (cmdlet unavailable): LISTENING lines only. Without this filter an outbound
    # connection *to* some remote host's :8018 counts as ESTABLISHED and would be a false positive.
    foreach ($line in (netstat -ano | Select-String -Pattern 'LISTENING')) {
        if ($line.Line -match ":$Port\s") { return $true }
    }
    return $false
}

# --- Address detection: default-route interface, then any global IPv4 ----
function Get-LanAddress {
    try {
        $cfg = Get-NetIPConfiguration |
            Where-Object { $_.IPv4DefaultGateway -ne $null -and $_.IPv4Address -ne $null -and $_.NetAdapter.Status -eq 'Up' } |
            Select-Object -First 1
        if ($cfg) { return @($cfg.IPv4Address)[0].IPAddress }
    } catch { }

    try {
        $addr = Get-NetIPAddress -AddressFamily IPv4 |
            Where-Object { $_.IPAddress -notlike '127.*' -and $_.IPAddress -notlike '169.254.*' -and $_.PrefixOrigin -ne 'WellKnown' } |
            Select-Object -First 1
        if ($addr) { return @($addr)[0].IPAddress }
    } catch { }

    return $env:COMPUTERNAME
}

# --- .env generation ----------------------------------------------------
function New-RandomString {
    param([int]$Length)
    $chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
    $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
    $bytes = New-Object byte[] $Length
    $rng.GetBytes($bytes)
    $sb = New-Object System.Text.StringBuilder
    foreach ($b in $bytes) { [void]$sb.Append($chars[$b % $chars.Length]) }
    return $sb.ToString()
}

function New-JwtSecret {
    $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
    $bytes = New-Object byte[] 32
    $rng.GetBytes($bytes)
    return [Convert]::ToBase64String($bytes)
}

# Replace `KEY=...` in place; append the line when the key is missing.
function Set-EnvLines {
    param([string[]]$Lines, [string]$Key, [string]$Value)
    $line = '{0}="{1}"' -f $Key, $Value
    $pattern = '^' + [regex]::Escape($Key) + '='
    $done = $false
    $result = New-Object System.Collections.Generic.List[string]
    foreach ($l in $Lines) {
        if (-not $done -and $l -match $pattern) {
            $result.Add($line)
            $done = $true
        } else {
            $result.Add($l)
        }
    }
    if (-not $done) { $result.Add($line) }
    return $result.ToArray()
}

function Write-EnvFile {
    param([string[]]$Lines)
    $path = Join-Path $PSScriptRoot '.env'
    # UTF-8 without BOM; docker compose accepted both BOM and CRLF in testing
    [System.IO.File]::WriteAllText($path, (($Lines -join "`n") + "`n"), (New-Object System.Text.UTF8Encoding($false)))
}

function Get-EnvValue {
    param([string]$Name, [string]$Default)
    if (-not (Test-Path '.env')) { return $Default }
    $match = Get-Content '.env' | Where-Object { $_ -match ('^' + [regex]::Escape($Name) + '=') } | Select-Object -First 1
    if (-not $match) { return $Default }
    return ($match -replace ('^' + [regex]::Escape($Name) + '='), '').Trim('"').Trim()
}

# --- Prompts ------------------------------------------------------------
function Select-ImageSource {
    if ($ImageSource) { return $ImageSource }
    if ($Yes) { return 'cn' }

    Write-Host ''
    Write-Host 'Please select image source:' -ForegroundColor Yellow
    Write-Host '  [1] China  (Alibaba Cloud ACR image + Aliyun PyPI mirror)'
    Write-Host '  [2] Global (Docker Hub image + official PyPI)'
    $choice = Read-Host 'Enter choice [1]'
    if ($choice -eq '2') { return 'global' }
    return 'cn'
}

function Select-HostAddress {
    if ($HostAddress) { return $HostAddress }
    $detected = Get-LanAddress
    if ($Yes) { return $detected }

    Write-Host ''
    Write-Host 'Confirm this host address (the token/QR code of a client machine must reach it):' -ForegroundColor Yellow
    $answer = Read-Host "Press Enter to use $detected, or type another IP / hostname"
    if ([string]::IsNullOrWhiteSpace($answer)) { return $detected }
    return $answer.Trim()
}

# --- Health check -------------------------------------------------------
function Test-Health {
    param([int]$Port)
    $url = "http://localhost:$Port/health"
    if (Get-Command curl.exe -ErrorAction SilentlyContinue) {
        $code = & curl.exe -s -o NUL -w '%{http_code}' --max-time 5 $url
        if ($code -eq '200') { return $true }
        return $false
    }
    try {
        $resp = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 5
        return ($resp.StatusCode -eq 200)
    } catch {
        return $false
    }
}

# --- Main ---------------------------------------------------------------
Write-Host '=========================================='
Write-Host '  FDE MCP Blade Installer (Windows)'
Write-Host '=========================================='
Write-Host ''

Test-Docker

if (-not (Test-Path '.env_')) {
    Write-Err '.env_ template not found. Run this script from the deployment package directory.'
    exit 1
}
$reuseEnv = $false
if (Test-Path '.env') {
    Write-Note '.env already exists.'
    if ($Yes) {
        Write-Info 'Non-interactive mode: overwriting .env.'
    } else {
        $overwrite = Read-Host 'Overwrite it? [y/N]'
        if ($overwrite -notmatch '^[Yy]$') {
            # Keep the existing file instead of giving up: this is how you re-run after
            # editing SERVER_PORT / HOST_HOSTNAME by hand.
            $reuseEnv = $true
            Write-Info 'Keeping the existing .env.'
        }
    }
}

if ($reuseEnv) {
    # Follow whatever the existing .env says, so the printed info matches what compose will do
    $ComposeFileName = Get-EnvValue -Name 'COMPOSE_FILE' -Default 'docker-compose.yml'
    $hostAddr = Get-EnvValue -Name 'HOST_HOSTNAME' -Default ''
    if ([string]::IsNullOrWhiteSpace($hostAddr)) { $hostAddr = Get-LanAddress }
    Write-Info "Reusing .env (compose file: $ComposeFileName, HOST_HOSTNAME: $hostAddr)"
} else {
    $source = Select-ImageSource
    if ($source -eq 'cn') {
        $ComposeFileName = 'docker-compose.yml'
        $PipIndexUrl = 'https://mirrors.aliyun.com/pypi/simple/'
    } else {
        $ComposeFileName = 'docker-compose_en.yml'
        $PipIndexUrl = ''
    }
    Write-Info "Image source: $source (compose file: $ComposeFileName)"

    $hostAddr = Select-HostAddress
    if ([string]::IsNullOrWhiteSpace($hostAddr)) { $hostAddr = Get-LanAddress }
    Write-Info "Host address (HOST_HOSTNAME): $hostAddr"

    Write-Info 'Generating .env...'
    $lines = Get-Content '.env_' -Encoding UTF8
    $lines = Set-EnvLines -Lines $lines -Key 'MARIADB_ROOT_PASSWORD' -Value (New-RandomString 16)
    $lines = Set-EnvLines -Lines $lines -Key 'MARIADB_PASSWORD' -Value (New-RandomString 16)
    $lines = Set-EnvLines -Lines $lines -Key 'JWT_SECRET' -Value (New-JwtSecret)
    $lines = Set-EnvLines -Lines $lines -Key 'COMPOSE_FILE' -Value $ComposeFileName
    $lines = Set-EnvLines -Lines $lines -Key 'PIP_INDEX_URL' -Value $PipIndexUrl
    $lines = Set-EnvLines -Lines $lines -Key 'HOST_HOSTNAME' -Value $hostAddr
    Write-EnvFile -Lines $lines
    Write-Ok '.env written'
}

$ServerPort = [int](Get-EnvValue -Name 'SERVER_PORT' -Default '8018')

Write-Info "Checking port $ServerPort..."
if (Test-PortInUse -Port $ServerPort) {
    Write-Err "Port $ServerPort is already in use (another program is LISTENING on it)."
    Write-Info "Confirm with: netstat -ano | findstr :$ServerPort   (only a LISTENING line matters)"
    Write-Info "Then stop that program, or set another SERVER_PORT in .env and run this script again."
    exit 1
}
Write-Ok "Port $ServerPort is free"

Write-Info 'Pulling images...'
& docker compose pull
if ($LASTEXITCODE -ne 0) {
    Write-Err 'Image pull failed. Check the image source choice and your network.'
    Write-Info 'App image comes from Alibaba Cloud ACR (works in China). If the failure is on mariadb:11,'
    Write-Info 'that image only exists on Docker Hub - configure a registry mirror in Docker Desktop and retry'
    Write-Info '(see README section 11.6), or pre-pull it and tag it as mariadb:11 yourself.'
    exit 1
}

Write-Info 'Starting services...'
& docker compose up -d --remove-orphans
if ($LASTEXITCODE -ne 0) {
    Write-Err 'Failed to start services.'
    exit 1
}

Write-Info 'Waiting for the health check...'
$waited = 0
$healthy = $false
while ($waited -lt $MaxWaitSeconds) {
    if (Test-Health -Port $ServerPort) { $healthy = $true; break }
    Start-Sleep -Seconds 2
    $waited += 2
}

if (-not $healthy) {
    Write-Err 'Health check timed out. Container logs:'
    & docker compose logs fde-mcp-blade
    exit 1
}

Write-Host ''
Write-Host '=========================================='
Write-Host '  Installation completed' -ForegroundColor Green
Write-Host '=========================================='
Write-Host ''
Write-Host "Access URL : http://${hostAddr}:${ServerPort}"
Write-Host 'Default    : admin / admin123  (change it right after the first login)'
Write-Host "Config     : .env in this directory (COMPOSE_FILE=$ComposeFileName, HOST_HOSTNAME=$hostAddr)"
Write-Host ''
Write-Host 'Common commands:'
Write-Host '  docker compose ps              # status'
Write-Host '  docker compose logs -f         # logs'
Write-Host '  docker compose stop            # stop (containers kept)'
Write-Host '  docker compose pull; docker compose up -d   # upgrade'
Write-Host ''
Write-Note 'If another machine cannot open the URL, allow inbound TCP 8018 in Windows Defender Firewall.'
Write-Note 'The token/QR code is built from HOST_HOSTNAME: change it in .env and run "docker compose up -d", then re-generate tokens.'
