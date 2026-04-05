# Один скрипт для Windows: сборка и запуск стека.
#   .\scripts\deploy.ps1
# Продакшен (CORS + порт 80 для frontend):
#   $env:PRODUCTION = "1"; .\scripts\deploy.ps1

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $Root

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    Write-Error "Нужен Docker Desktop / docker в PATH."
}

$useCompose = $false
try {
    docker compose version | Out-Null
    $useCompose = $true
} catch { }

if (-not $useCompose) {
    Write-Error "Нужен 'docker compose'."
}

$cf = "docker-compose.yml"
if ($env:PRODUCTION -eq "1") { $cf = "$cf;docker-compose.prod.yml" }
if ($env:ENABLE_TLS -eq "1") { $cf = "$cf;docker-compose.caddy.yml" }
$env:COMPOSE_FILE = $cf
Write-Host "[deploy] COMPOSE_FILE=$cf"

if (-not (Test-Path .env)) {
    if (Test-Path .env.example) {
        Copy-Item .env.example .env
        Write-Host "[deploy] Создан .env из .env.example — задайте секреты."
    }
}

Write-Host "[deploy] Сборка..."
docker compose build --pull

Write-Host "[deploy] Запуск..."
docker compose up -d

if ($env:PRODUCTION -eq "1" -and $env:STOP_ADMINER -ne "0") {
    Write-Host "[deploy] Остановка Adminer..."
    docker compose stop adminer 2>$null
}

docker compose ps
Write-Host ""
Write-Host "Готово. См. docs/DEPLOY.md для cipherline.clv-digital.tech"
