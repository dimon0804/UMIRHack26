#!/usr/bin/env bash
# Один скрипт: подготовка .env, сборка и запуск всего стека Cipherline.
# Использование:
#   ./scripts/deploy.sh              # dev-подобный запуск (порты как в docker-compose.yml)
#   PRODUCTION=1 ./scripts/deploy.sh   # прод: compose.prod + CORS под cipherline.clv-digital.tech, остановка Adminer
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

if ! command -v docker >/dev/null 2>&1; then
  echo "Ошибка: нужен Docker." >&2
  exit 1
fi

if docker compose version >/dev/null 2>&1; then
  DC=(docker compose)
elif command -v docker-compose >/dev/null 2>&1; then
  DC=(docker-compose)
else
  echo "Ошибка: нужен docker compose или docker-compose." >&2
  exit 1
fi

export COMPOSE_FILE="docker-compose.yml"
if [[ "${PRODUCTION:-0}" == "1" ]]; then
  export COMPOSE_FILE="docker-compose.yml:docker-compose.prod.yml"
  echo "[deploy] Режим PRODUCTION (COMPOSE_FILE=$COMPOSE_FILE)"
fi

if [[ ! -f .env ]]; then
  if [[ -f .env.example ]]; then
    cp .env.example .env
    echo "[deploy] Создан .env из .env.example — задайте JWT_SECRET, POSTGRES_PASSWORD, при необходимости MISTRAL_API_KEY и GATEWAY_CORS_ORIGINS."
  else
    echo "[deploy] Нет .env и .env.example — создайте .env вручную." >&2
  fi
fi

echo "[deploy] Сборка образов..."
"${DC[@]}" build --pull

echo "[deploy] Запуск контейнеров..."
"${DC[@]}" up -d

if [[ "${PRODUCTION:-0}" == "1" ]] && [[ "${STOP_ADMINER:-1}" == "1" ]]; then
  echo "[deploy] Останавливаем Adminer (не для публичного прод)..."
  "${DC[@]}" stop adminer 2>/dev/null || true
fi

echo "[deploy] Статус:"
"${DC[@]}" ps

echo ""
echo "Готово. UI: http://localhost:${FRONTEND_PORT:-3000} (или порт 80 в PRODUCTION с docker-compose.prod.yml)."
echo "Gateway напрямую: http://localhost:${GATEWAY_PORT:-8000}/docs"
echo "Публичный домен: https://cipherline.clv-digital.tech — настройте TLS на reverse proxy → порт frontend (см. docs/DEPLOY.md)."
