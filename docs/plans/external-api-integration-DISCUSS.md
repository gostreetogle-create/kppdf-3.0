# Внешние подключения к KPPDF — получение данных

> **Статус: ОБСУДИТЬ!**  
> Черновик для будущих архитектурных решений. Не является утверждённым планом работ.  
> Обновлено: 2026-05-29 (после ревью требований ai-analyst и обсуждения «общего API»).

---

## Принцип (согласовано в обсуждении)

1. **К Mongo снаружи никто не ходит** — единственный шлюз: `HTTP API` `:3000/api/v1/*`.
2. **Не писать API «под дудку»** под каждого клиента — один универсальный REST + RBAC.
3. **Клиент сам решает**, что читать, как paginate, что кэшировать.
4. **Service account** — отдельный user с минимальными permissions (read-only где возможно).
5. **JWT Bearer достаточен** для server-to-server; долгоживущие API keys — отложить.

---

## Что уже есть в kppdf-3.0

| Компонент | Статус | Где |
|-----------|--------|-----|
| REST API 26+ модулей | ✅ | `backend/src/app.ts`, `crud-factory` |
| Auth: login по `username`, JWT | ✅ | `auth.router.ts`, `auth.service.ts` |
| Bearer + httpOnly cookies | ✅ | `middleware/auth.ts`, `auth-cookies.ts` |
| Refresh token (7d), access (15m) | ✅ | `POST /api/v1/auth/refresh` |
| RBAC на каждый endpoint | ✅ | `requirePermission`, wildcards `*.view`, `office.*` |
| Paginated lists `{ success, data, total, page, limit, totalPages }` | ✅ | `utils/api-response.ts` |
| Health без auth | ✅ | `GET /api/v1/health` |
| CORS для frontend | ✅ | `app.ts` |
| Permissions catalog | ✅ | `shared/types/role.interface.ts`, `core/permissions.ts` |

**Схема подключения (уже работает):**

```
Внешний клиент
  → POST /api/v1/auth/login  { username, password }
  → JWT access (+ refresh)
  → Authorization: Bearer <token>
  → GET /api/v1/directories/products?page=1&limit=50
  → RBAC: permission есть → 200 + data; нет → 403; нет токена → 401
```

**Не «открытый API»** — без логина доступен только `/health`.

---

## Что отсутствует (блокеры dev)

| Проблема | Критичность | Действие (обсудить) |
|----------|-------------|---------------------|
| Нет service user `ai-sync` в seed (для kppdf-ai-analyst) | 🟡 P1 | Роль + user по чеклисту ai-analyst |
| Нет роли `integration` / generic service accounts в seed | 🟡 P1 | Добавить роль с `*.view` или точечными permissions |

> **Примечание (2026-05-29):** вход `admin`/`admin123` починен — в seed users создаются через `UserModel.create` (bcrypt через save middleware), не `insertMany`. Секции seed (категории, EAV, templates) на месте. Черновик агента ошибочно писал «seed повреждён».
| OpenAPI / Swagger | 🟢 P2 | Документация для партнёров |
| Долгоживущие API keys | 🟢 P3 | ~1–2 дня, когда интеграций станет много |
| Rate limiting | 🟢 P3 | На prod |
| Webhooks / push-уведомления | ⚪ по задаче | Отдельное проектирование |

---

## Типовые сценарии (обсудить приоритеты)

| Сценарий | Решение сейчас | Нужна ли доработка KPPDF |
|----------|----------------|--------------------------|
| Внешний сервис читает каталог | service-user + JWT Bearer | Только seed + роль |
| 1C / ERP синхронизация | polling paginated API | Нет (клиент paginate) |
| BI / отчёты | API или export endpoint | Обсудить: достаточно ли GET lists |
| Мобилка / портал | user login или service-user | Нет |
| Push «данные изменились» | — | Webhooks — отдельная тема |

---

## API tokens vs JWT — решение на обсуждение

| | JWT (сейчас) | API keys (будущее) |
|---|-------------|-------------------|
| Подключение | login → Bearer, refresh каждые 15m | один ключ в `.env` |
| Сложность внедрения | 0 (есть) | модель, hash, UI revoke, middleware |
| Достаточно для | 1–3 интеграций | много внешних систем |
| **Вывод обсуждения** | **достаточно сейчас** | **не обязательно, P3** |

---

## Что НЕ делать

- Не давать прямой доступ к MongoDB внешним системам.
- Не создавать отдельные `/integration/*` endpoints под каждого клиента.
- Не дублировать бизнес-логику вне backend (pipeline, LLM, RAG — зона внешних сервисов).

---

## Минимальный backlog (если команда согласится)

### P0 — инфраструктура данных
- [x] Seed users + login (`UserModel.create`, e2e `auth.seed-login`) — 2026-05-29
- [ ] Smoke: login + Bearer + GET `/directories/products` (для integration/ai-sync user)

### P1 — integration-ready (без API keys)
- [ ] Роль `integration` в seed: `['*.view']` или granular read-only
- [ ] Service user `integration@kppdf.ru` (имя/password — обсудить)
- [ ] Краткая docs: «Как подключиться к API» (login, Bearer, pagination, permissions)

### P2 — зрелость (обсудить нужность)
- [ ] OpenAPI spec из существующих routes
- [ ] Rate limiting на prod

### P3 — по запросу
- [ ] API keys (create/revoke, admin UI)
- [ ] Webhooks

---

## Приложение: ai-analyst (низкий приоритет, отдельная тема)

> Не часть общей модели интеграции. Ai-analyst — один из возможных JWT-клиентов.

| Требование ai-analyst | Нужен ли кастомный API KPPDF | Комментарий |
|----------------------|------------------------------|-------------|
| Sync каталога | **Нет** | Уже есть `/directories/products`, `/directories/categories` |
| User `ai-sync` | **Нет** (convention клиента) | Достаточно любой роли с нужными view-permissions |
| Фаза 3: `/news` proxy + UI | **Да, отдельная фича** | KPPDF тянет данные *из* ai-analyst для своего UI — не «отдача данных из БД» |
| `AI_SERVICE_URL/KEY` | Только для proxy | Не для sync |

Канон ai-analyst: `kppdf-ai-analyst/docs/KPPDF3_REQUIREMENTS.md`  
Stub в kppdf: `docs/plans/ai-analyst-action-plan.md`

---

## Вопросы для следующего обсуждения

1. Имя и scope роли `integration`: `*.view` или granular per module?
2. Нужен ли OpenAPI до первой внешней интеграции?
3. API keys — триггер: сколько интеграций / какой SLA на refresh?
4. Фаза 3 ai-analyst (news UI) — нужна ли в KPPDF вообще?
5. Rate limiting — nginx vs middleware?

---

*Файл создан для фиксации рассуждений. Перед реализацией — согласование с @chief-architect.*
