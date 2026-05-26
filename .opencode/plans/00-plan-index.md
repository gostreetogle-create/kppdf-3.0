# План разработки — Индекс

> Единый указатель этапов разработки KPPDF 3.0.

| Этап | Название | Статус | Документ | Описание |
|------|----------|--------|----------|----------|
| 0 | Фундамент (система агентов) | ✅ | [`01-fundament.md`](01-fundament.md) | opencode, агенты, правила, планы |
| 1 | Backend scaffold | ✅ | [`02-backend-scaffold.md`](02-backend-scaffold.md) | Express, MongoDB, 26 модулей, CRUD Factory, auth, seed |
| 2 | Frontend scaffold | ✅ | [`03-frontend-scaffold.md`](03-frontend-scaffold.md) | Angular 21, PrimeNG, страницы, дизайн-токены |
| 3 | PLM-ядро | 🔄 | [`04-plm-core.md`](04-plm-core.md) | Базовый CRUD ✅. Нужно: EAV, BOM-деревья, жизненный цикл |
| 4 | ERP-функции | ⏳ | [`05-erp-functions.md`](05-erp-functions.md) | Расчёты себестоимости, планирование, триггеры |
| 5 | Compliance | ⏳ | [`06-compliance.md`](06-compliance.md) | Compliance engine, проверки ТЗ/ГОСТ |
| 6 | Документация и деплой | 🔄 | [`07-deploy-docs.md`](07-deploy-docs.md) | Документация ✅. Нужно: CI/CD, Docker, Swagger |

## Легенда
- ✅ — выполнено
- 🔄 — частично выполнено / в работе
- ⏳ — в планах
