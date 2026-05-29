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
| [ui-manifest.md](ui-manifest.md) | UI-манифест — Конституция интерфейсов, правила + YAML-проверки |
| [golden-samples.ts](../golden-samples.ts) | Эталонные паттерны UI-компонентов (таблица с пагинацией, CRUD-диалог) |
| [FREEZE-RULES.md](../lock/FREEZE-RULES.md) | FreezeGuard — frozen/locked файлы, алгоритм STOP для AI |
| [encoding-windows.md](encoding-windows.md) | **Кодировки Windows:** UTF-8 BOM для `.ps1`, LF для `.sh`, UTF-8 для `.ts` |

## Основные принципы

1. **Микро-архитектура**: `core/` → `shared/` → `features/` → `layout/`.
2. **Чистый лист**: каждый модуль пишется с нуля под текущую задачу.
3. **Актуальность**: после любого изменения — обновить README, AGENTS.md, планы.
