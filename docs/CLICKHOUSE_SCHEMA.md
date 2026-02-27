# ClickHouse Schema Guide

Физическая SQL-схема лежит в:
`infra/clickhouse/init/001_schema.sql`

Этот документ объясняет таблицы простыми словами.

## База данных
- DB: `promo_code_manager`
- Все таблицы создаются автоматически при `docker compose up`.

## Таблицы

### `users`
Нужна для таблицы пользователей и метрик по пользователю.

Ключевые поля:
- `user_id`, `email`, `name`, `phone`, `is_active`
- `created_at`, `updated_at`

### `promocodes`
Нужна для таблицы промокодов и их эффективности.

Ключевые поля:
- `promocode_id`, `code`, `discount_percent`
- `usage_limit_total`, `usage_limit_per_user`
- `date_from`, `date_to`, `is_active`

### `orders`
Нужна для заказов и агрегатов по тратам.

Ключевые поля:
- `order_id`, `user_id`, `user_email`, `user_name`
- `amount`, `discount_amount`, `final_amount`
- `promocode_id`, `promocode_code`

### `promo_usages`
Нужна для истории применений промокодов.

Ключевые поля:
- `usage_id`, `order_id`, `user_id`
- `user_email`, `user_name`
- `promocode_id`, `promocode_code`
- `order_amount`, `discount_amount`, `final_amount`, `used_at`

## Важные принципы
- Таблицы денормализованы: аналитика не ходит в MongoDB.
- Обновления пишутся как upsert-события (ReplacingMergeTree + `version`).
- Для производительности аналитика всегда использует фильтр по датам.
