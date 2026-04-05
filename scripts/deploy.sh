#!/usr/bin/env bash
# Полный деплой Cipherline: при необходимости ставит Docker Engine + Compose, затем build/up.
#
#   ./scripts/deploy.sh
#   PRODUCTION=1 ./scripts/deploy.sh
#
# Отключить автоустановку Docker (только ошибка, если нет docker):
#   SKIP_DOCKER_INSTALL=1 ./scripts/deploy.sh
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

log() { echo "[deploy] $*"; }

require_root_for_docker_install() {
  if [[ "$(id -u)" -ne 0 ]]; then
    echo "Для автоустановки Docker нужен root. Выполните: sudo \"$0\"" >&2
    exit 1
  fi
}

ensure_docker_daemon() {
  if docker info >/dev/null 2>&1; then
    return 0
  fi
  log "Docker установлен, но демон не отвечает — запускаем..."
  if command -v systemctl >/dev/null 2>&1; then
    systemctl enable --now docker 2>/dev/null || true
    systemctl start docker 2>/dev/null || true
  fi
  if command -v service >/dev/null 2>&1; then
    service docker start 2>/dev/null || true
  fi
  sleep 2
  docker info >/dev/null 2>&1 || {
    echo "Docker daemon недоступен. Проверьте: systemctl status docker" >&2
    exit 1
  }
}

install_docker_engine() {
  require_root_for_docker_install
  export DEBIAN_FRONTEND=noninteractive
  log "Устанавливаем Docker Engine + Compose (официальный скрипт или пакеты)..."

  if command -v apt-get >/dev/null 2>&1; then
    apt-get update -qq
    apt-get install -y ca-certificates curl gnupg
    if curl -fsSL https://get.docker.com -o /tmp/get-docker.sh; then
      # CHANNEL=stable: engine + docker compose plugin на поддерживаемых ОС
      sh /tmp/get-docker.sh
      rm -f /tmp/get-docker.sh
    else
      log "get.docker.com недоступен — ставим docker.io из репозитория ОС..."
      apt-get install -y docker.io
      apt-get install -y docker-compose-plugin 2>/dev/null || apt-get install -y docker-compose-v2 2>/dev/null || true
    fi
  elif command -v dnf >/dev/null 2>&1; then
    dnf install -y docker docker-compose-plugin || dnf install -y docker
  elif command -v yum >/dev/null 2>&1; then
    yum install -y docker docker-compose-plugin || yum install -y docker
  else
    echo "Не удалось определить пакетный менеджер. Установите Docker вручную: https://docs.docker.com/engine/install/" >&2
    exit 1
  fi

  hash -r
  if command -v systemctl >/dev/null 2>&1; then
    systemctl enable docker 2>/dev/null || true
    systemctl start docker 2>/dev/null || true
  fi
}

resolve_compose_cmd() {
  if docker compose version >/dev/null 2>&1; then
    DC=(docker compose)
    return 0
  fi
  if command -v docker-compose >/dev/null 2>&1; then
    DC=(docker-compose)
    return 0
  fi
  return 1
}

ensure_docker_and_compose() {
  if command -v docker >/dev/null 2>&1 && resolve_compose_cmd; then
    ensure_docker_daemon
    return 0
  fi

  if [[ "${SKIP_DOCKER_INSTALL:-0}" == "1" ]]; then
    echo "Ошибка: не найден Docker (или docker compose). Установите вручную или запустите без SKIP_DOCKER_INSTALL=1." >&2
    exit 1
  fi

  if ! command -v docker >/dev/null 2>&1; then
    install_docker_engine
  fi

  ensure_docker_daemon

  if ! resolve_compose_cmd; then
    log "Compose plugin не найден — доустанавливаем..."
    require_root_for_docker_install
    if command -v apt-get >/dev/null 2>&1; then
      apt-get update -qq
      apt-get install -y docker-compose-plugin 2>/dev/null || apt-get install -y docker-compose-v2 2>/dev/null || true
    fi
    hash -r
    resolve_compose_cmd || {
      echo "Не удалось найти «docker compose». Установите plugin: https://docs.docker.com/compose/install/linux/" >&2
      exit 1
    }
  fi
}

ensure_docker_and_compose

export COMPOSE_FILE="docker-compose.yml"
if [[ "${PRODUCTION:-0}" == "1" ]]; then
  export COMPOSE_FILE="docker-compose.yml:docker-compose.prod.yml"
  log "Режим PRODUCTION (COMPOSE_FILE=$COMPOSE_FILE)"
fi

if [[ ! -f .env ]]; then
  if [[ -f .env.example ]]; then
    cp .env.example .env
    log "Создан .env из .env.example — задайте JWT_SECRET, POSTGRES_PASSWORD, при необходимости MISTRAL_API_KEY."
  else
    log "Нет .env и .env.example — создайте .env вручную."
  fi
fi

log "Сборка образов..."
"${DC[@]}" build --pull

log "Запуск контейнеров..."
"${DC[@]}" up -d

if [[ "${PRODUCTION:-0}" == "1" ]] && [[ "${STOP_ADMINER:-1}" == "1" ]]; then
  log "Останавливаем Adminer..."
  "${DC[@]}" stop adminer 2>/dev/null || true
fi

log "Статус:"
"${DC[@]}" ps

echo ""
echo "Готово. UI: http://localhost:${FRONTEND_PORT:-3000} (в PRODUCTION часто порт 80 → см. docker-compose.prod.yml)."
echo "Gateway: http://localhost:${GATEWAY_PORT:-8000}/docs"
echo "Домен: https://cipherline.clv-digital.tech — TLS на reverse proxy (docs/DEPLOY.md)."
