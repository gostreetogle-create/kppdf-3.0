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
│   │   ├── pages/                ← Страницы (dashboard, directories, login, admin-layout)
│   │   ├── app.config.ts         ← PrimeNG preset + providers
│   │   └── app.routes.ts         ← Маршруты (lazy loaded)
│   ├── environments/             ← environment.ts / environment.prod.ts
│   └── styles/                   ← Глобальные стили, дизайн-токены
│
├── backend/                      ← Express-сервер
│   ├── src/
│   │   ├── config/               ← config, db, env
│   │   ├── middleware/           ← error-handler, auth
│   │   ├── modules/              ← 8 модулей справочников + health + auth
│   │   ├── utils/                ← api-response, crud-factory
│   │   ├── app.ts                ← Express app (роуты)
│   │   ├── index.ts              ← Точка входа
│   │   └── seed.ts               ← Заполнение БД тестовыми данными
│   └── .env                      ← Конфигурация
│
├── shared/                       ← Общие типы (FE + BE)
│   └── types/                    ← 8 интерфейсов + index.ts
│
├── .opencode/                    ← Конфигурация opencode (агенты, правила, планы)
│   ├── agents/                   ← orchestrator + 12 subagent'ов
│   ├── rules/                    ← architecture-layers, angular-signals, ui-standards, ui-library
│   └── plans/                    ← 8 планов разработки (00-07)
│
├── PROJECT.md                    ← ← ВЫ ЗДЕСЬ
├── README.md                     ← Быстрый старт
└── AGENTS.md                     ← Система агентов
```

### Слои импортов (строгие)
```
core/ → shared/ → entities/ → features/ → pages/
```

---

## 4. Модули справочников (8 таблиц)

| № | Модуль | Сущность | Ключевые поля | API Path |
|---|--------|----------|--------------|----------|
| 1 | **products** | Товары/услуги | name, sku, kind (ITEM/SERVICE/WORK), unit, categoryId, status | `/api/v1/directories/products` |
| 2 | **categories** | Категории | name, parentId (дерево), fullPath, sortOrder, isActive | `/api/v1/directories/categories` |
| 3 | **counterparties** | Контрагенты | name, legalForm (ООО/ИП/АО/…), roles (client/supplier/company), inn, kpp, bank | `/api/v1/directories/counterparties` |
| 4 | **users** | Пользователи | username, email, displayName, role (admin/manager/viewer), passwordHash (bcrypt) | `/api/v1/directories/users` |
| 5 | **roles** | Роли доступа | name, label, permissions[], isSystem, sortOrder | `/api/v1/directories/roles` |
| 6 | **statuses** | Статусы | entityType, statusId, label, color, icon, isInitial, isFinal | `/api/v1/directories/statuses` |
| 7 | **work-types** | Типы работ | name, section (materials/work/task/drawing), isActive | `/api/v1/directories/work-types` |
| 8 | **settings** | Настройки | key, value, description, group | `/api/v1/directories/settings` |

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

### Directories (справочники)
| Method | Path | Описание |
|--------|------|----------|
| GET | `/api/v1/directories/:entity` | Список (page, limit, search) |
| GET | `/api/v1/directories/:entity/:id` | По ID |
| POST | `/api/v1/directories/:entity` | Создать |
| PUT | `/api/v1/directories/:entity/:id` | Обновить |
| DELETE | `/api/v1/directories/:entity/:id` | Удалить |

### Auth
| Method | Path | Описание |
|--------|------|----------|
| POST | `/api/v1/auth/login` | Вход (username + password → access + refresh tokens) |
| POST | `/api/v1/auth/refresh` | Обновление access-токена |
| POST | `/api/v1/auth/register` | Регистрация |

### Dashboard
| Method | Path | Описание |
|--------|------|----------|
| GET | `/api/v1/dashboard/stats` | Счётчики по всем таблицам |

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
- [x] .opencode/rules/ — 6 правил (architecture, signals, UI, project-context)
- [x] .opencode/plans/ — 8 планов разработки
- [x] .prettierrc, .editorconfig, .nvmrc, .gitignore
- [x] AGENTS.md, README.md, PROJECT.md (этот документ)

**Backend:**
- [x] Express server, MongoDB connection, config
- [x] ApiResponse utility (success/paginated/error)
- [x] Error handler (404 + 500)
- [x] Health endpoint (status + MongoDB uptime)
- [x] **CRUD Factory** — универсальный generic-роутер
- [x] 8 модулей (model + router): products, categories, counterparties, users, roles, statuses, work-types, settings
- [x] User model с bcrypt pre-save + comparePassword
- [x] Status model с composite unique (entityType + statusId)
- [x] Counterparty: unique sparse inn
- [x] Seed script (40+ записей, покрытие всех 8 таблиц)
- [x] .env + backend .gitignore

**Frontend:**
- [x] Angular 21 standalone + PrimeNG Aura custom preset (compact)
- [x] Ленивая загрузка маршрутов (dashboard + directories + login)
- [x] Admin layout (сайдбар, навигация, router-outlet)
- [x] Дизайн-токены CSS (цвета, тени, радиусы, отступы)
- [x] ApiService (HTTP-клиент с типизированными ответами)
- [x] **DirectoryService** — универсальный CRUD для 8 справочников
- [x] **NotificationService** — Toast-уведомления (success/error/warn/info)
- [x] **DirectoriesPage** — рабочий CRUD:
  - [x] Реальные API-запросы (GET/POST/PUT/DELETE)
  - [x] Пагинация (lazy loading, totalRecords)
  - [x] Debounced поиск (300мс)
  - [x] Toast-уведомления успеха/ошибки
  - [x] ConfirmDialog подтверждение удаления
  - [x] Спиннер загрузки + empty state
  - [x] Валидация required полей
  - [x] 8 вкладок-переключателей справочников
- [x] proxy.conf.json (API → localhost:3000)
- [x] Shared types (8 интерфейсов + index.ts)
- [x] dashboard-page (реальная статистика из API)

### ✅ Завершено (профессиональная платформа)

**Auth:**
- [x] POST /api/v1/auth/login (JWT access + refresh)
- [x] POST /api/v1/auth/refresh
- [x] Auth middleware (JWT verification)
- [x] Frontend login page (рабочая, демо-данные)
- [x] Auth guard (canActivate)
- [x] HTTP interceptor (добавление Bearer-токена + auto-refresh)

**Frontend — улучшения:**
- [x] Dashboard с реальной статистикой от API
- [x] Страница 404 (с дизайном)
- [x] Состояния загрузки (skeleton loading)
- [x] Toast-уведомления для всех CRUD-операций
- [x] ConfirmDialog для удаления

**Backend — улучшения:**
- [x] Валидация (express-validator для auth)
- [x] Dashboard stats endpoint (countDocuments по 8 таблицам)

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
| 3 | **PLM-ядро** — заказы, BOM, EAV-атрибуты | ⏳ |
| 4 | **ERP-функции** — закупки, склад, себестоимость | ⏳ |
| 5 | **Compliance** — проверка по ТЗ и ГОСТ | ⏳ |
| 6 | **Деплой** — nginx, systemd, CI/CD | ⏳ |

---

*Последнее обновление: май 2026*
