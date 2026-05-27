# Контекст проекта KPPDF 3.0

> PLM + ERP + CRM платформа для малого производства.

## О проекте

**KPPDF 3.0** — профессиональная система управления производством, заменяющая разрозненные Excel-таблицы и бумажные журналы единой платформой.

### Что делает проект
- Управление жизненным циклом изделия (PLM): спецификации BOM, техпроцессы, операции
- Планирование производства (ERP): закупки, склад, себестоимость, наряды
- Взаимодействие с клиентами (CRM): заказы, коммерческие предложения
- Compliance-контроль: проверка изделий на соответствие ТЗ и ГОСТ
- Статусная модель: каждый документ проходит жизненный цикл (черновик → подтверждён → в работе → выполнен)

### Целевые пользователи
- **Инженеры-конструкторы** — работа со спецификациями, BOM, техпроцессами
- **Менеджеры производства** — планирование закупок, нарядов, отгрузок
- **Кладовщики** — учёт материалов, резервирование, движения склада
- **Руководители** — дашборд, аналитика, compliance-контроль

### Ключевые сценарии
1. Создание заказа клиента → формирование BOM → расчёт себестоимости
2. Закупка материалов → приход на склад → резервирование под заказ
3. Производственный наряд → техпроцесс → отгрузка готовой продукции
4. Проверка изделия на соответствие ТЗ → формирование паспорта

### Технологический стек
| Компонент | Технология | Версия |
|-----------|-----------|--------|
| Frontend | Angular (Standalone, Signals, OnPush) | 21+ |
| UI Kit | PrimeNG + PrimeIcons + Aura compact пресет | 21+ |
| Стилизация | SCSS + BEM (только layout) + CSS-токены | — |
| Backend | Express.js + TypeScript (strict) | 4.21+ |
| База данных | MongoDB + Mongoose (in-memory для dev) | 8.x |
| Аутентификация | JWT (access 15m + refresh 7d) + bcrypt + RBAC | — |
| Тестирование | Jest (backend), Jasmine/Karma (frontend) | — |
| Линтинг | ESLint 9 flat config | — |

## Архитектура

### Структура папок (frontend)
```
src/app/
├── core/              # ApiService, AuthService, DirectoryService, NotificationService
│   ├── api.service.ts       # HTTP-клиент (get/post/put/delete)
│   ├── auth.service.ts      # JWT логин/рефреш/логаут
│   ├── auth.guard.ts        # Route guard (canActivate)
│   ├── auth.interceptor.ts  # Bearer token + auto-refresh
│   ├── directory.service.ts # CRUD для 8 справочников
│   └── notification.service.ts # Toast-уведомления
├── shared/            # Переиспользуемые UI-компоненты, типы
│   ├── services/      # CrudApiService (CRUD для 18 бизнес-модулей)
│   └── ui/            # EmptyState, PageLayout
├── features/          # Страницы и сценарии (lazy routes)
│   ├── dashboard/, directories/, modules/, login/, …
└── layout/
    └── admin-layout/  # Сайдбар + навигация + router-outlet
```

### Слои импортов (строгие)
```
core/ → shared/ → features/ → layout/
```
- `shared/` не импортирует `features/`, `layout/`, `core/`
- `features/` не импортирует `layout/` и другие `features/*`
- `layout/` может импортировать всё выше

### Структура папок (backend)
```
backend/src/
├── config/            # index.ts (env, port, mongoUri, jwt)
│   └── db.ts          # MongoDB connection
├── middleware/         # auth.ts, error-handler.ts, validate.ts
├── modules/           # 26 модулей + auth + dashboard + health
├── utils/             # api-response.ts, crud-factory.ts
├── types/             # auth типы
├── __tests__/         # Unit-тесты (CRUD factory, Auth)
├── app.ts             # Express app (все роуты)
├── index.ts           # Точка входа
└── seed.ts            # 260+ тестовых записей
```

## Ключевые архитектурные решения

| Решение | Обоснование |
|---------|------------|
| **Signals вместо NgRx** | PLM/ERP не требует сложного стейта; Signals достаточно |
| **PrimeNG Aura compact** | Минималистичный UI, компактные отступы |
| **Standalone компоненты** | Angular 21 стандарт, без NgModules |
| **OnPush Change Detection** | Производительность; сигналы работают оптимально |
| **MongoDB (не SQL)** | Гибкая схема для EAV-атрибутов |
| **CRUD Factory** | Generic-роутер = 26 endpoint'ов без дублирования |
| **`any` запрещён → `unknown`** | type-safety на уровне TS strict |
| **Только `inject()`** | Без constructor DI (устаревший паттерн) |
| **BEM только для layout** | PrimeNG для UI-элементов, BEM для обёрток |
| **Linear-inspired дизайн** | Тёмный сайдбар, лавандовый акцент, строгая иерархия бордеров |

## Терминология

| Термин | Значение |
|--------|----------|
| **BOM** | Bill of Materials — спецификация изделия (многоуровневая) |
| **EAV** | Entity-Attribute-Value — гибкие атрибуты |
| **PLM** | Product Lifecycle Management |
| **ERP** | Enterprise Resource Planning |
| **CRM** | Customer Relationship Management |
| **Compliance** | Проверка соответствия изделия ТЗ и ГОСТ |
| **Entity** | Одна из 8 таблиц справочников |
| **Directory** | Справочник — таблица-перечисление (8 шт) |
| **Work Order** | Производственный наряд |

## Статус разработки

| Этап | Описание | Статус |
|------|----------|--------|
| 0 | Фундамент (система агентов, opencode) | ✅ |
| 1 | Backend scaffold (26 модулей, CRUD Factory, seed) | ✅ |
| 2 | Frontend scaffold (Angular, PrimeNG, pages, routing) | ✅ |
| 3 | PLM-ядро (заказы, BOM, 18 бизнес-модулей) | ✅ |
| 4 | ERP-функции (закупки, склад, себестоимость) | ⏳ |
| 5 | Compliance (проверки по ТЗ и ГОСТ) | ⏳ |
| 6 | Деплой и документация | ⏳ |
#### Last updated: May 2026
