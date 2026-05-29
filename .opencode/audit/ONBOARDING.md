# ONBOARDING — KPPDF 3.0

> **Единая точка входа.** 5 минут — и вы в проекте.

---

## Блок A: Как пользоваться системой задач (5 мин)

### Для вас (человек)

1. **Откройте YouGile** → доска **«KPPDF — сейчас»**
2. **Скопируйте id карточки** (например, `UI-P0-03`) → вставьте в чат AI
3. **Статус в git обновляется сам** (GitHub Action каждые 2 часа, после настройки `YOUGILE_TOKEN` в GitHub Secrets)

### Правила дисциплины

| Правило | Зачем |
|---------|-------|
| Статус — **только в YouGile** | Не галочки в markdown |
| Новая идея → карточка в «Дальше» | В тот же день |
| Закончили → «Сделано» или «На проверке» | Вы или AI напомнил |
| ≤ 3 в «В работе» | Иначе доска врёт |
| Раз в неделю 10 мин: пройти «Дальше» | Убрать дубли, закрыть мусор |

### Как AI понимает задачу

```
Вы копируете: UI-P0-03 · kp-search — единое поле поиска
         ↓
AI читает: .opencode/yougile-snapshot.yaml  → колонка: «Дальше»
           .opencode/audit/UI-CONSISTENCY-PLAN.md → спецификация
           .opencode/lock/INDEX.yaml → freeze: ui-kit = wip
         ↓
AI делает задачу
```

---

## Блок B: Быстрый вход в проект (1–2 часа)

### Порядок чтения (для нового человека)

| # | Документ | Зачем | Время |
|---|----------|-------|-------|
| 1 | `README.md` | Что за проект, установка, запуск, логины | 15 мин |
| 2 | `.opencode/audit/ONBOARDING.md` | ← Вы здесь | 5 мин |
| 3 | `.opencode/project-readiness.yaml` + `.opencode/lock/INDEX.yaml` | Что готово, что заморожено | 10 мин |
| 4 | `docs/ARCHITECTURE.md` | Как устроен проект (слои, модули, API) | 30 мин |
| 5 | `DEPLOY.md` | Деплой на production | 15 мин |
| 6 | `.opencode/rules/encoding-windows.md` | Кодировки на Windows (обязательно!) | 5 мин |
| 7 | `src/app/features/quotations/QUOTATION-EDITOR-BLOCKS.md` | Главный UX-сценарий (редактор КП) | 30 мин |

---

## Блок C: Маршруты по роли

| Роль | Дополнительное чтение |
|------|----------------------|
| **UI / frontend** | `.opencode/audit/UI-CONSISTENCY-PLAN.md`, `.opencode/rules/ui-manifest.md`, `shared/ui/kp-product-picker/README.md`, `.opencode/golden-samples.ts` |
| **Backend** | `backend/src/utils/crud-factory.ts`, `shared/types/`, `backend/src/seed.ts` |
| **DevOps** | `deploy/synology/RUNBOOK.md`, `deploy/synology/INSTALL.md`, `deploy/monitoring/` |
| **PM / владелец** | `.opencode/audit/TEAM-STATUS-AND-YOUGILE-OPTIONS.md`, `config/yougile-task-registry.yaml` |
| **AI-оператор** | `.opencode/AI_CONTEXT.md`, `AGENTS.md`, `.opencode/yougile-snapshot.yaml` |

---

## Блок D: Карта документов (что читать обязательно)

| Документ | Обязательно? | Роль |
|----------|-------------|------|
| `README.md` | ✅ Все | Быстрый старт |
| `ONBOARDING.md` | ✅ Все | ← Вы здесь |
| `.opencode/lock/INDEX.yaml` | ✅ Все | FreezeGuard |
| `docs/ARCHITECTURE.md` | ✅ Все | Полная картина |
| `AGENTS.md` | ✅ AI | Инварианты |
| `.opencode/AI_CONTEXT.md` | ✅ AI | Контекст |
| `.opencode/yougile-snapshot.yaml` | ✅ AI | Статус задач |
| `DEPLOY.md` | ⬜ DevOps | Деплой |
| `.opencode/audit/UI-CONSISTENCY-PLAN.md` | ⬜ UI | Спецификация |
| `backend/src/seed.ts` | ⬜ Backend | Тестовые данные |
| `src/app/app.routes.ts` | ⬜ UI/Frontend | Маршруты |

> Полная карта: `docs/INDEX.md`

---

## Блок E: Тестовые пользователи

| Логин | Пароль | Роль |
|-------|--------|------|
| `admin` | `admin123` | Администратор |
| `manager` | `manager123` | Менеджер |
| `viewer` | `viewer123` | Наблюдатель |

---

## Блок F: Быстрые команды

| Команда | Где | Что делает |
|---------|-----|------------|
| `.\start.cmd` | корень | Запуск всего (Windows) |
| `.\stop.ps1` | корень | Остановка (Windows) |
| `cd backend && node dev.js` | backend | Backend (MongoDB + seed + сервер) |
| `ng serve` | корень | Frontend (localhost:4200) |
| `ng build` | корень | Production сборка |
| `ng lint` | корень | ESLint |
| `npm test` | backend | Backend тесты |

---

*Создано: 2026-05-29. Обновляйте при изменении структуры проекта.*
