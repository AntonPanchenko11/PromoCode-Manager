# Technical Stack

Фактический стек текущей реализации.

## Runtime
- Node.js `20+`
- TypeScript `5.x` (`strict: true`)

## Backend
- NestJS `10.x`
- Mongoose `8.x` + MongoDB `7.x`
- `class-validator` + `class-transformer`
- JWT auth (`@nestjs/jwt`, `passport-jwt`) + `bcrypt`
- ClickHouse client: `@clickhouse/client`
- Redis client: `redis` (node-redis)

## Frontend
- React `18.x` + Vite `5.x`
- TypeScript SPA (без SSR)
- Routing: `react-router-dom`
- Кастомные таблицы с server-side пагинацией/сортировкой/фильтрацией

## Infra
- Docker Compose
- ClickHouse `24.x`
- Redis `7.x`

## Quality gates
- `npm run typecheck` (backend + frontend)
- `npm test` (backend)
