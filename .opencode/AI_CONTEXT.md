# KPPDF 3.0 — AI Master Context

> **Единый источник правды для AI-агентов.** Прочитай этот файл первым, чтобы понять весь проект.

---

## 1. Быстрый старт для AI

```
Проект:      KPPDF 3.0
Тип:         PLM + ERP + CRM платформа для малого производства
Стек:        Angular 21 + PrimeNG Aura + Express.js + MongoDB
Dev URL:     http://localhost:4200 (frontend) / http://localhost:3000 (backend)
Prod URL:    https://sport-set.ru
Репозиторий: git@github.com:invSportiN/kppdf-3.0.git
Язык:        TypeScript strict (весь проект)
```

### Ключевые файлы (навигация)

| Файл | Назначение |
|------|-----------|
| `PROJECT.md` | Полная картина проекта (архитектура, модули, API, roadmap) |
| `README.md` | Быстрый старт (установка, запуск, логины) |
| `AGENTS.md` | **Система агентов — роли, вызовы, правила** |
| `DESIGN.md` | Дизайн-система Linear (цвета, типографика, компоненты) |
| `.opencode/rules/` | Правила архитектуры (7 файлов) |
| `.opencode/plans/` | Планы разработки (8 файлов) |
| `.opencode/golden-samples.ts` | Эталонные UI-паттерны |
| `.opencode/readiness-feedback.yaml` | **Open issues пользователя для AI** (не FreezeGuard) |
| `opencode.json` | Конфигурация opencode |

### Структура проекта

```
kppdf-3.0/
├── src/                          ← Angular frontend
│   ├── app/
│   │   ├── core/                 ← ApiService, AuthService, guards, interceptors
│   │   ├── features/             ← Dashboard, Directories, Modules, Login, …
│   │   ├── layout/               ← admin-layout
│   │   ├── shared/               ← CrudApiService, kp-*, crud
│   │   ├── app.config.ts         ← PrimeNG preset KppdfPreset
│   │   └── app.routes.ts         ← Маршруты (lazy loading)
│   ├── environments/             ← environment.ts / environment.prod.ts
│   └── styles/                   ← _tokens.scss (дизайн-токены), styles.scss (глобальные стили)
│
├── backend/                      ← Express сервер
│   ├── src/
│   │   ├── config/               ← index.ts (env vars), db.ts (MongoDB)
│   │   ├── middleware/           ← auth.ts (JWT), error-handler.ts, validate.ts
│   │   ├── modules/              ← 26 модулей + auth + dashboard + health
│   │   ├── utils/                ← ApiResponse, CRUD Factory (createCrudRouter)
│   │   ├── __tests__/            ← Jest тесты
│   │   ├── app.ts                ← Express app (все роуты подключены)
│   │   ├── index.ts              ← Точка входа
│   │   └── seed.ts               ← 260+ тестовых записей
│   └── dev.js                    ← Универсальный лаунчер (MongoDB in-memory + seed + сервер)
│
├── shared/types/                 ← 26 интерфейсов для FE + BE
├── deploy/                       ← Docker, nginx, Synology deploy
├── .opencode/                    ← Агенты, правила, планы, AI контекст
├── .cursor/rules/                ← Bridge для Cursor (краткие rules)
├── PROJECT.md                    ← Полная документация
├── AGENTS.md                     ← Система агентов
└── README.md                     ← Быстрый старт
```

---

## 2. Модульная карта (26 сущностей)

### 2a. Справочники (8) — `/api/v1/directories/:entity`

| Ключ | CRUD | UI | Frontend страница | Модель |
|------|------|----|-------------------|--------|
| `products` | CRUD Factory | DirectoriesPage | `/directories` | product.model.ts |
| `categories` | CRUD Factory | DirectoriesPage | `/directories` | category.model.ts |
| `counterparties` | CRUD Factory | DirectoriesPage | `/directories` | counterparty.model.ts |
| `users` | CRUD Factory + bcrypt | DirectoriesPage | `/directories` | user.model.ts (pre-save hash) |
| `roles` | CRUD Factory | DirectoriesPage | `/directories` | role.model.ts |
| `statuses` | CRUD Factory | DirectoriesPage | `/directories` | status.model.ts (composite unique) |
| `work-types` | CRUD Factory | DirectoriesPage | `/directories` | work-type.model.ts |
| `settings` | CRUD Factory | DirectoriesPage | `/directories` | setting.model.ts |

### 2b. Бизнес-модули (18) — разные API paths

| Группа | Ключ | API Path | UI |
|--------|------|----------|----|
| CRM | `quotations` | `/api/v1/directories/quotations` | ModulesPage |
| CRM | `orders` | `/api/v1/directories/orders` | ModulesPage |
| CRM | `interactions` | `/api/v1/directories/interactions` | ModulesPage |
| PLM | `boms` | `/api/v1/directories/boms` | ModulesPage |
| PLM | `operations` | `/api/v1/directories/operations` | ModulesPage |
| PLM | `tech-processes` | `/api/v1/directories/tech-processes` | ModulesPage |
| Закупки | `purchase-requests` | `/api/v1/directories/purchase-requests` | ModulesPage |
| Закупки | `purchase-orders` | `/api/v1/directories/purchase-orders` | ModulesPage |
| Склад | `warehouses` | `/api/v1/directories/warehouses` | ModulesPage |
| Склад | `stock-movements` | `/api/v1/stock/movements` | ModulesPage |
| Склад | `reservations` | `/api/v1/stock/reservations` | ModulesPage |
| Производство | `work-orders` | `/api/v1/directories/work-orders` | ModulesPage |
| Производство | `work-order-operations` | `/api/v1/directories/work-order-operations` | ModulesPage |
| Себестоимость | `cost-calculations` | `/api/v1/cost` | ModulesPage |
| Себестоимость | `actual-costs` | `/api/v1/directories/actual-costs` | ModulesPage |
| Отгрузка | `shipments` | `/api/v1/directories/shipments` | ModulesPage |
| Отгрузка | `shipping-docs` | `/api/v1/directories/shipping-docs` | ModulesPage |
| Админ | `counters` | `/api/v1/counters` | ModulesPage |

### API Auth endpoints
```
POST /api/v1/auth/login     → { username, password } → { accessToken, refreshToken }
POST /api/v1/auth/refresh   → { refreshToken } → { accessToken, refreshToken }
POST /api/v1/auth/register  → регистрация
```

### Dashboard
```
GET /api/v1/dashboard/stats → счётчики по всем 26 таблицам
```

---

## 3. Архитектурные константы (важно для AI)

### Формат ответа API
```typescript
// Успех:
{ success: true, data: T, message?: string }
// Пагинированный:
{ success: true, data: T[], total: number, page: number, limit: number, totalPages: number }
// Ошибка:
{ success: false, error: string, message?: string }
```

### CRUD Factory (backend)
```typescript
// Один вызов = 5 endpoint'ов
createCrudRouter<T>(model: Model<T>): Router
// GET / (page, limit, search, sort, order)
// GET /:id
// POST / (201)
// PUT /:id
// DELETE /:id
```

### Требования к UI (жёсткие)
- Все кнопки: `size="small"`
- Все `<input>`: `pInputText`
- Таблицы: `[stripedRows]="true"` + `[paginator]="true"` + `emptymessage`
- Статусы/роли: `<p-tag>` (не plain text)
- Action колонка: `pi pi-pencil` (secondary) + `pi pi-trash` (danger)
- Диалоги: `[modal]="true"` + footer с кнопками + `style="width:100%"` на контролах
- Пароли: `<p-password [feedback]="false">` (не `<input type="password">`)

### Требования к TypeScript
- `any` запрещён → только `unknown` с type guard
- constructor DI запрещён → только `inject()`
- NgModules запрещены → только Standalone
- Signals → NO NgRx
- `signal()` + `computed()` + `effect()` — только для отладки

### Формат shared/types
```typescript
// Пример: backend/modules/products/product.model.ts = Mongoose
// shared/types/product.interface.ts = чистый TS интерфейс
// Frontend импортирует из shared/types/
```

---

## 4. Дизайн-система (Linear-inspired)

### Цвета
- **Primary**: `#5e6ad2` (Linear lavender) — основной акцент
- **Sidebar bg**: `#0f1117` (тёмный)
- **Surface**: `#ffffff` (светлый режим)
- **Bg**: `#f5f5f5` (светлый фон)
- **Text**: `#1a1a1a` (основной), `#6b6b6b` (вторичный)
- **Border**: `#e5e5e5` (hairline)

### Типографика
- Font: Inter → system-ui fallback
- Body: 13px, line-height 1.45
- H1: 24px, weight 700, letter-spacing -0.02em
- Table header: 11.5px
- Table cell: 13px

### Размеры
- Sidebar: 220px
- Page max: 1400px
- Border radius: 4/6/8/12/16px
- Spacing grid: 4px base

---

## 5. Разработка

### Локальный запуск
```bash
# Backend (одной командой)
cd backend && node dev.js        # MongoDB in-memory + seed + сервер

# Frontend (второй терминал, из корня)
npm install --legacy-peer-deps   # только при первом запуске
ng serve или npx ng serve        # localhost:4200
```

### Тестовые пользователи
| Логин | Пароль | Роль |
|-------|--------|------|
| `admin` | `admin123` | Администратор |
| `manager` | `manager123` | Менеджер |
| `viewer` | `viewer123` | Наблюдатель |

### Команды
| Команда | Где | Описание |
|---------|-----|----------|
| `node dev.js` | `backend/` | MongoDB in-memory + seed + сервер |
| `npm run seed` | `backend/` | Только seed БД |
| `npm run dev` | `backend/` | Backend dev (tsx watch) |
| `npm test` | `backend/` | Jest тесты |
| `ng serve` | корень | Frontend dev |
| `ng build` | корень | Production сборка |
| `ng lint` | корень | ESLint проверка |

### Переменные окружения (.env)
```env
PORT=3000
MONGO_URI=mongodb://localhost:27017/kppdf30
JWT_SECRET=...
JWT_REFRESH_SECRET=...
NODE_ENV=development
```

---

## 6. Правила для AI при работе с проектом

### Приоритеты изменений
1. **Сначала прочитай** — всегда читай существующие файлы перед редактированием
2. **Минимальные изменения** — меняй только то, что нужно для задачи
3. **Следуй конвенциям** — смотри на соседние файлы, повторяй паттерны
4. **Не ломай API контракты** — не меняй сигнатуры без обновления всех потребителей
5. **Проверяй типы** — `ng build` и `npm test` после изменений
6. **Обновляй документацию** — если меняешь структуру или API

### Что НЕЛЬЗЯ делать
- Менять API контракты без согласования
- Удалять CRUD Factory (это архитектурное решение)
- Менять shared/types без обновления backend И frontend
- Добавлять NgModules, constructor DI, `any`
- Использовать raw `<table>`, `<button>`, `<input>` (только PrimeNG)
- Менять дизайн-токены без согласования с DESIGN.md

---

## 7. Статус разработки

| Этап | Описание | Статус |
|------|----------|--------|
| 0 | Фундамент (агенты, opencode) | ✅ |
| 1 | Backend scaffold (26 модулей, CRUD Factory, seed) | ✅ |
| 2 | Frontend scaffold (Angular, PrimeNG, страницы, роутинг) | ✅ |
| 3 | PLM-ядро (заказы, BOM, 18 бизнес-модулей) | 🔄 Базовый CRUD ✅, бизнес-логика ⏳ |
| 4 | ERP-функции (закупки, склад, себестоимость) | ⏳ Нужно: расчёты, планирование, триггеры |
| 5 | Compliance (проверки ТЗ/ГОСТ) | ⏳ Нужно: compliance engine, UI отчётов |
| 6 | Деплой и документация | ⏳ Нужно: CI/CD, докеризация, docs |

---

*Последнее обновление: май 2026. Создан для AI-агентов Codebuff.*
