# KPPDF 3.0 — Архитектурные инварианты

> **Цель:** Защитить целостность проекта через жёсткие правила, а не через "роли агентов".
> Нарушение любого инварианта — архитектурный долг, который нужно немедленно исправить.

---

## 🏗️ Слои зависимостей

```
core → shared → features → layout
          ↕              ↕
      externals      externals
```

### Правила импортов

| Слой | Паттерн | Разрешено импортировать |
|------|---------|------------------------|
| `core` | `src/app/core/**` | ✅ externals (rxjs, @angular) |
| `shared` | `src/app/shared/**` | ✅ `core` + externals |
| `feature` | `src/app/features/**` | ✅ `core`, `shared` + externals |
| `layout` | `src/app/layout/**` | ✅ всё |

### Запреты

- 🔴 **`core` → `shared`, `feature`, `layout`** — core ничего не знает о вышележащих слоях
- 🔴 **`shared` → `feature`, `layout`** — shared не знает о фичах
- 🔴 **`features/X` → `features/Y`** — фичи изолированы. Если нужна общая логика → выносить в `shared/`
- 🔴 **`features` → `layout`** — фичи не знают о шаблонах layout

> **ESLint rule:** Все запреты защищены `eslint-plugin-boundaries` (`boundaries/dependencies`).
> Попытка нарушить → ошибка сборки.

---

## 🧊 FreezeGuard — блокировка завершённых модулей

> **Перед редактированием любого файла** — проверить FreezeGuard.

1. Открыть [`.opencode/lock/INDEX.yaml`](.opencode/lock/INDEX.yaml) — статус модуля (`frozen` | `locked` | `wip` | `deprecated`).
2. Открыть lockfile модуля (`.opencode/lock/modules/*.yaml`) — список `locked_files`.
3. Если файл в `locked_files` и статус **frozen** или **locked** → **STOP**. Сообщить пользователю: `🧊 [module] frozen`.
4. Статус **wip** → можно менять.

Правила для AI: [`.opencode/lock/FREEZE-RULES.md`](.opencode/lock/FREEZE-RULES.md). CLI: `npm run freeze:status`, `npm run freeze:check`.

Разморозка — только @chief-architect (статус → `wip` → изменения → аудит → `npm run freeze:update` → `frozen`).

**Pre-commit (только AI):** lint → build → tests → `freeze:update` (если менялся frozen/locked) → `freeze:check` (exit 0) → `git commit`. Пользователь не коммитит. Детали: [`.opencode/lock/FREEZE-RULES.md`](.opencode/lock/FREEZE-RULES.md).

---

## Readiness — file-only tracking

> UI «Статус реализации» снят с продакшена. Отслеживание — только YAML + backlog.

- **Backlog (P0–P2, задачи):** [`.opencode/audit/CHECKLIST-BACKLOG.md`](.opencode/audit/CHECKLIST-BACKLOG.md) — канонический список.
- **Прогресс модулей (%):** [`.opencode/project-readiness.yaml`](.opencode/project-readiness.yaml) — `enabled: false`, правит AI после fix; сверять с [`.opencode/lock/INDEX.yaml`](.opencode/lock/INDEX.yaml).
- **Замечания пользователя (опционально):** [`.opencode/readiness-feedback.yaml`](.opencode/readiness-feedback.yaml) — не в FreezeGuard, читать вручную при наличии open issues.

---

## 📦 Public API (Barrel-файлы)

Каждая фича экспортирует ТОЛЬКО через `index.ts`:

```typescript
// features/products/index.ts — единственное, что видно снаружи
export { ProductsComponent } from './products.component';
export type { Product } from './models/product.model';
// всё остальное — ПРИВАТНО
```

### Правила

- ✅ **Импорт из фичи — ТОЛЬКО через barrel:** `import('./features/products')`
- 🔴 **Прямой импорт во внутренности фичи ЗАПРЕЩЁН:** `import('./features/products/products.internal.service')`
- 🔴 **Импорт из barrel за пределами `app.routes.ts` — только через lazy routes

---

## 🎨 UI-кит и PrimeNG

### Иерархия

```
shared/ui/           ← единственное место, где разрешён прямой импорт PrimeNG
  ├── kp-button      ← обёртка над PrimeNG
  ├── kp-input       ← обёртка над PrimeNG
  ├── kp-table       ← обёртка над PrimeNG
  ├── empty-state    ← компонент без PrimeNG
  ├── page-layout    ← компонент без PrimeNG
  └── index.ts       ← публичный API UI-кита
```

### Правила

- ✅ **Новые компоненты** — только через `kp-*` обёртки из `shared/ui/`
- 🔴 **Прямой импорт `primeng/*` в `features/*` ЗАПРЕЩЁН** — только через `shared/ui/`
- 🔴 **Прямой импорт `primeng/*` в `core/*` ЗАПРЕЩЁН** — утилиты не зависят от UI
- 🔴 **Inline-стили ЗАПРЕЩЕНЫ** — только SCSS
- 🔴 **Raw HTML-элементы** (`<button>`, `<input>`, `<table>`, `<dialog>`) — только через PrimeNG или kp-обёртки

> **Note:** Существующий код в `features/*` может содержать прямые импорты PrimeNG.
> Это **технический долг**, который мигрируется по мере рефакторинга в `kp-crud-page`.

---

## 🔐 Permissions (RBAC)

### Единый источник

```typescript
// core/permissions.ts — единственное место, где определяются префиксы
export const MODULE_PERM_PREFIX: Record<string, string> = { ... };
export const DIR_PERM_PREFIX: Record<string, string> = { ... };
```

### Правила

- ✅ **Проверка прав — только через `*appHasPermission` или `auth.hasPermission()`**
- ✅ **Префиксы — только из `core/permissions`**
- 🔴 **Хардкод строк разрешений в шаблонах ЗАПРЕЩЁН** (кроме композиции с префиксом)
- 🔴 **Каждый эндпоинт на бэке — через `crud-factory` с `permPrefix`**

---

## 🔄 CRUD и данные

### Единый поток

```
Компонент → CrudStore / CrudApiService → API → Сервер
```

### Правила

- ✅ **Все CRUD-страницы используют `kp-table` + `CrudStore` / `CrudApiService`**
- ✅ **Все API-ответы — через `ApiResponse<T>` wrapper**
- ✅ **Пагинация для всех списков** (page, limit, total)
- 🔴 **Прямой `http.get` в компонентах ЗАПРЕЩЁН** — только через сервисы
- 🔴 **Ручной CRUD без `crud-factory` на бэке ЗАПРЕЩЁН**

---

## 📐 Технологический стек

| Слой | Технологии |
|------|------------|
| Frontend | Angular 21+, Standalone, Signals, OnPush |
| UI | PrimeNG 21 (через `shared/ui/kp-*`) |
| Стили | SCSS+BEM, CSS-переменные в `_tokens.scss` |
| Backend | Express.js + TypeScript |
| DB | MongoDB + Mongoose |
| Auth | JWT + bcrypt, RBAC |
| Code quality | ESLint + boundaries, TypeScript strict |

---

## 🚦 Процесс работы

### Перед каждой задачей

1. **Прочитать `AGENTS.md`** — убедиться, что все инварианты актуальны
2. **Собрать контекст** — file-picker, code-searcher, read_files
3. **Проверить наличие существующих решений** — не дублировать `CrudStore`, `kp-*`, `core/permissions`

### После каждого изменения

1. **`ng build`** — сборка должна проходить без ошибок
2. **`ng lint`** — проверить ESLint (границы, запрещённые импорты, стиль)
3. **Проверить импорты** — не нарушены ли архитектурные слои
4. **Code review** — запустить `code-reviewer-deepseek-flash` для проверки стандартов качества
5. **Документация** — обновить README/AGENTS.md если изменилась структура

---

## ⛔ Что НЕЛЬЗЯ делать

- 🔴 Использовать `any` — только `unknown` с type guard
- 🔴 Использовать constructor DI — только `inject()`
- 🔴 Использовать NgModules — только Standalone
- 🔴 Использовать `subscribe()` без DestroyRef/OnDestroy
- 🔴 Хранить секреты или JWT в коде — только `.env`
- 🔴 Менять shared/types без синхронизации FE и BE
- 🔴 Игнорировать ESLint-ошибки — `// eslint-disable-next-line` только с обоснованием
- 🔴 **Удалять или рефакторить `QuotationEditor` (маршрут `/quotations/:id`)** — P0-фича, восстановлена после случайного удаления в `f74863a`. Любые изменения — только с задачей и approval @chief-architect.

---

## 🤖 Система агентов (OpenCode + Cursor)

> **Важно:** Агенты **не запускаются сами** при каждом коммите. Они — инструкции для AI в OpenCode (`opencode.json`) и ориентиры в Cursor (`AGENTS.md`). Качество UI зависит от явного вызова нужного агента и от соблюдения чеклистов в `.opencode/`.

### Где что лежит

| Среда | Конфиг | Роль |
|-------|--------|------|
| **OpenCode** | `opencode.json` + `.opencode/agents/*.md` | Primary `@orchestrator`, делегирование subagent'ам |
| **Cursor** | `AGENTS.md` + `.cursor/rules/*.mdc` | Инварианты, маршрут агентов, UI/BE по globs |
| Контекст | `.opencode/AI_CONTEXT.md`, `.opencode/rules/` | Правила UI, слои, golden-samples |

### Карта агентов (OpenCode)

| Агент | Зона ответственности | Не делает |
|-------|---------------------|-----------|
| `@orchestrator` | Маршрутизация задач, синтез ответа | Не подменяет узких специалистов на сложном UI |
| `@ui-specialist` | Вёрстка, `kp-*`, PrimeNG, диалоги, формы | Навигацию, бизнес-логику |
| `@ui-qa` | Red Team: Manifest + golden-samples | Деплой, бэкенд |
| `@ui-auditor` | Финальный чеклист, `ng build`/`ng lint` | Повторный аудит таблиц (зона ui-qa) |
| `@design-system` | Токены, `_tokens.scss`, переменные | CRUD-поля, API |
| `@ux-architect` | Меню, IA, группы разделов, RBAC в навигации | Визуальный дизайн, вёрстку форм |
| `@guardian` | Слои импортов, boundaries | UI-детали |
| `@reviewer` | Code review, `any`, стиль | Фичи целиком |
| `@backend-specialist` | Express, MongoDB, seed | Angular-формы |
| `@api-specialist` | Контракты API, `shared/types` | CSS |
| `@auth-specialist` | JWT, RBAC | Таблицы |
| `@tester` | Unit-тесты | Продакшен-фиксы без тест-плана |
| `@meta-architect` | BOM, EAV, сложная предметка | Простые CRUD |
| `@production-planner` | Планирование, себестоимость | UI-кит |
| `@compliance-validator` | Compliance-проверки | Навигация |
| `@deploy-specialist` | Деплой на Ubuntu-сервер (192.168.1.46), Docker, nginx, CI/CD | Формы |
| `@chief-architect` | Сводка аудитов, P0–P2 | Написание фич |

### Типичные разрывы (почему «агенты не работают»)

1. **Ожидание авто-UI** — после CRUD на `kp-crud-page` нужно вручную: `entityLabel`, select для `*Id`, статусы из seed, подписи в таблице (`type: 'select'` / `tag` + `options`).
2. **Путаница UX vs UI** — `@ux-architect` не правит модалки; формы → `@ui-specialist` + `ui-manifest.md`.
3. **Cursor** — rules в `.cursor/rules/`; сложная роль → прочитать один файл из `.opencode/agents/` (см. router rule). Оркестр auto — только OpenCode.
4. **QA-цикл** — после UI: `@ui-qa` → `@ui-auditor`; иначе баги вроде «ID вместо имени».
5. **Случайное удаление QuotationEditor** — ✅ защищено инвариантом в «⛔ Что НЕЛЬЗЯ делать» + P0 в `.opencode/audit/CHECKLIST-BACKLOG.md`.

### Командный аудит

- Процесс: [.opencode/audit/TEAM-WORKFLOW.md](.opencode/audit/TEAM-WORKFLOW.md)
- Сводка: `@chief-architect` ← отчёты в `.opencode/audit/reports/`
- **Последний аудит:** 2026-05-27 (финал) → [отчёт](.opencode/audit/reports/2026-05-27.md)

### Cursor (кратко)

- Rules: `.cursor/rules/` (`kppdf-response-style` — краткие ответы).
- UI-файлы → `kppdf-ui.mdc`; backend → `kppdf-backend.mdc`.
- Явно в промпте: `@ui-specialist` / `@ux-architect` — если rule не хватило.
- Примеры: «Действуй по ui-specialist.md — поправь kp-table на tenders»; «По ux-architect — куда в меню положить EAV».

### QuotationEditor — блоки, таблицы, подбор (2026-05-27…28)

- Документация UX: [src/app/features/quotations/QUOTATION-EDITOR-BLOCKS.md](src/app/features/quotations/QUOTATION-EDITOR-BLOCKS.md)
- Product picker: [src/app/shared/ui/kp-product-picker/README.md](src/app/shared/ui/kp-product-picker/README.md)
- Панель блоков справа от A4; **открытие по клику** на блок (не hover); перетаскивание блоков при **открытом** замке в шапке; по умолчанию замок открыт.
- Таблицы: `tableKind` (`products`, `services`), одна таблица каждого типа; кнопка **«Выбрать товары/услуги»**; позиции в `items[]` с тем же `tableKind`.
- Подбор: модалка → строки → футер **«Добавить N товаров»** (см. README picker).
- Заголовок toolbar: `formatQuotationLabel()` — без дубля «КП №КП-…».

### CRUD: поля-ссылки (`*Id`)

- 🔴 **Запрещено** показывать MongoDB `ObjectId` пользователю в форме и таблице.
- ✅ Использовать сервисы `*OptionsService` из `shared/services/` (`Counterparty`, `Quotation`, `Product`, `Order`, `Warehouse`, `Shipment`, `WorkOrder`, `Operation`).
- ✅ В таблице: `type: 'select'` + `options`; для статусов: `type: 'tag'` + `options` (подписи на русском).
- ✅ Заголовок диалога: `entityLabel` на `app-kp-crud-page` (родительный падеж).

---

## 🧠 Агент: @ux-architect — UX/IA Business Navigation Architect

> **Специализация:** Информационная архитектура, навигационные паттерны, группировка разделов по бизнес-логике производства, ролевые сценарии.
> Отвечает за структуру и логику, НЕ за визуальный дизайн.

### Когда вызывать

- При добавлении новых пунктов меню или перегруппировке существующих
- При появлении новой фичи — определить, куда её поместить в навигации
- Для аудита текущей структуры: не нарушена ли бизнес-логика производства
- При проектировании вкладок внутри страниц и breadcrumbs

### Принципы

| № | Правило |
|---|---------|
| 1 | Навигация строится по **бизнес-процессам**, а не по структуре БД или кода |
| 2 | Пользователь должен понимать, где он и что делать, за < 2 секунд |
| 3 | Частые действия — ближе и заметнее; редкие (администрирование) — глубже |
| 4 | Разделы группируются по смыслу: Операции / Справочники / Аналитика / Администрирование |
| 5 | Один экран — одна главная задача |
| 6 | Ключевое действие (создать/редактировать/экспорт) — без поиска |
| 7 | Путь к цели — не более 3 кликов для ежедневных операций |
| 8 | Названия разделов — на языке производства, а не разработчика |
| 9 | RBAC влияет на меню: разные роли видят разные приоритеты |
| 10 | Нет дублирования функций в разных разделах |

### Обязательные группы продукта

```
Обзор / Главная           ← Dashboard, KPI, отклонения
Производство              ← Заказы, задания, операции, смены, техпроцессы
Планирование              ← План производства, календарь, очередь работ
Склад / Материалы         ← Материалы, остатки, партии, перемещения, поставки
Качество                  ← Проверки, дефекты, протоколы
Документы                 ← Все документы, шаблоны, загрузка
Аналитика                 ← Отчёты, KPI, производительность, план-факт
Справочники               ← Продукты, категории, контрагенты, единицы измерения, статусы
Администрирование         ← Пользователи, роли, права, настройки системы, интеграции
```

> **Важно:** Это ориентир, а не догма. Сначала изучить текущие разделы, permissions и app.routes.ts, затем предлагать конкретную структуру.

### Запреты

- 🔴 Предлагать изменения «просто красиво» — только с бизнес-обоснованием
- 🔴 Смешивать операционные разделы, справочники, аналитику и администрирование в одну группу
- 🔴 Делать меню слишком глубоким (частые действия) или слишком плоским (много разделов)
- 🔴 Ломать RBAC — структура меню обязана учитывать роли
- 🔴 Требовать cross-feature импорты или глобальный state для навигации
- 🔴 Предлагать визуальный дизайн (цвета, тени) — это зона UI-агента
- 🔴 Менять код без подтверждения — сначала аудит, потом согласование

### Формат рекомендаций

Каждое предложение оформлять как:

```
[Проблема] → [Бизнес-обоснование] → [Структурное решение] → [Влияние на архитектуру]
```

### Чек-лист для любого раздела

- [ ] Название понятно производственнику (не разработчику)?
- [ ] Пользователь понимает, куда попал, за < 2 секунд?
- [ ] Ключевое действие видно без поиска?
- [ ] Нет дублирования функций в других разделах?
- [ ] Структура учитывает RBAC?
- [ ] Ежедневные операции — ≤ 3 кликов?

### Примеры ролевых путей

| Роль | Первое, что видит | Ключевые разделы |
|------|-------------------|------------------|
| Директор | KPI, отклонения, план-факт | Dashboard, Аналитика |
| Нач. производства | План на смену, задания, проблемные операции | Производство, Планирование |
| Технолог | Маршруты, продукты, техпроцессы | Справочники, Производство |
| Мастер смены | Задания на смену, отметки выполнения | Производство |
| Склад | Остатки, материалы, перемещения | Склад / Материалы |
| Администратор | Пользователи, роли, настройки | Администрирование |

---

## 🚀 Агент: @deploy-specialist — Deployment to Ubuntu VM

> **Специализация:** Деплой KPPDF 3.0 на Ubuntu-сервер (192.168.1.46) через Docker Compose.
> Каноническая инструкция: [`.opencode/agents/deploy-specialist.md`](.opencode/agents/deploy-specialist.md)

### Когда вызывать

- При запросе «задеплой» / «обнови на сервере» / «выкати на прод»
- При первом развёртывании на новом сервере
- При проблемах с доступностью сайта после деплоя

### Чек-лист (обязательно!)

- [ ] **Конвертировать .sh в LF:** `sed -i 's/\r$//' deploy.sh deploy/deploy.sh deploy/synology/deploy.sh`
- [ ] **Проверить deploy/.env:** заполнены JWT_SECRET, JWT_REFRESH_SECRET, DEPLOY_PASSWORD, DEPLOY_HOST, DEPLOY_USER
- [ ] **Проверить monitoring HOST:** в `deploy/monitoring/server.py` должно быть `HOST = os.getenv("MONITOR_HOST", "0.0.0.0")`
- [ ] **Проверить SSH:** `ssh -o ConnectTimeout=10 tiit@192.168.1.46 "echo OK"`
- [ ] **Проверить git pull:** код должен быть свежим
- [ ] **Запустить:** `bash deploy.sh --skip-seed` (обновление) или `bash deploy.sh` (первый деплой)
- [ ] **Верифицировать:** health, контейнеры, мониторинг

### Известные проблемы

| Проблема | Решение |
|----------|---------|
| `$'\r': command not found` | Не конвертировали CRLF → LF |
| Monitoring не открывается | Проверить `ss -tlnp \| grep 3001` на сервере |
| `sudo: a password is required` | Пароль в deploy/.env или NOPASSWD |
| Backend не отвечает | `docker logs kppdf-backend --tail 50` |

### Ссылки

- Полная инструкция: [`.opencode/agents/deploy-specialist.md`](.opencode/agents/deploy-specialist.md)
- Конфиг деплоя: `deploy/.env` (не коммитится, в .gitignore)
