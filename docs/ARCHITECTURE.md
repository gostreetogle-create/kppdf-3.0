# KPPDF 3.0 Architecture

## Purpose

Единый архитектурный документ проекта: слои, модули, ключевые решения и ссылки на канонические источники.

## Scope

- Frontend/Backend архитектура
- Модульная карта домена
- Архитектурные инварианты и правила документации
- Границы Readiness и FreezeGuard

## Source of Truth

- Архитектурные инварианты и запреты: `AGENTS.md`
- Статус реализации (проценты, чеклисты): `.opencode/project-readiness.yaml`
- Freeze-статусы изменения файлов: `.opencode/lock/INDEX.yaml` + `.opencode/lock/modules/*.yaml`
- Деплой: `DEPLOY.md`

## Main Content

### System overview

KPPDF 3.0 — PLM + ERP + CRM система для малого производства на Angular + Express + MongoDB.

### Layering

Frontend зависимости:

`core -> shared -> features -> layout`

Запрещены обратные и cross-feature импорты; правила защищаются `eslint-plugin-boundaries`.

### Backend shape

- Express + TypeScript strict
- CRUD-эндпоинты через `crud-factory`
- Единый контракт API-ответов `ApiResponse<T>`
- JWT + RBAC в auth/middleware

### Domain modules

- Справочники: products, categories, counterparties, users, roles, statuses, work-types, settings
- Бизнес-модули: quotations, orders, interactions, boms, operations, tech-processes, purchase-requests, purchase-orders, warehouses, stock-movements, reservations, shipments, work-orders, work-order-operations, cost-calculations, actual-costs, shipping-docs, counters

Актуальный прогресс этих модулей ведется только в `.opencode/project-readiness.yaml`.

### Readiness vs FreezeGuard

- **Readiness** = управленческий прогресс проекта: проценты, чеклисты, этапы.
- **FreezeGuard** = защита от изменений в коде/документах: `wip | locked | frozen`.
- Значения не взаимозаменяемы: readiness не блокирует правки, freeze не показывает готовность.

### Documentation model

- Canonical docs: `README.md`, `docs/ARCHITECTURE.md`, `DEPLOY.md`, `.opencode/project-readiness.yaml`
- Bridge docs: `DESIGN.md`, `docs/integrations/yougile/*`, `deploy/synology/*`, `.opencode/lock/README.md`
- Archive docs: `docs/archive/analysis/` — аналитика, аудиты, схемы (KPPDF-АНАЛИЗ.md, AUDIT-*, АНАЛИЗ-*)

## References

- `docs/INDEX.md`
- `.opencode/AI_CONTEXT.md`
- `.opencode/rules/project-context.md`
- `.opencode/lock/README.md`

