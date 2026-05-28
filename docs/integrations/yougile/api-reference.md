# YouGile API v2 — Reference

> Документация методов YouGile REST API, используемых в проекте KPPDF 3.0.

---

## Аутентификация

```
Authorization: Bearer <token>
Content-Type: application/json
Base URL: https://yougile.com/api-v2
```

Токен хранится:
- В `yougile-sync-server/.env` (`YG_TOKEN`)
- В `tools/yougile-sync.ps1` (хардкод, строка `$headers`)

---

## Эндпоинты

### GET /boards

Получить список досок.

**Пример ответа:**
```json
[
  { "id": "438ae799-...", "title": "СпортИнЮг" },
  { "id": "16d98239-...", "title": "Статус реализации" }
]
```

**Используется в:** `checkConnection()`, `yougile-sync.ps1`

---

### GET /columns

Получить список колонок.

**Пример ответа:**
```json
[
  { "id": "eefe08af-...", "title": "01 CRM: Клиенты и КП", "boardId": "438ae799-..." }
]
```

**Используется в:** `yougile-restructure.js`

---

### POST /columns

Создать новую колонку.

**Тело запроса:**
```json
{ "title": "✅ Завершено (100%)", "boardId": "16d98239-..." }
```

**Ответ:**
```json
{ "id": "e5657613-..." }
```

**Используется в:** `yougile-restructure.js`, создание доски «Статус реализации»

---

### PUT /columns/:id

Переименовать колонку.

**Тело запроса:**
```json
{ "title": "Новое название" }
```

**Ответ:**
```json
{ "id": "1e14c89e-..." }
```

⚠️ **Важно:** Переименование колонки может привести к её «исчезновению» из списка колонок (баг API). Задачи при этом сохраняют `columnId`. Рекомендуется вместо переименования создавать новую колонку и перемещать задачи.

---

### GET /tasks?limit=100&offset=N

Получить задачи с пагинацией. Лимит — до 100 за запрос.

**Параметры:**
- `limit` — макс 100
- `offset` — смещение

**Пример ответа:**
```json
{
  "content": [
    { "id": "281c2185-...", "title": "[EPIC] 08 Модели БД", "columnId": "...", "completed": false, "subtasks": ["id1", "id2", ...], "description": "..." }
  ],
  "total": 42
}
```

**Поля задачи:**
| Поле | Тип | Описание |
|------|-----|----------|
| `id` | string | UUID задачи |
| `title` | string | Название |
| `columnId` | string | ID колонки |
| `completed` | boolean | Завершена ли |
| `subtasks` | string[] | **Массив ID подзадач** (не объекты!) |
| `description` | string | Описание (поддерживает Markdown) |

**Используется в:** `getAllTasks()`, `yougile-sync.ps1` report/status

---

### GET /tasks/:id

Получить конкретную задачу.

**Используется в:** `getTask()` для чтения статуса подзадач

---

### PUT /tasks/:id

Обновить задачу. Можно передавать только нужные поля.

**Поля для обновления:**
```json
{
  "title": "Новое название",
  "description": "Новое описание (Markdown)",
  "columnId": "id-колонки",
  "completed": true
}
```

**Особенности:**
- `completed: true` — отмечает задачу выполненной
- `columnId` — перемещает задачу в другую колонку
- `description` — обновляет описание (используется для записи прогресса)

**Используется в:** `updateTask()`, `mark-done`, `sync-from-code`, restructure

---

## Типовые сценарии

### 1. Получить процент выполнения EPIC

```javascript
// subtasks — массив ID подзадач
// allTasks — Map<id, task>
const done = task.subtasks.filter(sid => allTasks.get(sid)?.completed).length;
const percent = Math.round(done / task.subtasks.length * 100);
```

### 2. Обновить описание задачи с прогрессом

```javascript
const description = `🔵 **${moduleKey}** — готовность: ${percent}%\n\n` +
  items.map(i => `${i.done ? '✅' : '⬜'} ${i.name}: ${i.done ? 'выполнено' : 'не выполнено'}`).join('\n') +
  `\n\n*Обновлено: ${new Date().toISOString().slice(0,16).replace('T', ' ')} (yougile-sync-server)*`;

await api.put(`/tasks/${taskId}`, { description });
```

### 3. Переместить задачу между колонками

```javascript
await api.put(`/tasks/${taskId}`, { columnId: targetColumnId });
```

### 4. Получить все задачи с пагинацией

```javascript
let all = [], offset = 0;
while (true) {
  const res = await api.get(`/tasks?limit=100&offset=${offset}`);
  all = all.concat(res.content);
  if (res.content.length < 100) break;
  offset += 100;
}
```

---

## Ограничения

| Параметр | Значение |
|----------|----------|
| Rate limit | ~100 запросов/мин (при 429 — retry с exponential backoff) |
| Лимит задач на запрос | 100 (пагинация через offset) |
| Подзадачи | API возвращает `string[]` (ID), не объекты |
| Описание | Markdown поддерживается |

## Обработка ошибок

- **429** — Too Many Requests → retry с задержкой (1s, 2s, 4s)
- **401** — Неверный токен → без retry (смысла нет)
- **404** — Задача не найдена → без retry
- Все retry имеют max 3 попытки
