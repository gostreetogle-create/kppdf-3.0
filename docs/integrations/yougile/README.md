# YouGile Integration — KPPDF 3.0

> **Цель:** Зафиксировать все способы взаимодействия с YouGile в проекте — API, конфигуратор, существующие скрипты.

---

## Два мира YouGile

| Способ | Что это | Кто использует |
|--------|---------|----------------|
| **REST API v2** | Удалённое управление задачами, колонками, описаниями | Скрипты, сервер, Cursor/AI |
| **Конфигуратор** | JavaScript-скрипты внутри браузера YouGile (кнопки, хоткеи) | Пользователь в UI YouGile |

Ниже — карта того, что уже реализовано в проекте.

---

## REST API v2 — автоматизация

### Базовые параметры

```
Base URL: https://yougile.com/api-v2
Auth:     Bearer Token (заголовок Authorization)
Docs:     https://ru.yougile.com/api/docs
Token:    в .env (yougile-sync-server) или tools/yougile-sync.ps1
```

### Используемые эндпоинты

| Метод | Endpoint | Назначение | Где используется |
|-------|----------|------------|------------------|
| `GET` | `/boards` | Получить список досок | checkConnection |
| `GET` | `/columns` | Получить список колонок | yougile-restructure.js |
| `GET` | `/tasks?limit=N` | Получить все задачи (с пагинацией) | sync, report, snapshot |
| `GET` | `/tasks/:id` | Получить конкретную задачу | readSubtaskStatus |
| `PUT` | `/tasks/:id` | Обновить задачу (description, columnId, completed) | sync, mark-done, restructure |
| `POST` | `/columns` | Создать колонку | restructure |
| `PUT` | `/columns/:id` | Переименовать колонку | restructure |

### Что уже реализовано

| Инструмент | Язык | Назначение |
|------------|------|------------|
| `tools/yougile-sync.ps1` | PowerShell | CLI: report, status, mark-done, sync-from-code, list-done |
| `tools/yougile-restructure.js` | Node.js | Перестройка колонок досок |
| `tools/fix-yougile-descriptions.js` | Node.js | Массовое обновление описаний |
| `tools/sync-yougile-completed.js` | Node.js | Синхронизация completed-статуса |
| `yougile-sync-server` (отдельный проект) | Node.js/TS | Сервер: sync → readiness snapshot, вебхуки, Google Sheets |

Детально: [API Reference](api-reference.md)

---

## Конфигуратор YouGile (опционально)

Встроенный редактор скриптов (Ctrl+~). В проекте **нет** готовых `.js` для вставки — основная автоматизация через REST API.

Справка: [Configurator Scripts](configurator-scripts.md)

---

## Синхронизация статуса

Сервер `yougile-sync-server` (порт 3002) автоматически:
1. Читает маппинг `config/mapping.yaml` (модуль → задача YouGile)
2. Проверяет статус подзадач через API
3. Обновляет описание EPIC-задачи: `🔵 db-models — готовность: 67%`
4. Делает снапшот для Google Sheets

**Период:** Раз в 5 минут (настраивается через `pollIntervalSec`).

Детально: [Сервер синхронизации](#) (TODO: отдельный док)

---

## Быстрые ссылки

| Ресурс | URL |
|--------|-----|
| YouGile API docs | https://ru.yougile.com/api/docs |
| Доска «Статус реализации» | ID: `16d98239-919e-43f7-9bf4-a3fbadbdd580` |
| Доска «СпортИнЮг» | ID: `438ae799-8d02-4b98-b8c3-1d3c5ffc059c` |
| Доска «Настройки проекта» | ID: `ae0e0a0a-ad7f-497e-96e0-0571b6dd9106` |
