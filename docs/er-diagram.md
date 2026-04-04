# ER-диаграмма (Auth Service)

Сервис аутентификации использует отдельную БД `auth_db`. Ниже — основные сущности на текущем этапе.

```mermaid
erDiagram
  users ||--o{ refresh_tokens : has

  users {
    uuid id PK
    varchar email UK
    varchar password_hash
    varchar locale
    timestamptz created_at
  }

  refresh_tokens {
    uuid id PK
    uuid user_id FK
    varchar token_hash UK
    timestamptz expires_at
    boolean revoked
    timestamptz created_at
  }
```

Пароли хранятся только в виде bcrypt-хэша. Сырой refresh-токен клиенту отдаётся один раз; в БД сохраняется SHA-256 хэш.

---

## Progress Service (`progress_db`)

Состояние тренажёра (HP, XP, модули, история ответов) хранится в JSONB; лидерборд и статистика читают те же данные.

```mermaid
erDiagram
  cipherline_game_state {
    uuid user_id PK
    varchar email
    jsonb state
    timestamptz updated_at
  }

  custom_simulation_case {
    uuid id PK
    uuid user_id
    varchar kind
    varchar title
    jsonb payload
    timestamptz created_at
  }
```

- **`user_id`** совпадает с `users.id` из `auth_db` (логическая связь между сервисами; физический FK не обязателен при раздельных БД).
- **`state`** — полный объект прогресса клиента (сценарии, ответы, сертификат и т.д.).
- **`custom_simulation_case`** — сгенерированные через AI и сохранённые пользователем одношаговые кейсы (почта/чат); идентификатор в API `cs-mail-{uuid}` / `cs-chat-{uuid}`.
