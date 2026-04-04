# UMIRHack26 — симулятор кибератак (образовательная платформа)

Production-oriented monorepo: **FastAPI**-микросервисы, **Vite + React** UI, **PostgreSQL**, **Redis**, **Docker Compose**. Единая точка входа — **API Gateway** (`/api/v1/...`).

## Быстрый старт

```bash
cp .env.example .env
# Задайте надёжный JWT_SECRET (≥32 символов) для любого окружения кроме локального smoke-теста.

docker compose up --build
```

- **Gateway (OpenAPI):** [http://localhost:8000/docs](http://localhost:8000/docs)
- **Фронтенд:** [http://localhost:3000](http://localhost:3000)
- **Агрегированный health:** [http://localhost:8000/api/v1/health](http://localhost:8000/api/v1/health)
- **Adminer (PostgreSQL):** [http://localhost:5050](http://localhost:5050) — тема по умолчанию **rmsoft_blue-dark** (синяя тёмная). Вход: СУБД **PostgreSQL**, сервер **`postgres`**, пользователь и пароль из `.env` (`POSTGRES_*`), база например **`auth_db`**, **`simulation_db`** или **`progress_db`**.

Внутренние сервисы не публикуют порты наружу (только через gateway), кроме Postgres/Redis/Adminer при дефолтном `docker-compose.yml` (удобство разработки). **Adminer** не оставляйте доступным из интернета в продакшене без VPN, IP-фильтра или отдельного профиля compose.

## Структура репозитория

```
backend/
  gateway/           # API Gateway, прокси, CORS
  auth-service/      # Регистрация, логин, JWT access + refresh (PostgreSQL auth_db)
  simulation-service/# Сценарии (почта, чат, Wi‑Fi, скимминг, выбор действия)
  progress-service/  # Прогресс Cipherline + лидерборд (PostgreSQL)
  init-db/           # SQL создания БД per-service
frontend/            # Vite + React, Tailwind, тёмная/светлая тема, RU/EN
docs/                # Архитектура, ER, OpenAPI, Postman, OWASP/CWE/APWG
```

## API через шлюз

| Метод | Путь | Описание |
|--------|------|----------|
| POST | `/api/v1/auth/register` | Регистрация (`email`, `password`, `locale`: `ru` \| `en`) |
| POST | `/api/v1/auth/login` | Вход |
| POST | `/api/v1/auth/refresh` | Обновление пары токенов (`refresh_token`) |
| GET | `/api/v1/auth/me` | Профиль (заголовок `Authorization: Bearer <access>`) |
| GET | `/api/v1/simulation/scenarios` | Список модулей (`?lang=ru\|en`) |
| GET | `/api/v1/simulation/scenarios/{id}` | Шаг сценария (`?step=1..5`) |
| POST | `/api/v1/simulation/scenarios/{id}/submit` | Проверка ответа (`choice_id`, `step`) |
| GET/PUT | `/api/v1/progress/cipherline/state` | Загрузка/сохранение прогресса (Bearer) |
| GET | `/api/v1/progress/leaderboard` | Публичный лидерборд (`?sort=xp\|accuracy\|modules`) |
| GET | `/api/v1/progress/leaderboard/stats` | Агрегированная статистика |
| GET | `/api/v1/progress/leaderboard/me` | Ваш ранг (Bearer) |
| GET/POST | `/api/v1/progress/custom-scenarios` | Каталог пользовательских AI-кейсов (Bearer) |
| DELETE | `/api/v1/progress/custom-scenarios/{cs-mail-…\|cs-chat-…}` | Удалить кейс (Bearer) |
| POST | `/api/v1/ai/generate-scenario` | Сгенерировать JSON сценария почты или чата (для сохранения в custom-scenarios) |
| GET | `/api/v1/soc/stats` | Счётчики Live SOC Wall |
| WS | `/api/v1/soc/ws` | Поток событий для страницы `/live-soc` (Redis pub/sub) |

Поток «новый кейс»: `POST /api/v1/ai/generate-scenario` → `POST /api/v1/progress/custom-scenarios` с `{ "scenario": … }` → в UI появляется строка с id `cs-mail-…` / `cs-chat-…`; `GET/POST …/simulation/scenarios/…` для игры передаёт **тот же Bearer**. В Docker у **simulation-service** должен быть `PROGRESS_SERVICE_URL` (уже в `docker-compose.yml`).

Ошибки содержат поля `code`, `message` (по `Accept-Language`: `ru` по умолчанию), `messages.ru` / `messages.en`.

## GitHub Flow

- Ветка **`main`** — стабильная, готовая к демо/продакшену.
- Ветка **`dev`** — интеграция перед merge в `main`.
- Фичи: **`feature/краткое-название`**.
- Изменения только через **Pull Request** (шаблон в `.github/pull_request_template.md`), ревью обязательно даже в минимальном объёме.

Пример:

```bash
git checkout dev
git pull
git checkout -b feature/simulation-scenarios
# ... коммиты ...
git push -u origin feature/simulation-scenarios
# открыть PR → dev
```

## Безопасность

- Пароли: **bcrypt** (passlib). В образе зафиксирован `bcrypt==4.0.1` из‑за совместимости с `passlib` на Python 3.12.
- **Adminer** даёт полный доступ к БД: используйте только в доверенной сети; в облаке отключайте сервис или вынесите за SSO/VPN.
- JWT: access (короткий TTL) + refresh (хранится хэш в БД, ротация при refresh).
- В продакшене: сильный `JWT_SECRET`, TLS на reverse proxy, ограничение CORS, секреты из vault/Kubernetes Secrets.

## Документация

- [Архитектура](docs/architecture.md)
- [ER-диаграмма (auth + progress)](docs/er-diagram.md)
- [OpenAPI через gateway (единый файл)](docs/openapi-cipherline-gateway.yaml) — можно открыть в [editor.swagger.io](https://editor.swagger.io/)
- [Postman-коллекция](docs/postman/Cipherline-Gateway.postman_collection.json)
- [Трассировка угроз: OWASP / CWE / APWG](docs/SECURITY_SOURCES.md)

## Лицензия

Проект создан в рамках хакатона; уточните лицензию у организаторов.
