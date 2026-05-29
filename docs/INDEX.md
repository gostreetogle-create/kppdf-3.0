# Documentation Index

## Purpose

Единая карта документации с указанием canonical и bridge источников.

## Scope

- Навигация по основным документам проекта
- Фиксация единственных источников истины
- Навигация по архиву

## Source of Truth

- Статус задач (live): `.opencode/yougile-snapshot.yaml` ← автоснимок из YouGile
- Статус модулей (%): `.opencode/project-readiness.yaml`
- FreezeGuard блокировки: `.opencode/lock/INDEX.yaml`

## Main Content

- `README.md` — onboarding и быстрый старт (canonical)
- `.opencode/audit/ONBOARDING.md` — **единая точка входа** для людей и AI (canonical)
- `.opencode/rules/encoding-windows.md` — кодировки Windows: UTF-8 BOM для `.ps1`, LF для `.sh` (canonical)
- `docs/ARCHITECTURE.md` — архитектура, инварианты, документационная модель (canonical)
- `DEPLOY.md` — единая инструкция деплоя (canonical)
- `DESIGN.md` — bridge на архитектурный контур документации
- `deploy/synology/RUNBOOK.md` — Synology/Ubuntu runtime runbook (bridge)
- `deploy/synology/INSTALL.md` — Synology/Ubuntu installation specifics (bridge)
- `.opencode/lock/README.md` — FreezeGuard процессы и различие с readiness (bridge)
- `docs/integrations/yougile/README.md` — YouGile: обзор интеграции (bridge)
- `docs/integrations/yougile/conventions.md` — **правила оформления** + реестр PLM-xxx
- `config/yougile-task-registry.yaml` — реестр PLM-xxx → UUID YouGile
- `docs/integrations/yougile/adding-tasks.md` — деревья CRM / 08, скрипты создания
- `docs/integrations/yougile/api-reference.md` — YouGile REST API v2 reference (bridge)
- `docs/integrations/yougile/configurator-scripts.md` — YouGile configurator guide (bridge)
- `src/app/features/quotations/QUOTATION-EDITOR-BLOCKS.md` — **редактор КП**: блоки, таблицы, product picker (canonical для UX редактора)
- `src/app/shared/ui/kp-product-picker/README.md` — модалка выбора товаров/услуг
- `docs/PLACEHOLDER-SYSTEM.md` — **плейсхолдеры шаблонов**: токены {{org.*}}/{{client.*}}/{{doc.*}}/{{item.*}}, resolve-сервис, kp-placeholder-picker (canonical)
- `docs/archive/analysis/README.md` — карта архивной аналитики
- `tools/README.md` — индекс утилит (импорт товаров, YouGile, сборка)
- `tools/products_import_export/README.md` — импорт/экспорт товаров (Sheets ↔ MongoDB)

## YouGile Integration

- `docs/integrations/yougile/README.md` — обзор интеграции, автоснимок для AI
- `docs/integrations/yougile/conventions.md` — правила оформления + реестр PLM-xxx
- `config/yougile-task-registry.yaml` — реестр PLM-xxx → UUID YouGile
- `.opencode/yougile-snapshot.yaml` — **автоснимок статуса задач** (GitHub Action)
- `.github/workflows/yougile-snapshot.yml` — GitHub Action (каждые 2 ч)
- `tools/yougile-seed-kppdf-board.js` — seed доски «KPPDF — сейчас»
- `tools/yougile-export-snapshot.js` — экспорт задач в snapshot YAML

## Audit

- `.opencode/audit/TEAM-STATUS-AND-YOUGILE-OPTIONS.md` — история решений: YouGile/AI workflow (2026-05-29)
- `.opencode/audit/UI-CONSISTENCY-PLAN.md` — спецификация UI-миграции (kp-*, P0–P2)
- `.opencode/audit/UI-TASKS-REMAINING.md` — оставшиеся задачи P1–P2

## References

- `.opencode/AI_CONTEXT.md`
- `.opencode/rules/project-context.md`
- `.opencode/lock/FREEZE-RULES.md`

