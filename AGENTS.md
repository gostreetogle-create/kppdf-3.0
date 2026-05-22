# Агенты

## Оркестратор

**`orchestrator`** — primary-агент. Автоматически распределяет задачи между subagent'ами.

Как работает:
1. Ты даёшь задачу
2. Orchestrator сам определяет — выполнить самому или делегировать
3. При делегировании вызывает нужных subagent'ов
4. Собирает результаты в единый ответ

## Subagent'ы

| Агент | Специализация |
|---|---|
| `@guardian` | Проверка архитектуры, импортов, слоёв |
| `@reviewer` | Code Review |
| `@ui-specialist` | UI-компоненты, стили |
| `@tester` | Тестирование |
| `@backend-specialist` | Express сервер, БД |
| `@api-specialist` | API-контракты |
| `@auth-specialist` | Авторизация и безопасность |
| `@deploy-specialist` | Деплой и инфраструктура |
| `@design-system` | Дизайн-система и токены |
| `@meta-architect` | EAV-атрибуты, BOM-деревья |
| `@production-planner` | Расчёт себестоимости и планирование |
| `@compliance-validator` | Проверка соответствия |

## Выбор режима

При старте сессии доступны 3 режима:
- **plan** — режим планирования
- **code** — режим разработки
- **orchestrator** — режим оркестратора (primary)

## Правила архитектуры

Все правила описаны в `.opencode/rules/`:
- `architecture-layers.md` — структура папок и импорты
- `angular-signals.md` — Signals, inject(), строгая типизация
- `ui-standards.md` — Standalone, OnPush, SCSS + BEM, Dumb/Smart
- `ui-library.md` — PrimeNG + Aura + PrimeIcons

## Планы разработки

Подробные планы в `.opencode/plans/`:
- `00-plan-index.md` — индекс этапов
- `01-fundament.md` — фундамент (система агентов) ✅
- `02-backend-scaffold.md` — backend scaffold ✅
- `03-frontend-scaffold.md` — frontend scaffold ✅
- `04-plm-core.md` — PLM-ядро (заказы, BOM) ⏳
- `05-erp-functions.md` — ERP-функции ⏳
- `06-compliance.md` — compliance ⏳
- `07-deploy-docs.md` — деплой и документация ⏳
