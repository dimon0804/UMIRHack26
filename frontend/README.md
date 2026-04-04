# Cipherline — фронтенд (React + TypeScript)

Симулятор решений в области кибергигиены: сценарии «Офис», «Дом», «Публичный Wi‑Fi», геймификация (HP, лига, XP), сертификат с QR и страница верификации.

## Структура

- `src/pages` — экраны: вход, регистрация, дашборд, сценарий, результаты, профиль, сертификат.
- `src/components` — шапка, приватный роут, оверлей «взлома», макеты интерфейсов сценария.
- `src/data/scenarios/*.json` — сценарии (нарратив, шаги, варианты ответов). Новый сценарий: добавить JSON и импорт в `src/lib/scenarios.ts`.
- `src/context/AppContext.tsx` — сессия, прогресс, mock‑хранилище в `localStorage` без `VITE_API_URL`.
- `src/api/client.ts` — обёртка `fetch`; при заданном `VITE_API_URL` запросы идут на бекенд.

## Переменные окружения

Скопируйте `.env.example` в `.env`. Основная переменная:

| Переменная      | Описание |
|-----------------|----------|
| `VITE_API_URL`  | URL API (например `https://api.example.com`). Если пусто — демо с `localStorage`. |

## Команды

```bash
npm install
npm run dev      # http://localhost:5173
npm run build
npm run preview  # предпросмотр production-сборки
```

## Docker

Убедитесь, что **`package.json` начинается с символа `{`**, без лишних букв перед ним — иначе `npm install` в контейнере падает и образ не соберётся.

### Вариант A — только интерфейс (nginx, порт 3173)

Демо работает без API (логин/данные в `localStorage`):

PowerShell (из папки проекта):

```powershell
.\scripts\start-docker-ui.ps1
```

Или вручную:

```bash
cd c:\Users\nasta\OneDrive\Desktop\front
docker compose -f docker-compose.ui.yml up --build --force-recreate
```

Пока команда `up` работает в терминале, контейнер живой. Закрыли окно — сайт снова будет «отказано в подключении».

### Вариант A2 — если nginx-образ не собирается / не стартует

Один контейнер Node, без nginx:

```powershell
.\scripts\start-docker-preview.ps1
```

Сайт: **`http://localhost:4173`**. Та же команда вручную:  
`docker compose -f docker-compose.preview.yml up --build`

В compose задано имя проекта **`cipherline-ui`**, контейнер **`cipherline-web`** — так не пересекается с другим репозиторием в папке тоже названной `front`.

**Важно:** фронт слушает порт **`3173`**, не `3000`. На `:3000` у вас может висеть совсем другое приложение — из‑за этого и кажется, что «открывается старый сайт».

1. В адресной строке обязательно укажите **порт**: **`http://localhost:3173`** (не просто `127.0.0.1` без `:3173` — иначе браузер лезет на порт 80 и будет «отказано в подключении»).
2. Проверка контейнера: **`http://localhost:3173/__cipherline_health`** — текст `cipherline-container-ok`.
3. На странице входа внизу должна быть подпись **«Cipherline · симулятор кибергигиены · sim-2026»**.

Перед запуском при желании уберите старый контейнер: `docker rm -f cipherline-web`. Пересборка: `docker compose -f docker-compose.ui.yml build --no-cache`. Жёсткое обновление в браузере: **Ctrl+Shift+R**.

Логи: `docker compose -f docker-compose.ui.yml logs -f`.

Другой порт: `set CIPHERLINE_PORT=4000` (PowerShell: `$env:CIPHERLINE_PORT=4000`) и снова `up`.

### Вариант B — фронт + заглушка API

```bash
docker compose up --build
```

Адрес: **`http://127.0.0.1:3173`** (или `FRONTEND_PORT`). Та же проверка: `/__cipherline_health`. Прокси `/api/*` → `backend:8080`.

### Если «ничего не открывается»

1. Docker Desktop запущен (Windows).
2. Команда выполняется из папки с `Dockerfile` и `docker-compose*.yml`.
3. Используйте порт **3173**, не 3000.
4. В логах: `docker compose logs frontend` или `docker compose -f docker-compose.ui.yml logs web`.

### `ERR_CONNECTION_REFUSED` на localhost

| Причина | Что сделать |
|--------|-------------|
| В адресе **нет порта** | Открывайте **`http://localhost:3173`**, не `http://127.0.0.1` без `:3173`. |
| Терминал с `docker compose up` **закрыт** | Запустите снова и **не закрывайте** окно, пока смотрите сайт. |
| Docker Desktop **не запущен** | Запустите Docker Desktop, дождитесь статуса Running, повторите `up`. |
| Контейнер упал | `docker compose -f docker-compose.ui.yml logs web` — смотрите ошибки nginx/сборки. |
| Порт 3173 занят | `$env:CIPHERLINE_PORT=4000` и снова `up`, затем `http://localhost:4000`. |

Проверка, что порт проброшен: `docker ps` — у контейнера `cipherline-web` должно быть `0.0.0.0:3173->80/tcp` (или ваш порт).

### Типичные ошибки Docker

| Сообщение | Что сделать |
|-----------|-------------|
| `failed to resolve source metadata` / `no such host` при pull образов | Нет доступа к Docker Hub или DNS. В Docker Desktop → **Settings → Docker Engine** добавьте, например: `"dns": ["8.8.8.8", "1.1.1.1"]`, сохраните и **Restart**. Либо VPN / корпоративный mirror registry. |
| `npm ERR!` / `Unexpected token` при сборке | Убедитесь, что `package.json` — валидный JSON (без лишних запятых). |
| `failed to solve` на шаге `RUN npm run build` | Смотрите полный лог выше по строкам TypeScript/Vite. Для обхода проверки типов в образе можно временно в Dockerfile заменить на `RUN npm run build:docker`. |

## Маршруты

| Путь              | Назначение        |
|-------------------|-------------------|
| `/login`          | Вход              |
| `/register`       | Регистрация       |
| `/dashboard`      | Дашборд           |
| `/scenario/:id`   | Симулятор         |
| `/results/:id`    | Итоги сценария    |
| `/profile`        | Профиль, графики  |
| `/certificate`    | Сертификат        |
| `/verify/:id`     | Проверка по QR    |

## HTTPS

На продакшене терминация TLS (1.2+) на reverse proxy или CDN; пароли не логируются на клиенте и передаются только в теле запросов на ваш API.

## WebSocket (опционально)

Для live‑обновления HP/лиги можно подключить сокет в `AppContext` и диспатчить события после шагов сценария — точка расширения не зашита в UI, чтобы не усложнять демо.
