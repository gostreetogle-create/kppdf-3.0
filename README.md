# KPPDF 3.0

> PLM + ERP + CRM платформа для малого производства.

**Профессиональная система управления производством.** Единое окно для заказов, спецификаций, закупок, склада и compliance-контроля.

---

## Быстрый старт

### Требования
- **Node.js** 22+
- **npm** 10+

> MongoDB не требуется — используется встроенный in-memory сервер (mongodb-memory-server).
> При первом запуске автоматически загружается ~780MB бинарника MongoDB.

### Установка и запуск

```bash
# 1. Backend (MongoDB + seed + сервер — одной командой)
cd backend
npm install
node dev.js              # http://localhost:3000

# 2. Frontend (новый терминал, из корня проекта)
npm install --legacy-peer-deps   # если npm i выдаёт ERESOLVE
ng.cmd serve                      # http://localhost:4200
```

> Если `ng` не найден — используй `npx ng serve` или `ng.cmd serve`.

### Вход в систему
| Логин | Пароль | Роль |
|-------|--------|------|
| `admin` | `admin123` | Администратор |
| `manager` | `manager123` | Менеджер |
| `viewer` | `viewer123` | Наблюдатель |

---

## Основные возможности

### 📦 8 справочников (работают сразу после установки)
- **Товары** — номенклатура (товары/услуги/работы)
- **Категории** — иерархическое дерево категорий
- **Контрагенты** — клиенты, поставщики, юрлица (ИНН/КПП/банк)
- **Пользователи** — сотрудники с доступом к системе
- **Роли** — RBAC система прав доступа
- **Статусы** — гибкая статусная модель для сущностей
- **Типы работ** — виды производственных операций
- **Настройки** — системные параметры (компания, валюта, UI)

### 🔐 Авторизация
- JWT access + refresh token
- RBAC (admin / manager / viewer / engineer)
- Bearer token в каждый запрос
- Auto-refresh при 401

### 📊 Дашборд
- Счётчики по всем таблицам
- Быстрая навигация в справочники
- Статус MongoDB и uptime

---

## Структура проекта

```
kppdf-3.0/
├── src/                          ← Angular-приложение
│   ├── app/
│   │   ├── core/                 ← Сервисы (auth, api, directory, notification)
│   │   ├── pages/                ← Страницы (dashboard, directories, login, admin-layout, 404)
│   │   ├── app.config.ts         ← PrimeNG preset + providers
│   │   └── app.routes.ts         ← Маршруты (ленивая загрузка)
│   ├── environments/             ← Окружения (dev/prod)
│   └── styles/                   ← Глобальный SCSS + дизайн-токены
│
├── backend/                      ← Express-сервер
│   ├── src/
│   │   ├── config/               ← Конфигурация + MongoDB
│   │   ├── middleware/           ← auth JWT + error-handler + validate
│   │   ├── modules/              ← 8 справочников + auth + dashboard + health
│   │   ├── types/                ← Типы auth
│   │   ├── utils/                ← ApiResponse + CRUD Factory
│   │   ├── __tests__/            ← Unit-тесты
│   │   ├── app.ts                ← Express app (все роуты)
│   │   ├── index.ts              ← Точка входа
│   │   └── seed.ts               ← 40+ записей тестовых данных
│   └── .env                      ← Переменные окружения
│
├── shared/types/                 ← 8 интерфейсов, общих для FE + BE
│
├── .opencode/                    ← Агенты, правила, планы разработки
│
├── PROJECT.md                    ← Полное описание проекта (картина)
├── AGENTS.md                     ← Система opencode-агентов
├── README.md                     ← ← Вы здесь
├── eslint.config.js              ← ESLint frontend
├── angular.json
├── tsconfig.json
└── proxy.conf.json               ← /api/* → localhost:3000
```

---

## API Endpoints

### Health
```
GET /api/v1/health                → статус сервера + MongoDB
```

### Auth
```
POST /api/v1/auth/login           → { username, password } → tokens
POST /api/v1/auth/refresh         → { refreshToken } → new tokens
```

### Directories (8 справочников)
```
GET    /api/v1/directories/:entity     → список (page, limit, search)
GET    /api/v1/directories/:entity/:id → одна запись
POST   /api/v1/directories/:entity     → создать
PUT    /api/v1/directories/:entity/:id → обновить
DELETE /api/v1/directories/:entity/:id → удалить
```
где `:entity` = `products`, `categories`, `counterparties`, `users`, `roles`, `statuses`, `work-types`, `settings`

### Dashboard
```
GET /api/v1/dashboard/stats → счётчики по всем таблицам
```

---

## Скрипты

| Команда | Где | Описание |
|---------|-----|----------|
| `ng.cmd serve` / `npx ng serve` | корень | Frontend dev server (порт 4200) |
| `ng build` | корень | Production сборка |
| `node dev.js` | `backend/` | **Всё вместе**: MongoDB + seed + сервер (порт 3000) |
| `npm run dev` | `backend/` | Backend dev (tsx watch, без seed) |
| `npm run dev:full` | `backend/` | То же, что `node dev.js` |
| `npm run seed` | `backend/` | Заполнение БД тестовыми данными |
| `npm run test` | `backend/` | Jest unit-тесты |
| `npm run build` | `backend/` | TypeScript компиляция |

---

## Технологии

| Компонент | Технология |
|-----------|-----------|
| Frontend | Angular 21 (standalone, signals, OnPush) |
| UI Kit | PrimeNG 21 + PrimeIcons + Aura compact |
| Backend | Express 4.21 + TypeScript 5.8 |
| Database | MongoDB 8 + Mongoose |
| Auth | JWT (access + refresh), bcrypt |
| Validation | express-validator |
| Tests | Jest (backend), Jasmine/Karma (frontend) |
| Linting | ESLint 9 flat config |
| Styling | SCSS + BEM (только layout) |

---

## Команда разработки (opencode)

Система из **15 агентов** (1 primary + 14 subagent). Подробная карта и типичные разрывы — в `AGENTS.md` (раздел «Система агентов»).

> Агенты **не правят код сами** при обычной разработке: их нужно явно вызывать в OpenCode (`opencode.json`) или следовать чеклистам. В Cursor по умолчанию подключены архитектурные правила + `@ux-architect` (навигация, не формы).

| Агент | Специализация |
|-------|--------------|
| `@orchestrator` | Маршрутизация задач между subagent'ами |
| `@guardian` | Архитектура, слои импортов |
| `@reviewer` | Code review, any/inline-стили |
| `@ui-specialist` | Вёрстка, `kp-*`, диалоги, формы |
| `@ui-qa` | Аудит UI по Manifest / golden-samples |
| `@ui-auditor` | Финальный чеклист, build/lint |
| `@ux-architect` | Меню, IA, RBAC в навигации (не визуал) |
| `@tester` | Unit-тесты (Jasmine/Karma/Jest) |
| `@backend-specialist` | Express, MongoDB |
| `@api-specialist` | API-контракты, DTO |
| `@auth-specialist` | JWT, guards, RBAC |
| `@deploy-specialist` | nginx, systemd, CI/CD |
| `@design-system` | Дизайн-токены, CSS |
| `@meta-architect` | EAV, BOM, сложная предметка |
| `@production-planner` | Расчёты, себестоимость |
| `@compliance-validator` | Проверки соответствия |

---

## Лицензия

MIT
