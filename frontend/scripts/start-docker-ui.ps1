# Запуск Cipherline в Docker (только UI). Окно терминала не закрывайте — пока оно открыто, сайт доступен.
$ErrorActionPreference = "Stop"
Set-Location (Join-Path $PSScriptRoot "..")

Write-Host "Проверка Docker..." -ForegroundColor Cyan
docker version 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) {
    Write-Host "Docker не отвечает. Запустите Docker Desktop и подождите, пока станет «Running»." -ForegroundColor Red
    exit 1
}

$port = if ($env:CIPHERLINE_PORT) { $env:CIPHERLINE_PORT } else { "3173" }
Write-Host "Сборка и старт (порт $port)..." -ForegroundColor Cyan
docker compose -f docker-compose.ui.yml up --build
