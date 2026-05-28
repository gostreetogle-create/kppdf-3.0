# KPPDF 3.0 — RBAC: Чеклист реализации

> Пошаговый план внедрения ролевого доступа.
> **Приоритет:** P1 (критично для структуры) → P2 (функциональность) → P3 (улучшения)

---

## Фаза 1: Базовый Backend 🔧 [P1]

### 1.1. Миграция User.role → связанная роль

- [ ] Изменить `IUser.role: string` → `roleName: string` (ref → Role.name)
- [ ] Обновить `user.model.ts` (Mongoose schema)
- [ ] Обновить `user.interface.ts` (shared types)
- [ ] Обновить seed: пользователи ссылаются на существующие Role.name
- [ ] Написать миграцию для существующих users (если есть)

### 1.2. Обновление ALL_PERMISSIONS

- [ ] Расширить `ALL_PERMISSIONS` в `shared/types/role.interface.ts`
  - [ ] `office` секция: tenders, quotations, orders, counterparties, interactions, products
  - [ ] `production` секция: products, boms, techProcesses, operations, workOrders, workOrderOperations, productPassports
  - [ ] `accounting` секция: costCalculations, actualCosts, shippingDocs
  - [ ] `warehouse` секция: warehouses, stockMovements, reservations, purchaseRequests, purchaseOrders, shipments
  - [ ] `admin` секция: users, roles, settings, categories, statuses, workTypes, counters
  - [ ] Действия: `view`, `create`, `edit`, `delete`, `approve`
  - [ ] Добавить `group` (section name) для группировки в UI

### 1.3. Permission middleware (backend)

- [ ] Создать `backend/src/middleware/permission.ts`
  - [ ] Middleware `requirePermission(permissionCode: string)`
  - [ ] Декодировать JWT → roleName → загрузить Role из БД → проверить permission
  - [ ] Кешировать Role в `req.user.permissions` (чтобы не ходить в БД на каждый запрос)
- [ ] Применить к роутам:
  - [ ] Каждый роут CRUD-factory принимает `requirePermission` middleware
  - [ ] GET (list) → `*.view`
  - [ ] GET (single) → `*.view`
  - [ ] POST → `*.create`
  - [ ] PUT → `*.edit`
  - [ ] DELETE → `*.delete`

### 1.4. JWT payload — добавить permissions

- [ ] В `auth.service.ts` при логине загружать Role и включать permissions в JWT payload
- [ ] Обновить `JwtPayload` тип: добавить `permissions: string[]`
- [ ] После рефреша токена — перезагружать permissions из БД

### 1.5. Seed — новые роли

- [ ] Добавить в `seed.ts` роли:
  - [ ] `director` — `*.view` + `*.approve`
  - [ ] `manager` — `office.*`
  - [ ] `accountant` — `accounting.*`
  - [ ] `engineer` — `production.*` (кроме products.delete)
  - [ ] `foreman` — `production.workOrders.create/edit`, `production.operations.view`
  - [ ] `storekeeper` — `warehouse.*` (кроме purchaseOrders.create/edit/delete)
  - [ ] `purchaser` — `warehouse.purchaseRequests.*`, `warehouse.purchaseOrders.*`
  - [ ] `viewer` — `*.view` (кроме admin)
- [ ] Обновить тестовых пользователей: привязать к новым ролям

---

## Фаза 2: Frontend 🔧 [P1]

### 2.1. AuthService — permissions

- [ ] `auth.service.ts`:
  - [ ] После логина — загрузить permissions из JWT
  - [ ] Хранить `permissions: signal<string[]>` (reactive)
  - [ ] Метод `hasPermission(code: string): boolean`
  - [ ] Метод `hasSection(section: string): boolean` (есть ли хоть одно view в секции)
- [ ] `auth.guard.ts`:
  - [ ] `PermissionGuard` с параметром `requiredPermission`

### 2.2. Permission directive

- [ ] Создать `src/app/core/permission.directive.ts`:
  - [ ] `*appHasPermission="'office.tenders.edit'"` — скрывает элемент
  - [ ] `*appHasSection="'production'"` — показывает секцию меню
  - [ ] Использовать Angular structural directive с `else` template

### 2.3. Меню по роли

- [ ] **Админ-лейаут** (`admin-layout.component.ts`):
  - [ ] Показывать пункты меню только для секций, к которым есть доступ
  - [ ] Группировка меню по секциям (подзаголовки)
  - [ ] Пример:
    ```
    📋 Моя работа
      — Дашборд (всегда)
    🏢 Офис и продажи        (есть office.*)
      — Запросы → /modules
      — Справочники → /directories
    🏭 Производство          (есть production.*)
      — Модули → /modules
    📊 Финансы               (есть accounting.*)
      — Модули → /modules
    📦 Склад и логистика     (есть warehouse.*)
      — Модули → /modules
    ⚙️ Администрирование     (только admin)
      — Пользователи → /directories
      — Настройки → /directories
    ```

### 2.4. Страница модулей — кнопки по permission

- [ ] `modules-page.component.ts`:
  - [ ] Показывать только модули, доступные текущей роли
  - [ ] Кнопка «Создать» — только если есть `*.create`
  - [ ] Кнопка «Редактировать» в строке — только если есть `*.edit`
  - [ ] Кнопка «Удалить» — только если есть `*.delete`
  - [ ] Чекбоксы выбора — только если есть `*.delete`

### 2.5. Диалоги — поля по permission

- [ ] В формах:
  - [ ] Поля `disabled` если нет `*.edit`
  - [ ] Чекбокс «Активен» доступен только admin
  - [ ] System-поля (isSystem, isInitial) только admin

---

## Фаза 3: Дашборды 📊 [P1]

### 3.1. API — ролевой дашборд

- [ ] Новый endpoint: `GET /api/v1/dashboard/my`
- [ ] Возвращает данные в зависимости от роли пользователя:
  - [ ] **manager**: новые тендеры, КП-черновики, активные заказы
  - [ ] **engineer**: заказы без BOM, последние паспорта
  - [ ] **foreman**: наряды (pending/in_progress/completed)
  - [ ] **accountant**: незакрытые калькуляции, документы без фактур
  - [ ] **storekeeper**: заявки на закуп, заказы в пути, отгрузки сегодня
  - [ ] **purchaser**: заявки на закуп (approved → not ordered)
  - [ ] **director**: общая статистика + пункты на утверждение
  - [ ] **admin**: всё + системные метрики

### 3.2. UI — переписать дашборд

- [ ] `dashboard-page.component.ts`:
  - [ ] Загружать `GET /api/v1/dashboard/my`
  - [ ] Рендерить виджеты под текущую роль
  - [ ] Pipeline-воронка: Входящие → В работе → Готово
  - [ ] Для каждой секции — разный набор виджетов
  - [ ] Карточки ведут в соответствующий раздел (/modules с фильтром)

### 3.3. PageLayout — баннер роли

- [ ] В `page-layout.component.ts` добавить:
  - [ ] Название роли и секции пользователя
  - [ ] Быстрые ссылки на «Входящие» для роли

---

## Фаза 4: Профиль и управление 🔐 [P2]

### 4.1. Страница профиля

- [ ] Создать `MyProfilePageComponent`:
  - [ ] Смена пароля
  - [ ] Просмотр своей роли и прав
  - [ ] Список разрешений (readonly, в группировке по секциям)

### 4.2. UI управления ролями

- [ ] В `directories-page` добавить управление ролями:
  - [ ] При выборе роли — отобразить дерево permission-ов
  - [ ] Чекбоксы с группировкой по секциям → модулям → действиям
  - [ ] Аккордеон: секция (Офис) → модуль (Tenders) → чекбоксы (view, create, edit, delete)
  - [ ] Заголовки секций с иконками

### 4.3. Привязка роли к пользователю

- [ ] В диалоге пользователя:
  - [ ] Поле «Роль» — выпадающий список из Role (с label)
  - [ ] Показывать описание роли при выборе
  - [ ] Отображать список прав роли (для информации)

---

## Фаза 5: AuditLog 📝 [P2]

### 5.1. Backend

- [ ] Создать модель `AuditLog`:
  ```
  {
    userId: string,
    username: string,
    action: 'create' | 'update' | 'delete' | 'approve' | 'login',
    entityType: string,      // 'tender' | 'order' | ...
    entityId: string,
    changes: object,          // { field: { from, to } }
    timestamp: Date,
    ip: string
  }
  ```
- [ ] Middleware `auditLog(entityType)` — автоматически логировать CRUD
- [ ] Endpoint `GET /api/v1/audit-log?entityType=tender&entityId=xxx`
- [ ] Endpoint `GET /api/v1/audit-log?userId=xxx` (история действий сотрудника)

### 5.2. Frontend

- [ ] Кнопка «История» в диалогах (только для ролей с доступом)
- [ ] Таблица лога: дата, пользователь, действие, изменения
- [ ] Фильтр по дате, типу, пользователю

---

## Фаза 6: Уведомления 🔔 [P3]

### 6.1. Backend

- [ ] Создать модель `Notification`:
  ```
  {
    userId: string,
    type: 'tender.new' | 'order.ready' | 'purchase.need_approve' | ...,
    title: string,
    message: string,
    link: string,            // router link
    isRead: boolean,
    createdAt: Date
  }
  ```
- [ ] При смене статуса документа — уведомлять следующего в цепочке:
  - [ ] Tender (new) → manager
  - [ ] Quotation (accepted) → engineer (need BOM)
  - [ ] WorkOrder (completed) → storekeeper (need shipment)
  - [ ] PurchaseRequest (approved) → purchaser
  - [ ] PurchaseOrder (received) → storekeeper (need receipt)

### 6.2. Frontend

- [ ] Бэйдж непрочитанных в сайдбаре
- [ ] Dropdown-список последних 5 уведомлений
- [ ] Страница всех уведомлений

---

## Фаза 7: Полировка 🎨 [P3]

### 7.1. UI — единый стиль секций

- [ ] Каждая секция — свой цвет акцента в дашборде:
  - 🏢 **Офис** — синий (#3b82f6)
  - 🏭 **Производство** — оранжевый (#f59e0b)
  - 📊 **Бухгалтерия** — зелёный (#10b981)
  - 📦 **Склад** — фиолетовый (#8b5cf6)
  - ⚙️ **Админ** — серый (#6b7280)
- [ ] Иконки для каждой секции в меню и дашборде

### 7.2. Локализация

- [ ] Все permission-коды показаны в UI на русском языке
- [ ] Названия секций в sidebar — русские (с иконками)
- [ ] Описания ролей — на русском

### 7.3. Тесты

- [ ] Backend: unit-тесты permission middleware
- [ ] Backend: integration-тесты: запрос без permission → 403
- [ ] Frontend: unit-тесты permission directive
- [ ] Frontend: component-тесты: кнопки скрыты без permission

---

## MVP: Только P1 (5-7 дней)

Пользователь сказал **«не слишком усложнять»**. Поэтому MVP — только то, без чего система не работает как RBAC:

| Фаза | Дней | Что делаем |
|------|------|-----------|
| **1. Backend RBAC** | 2-3 | Permission middleware + ALL_PERMISSIONS + обновление User.role → roleName + seed |
| **2. Frontend RBAC** | 2-3 | AuthService permissions + directive + меню по роли + кнопки в модулях |
| **3. Дашборд** | 1 | API `/dashboard/my` + виджеты под роль + воронка «получил → передал» |

**Остальное — в будущие итерации:**
- Профиль, AuditLog, Уведомления, Полировка — только после внедрения базового RBAC

### Первые шаги (что делать прямо сейчас):

1. ✅ `KPPDF-RBAC-АНАЛИЗ.md` — готов
2. ✅ `KPPDF-RBAC-ЧЕКЛИСТ.md` — готов
3. ⏳ **Расширить `ALL_PERMISSIONS`** в `shared/types/role.interface.ts` (все секции + модули)
4. ⏳ **Создать middleware `permission.ts`** (backend) — проверка по JWT permissions
5. ⏳ **Обновить seed** — новые роли (director, accountant, foreman, purchaser) + тестовые пользователи
6. ⏳ **Начать frontend**: permissions в AuthService + permission directive
