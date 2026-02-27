# API Quick Guide

Этот файл для быстрого понимания API. Источник истины: Swagger UI `http://localhost:3000/api/docs`.

## Base
- Base URL: `http://localhost:3000/api`
- Формат: `application/json`
- Защищенные endpoint'ы: `Authorization: Bearer <accessToken>`

## Auth Flow
1. `POST /auth/register` -> создать пользователя + получить токены.
2. `POST /auth/login` -> войти и получить `accessToken`/`refreshToken`.
3. `POST /auth/refresh` -> обновить пару токенов.
4. `GET /auth/me` -> получить текущего пользователя.
5. `POST /auth/logout` -> завершить сессию.

## Business Endpoints

### Users
- `POST /users` — создать пользователя.
- `GET /users/:id` — получить пользователя.
- `PATCH /users/:id` — обновить пользователя.
- `PATCH /users/:id/deactivate` — деактивировать пользователя.

### Promocodes
- `POST /promocodes` — создать промокод.
- `GET /promocodes/:id` — получить промокод.
- `PATCH /promocodes/:id` — обновить промокод.
- `PATCH /promocodes/:id/deactivate` — деактивировать промокод.

### Orders
- `POST /orders` — создать заказ (без промокода).
- `GET /orders/my` — список своих заказов.
- `POST /orders/:id/apply-promocode` — применить промокод к существующему заказу.

## Analytics (ClickHouse-only)
- `GET /analytics/users`
- `GET /analytics/promocodes`
- `GET /analytics/promo-usages`

Все analytics endpoint'ы поддерживают:
- `page`, `pageSize`
- `sortBy`, `sortDir`
- `dateFrom`, `dateTo`
- `filters` (JSON строка, server-side обработка)

Пример:
```http
GET /api/analytics/users?page=1&pageSize=20&sortBy=totalSpent&sortDir=desc&dateFrom=2026-02-01T00:00:00.000Z&dateTo=2026-02-28T23:59:59.999Z&filters={"isActive":true}
```

## Error Format
```json
{
  "statusCode": 409,
  "error": "Conflict",
  "code": "PROMOCODE_ALREADY_APPLIED",
  "message": "Promocode is already applied to this order",
  "details": {},
  "timestamp": "2026-02-26T12:00:00.000Z",
  "path": "/api/orders/123/apply-promocode"
}
```

Частые статусы:
- `400` — validation/input error
- `401` — unauthorized/invalid token
- `403` — forbidden
- `404` — entity not found
- `409` — business conflict (лимиты, lock timeout, duplicate apply)
