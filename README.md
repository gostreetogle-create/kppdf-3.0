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

**Windows (рекомендуется):**

```powershell
.\start.cmd    # Docker MongoDB + backend + frontend + YouGile sync + браузер
.\stop.ps1     # остановка процессов
```

**Вручную (любая ОС):**

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

### Кодировки на Windows

| Что | Правило |
|-----|---------|
| `start.ps1`, `stop.ps1`, любые `*.ps1` | **UTF-8 с BOM** — иначе ParserError и «кракозябры» в PowerShell 5.1 |
| После правки `.ps1` | `npm run ps1:bom` и `npm run ps1:check` |
| Деплой `.sh` с Windows | LF без CRLF — см. [DEPLOY.md](./DEPLOY.md) |

Полный протокол для AI и разработчиков: [`.opencode/rules/encoding-windows.md`](.opencode/rules/encoding-windows.md)

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
├── src/                          ← Angular-приложение (core, features, layout, shared, styles)
├── backend/                      ← Express-сервер (modules, config, middleware, seed, __tests__)
├── shared/types/                 ← 28 интерфейсов, общих для FE + BE
├── public/                       ← Статика Angular
│
├── docs/                         ← Вся документация
│   ├── ARCHITECTURE.md           ← Архитектура и документационная модель
│   ├── INDEX.md                  ← Карта документации
│   ├── integrations/yougile/     ← YouGile API, конфигуратор, скрипты
│   └── archive/analysis/         ← Архивная аналитика (аудиты, анализ, схемы RBAC)
│
├── deploy/                       ← Деплой и инфраструктура
│   ├── deploy.sh                 ← Деплой-скрипт (Synology)
│   ├── synology/                 ← Synology/Ubuntu: Deploy, nginx, tunnel, мониторинг
│   └── monitoring/               ← Дашборд мониторинга (порт 3001)
│
├── tools/                        ← Утилиты вне основного приложения
│   ├── products_import_export/   ← Импорт/экспорт товаров (Sheets ↔ MongoDB)
│   ├── scripts/                  ← restore-quotation-editor.js
│   ├── yougile-scripts/          ← Готовые .js для конфигуратора YouGile
│   ├── yougile-sync.ps1          ← PowerShell-синхронизация YouGile
│   ├── build.sh                  ← Сборка архива (обёртка над deploy.sh)
│   └── check_ng.sh              ← Проверка Nginx конфигурации
│
├── .opencode/                    ← Агенты, правила, планы, FreezeGuard
├── .cursor/                      ← Cursor rules (bridge)
│
├── deploy.sh                     ← Единый скрипт деплоя (локальный + серверный режим)
├── docker-compose.yml            ← Docker Compose (development)
├── docker-compose.prod.yml       ← Docker Compose (production)
├── start.ps1                     ← Запуск dev-окружения (Windows)
├── stop.ps1                      ← Остановка dev-окружения (Windows)
├── package.json                  ← Frontend"/"общий проект
├── angular.json                  ← Angular конфиг
├── tsconfig.json / tsconfig.app.json / tsconfig.spec.json
├── eslint.config.js              ← ESLint flat config
├── proxy.conf.json               ← /api/* → localhost:3000
├── karma.conf.js                 ← Тестовый раннер
├── opencode.json                 ← OpenCode AI-агенты
├── README.md                     ← ← Вы здесь
├── AGENTS.md                     ← Система opencode-агентов (FreezeGuard locked)
├── DEPLOY.md                     ← Инструкция деплоя (canonical)
├── DESIGN.md                     ← Bridge на архитектурную документацию
└── PROJECT.md                    ← Bridge на архитектурную документацию (FreezeGuard locked)
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
| `.\start.cmd` / `.\start.ps1` | корень | Запуск dev-окружения (Windows) |
| `.\stop.ps1` | корень | Остановка dev (Windows) |
| `npm run ps1:bom` | корень | UTF-8 BOM для `.ps1` |
| `npm run ps1:check` | корень | Проверка BOM и синтаксиса `.ps1` |

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

---

## 🚀 Деплой на production-сервер

> **Полная инструкция:** [`DEPLOY.md`](./DEPLOY.md) | **AI-агент:** [`.opencode/agents/deploy-specialist.md`](.opencode/agents/deploy-specialist.md)

### Быстрый старт (обновление сайта)

```bash
# 1. Обновить код
cd C:\Users\user\WebstormProjects\kppdf-3.0
git pull

# 2. Конвертировать .sh в LF (ОБЯЗАТЕЛЬНО!)
sed -i 's/\r$//' deploy.sh deploy/deploy.sh deploy/synology/deploy.sh

# 3. Проверить deploy/.env
grep -v "^#" deploy/.env | grep -v "^$"

# 4. Проверить SSH
ssh -o ConnectTimeout=10 tiit@192.168.1.46 "echo OK"

# 5. Запустить деплой
bash deploy.sh --skip-seed
```

### После деплоя — проверить

| Проверка | Команда | Ожидание |
|----------|---------|----------|
| Backend | `curl http://192.168.1.46:3000/api/v1/health` | `{"status":"ok","mongodb":"connected"}` |
| Frontend | `curl -s -o /dev/null -w '%{http_code}' http://192.168.1.46/` | `200` |
| Monitoring | открыть `http://192.168.1.46:3001` в браузере | Дашборд с метриками |
| Docker | `ssh tiit@192.168.1.46 "sudo docker ps"` | Все 3 контейнера Up |

### Известные проблемы (чтоб не мучиться)

| Проблема | Решение |
|----------|---------|
| `$'\r': command not found` на сервере | **Забыли конвертировать .sh в LF!** → `sed -i 's/\r$//' deploy.sh` |
| `http://192.168.1.46:3001` не открывается | Monitoring слушает 127.0.0.1 → исправить на 0.0.0.0 в `server.py`, rebuild |
| `sudo: a password is required` | Пароль в `deploy/.env` → `DEPLOY_PASSWORD` |

### Адреса

| URL | Назначение |
|-----|------------|
| `https://sport-set.ru` | Production (через Cloudflare Tunnel) |
| `http://192.168.1.46:3000/` | Frontend (прямой доступ) |
| `http://192.168.1.46:3001/` | Дашборд мониторинга |
| `http://192.168.1.46:3000/api/v1/health` | Health API |

**Логин:** admin / admin123

---

## Команда разработки (opencode)

Система из **15 агентов** (1 primary + 14 subagent). Подробная карта и типичные разрывы — в `AGENTS.md` (раздел «Система агентов»).

> OpenCode: оркестр в `opencode.json`. Cursor: `AGENTS.md` + `.cursor/rules/` (архитектура, UI/BE по файлам, маршрут к `.opencode/agents/`).

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

## Source Of Truth

- **Статус задач:** YouGile «KPPDF — сейчас» · для AI: `.opencode/yougile-snapshot.yaml`
- Статус модулей (проценты, чеклисты, этапы): `.opencode/project-readiness.yaml`
- Архитектура и структура документации: `docs/ARCHITECTURE.md`, `docs/INDEX.md`
- Деплой (canonical): `DEPLOY.md`
- Onboarding (единая точка входа): `.opencode/audit/ONBOARDING.md`

## Лицензия

MIT
