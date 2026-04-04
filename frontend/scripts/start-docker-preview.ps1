# Альтернатива nginx-образу: Vite preview на порту 4173
$ErrorActionPreference = "Stop"
Set-Location (Join-Path $PSScriptRoot "..")

Write-Host "Проверка Docker..." -ForegroundColor Cyan
docker version 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) {
    Write-Host "Запустите Docker Desktop." -ForegroundColor Red
    exit 1
}

Write-Host "Сборка и старт на http://localhost:4173 (терминал не закрывайте)" -ForegroundColor Cyan
docker compose -f docker-compose.preview.yml up --build
