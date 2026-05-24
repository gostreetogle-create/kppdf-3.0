# Правила проекта

Данный файл — точка входа во все правила микро-архитектуры.
Каждый раздел разработки описан в отдельном файле.

## Быстрая навигация

| Файл | О чём |
|------|-------|
| [project-context.md](project-context.md) | Описание проекта, предметная область, ключевые сценарии |
| [architecture-layers.md](architecture-layers.md) | Структура папок, правила импортов |
| [angular-signals.md](angular-signals.md) | Signals, inject(), строгая типизация |
| [ui-standards.md](ui-standards.md) | Standalone, OnPush, SCSS + BEM, Dumb/Smart |
| [ui-library.md](ui-library.md) | PrimeNG + Aura + PrimeIcons |
| [ui-audit-checklist.md](ui-audit-checklist.md) | UI-аудит — чеклист проверки перед сдачей |

## Основные принципы

1. **Микро-архитектура**: `core/` → `shared/` → `entities/` → `features/` → `pages/`.
2. **Чистый лист**: каждый модуль пишется с нуля под текущую задачу.
3. **Актуальность**: после любого изменения — обновить README, AGENTS.md, планы.
