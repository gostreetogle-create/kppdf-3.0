# Этап 1 (Stage 1): Backend scaffold

> **Статус: ✅ ЗАВЕРШЁН**

## Что сделано
- [x] Express.js сервер на TypeScript (strict) — `backend/src/index.ts`
- [x] MongoDB connection с in-memory сервером (mongodb-memory-server) — `config/db.ts`
- [x] Config через `dotenv` — `backend/src/config/index.ts`
- [x] Единый формат ответа `ApiResponse<T>` — `utils/api-response.ts`
- [x] **CRUD Factory** — generic `createCrudRouter<T>(model)` — 26 сущностей
- [x] 26 модулей: 8 справочников + 18 бизнес-модулей (model + router)
- [x] Error handler (404 + 500) — `middleware/error-handler.ts`
- [x] Health endpoint — статус сервера + MongoDB uptime
- [x] JWT auth middleware — `middleware/auth.ts`
- [x] User model с bcrypt pre-save + comparePassword
- [x] Status model с composite unique (entityType + statusId)
- [x] Counterparty: уникальный sparse ИНН
- [x] Seed script — 260+ записей, покрытие всех 26 таблиц
- [x] Unit-тесты: CRUD factory (7 тестов) + Auth (5 тестов)
- [x] ESLint flat config для backend
- [x] .env + backend .gitignore
- [x] `dev.js` — универсальный лаунчер (MongoDB in-memory + seed + сервер)

## Использованные агенты
- `@backend-specialist` — сервер, БД, middleware
- `@auth-specialist` — JWT аутентификация
- `@api-specialist` — API-контракты, shared/types
- `@tester` — unit-тесты
