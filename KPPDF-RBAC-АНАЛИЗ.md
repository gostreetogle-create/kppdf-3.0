# KPPDF 3.0 — RBAC: Роли, Разделы, Доступы

> Аналитика системы управления доступом на основе ролей.
> Бизнес-блоки, роли, разрешения, дашборды и архитектура реализации.

---

## 1. Бизнес-блоки (секции)

Воронка предприятия — **«получил входные → обработал → передал дальше»**:

```
           ┌─────────────┐
           │   ВХОДЯЩИЕ   │
           │  (Тендеры)   │
           └──────┬──────┘
                  │
           ┌──────▼──────┐
     ┌─────┤1. ОФИС И │     │
     │     │ ПРОДАЖИ  │     │
     │     │ (Продажи)   │     │
     │     └──────┬──────┘     │
     │            │            │
     │     ┌──────▼──────┐     │
     │     │  2. ПРОИЗ-   │     │
     │     │   ВОДСТВО    │     │
     │     └──────┬──────┘     │
     │            │            │
┌────▼────┐ ┌────▼────┐ ┌─────▼─────┐
│ 4. СКЛАД │ │3. БУХ-   │ │           │
│ (Матери- │ │ ГАЛТЕРИЯ │ │ (Готовая  │
│  алы)    │ │(Затраты) │ │  продак- │
└──────────┘ └──────────┘ │  ция)    │
                          └──────────┘
```

### 1.1. 🏢 ОФИС И ПРОДАЖИ (CRM-воронка)

| # | Модуль | Суть | Откуда приходит | Куда передаёт |
|---|--------|------|----------------|---------------|
| 1 | **Tenders** (Запросы) | Входящие запросы 44-ФЗ | Email / Площадки | → КП |
| 2 | **Quotations** (КП) | Коммерческие предложения | Tenders (approved) | → Заказы |
| 3 | **Orders** (Заказы) | Заказы клиентов | КП (accepted) | → Производство / Склад |
| 4 | **Counterparties** | Контрагенты (клиенты + наши компании) | Вручную | — |
| 5 | **Interactions** | Лог общения с клиентом | Вручную | — |
| 6 | **Products** (просмотр) | Справочник товаров | — | — |

**Зона ответственности:** CRM-воронка. Кто-то присылает запрос → менеджер обрабатывает → создаёт КП → получает заказ → передаёт в работу.

### 1.2. 🏭 ПРОИЗВОДСТВО (Изготовление)

| # | Модуль | Суть | Откуда приходит | Куда передаёт |
|---|--------|------|----------------|---------------|
| 1 | **BOM** (Спецификации) | Состав изделия | Инженер | → Техпроцесс |
| 2 | **TechProcesses** (Техпроцессы) | Маршрут изготовления | BOM | → Наряды |
| 3 | **Operations** (Операции) | Справочник операций | Вручную | → Техпроцесс |
| 4 | **WorkOrders** (Наряды) | Производственное задание | Заказы / Техпроцессы | → Склад (на отгрузку) |
| 5 | **WorkOrderOperations** (Операции нарядов) | Выполнение по шагам | Наряды | → ОТК |
| 6 | **ProductPassports** (Паспорта) | Паспорт изделия | Наряды (completed) | → Клиенту |
| 7 | **Products** (техполя) | Товары (вес, размеры, материалы) | Инженер | — |

**Зона ответственности:** Сделать продукт. Получил заказ → разработал BOM → создал техпроцесс → выдал наряд → изготовил → оформил паспорт → передал на склад.

### 1.3. 📊 БУХГАЛТЕРИЯ (Финансы и отчётность)

| # | Модуль | Суть | Откуда приходит | Куда передаёт |
|---|--------|------|----------------|---------------|
| 1 | **CostCalculations** (Калькуляции) | Расчёт себестоимости | BOM + TechProcesses | → Отчёт |
| 2 | **ActualCosts** (Факт. затраты) | Реальные затраты по заказу | Склад + Производство | → Фин. анализ |
| 3 | **ShippingDocs** (Отгруз. документы) | ТОРГ-12, счета-фактуры | Отгрузки | → Клиенту |
| 4 | **Counterparties** (реквизиты) | Просмотр реквизитов | — | — |
| 5 | **Orders** (просмотр) | Просмотр заказов | — | — |

**Зона ответственности:** Контроль денег. Рассчитал себестоимость → собрал фактические затраты → закрыл документами.

### 1.4. 📦 СКЛАД И ЛОГИСТИКА (Материалы + Отгрузка)

| # | Модуль | Суть | Откуда приходит | Куда передаёт |
|---|--------|------|----------------|---------------|
| 1 | **Warehouses** (Склады) | Справочник складов | — | — |
| 2 | **StockMovements** (Движения) | Приход / расход / перемещение | Закупки / Производство | — |
| 3 | **Reservations** (Резервы) | Резервирование под заказ | Заказы | → Производство |
| 4 | **PurchaseRequests** (Заявки на закуп) | Потребность в материалах | Производство / склад | → Заказы поставщикам |
| 5 | **PurchaseOrders** (Заказы поставщикам) | Закупка материалов | Заявки на закуп | → Поставщик |
| 6 | **Shipments** (Отгрузки) | Отгрузка клиенту | Склад ГП | → Бухгалтерия |
| 7 | **Products** (остатки) | Просмотр остатков | — | — |

**Зона ответственности:** Всё, что движется. Получил заявку → закупил → оприходовал → выдал в производство → отгрузил готовое.

---

## 2. Роли (Roles)

### 2.1. Системные роли

| Роль | Код | Описание | Блок |
|------|-----|----------|------|
| **Администратор** | `admin` | Полный доступ ко всему. Управление системой. | Все |
| **Директор** | `director` | Видит всё, утверждает ключевые решения | Все (read + approve) |

### 2.2. Роль «Офис»

| Роль | Код | Описание | Воронка |
|------|-----|----------|---------|
| **Менеджер** | `manager` | Тендеры → КП → Заказы → Контрагенты | Входящие → Обработал → Передал |

### 2.3. Роли «Производство»

| Роль | Код | Описание | Воронка |
|------|-----|----------|---------|
| **Инженер-конструктор** | `engineer` | BOM → Техпроцессы → Операции → Паспорта | Спроектировал → Передал в цех |
| **Мастер цеха** | `foreman` | Наряды → Операции → Паспорта (создание) | Получил задание → Выполнил → Сдал |

### 2.4. Роли «Бухгалтерия»

| Роль | Код | Описание | Воронка |
|------|-----|----------|---------|
| **Бухгалтер** | `accountant` | Калькуляции → Затраты → Отгруз. документы | Рассчитал → Закрыл |

### 2.5. Роли «Склад и логистика»

| Роль | Код | Описание | Воронка |
|------|-----|----------|---------|
| **Зав. складом** | `storekeeper` | Склады → Движения → Резервы → Закупки → Отгрузки | Получил → Оприходовал → Выдал → Отгрузил |
| **Снабженец** | `purchaser` | Заявки → Заказы поставщикам | Запросили → Закупил |

### 2.6. Пассивная

| Роль | Код | Описание |
|------|-----|----------|
| **Наблюдатель** | `viewer` | Только просмотр: Офис + Производство + Бухгалтерия + Склад. Без admin-модулей. |

---

## 3. Модель разрешений (Permissions)

### 3.1. Формат

```
<секция>.<модуль>.<действие>
```

- **секция:** `office` / `production` / `accounting` / `warehouse` / `admin`
- **модуль:** `tenders` / `quotations` / `orders` / `boms` / ... / `products`
- **действие:** `view` / `create` / `edit` / `delete` / `approve`
- **wildcard:** `office.*` — всё в секции Офис, `*.view` — везде просмотр

### 3.2. Полный справочник разрешений

#### Офис

```
office.tenders.view
office.tenders.create
office.tenders.edit
office.tenders.delete
office.quotations.view
office.quotations.create
office.quotations.edit
office.quotations.delete
office.quotations.approve
office.orders.view
office.orders.create
office.orders.edit
office.orders.delete
office.orders.approve
office.counterparties.view
office.counterparties.create
office.counterparties.edit
office.counterparties.delete
office.interactions.view
office.interactions.create
office.interactions.edit (удалить нельзя — лог)
office.products.view
```

#### Производство

```
production.products.edit          (тех. поля: габариты, вес, материалы)
production.boms.view
production.boms.create
production.boms.edit
production.boms.delete
production.techProcesses.view
production.techProcesses.create
production.techProcesses.edit
production.techProcesses.delete
production.operations.view
production.operations.create
production.operations.edit
production.operations.delete
production.workOrders.view
production.workOrders.create
production.workOrders.edit
production.workOrders.delete
production.workOrderOperations.view
production.workOrderOperations.create
production.workOrderOperations.edit
production.productPassports.view
production.productPassports.create
production.productPassports.edit
production.productPassports.delete
```

#### Бухгалтерия

```
accounting.costCalculations.view
accounting.costCalculations.create
accounting.costCalculations.edit
accounting.actualCosts.view
accounting.actualCosts.create
accounting.actualCosts.edit
accounting.shippingDocs.view
accounting.shippingDocs.create
accounting.shippingDocs.edit
accounting.shippingDocs.delete
accounting.orders.view              (просмотр)
accounting.counterparties.view      (реквизиты)
```

#### Склад

```
warehouse.warehouses.view
warehouse.warehouses.create
warehouse.warehouses.edit
warehouse.stockMovements.view
warehouse.stockMovements.create
warehouse.stockMovements.edit       (корректировки)
warehouse.reservations.view
warehouse.reservations.create
warehouse.reservations.edit
warehouse.reservations.delete
warehouse.purchaseRequests.view
warehouse.purchaseRequests.create
warehouse.purchaseRequests.edit
warehouse.purchaseRequests.delete
warehouse.purchaseRequests.approve
warehouse.purchaseOrders.view
warehouse.purchaseOrders.create
warehouse.purchaseOrders.edit
warehouse.purchaseOrders.delete
warehouse.shipments.view
warehouse.shipments.create
warehouse.shipments.edit
warehouse.shipments.delete
warehouse.products.view             (остатки)
```

#### Администрирование

```
admin.users.view
admin.users.create
admin.users.edit
admin.users.delete
admin.roles.view
admin.roles.create
admin.roles.edit
admin.roles.delete
admin.settings.view
admin.settings.edit
admin.categories.view
admin.categories.create
admin.categories.edit
admin.categories.delete
admin.statuses.view
admin.statuses.create
admin.statuses.edit
admin.statuses.delete
admin.workTypes.view
admin.workTypes.create
admin.workTypes.edit
admin.workTypes.delete
admin.counters.view                 (просмотр счётчиков)
admin.counters.edit                 (корректировка seq)
```

| Разрешение | admin | director | manager | accountant | engineer | foreman | storekeeper | purchaser | viewer |
|---|---|---|---|---|---|---|---|---|---|
| `office.*.view` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `production.*.view` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `accounting.*.view` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `warehouse.*.view` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `office.tenders.*` | ✅ | ✅ (approve🗸) | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `office.quotations.*` | ✅ | ✅ (approve🗸) | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `office.orders.*` | ✅ | ✅ (approve🗸) | ✅ | view | ❌ | ❌ | view | ❌ | ❌ |
| `office.counterparties.*` | ✅ | ✅ | ✅ | view | ❌ | ❌ | view | view | ❌ |
| `office.interactions.*` | ✅ | view | ✅ | ❌ | view | view | view | ❌ | ❌ |
| `production.products.edit` | ✅ | edit | view | ❌ | ✅ | edit | view | ❌ | ❌ |
| `production.boms.*` | ✅ | view | ❌ | ❌ | ✅ | view | ❌ | ❌ | ❌ |
| `production.techProcesses.*` | ✅ | view | ❌ | ❌ | ✅ | view | ❌ | ❌ | ❌ |
| `production.operations.*` | ✅ | view | ❌ | ❌ | ✅ | view | ❌ | ❌ | ❌ |
| `production.workOrders.*` | ✅ | view | view | ❌ | create | create/edit | ❌ | ❌ | ❌ |
| `production.workOrderOperations.*` | ✅ | view | ❌ | ❌ | view | create/edit | ❌ | ❌ | ❌ |
| `production.productPassports.*` | ✅ | view | ❌ | ❌ | ✅ | create | ❌ | ❌ | ❌ |
| `accounting.costCalculations.*` | ✅ | view | ❌ | ✅ | view | ❌ | ❌ | ❌ | ❌ |
| `accounting.actualCosts.*` | ✅ | view | ❌ | ✅ | create | ❌ | ❌ | ❌ | ❌ |
| `accounting.shippingDocs.*` | ✅ | view | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `accounting.orders.view` | ✅ | view | view | ✅ | view | view | view | view | ✅ |
| `accounting.counterparties.view` | ✅ | view | view | ✅ | view | view | view | view | ✅ |
| `warehouse.warehouses.*` | ✅ | view | ❌ | ❌ | ❌ | ❌ | ✅ | view | ❌ |
| `warehouse.stockMovements.*` | ✅ | view | ❌ | ❌ | ❌ | ❌ | ✅ | view | ❌ |
| `warehouse.reservations.*` | ✅ | view | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ |
| `warehouse.purchaseRequests.*` | ✅ | approve | ❌ | ❌ | create | ❌ | ✅ | ✅ | ❌ |
| `warehouse.purchaseOrders.*` | ✅ | approve | ❌ | ❌ | ❌ | ❌ | view | ✅ | ❌ |
| `warehouse.shipments.*` | ✅ | view | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ |
| `admin.*` | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |

> ✅ = полный CRUD, view = только просмотр, create = только создание, edit = редактирование, approve = утверждение
>
> **Примечание по viewer:** viewer не имеет доступа к admin-модулям (users, roles, settings, categories, statuses, workTypes, counters). `office.*.view` = только Офис, аналогично для других секций.

---

## 4. Дашборды (Role-based Dashboard)

### 4.1. Принцип: «Получил → Сделал → Передал»

Каждый дашборд строится как **воронка ответственности** роли:

```
┌───────────────┐     ┌───────────────┐     ┌───────────────┐
│    ВХОДЯЩЕЕ    │ ──▶ │   В РАБОТЕ    │ ──▶ │   ГОТОВО /    │
│ (ждут действий)│     │ (мои задачи)  │     │   ПЕРЕДАНО    │
└───────────────┘     └───────────────┘     └───────────────┘
```

### 4.2. Виджеты для каждого дашборда

#### 🏢 Офис (менеджер)

```
┌──────────────────────────────────────────────────────────┐
│ Входящие запросы (Tenders)                               │
│ ┌─────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐             │
│ │ NEW │ │IN_   │ │KP_   │ │ WON  │ │ LOST │             │
│ │  12  │ │PROG  │ │SENT  │ │   5  │ │   3  │             │
│ └─────┘ └──────┘ └──────┘ └──────┘ └──────┘             │
├──────────────────────────────────────────────────────────┤
│ Мои КП (черновики)                     Мои Заказы (активные)│
│ ┌──────────────────┐                  ┌──────────────────┐│
│ │ КП-2026-001 → 45%│                  │ З-2026-001 → 60% ││
│ │ КП-2026-003 → 20%│                  │ З-2026-002 → 30% ││
│ └──────────────────┘                  └──────────────────┘│
└──────────────────────────────────────────────────────────┘
```

#### 🏭 Производство (инженер)

```
┌──────────────────────────────────────────────────────────┐
│ Заказы к проектированию         Мои BOM / Техпроцессы    │
│ ┌─────────────┐                 ┌──────────────────┐     │
│ │ Заказ #001  │                 │ BOM v2 — Лист 3мм│     │
│ │ Заказ #003  │                 │ ТП — Труба 40x20 │     │
│ └─────────────┘                 └──────────────────┘     │
├──────────────────────────────────────────────────────────┤
│ Паспорта к оформлению           Последние паспорта       │
│ ┌──────────────────┐            ┌──────────────────┐     │
│ │ Наряд Н-001 гот. │            │ ПС-225 — Стойка  │     │
│ └──────────────────┘            └──────────────────┘     │
└──────────────────────────────────────────────────────────┘
```

#### 🏭 Производство (мастер)

```
┌──────────────────────────────────────────────────────────┐
│ Мои наряды (pending → in_progress → completed)           │
│ ┌────────┐  ┌────────┐  ┌────────┐  ┌────────┐          │
│ │  NEW   │  │ IN_    │  │ DONE   │  │ ALL    │          │
│ │   2    │  │ PROGR. │  │   1    │  │   4    │          │
│ │        │  │   1    │  │        │  │        │          │
│ └────────┘  └────────┘  └────────┘  └────────┘          │
├──────────────────────────────────────────────────────────┤
│ Операции сегодня                                          │
│ ┌──────────────────────────────────────────────────────┐ │
│ │ ⏳ Н-002: Сборка контроллеров (Фрезеровка — 50%)    │ │
│ │ ✅ Н-001: Резка листа — выполнено                    │ │
│ └──────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────┘
```

#### 📊 Бухгалтерия

```
┌──────────────────────────────────────────────────────────┐
│ Калькуляции (ожидают)           Фактические затраты       │
│ ┌─────────────┐                 ┌──────────────────┐     │
│ │ Заказ #003  │                 │ Заказ #001: 198k  │     │
│ │ Заказ #004  │                 │ Заказ #003: 520k  │     │
│ └─────────────┘                 └──────────────────┘     │
├──────────────────────────────────────────────────────────┤
│ Документы к закрытию                                      │
│ ┌──────────────────────────────────────────────────────┐ │
│ │ 🟡 Отгрузка ОТ-002 — нет документов                  │ │
│ │ ✅ Отгрузка ОТ-001 — ТОРГ-12 + Счёт-фактура          │ │
│ └──────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────┘
```

#### 📦 Склад

```
┌──────────────────────────────────────────────────────────┐
│ Заявки на закуп                  Заказы поставщикам      │
│ ┌──────┐ ┌────────┐ ┌────────┐  ┌──────┐ ┌────────┐    │
│ │DRAFT │ │APPROVED│ │ORDERED │  │SENT  │ │CONFIRM │    │
│ │  1   │ │   2    │ │   1    │  │  1   │ │   1    │    │
│ └──────┘ └────────┘ └────────┘  └──────┘ └────────┘    │
├──────────────────────────────────────────────────────────┤
│ Приходы (сегодня)                 Отгрузки (сегодня)     │
│ ┌──────────────┐                  ┌──────────────┐      │
│ │ ПЗ-004:     │                  │ ОТ-002:      │      │
│ │ Нержавейка  │                  │ Контроллеры  │      │
│ └──────────────┘                  └──────────────┘      │
└──────────────────────────────────────────────────────────┘
```

#### 👑 Директор

```
┌──────────────────────────────────────────────────────────┐
│ Общая картина предприятия                                 │
│ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ │
│ │ Запросы│ │   КП   │ │ Заказы │ │Наряды  │ │Отгрузки│ │
│ │  27    │ │   5    │ │   4    │ │   4    │ │   2    │ │
│ └────────┘ └────────┘ └────────┘ └────────┘ └────────┘ │
├──────────────────────────────────────────────────────────┤
│ Pipeline: Запрос → КП → Заказ → Производство → Отгрузка  │
│ ████████████████████░░░░░░░░░░░░░░░░░░░░░░░░ 45%         │
├──────────────────────────────────────────────────────────┤
│ На утверждении                                            │
│ ┌──────────────────────────────────────────────────────┐ │
│ │ 🔴 Закупка ПЗ-005 > 1М — требует подтверждения      │ │
│ │ 🟡 Заказ З-005 — новый клиент, проверить условия     │ │
│ └──────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────┘
```

---

## 5. Архитектура реализации

### 5.1. Backend

```
backend/src/
├── middleware/
│   ├── auth.ts              ← JWT-аутентификация (есть)
│   └── permission.ts        ← НОВОЕ: проверка permissions
│                              per-route + per-action
├── modules/
│   ├── roles/
│   │   ├── role.model.ts    ← уже есть (permissions: string[])
│   │   └── role.router.ts   ← уже есть (CRUD)
│   ├── users/
│   │   ├── user.model.ts    ← ИЗМЕНИТЬ: role → roleName
│   │   │                      (ссылка на Role.name)
│   │   └── user.router.ts   ← уже есть (CRUD)
│   └── ...
└── types/
    └── auth.ts              ← ИЗМЕНИТЬ: AuthRequest → permissions[]
```

### 5.2. Frontend

```
src/app/
├── core/
│   ├── auth.service.ts      ← ИЗМЕНИТЬ: хранить permissions
│   ├── auth.guard.ts        ← ИЗМЕНИТЬ: permission guard
│   └── permission.directive.ts  ← НОВОЕ: *appHasPermission="'office.tenders.edit'"
├── pages/
│   ├── admin-layout/
│   │   └── admin-layout.component.ts  ← ИЗМЕНИТЬ: меню по роли
│   ├── dashboard/
│   │   └── dashboard-page.component.ts  ← ПЕРЕПИСАТЬ: ролевой дашборд
│   └── modules/
│       └── modules-page.component.ts  ← ИЗМЕНИТЬ: кнопки по permission
└── shared/
    └── services/
        └── crud-api.service.ts  ← ИЗМЕНИТЬ: заголовок X-Permissions
```

### 5.3. Поток проверки доступа

```
1. Login → сервер возвращает JWT с { userId, username, roleName }
2. Получить permissions роли:
   GET /api/v1/directories/roles?filters={name: roleName}
3. Хранить permissions в AuthService (Reactive)
4. Backend middleware: проверить permission на каждый запрос
5. Frontend guard: проверить permission на маршрут
6. Frontend directive: скрыть кнопки без permission
```

---

## 6. Что упущено / можно улучшить

| Вопрос | Ответ |
|--------|-------|
| **Названия блоков** | Утверждено: **«Офис и продажи»**, **«Производство»**, **«Бухгалтерия»**, **«Склад»**. «Офис» расширен до «Офис и продажи» для ясности CRM-воронки. «Бухгалтерия» и «Склад» оставлены как есть — привычные названия для сотрудников |
| **Нужен ли «Тендерный отдел»?** | Можно выделить роль `tender-manager` внутри Офиса, если тендеров >50/мес |
| **Нужен ли «ОТК»?** | Пока внутри Производства (мастер фиксирует). Если ОТК — отдел: роль `qc-inspector` с разрешением `production.workOrderOperations.edit` (закрытие) |
| **Нужна ли роль «Руководитель производства»?** | Да, `production-manager` — видит всё в Производстве + утверждает наряды. Сейчас это частично `director`, частично `engineer`. Лучше выделить |
| **Уведомления?** | Будущее: при смене статуса → уведомление следующему в цепочке (`tender → manager`, `order → engineer`, `stock → storekeeper`) |
| **История действий?** | **Нужен `AuditLog` — P2** (не P3). Кто, когда, что изменил — критично для доверия к системе. Без audit-лога нельзя отследить «кто передал и кому» |

---

## 7. Итоговая схема данных

```
User ──→ Role ──→ Permission[]
 │                ├── office.tenders.view
 │                ├── office.tenders.create
 │                ├── office.quotations.*
 │                └── ...
 │
 ├── username
 ├── displayName
 ├── roleName (ref → Role.name)
 ├── isActive
 └── lastLoginAt

Role
 ├── name (unique)
 ├── label (человеческое имя)
 ├── description
 ├── permissions: string[]
 ├── isSystem
 └── sortOrder
```
