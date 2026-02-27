# PromoCode Manager Architecture

## Goal
Проект разделяет запись и чтение данных (CQRS):
- `Command side`: MongoDB (источник истины);
- `Query side`: ClickHouse (все аналитические таблицы);
- Redis: lock + cache.

## Components
```text
Frontend (React SPA)
        |
        v
Backend API (NestJS)
  | command writes -> MongoDB
  | outbox sync    -> ClickHouse
  | analytics read -> ClickHouse
  | cache/lock     -> Redis
```

## Data Flow
1. Клиент отправляет мутацию (`POST/PATCH`).
2. Backend валидирует и записывает данные в MongoDB.
3. Backend добавляет sync-событие в outbox (`sync_outbox_events`).
4. Worker забирает событие и реплицирует денормализованную строку в ClickHouse.
5. Frontend читает аналитику через `/analytics/*` только из ClickHouse.

## Data Models

### MongoDB (command side)
- `users`
- `promocodes`
- `orders`
- `promo_usages`
- `sync_outbox_events`

### ClickHouse (query side)
- `users`
- `promocodes`
- `orders`
- `promo_usages`

ClickHouse таблицы содержат человекочитаемые поля (`user_email`, `user_name`, `promocode_code`) и не требуют fallback-запросов к MongoDB.

## Redis Use-Cases
- distributed lock для `POST /orders/:id/apply-promocode`;
- кэш аналитики `/analytics/*` с коротким TTL;
- versioned invalidation после мутаций.

## Reliability Rules
- бизнес-операция в MongoDB не откатывается из-за ошибки sync в ClickHouse;
- outbox worker использует retry с backoff;
- после исчерпания retries событие переводится в `dead`.

## API Principles
- защищенные endpoint'ы через JWT;
- валидация DTO на входе;
- пагинация/сортировка/фильтрация выполняются на сервере;
- запросы к ClickHouse параметризованы.
