# YouGile Integration — KPPDF 3.0

> Взаимодействие с YouGile: API, оформление задач, скрипты, синхронизация.

---

## С чего начать

| Документ | Для кого |
|----------|----------|
| **[conventions.md](conventions.md)** | Правила оформления: названия, доска, `columnId`, `subtasks`, шаблон описания |
| [adding-tasks.md](adding-tasks.md) | Деревья CRM / 08 Документы, скрипты создания |
| [api-reference.md](api-reference.md) | REST API v2: эндпоинты, примеры кода |
| [configurator-scripts.md](configurator-scripts.md) | Конфигуратор в браузере (не используется в проекте) |

---

## Два мира YouGile

| Способ | Что это | Кто использует |
|--------|---------|----------------|
| **REST API v2** | Удалённое управление задачами, колонками, описаниями | Скрипты, сервер, Cursor/AI |
| **Конфигуратор** | JavaScript в браузере YouGile (кнопки, хоткеи) | Пользователь в UI |

Основная автоматизация — **REST API**. Конфигуратор в репозитории не используется.

---

## REST API v2

```
Base URL: https://yougile.com/api-v2
Auth:     Bearer Token (заголовок Authorization)
Docs:     https://ru.yougile.com/api/docs
Token:    yougile-sync-server/.env (YG_TOKEN) или tools/yougile-sync.ps1
```

### Эндпоинты

| Метод | Endpoint | Назначение |
|-------|----------|------------|
| `GET` | `/boards`, `/columns` | Доски и колонки |
| `GET` | `/tasks?limit=N&offset=M` | Задачи (пагинация) |
| `GET` | `/tasks/:id` | Одна задача |
| `POST` | `/tasks` | Создать задачу |
| `PUT` | `/tasks/:id` | Обновить (title, description, subtasks, columnId, completed) |
| `POST` / `PUT` | `/columns` | Колонки |

### Инструменты в репозитории

| Инструмент | Назначение |
|------------|------------|
| `tools/yougile-sync.ps1` | CLI: report, status, mark-done, sync-from-code |
| `tools/setup-documents-yougile-module.js` | Модуль **08 Документы** |
| `tools/fix-documents-board-visibility.js` | Убрать вложенные задачи с доски |
| `tools/fix-documents-links.js` | Пересборка `subtasks` модуля 08 |
| `tools/yougile-restructure.js` | Перестройка колонок |
| `tools/yougile-registry.js` | Реестр PLM-xxx → UUID: show, resolve, repair-links |
| `tools/sync-plm-checklist.js` | После фикса в коде: описание + отметка чеклиста в YouGile |
| `yougile-sync-server` | Polling, % EPIC, snapshot → Google Sheets |

---

## Ключевые правила (кратко)

Подробно: [conventions.md](conventions.md).

1. **На доске «План развития»** — только категории `01`–`08` (у них есть `columnId`).
2. **EPIC и задачи `N.x`** — создавать **без `columnId`**, иначе появятся отдельными карточками.
3. **Иерархия** — массив `subtasks` у родителя; `parentTaskId` в API не работает.
4. **Нумерация** — `N.x` совпадает с номером модуля (`8.1` в «08 Документы», не `1.4.1`).

---

## Синхронизация статуса

`yougile-sync-server` (порт 3002):

1. Читает `config/mapping.yaml` (модуль → задача YouGile)
2. Считает % выполнения подзадач EPIC
3. Обновляет описание: `🔵 db-models — готовность: 67%`
4. Пишет snapshot в Google Sheets

Период: каждые 5 мин (`pollIntervalSec`).

---

## Snapshot для AI

> **Как AI видит доску в репозитории.** Автоснимок каждые 2 часа.

### Принцип работы

1. GitHub Action (`.github/workflows/yougile-snapshot.yml`) запускает `tools/yougile-export-snapshot.js`
2. Скрипт читает все задачи с доски «KPPDF — сейчас» через REST API
3. Пишет `.opencode/yougile-snapshot.yaml` — id, title, column, labels, url
4. Коммитит snapshot в `main` (если изменился)

### Формат snapshot

```yaml
updated_at: "2026-05-29T12:00:00Z"
board: "KPPDF — сейчас"
tasks:
  - id: "UI-P0-03"
    title: "UI-P0-03 · kp-search — единое поле поиска"
    column: "📋 Дальше"
    labels: ["UI"]
    completed: false
    yougile_url: "https://yougile.com/team/0bdbccb0610e#task-id"
```

### Требования

- **GitHub Secret:** `YOUGILE_TOKEN` — токен API (ротация обязательна, хардкод удалён)
- **Доска:** «KPPDF — сейчас» должна существовать в YouGile
- **Seed:** первый запуск `node tools/yougile-seed-kppdf-board.js` создаёт доску и карточки

### Для AI

При получении id задачи (UI-P0-03, BL-P1-02):
1. Прочитать `.opencode/yougile-snapshot.yaml` → колонка, метки
2. Прочитать спецификацию из md (UI-CONSISTENCY-PLAN, CHECKLIST-BACKLOG)
3. Проверить FreezeGuard (`.opencode/lock/INDEX.yaml`)
4. Не выдумывать статус — он только в snapshot

## Быстрые ссылки

| Ресурс | URL / ID |
|--------|----------|
| YouGile API docs | https://ru.yougile.com/api/docs |
| Доска «Статус реализации» | `16d98239-919e-43f7-9bf4-a3fbadbdd580` |
| Колонка «План развития» | `59187569-feed-4a67-94ad-e20e7a098be7` |
| Доска «СпортИнЮг» | `438ae799-8d02-4b98-b8c3-1d3c5ffc059c` |
