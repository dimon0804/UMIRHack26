# Деплой Cipherline (production)

Публичный домен команды: **https://cipherline.clv-digital.tech**

Стек: Docker Compose (Postgres, Redis, auth, simulation, progress, ai-service, gateway, frontend nginx + Vite build). API с браузера идёт на **тот же хост**, путь **`/api/*`** — проксируется nginx контейнера `frontend` → `gateway:8000`.

## Быстрый старт на сервере (Linux)

1. Клонируйте репозиторий, перейдите в корень. **Docker ставить не обязательно:** `deploy.sh` при первом запуске сам поставит Engine + Compose (нужен **root** или `sudo`).
2. Если Docker уже стоит — скрипт просто соберёт и поднимет контейнеры.
3. Скопируйте переменные и заполните секреты:

   ```bash
   cp .env.example .env
   # Обязательно: JWT_SECRET (≥32 символа), POSTGRES_PASSWORD
   # Для LLM: MISTRAL_API_KEY
   # CORS (если не используете prod-файл ниже):
   # GATEWAY_CORS_ORIGINS=https://cipherline.clv-digital.tech
   ```

4. Один скрипт (прод):

   ```bash
   chmod +x scripts/deploy.sh
   PRODUCTION=1 ./scripts/deploy.sh
   ```

   Локально / без prod-оверрайда:

   ```bash
   ./scripts/deploy.sh
   ```

## Windows

```powershell
cd путь\к\UMIRHack26
Copy-Item .env.example .env   # при необходимости отредактируйте
$env:PRODUCTION = "1"
.\scripts\deploy.ps1
```

## Автоматический SSL (рекомендуется на ВМ)

Сертификат **сам по себе внутри контейнеров не появляется** — нужен ACME (Let's Encrypt). В репозитории есть **Caddy** в `docker-compose.caddy.yml`: он слушает **80/443**, получает сертификат и проксирует на контейнер `frontend`.

```bash
# DNS: A-запись cipherline.clv-digital.tech → публичный IP этой машины (проверьте: dig +short)
# Фаервол: разрешить вход 80, 443 с интернета

cd ~/UMIRHack26
git pull
PRODUCTION=1 ENABLE_TLS=1 ./scripts/deploy.sh
# В .env задайте реальный ACME_EMAIL=ваш@email (для Let's Encrypt)
```

После успешного выпуска сертификата сайт открывается по **https://cipherline.clv-digital.tech**.

Если «по IP открывается, по домену нет»:

1. **DNS** — `dig cipherline.clv-digital.tech` должен возвращать **тот же IP**, что у сервера (`curl -4 ifconfig.me` на ВМ).
2. **Порты** — с вашего ПК: `curl -I http://cipherline.clv-digital.tech` (должен ответить Caddy или редирект на HTTPS).
3. Без записи DNS в Let's Encrypt **нельзя** выдать валидный сертификат на чужой домен.

---

## TLS вручную (Nginx / Traefik)

На хосте перед контейнером поднимите **Nginx**, **Traefik** или **Caddy** вручную:

- Проксируйте `https://cipherline.clv-digital.tech` → `http://127.0.0.1:80` (при `PRODUCTION=1` frontend слушает **80** в `docker-compose.prod.yml`).
- Передайте заголовки:

  - `Host`
  - `X-Forwarded-Proto: https`
  - `X-Forwarded-For` (реальный IP клиента)

Пример фрагмента Nginx:

```nginx
location / {
    proxy_pass http://127.0.0.1:80;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_read_timeout 86400s;
}
```

WebSocket (`/api/v1/soc/ws`) уже учтён в `frontend/nginx.conf`.

## Безопасность

- **Adminer** в проде скрипт останавливает; не открывайте Postgres/Redis наружу (закройте порты файрволом или уберите `ports:` у `postgres`/`redis` в отдельном override).
- Храните `.env` только на сервере, не коммитьте.

## Проверка после деплоя

- `https://cipherline.clv-digital.tech/__cipherline_health` → текст `cipherline-container-ok`
- `https://cipherline.clv-digital.tech/api/v1/health` → JSON со статусами сервисов
