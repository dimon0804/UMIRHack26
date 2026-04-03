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
