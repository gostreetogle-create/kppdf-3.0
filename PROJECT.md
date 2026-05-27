# KPPDF 3.0 — PLM/ERP/CRM платформа

> **Полная картина проекта.** Единый источник правды по архитектуре, статусу, решениям и планам.

---

## 1. Концепция

**KPPDF 3.0** — платформа для управления малым производством. Заменяет разрозненные Excel-таблицы и бумажные журналы единой системой, объединяющей:

- **PLM** — управление жизненным циклом изделия (спецификации, BOM, чертежи, версии)
- **ERP** — планирование производства, закупки, склад, себестоимость
- **CRM** — заказы клиентов, коммерческие предложения, договоры

### Ключевые принципы
- **EAV-атрибуты** — гибкая расширяемость без миграций БД
- **Статусная модель** — каждый документ проходит жизненный цикл (черновик → подтверждён → в работе → выполнен)
- **BOM-деревья** — многоуровневые спецификации с расчётом себестоимости
- **Compliance** — проверка изделия на соответствие ТЗ и ГОСТ

---

## 2. Технологический стек

| Слой | Технология | Версия |
|------|-----------|--------|
| Frontend Framework | Angular | 21+ |
| UI Kit | PrimeNG + PrimeIcons | 21+ |
| Тема | PrimeNG Aura (кастомный пресет) | compact |
| Стейт-менеджмент | Signals (NO NgRx) | — |
| Backend | Express.js | 4.21+ |
| База данных | MongoDB (Mongoose) | 8.x |
| Аутентификация | JWT (access + refresh) | — |
| Язык | TypeScript | 5.8 strict |
| Стилизация | SCSS + BEM (только layout) | — |

---

## 3. Архитектура

```
kppdf-3.0/
├── src/                          ← Angular-приложение (frontend)
│   ├── app/
│   │   ├── core/                 ← Сервисы (api, auth, directory, notification)
│   │   ├── features/             ← Страницы и сценарии (lazy routes)
│   │   ├── layout/               ← admin-layout
│   │   ├── shared/               ← kp-*, crud, services
│   │   ├── app.config.ts         ← PrimeNG preset + providers
│   │   └── app.routes.ts         ← Маршруты (lazy loaded)
│   ├── environments/             ← environment.ts / environment.prod.ts
│   └── styles/                   ← Глобальные стили, дизайн-токены
│
├── backend/                      ← Express-сервер
│   ├── src/
│   │   ├── config/               ← config, db, env
│   │   ├── middleware/           ← error-handler, auth, validate
│   │   ├── modules/              ← 26 модулей (8 справочников + 18 бизнес-модулей) + health + auth
│   │   ├── utils/                ← api-response, crud-factory
│   │   ├── app.ts                ← Express app (роуты)
│   │   ├── index.ts              ← Точка входа
│   │   └── seed.ts               ← 260+ записей тестовых данных (26 таблиц)
│   └── .env                      ← Конфигурация
│
├── shared/                       ← Общие типы (FE + BE)
│   └── types/                    ← 26 интерфейсов + index.ts
│
├── .opencode/                    ← Конфигурация opencode (агенты, правила, планы)
│   ├── agents/                   ← orchestrator + subagents + chief-architect
│   ├── audit/                    ← TEAM-WORKFLOW, reports/
│   ├── rules/                    ← architecture-layers, angular-signals, ui-standards, ui-library
│   └── plans/                    ← 8 планов разработки (00-07)
│
├── PROJECT.md                    ← ← ВЫ ЗДЕСЬ
├── README.md                     ← Быстрый старт
└── AGENTS.md                     ← Система агентов
```

### Слои импортов (строгие)
```
core/ → shared/ → features/ → layout/
```

---

## 4. Модули (26 сущностей)

### 4a. Справочники (8 таблиц) — `/directories`

| № | Модуль | Сущность | Ключевые поля | API Path |
|---|--------|----------|--------------|----------|
| 1 | **products** | Товары/услуги | name, sku, kind (ITEM/SERVICE/WORK), unit, categoryId, status | `/api/v1/directories/products` |
| 2 | **categories** | Категории | name, parentId (дерево), fullPath, sortOrder, isActive | `/api/v1/directories/categories` |
| 3 | **counterparties** | Контрагенты | name, legalForm (ООО/ИП/АО/…), roles (client/supplier/company), inn, kpp, bank | `/api/v1/directories/counterparties` |
| 4 | **users** | Пользователи | username, email, displayName, role (admin/manager/viewer/engineer/storekeeper), passwordHash (bcrypt) | `/api/v1/directories/users` |
| 5 | **roles** | Роли доступа | name, label, permissions[], isSystem, sortOrder | `/api/v1/directories/roles` |
| 6 | **statuses** | Статусы | entityType, statusId, label, color, icon, isInitial, isFinal | `/api/v1/directories/statuses` |
| 7 | **work-types** | Типы работ | name, section (materials/work/task/drawing), isActive | `/api/v1/directories/work-types` |
| 8 | **settings** | Настройки | key, value, description, group | `/api/v1/directories/settings` |

### 4b. Бизнес-процессы (18 модулей) — `/modules`

| Группа | Модуль | Сущность | API Path |
|--------|--------|----------|----------|
| CRM | **quotations** | Коммерческие предложения | `/api/v1/directories/quotations` |
| CRM | **orders** | Заказы клиентов | `/api/v1/directories/orders` |
| CRM | **interactions** | Взаимодействия с контрагентами | `/api/v1/directories/interactions` |
| PLM | **boms** | Спецификации (BOM) | `/api/v1/directories/boms` |
| PLM | **operations** | Технологические операции | `/api/v1/directories/operations` |
| PLM | **tech-processes** | Техпроцессы | `/api/v1/directories/tech-processes` |
| Закупки | **purchase-requests** | Заявки на закуп | `/api/v1/directories/purchase-requests` |
| Закупки | **purchase-orders** | Заказы поставщикам | `/api/v1/directories/purchase-orders` |
| Склад | **warehouses** | Склады | `/api/v1/directories/warehouses` |
| Склад | **stock-movements** | Движения склада | `/api/v1/stock/movements` |
| Склад | **reservations** | Резервы | `/api/v1/stock/reservations` |
| Производство | **work-orders** | Производственные наряды | `/api/v1/directories/work-orders` |
| Производство | **work-order-operations** | Операции нарядов | `/api/v1/directories/work-order-operations` |
| Себестоимость | **cost-calculations** | Калькуляции себестоимости | `/api/v1/cost` |
| Себестоимость | **actual-costs** | Фактические затраты | `/api/v1/directories/actual-costs` |
| Отгрузка | **shipments** | Отгрузки | `/api/v1/directories/shipments` |
| Отгрузка | **shipping-docs** | Отгрузочные документы | `/api/v1/directories/shipping-docs` |
| Админ | **counters** | Счётчики автонумерации | `/api/v1/counters` |

### CRUD Factory — `backend/src/utils/crud-factory.ts`
Generic `createCrudRouter<T>(model)` для всех сущностей:
- `GET /` — пагинированный список + `?search=`
- `GET /:id` — по ID
- `POST /` — создание (201)
- `PUT /:id` — обновление
- `DELETE /:id` — удаление

---

## 5. API endpoints

### Health
| Method | Path | Описание |
|--------|------|----------|
| GET | `/api/v1/health` | Статус сервера + MongoDB |

### Directories (8 справочников)
| Method | Path | Описание |
|--------|------|----------|
| GET | `/api/v1/directories/:entity` | Список (page, limit, search) |
| GET | `/api/v1/directories/:entity/:id` | По ID |
| POST | `/api/v1/directories/:entity` | Создать |
| PUT | `/api/v1/directories/:entity/:id` | Обновить |
| DELETE | `/api/v1/directories/:entity/:id` | Удалить |
где `:entity` = `products`, `categories`, `counterparties`, `users`, `roles`, `statuses`, `work-types`, `settings`

### Бизнес-модули (18 модулей)
| Группа | API Path | Модуль |
|--------|----------|--------|
| CRM | `/api/v1/directories/quotations` | КП (quotations) |
| CRM | `/api/v1/directories/orders` | Заказы (orders) |
| CRM | `/api/v1/directories/interactions` | Взаимодействия (interactions) |
| PLM | `/api/v1/directories/boms` | BOM (boms) |
| PLM | `/api/v1/directories/operations` | Операции (operations) |
| PLM | `/api/v1/directories/tech-processes` | Техпроцессы (tech-processes) |
| Закупки | `/api/v1/directories/purchase-requests` | Заявки (purchase-requests) |
| Закупки | `/api/v1/directories/purchase-orders` | Заказы поставщикам (purchase-orders) |
| Склад | `/api/v1/directories/warehouses` | Склады (warehouses) |
| Склад | `/api/v1/stock/movements` | Движения (stock-movements) |
| Склад | `/api/v1/stock/reservations` | Резервы (reservations) |
| Производство | `/api/v1/directories/work-orders` | Наряды (work-orders) |
| Производство | `/api/v1/directories/work-order-operations` | Операции нарядов (work-order-operations) |
| Себестоимость | `/api/v1/cost` | Калькуляции (cost-calculations) |
| Себестоимость | `/api/v1/directories/actual-costs` | Факт. затраты (actual-costs) |
| Отгрузка | `/api/v1/directories/shipments` | Отгрузки (shipments) |
| Отгрузка | `/api/v1/directories/shipping-docs` | Отгруз. доки (shipping-docs) |
| Админ | `/api/v1/counters` | Счётчики (counters) |

### Auth
| Method | Path | Описание |
|--------|------|----------|
| POST | `/api/v1/auth/login` | Вход (username + password → access + refresh tokens) |
| POST | `/api/v1/auth/refresh` | Обновление access-токена |
| POST | `/api/v1/auth/register` | Регистрация |

### Dashboard
| Method | Path | Описание |
|--------|------|----------|
| GET | `/api/v1/dashboard/stats` | Счётчики по всем 26 таблицам |

### Формат ответа
```json
{
  "success": true,
  "data": { ... },
  "message": "Created"
}
```

Пагинированный:
```json
{
  "success": true,
  "data": [ ... ],
  "total": 100,
  "page": 1,
  "limit": 50,
  "totalPages": 2
}
```

---

## 6. Статус выполнения

### ✅ Завершено (каркас платформы)

**Infrastructure:**
- [x] .opencode/ — orchestrator + 12 subagent'ов
- [x] .opencode/rules/ — 7 правил (architecture, signals, UI, project-context, ui-manifest, golden-samples)
- [x] .opencode/plans/ — 8 планов разработки
- [x] .prettierrc, .editorconfig, .nvmrc, .gitignore
- [x] AGENTS.md, README.md, PROJECT.md (этот документ)

**Backend:**
- [x] Express server, MongoDB connection, config
- [x] ApiResponse utility (success/paginated/error)
- [x] Error handler (404 + 500)
- [x] Health endpoint (status + MongoDB uptime)
- [x] **CRUD Factory** — универсальный generic-роутер
- [x] 8 модулей справочников + 18 бизнес-модулей (model + router) = **26 сущностей**
- [x] User model с bcrypt pre-save + comparePassword
- [x] Status model с composite unique (entityType + statusId)
- [x] Counterparty: unique sparse inn
- [x] Seed script (260+ записей, покрытие всех 26 таблиц)
- [x] .env + backend .gitignore

**Frontend:**
- [x] Angular 21 standalone + PrimeNG Aura custom preset (compact)
- [x] Ленивая загрузка маршрутов (dashboard + directories + modules + login + 404)
- [x] Admin layout (сайдбар, навигация, router-outlet)
- [x] Дизайн-токены CSS (цвета, тени, радиусы, отступы) + PrimeNG-токены
- [x] ApiService (HTTP-клиент с типизированными ответами)
- [x] **DirectoryService** — универсальный CRUD для 8 справочников
- [x] **CrudApiService** — универсальный CRUD для 18 бизнес-модулей
- [x] **NotificationService** — Toast-уведомления (success/error/warn/info)
- [x] **DirectoriesPage** — рабочий CRUD для 8 справочников (табы, пагинация, поиск, диалоги)
- [x] **ModulesPage** — рабочий CRUD для 18 бизнес-модулей (табы, пагинация, поиск, диалоги)
- [x] proxy.conf.json (API → localhost:3000)
- [x] Shared types (26 интерфейсов + index.ts)
- [x] Shared UI (EmptyState, PageLayout)
- [x] dashboard-page (реальная статистика из API — 26 таблиц)

### ✅ Завершено (профессиональная платформа)

**Auth:**
- [x] POST /api/v1/auth/login (JWT access + refresh)
- [x] POST /api/v1/auth/refresh
- [x] Auth middleware (JWT verification)
- [x] Frontend login page (рабочая, демо-данные)
- [x] Auth guard (canActivate)
- [x] HTTP interceptor (добавление Bearer-токена + auto-refresh)

**Frontend — улучшения:**
- [x] Dashboard с реальной статистикой от API (26 сущностей, 2 секции)
- [x] Страница 404 (с дизайном)
- [x] Состояния загрузки (skeleton loading)
- [x] Toast-уведомления для всех CRUD-операций
- [x] ConfirmDialog для удаления
- [x] Empty State компонент с действиями
- [x] Page Layout компонент

**Backend — улучшения:**
- [x] Валидация (express-validator для auth)
- [x] Dashboard stats endpoint (countDocuments по 26 таблицам)

**Качество:**
- [x] ESLint flat config (frontend Angular + backend Node)
- [x] Pre-commit hook (ESLint на изменённых файлах)
- [x] Unit-тесты (CRUD factory — 7 тестов, Auth JWT — 5 тестов)

---

## 7. Ключевые архитектурные решения

| Решение | Обоснование |
|---------|------------|
| **Signals вместо NgRx** | PLM/ERP не требует сложного стейта; Signals достаточно для реактивности |
| **PrimeNG Aura compact** | Минималистичный UI без перегруза, компактные отступы |
| **Standalone компоненты** | Angular 21 стандарт; без NgModules |
| **OnPush Change Detection** | Производительность; сигналы работают оптимально |
| **Бэкенд как отдельный модуль** | Можно деплоить отдельно, заменять API без трогания фронта |
| **MongoDB (не SQL)** | Гибкая схема для EAV-атрибутов; production-спецификации с разной структурой |
| **CRUD Factory** | Один generic-роутер = 8 endpoint'ов; избегаем дублирования кода |
| **`any` запрещён → `unknown`** | type-safety на уровне TS strict |
| **Только `inject()`** | Никакого constructor DI (устаревший паттерн) |
| **BEM только для layout** | UI-элементы = PrimeNG; BEM только для обёрток |

---

## 8. Терминология

| Термин | Значение |
|--------|----------|
| **BOM** | Bill of Materials — спецификация изделия (многоуровневая) |
| **EAV** | Entity-Attribute-Value — гибкие атрибуты (характеристики) |
| **PLM** | Product Lifecycle Management — управление жизненным циклом изделия |
| **ERP** | Enterprise Resource Planning — планирование ресурсов предприятия |
| **CRM** | Customer Relationship Management — управление взаимоотношениями с клиентами |
| **Compliance** | Проверка соответствия изделия ТЗ и ГОСТ |
| **Entity** | Одна из 8 таблиц справочников |
| **Директория (Directory)** | Справочник — таблица-перечисление (8 шт) |

---

## 9. Как запустить

### Требования
- Node.js 22+
- MongoDB 7+ (локально или Docker: `docker run -d -p 27017:27017 mongo:7`)
- npm 10+

### Backend
```bash
cd backend
npm install
npm run seed          # заполнить БД тестовыми данными
npm run dev           # http://localhost:3000 (tsx watch)
```

### Frontend
```bash
# В корне (kppdf-3.0/)
npm install
ng serve              # http://localhost:4200
```

---

## 10. Roadmap

| Этап | Описание | Статус |
|------|----------|--------|
| 0 | Фундамент (система агентов, opencode) | ✅ |
| 1 | **Scaffold** — каркас FE + BE + справочники CRUD | ✅ |
| 2 | **Auth** — JWT, guards, login page | ✅ |
| 3 | **PLM-ядро** — заказы, BOM, бизнес-модули (18 сущностей) | ✅ |
| 4 | **ERP-функции** — закупки, склад, себестоимость | ⏳ |
| 5 | **Compliance** — проверка по ТЗ и ГОСТ | ⏳ |
| 6 | **Деплой** — nginx, systemd, CI/CD | ⏳ |

---

*Последнее обновление: май 2026*
