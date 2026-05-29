# Backlog

## Session 2026-05-28

**Закрыто сегодня** (коммиты до `e084cee` включительно):

- [x] **kp-button inline → scss** — стили в `kp-button.component.scss` + `_kp-button.scss`, глобальный блок 390–425 удалён
- [x] **kp-button `variant="premium"`** — миксины, host-классы, матрица в `ui-manifest.md`
- [x] **Login polish** — premium-кнопка входа, карточка auth, freeze-хеши login/platform
- [x] **P0 readiness / FreezeGuard** — синхронизация lock-хешей после UI-кита (`e084cee`)
- [x] **QuotationEditor UX** — таблицы products+services, product picker, заголовок КП, UI-кит в диалогах

**Открыто на следующую сессию** (P1/P2 — не трогать без задачи):

- [ ] Динамические колонки таблицы из конфига типа (`IDocumentTableType.columns`) — см. P1 ниже
- [ ] Настройки типов таблиц — `dataSource` кроме `products` (productKind ✅ в модели)
- [ ] EAV в tenders / orders (дублирует P2 ниже)
- [ ] login MessageService → NotificationService

> **Architecture Hardening review:** перед execution волн playbook — [plan § Чеклисты актуальности](.cursor/plans/microarchitecture_audit_7104360d.plan.md) (фильтр ACTUAL/PARTIAL/DONE/OBSOLETE). Сверка с backlog — §E plan.

---

## P0 (инварианты — запрещено удалять без миграции)
- [x] **QuotationEditor** — маршрут `/quotations/:id`, компонент `QuotationEditorComponent`.
      Случайно удалён в `f74863a` (Angular 19+ migration) как побочный ущерб рефакторинга.
      Восстановлен как `features/quotations/quotation-editor.component.ts`.
      Любая миграция/рефакторинг/удаление — только с задачей и approval @chief-architect.

## Закрыто
- [x] Cursor bridge, audit, modules kp-crud, EAV admin, attributes kp-*
- [x] EAV в products (диалог редактирования)

## P1 (QuotationEditor — таблицы)
- [x] **Панель блоков и порядок секций** — rail 280px, форматирование, drag по контенту, замок порядка (по умолчанию открыт), **открытие панели по клику**, цвет фона, drag таблицы.
      Док: [src/app/features/quotations/QUOTATION-EDITOR-BLOCKS.md](../../src/app/features/quotations/QUOTATION-EDITOR-BLOCKS.md).
- [x] **Добавление таблицы** — меню «+» → тип (Товары / Услуги) → «Добавить таблицу»; несколько типов на листе, позиции по `tableKind`.
- [x] **Product picker в таблице** — «Выбрать товары/услуги», модалка с paginator и футером «Добавить N товаров» (без chip-корзины).
      Док: [src/app/shared/ui/kp-product-picker/README.md](../../src/app/shared/ui/kp-product-picker/README.md).
- [x] **Персистенция `tableKind`** — `shared/types`, Mongoose, нормализация в редакторе.
- [x] **QuotationEditor: типы таблиц из API** — `/document-table-types` + fallback; админка CRUD.
- [ ] **Динамические колонки таблицы из конфига типа** — рендер по `IDocumentTableType.columns` (сейчас фиксированная сетка колонок). Каноничный пункт.
- [ ] **Настройки типов таблиц — доработки** — `productKind` в модели ✅ (2026-05-28); остаётся: другие `dataSource` кроме `products`.
      План: [.opencode/audit/plans/quotation-document-tables.md](plans/quotation-document-tables.md).

## P2 (опционально)
- [ ] EAV в tenders / orders
- [ ] login MessageService → NotificationService
- [x] kp-button inline → scss (UniButton: стили в kp-button.component.scss, global 390–425 удалён)
- [x] **[AUDIT] kp-button `variant="premium"`** — реализован (2026-05-28). Миксины в `_kp-button.scss`, host-классы `kp-button--variant-*/severity-*`, матрица severity×variant задокументирована в `ui-manifest.md`. Login: `[block]="true"` + `styleClass="auth__submit-btn"` только для purple-цвета; интеракции из `variant='premium'`.
## Введение производства — бизнес-логика (2026-05-29)

Производственный контур — ядро ERP-системы, а не социальный проект. Без излишней верификации.

- [ ] **Заказы (Orders) → Наряды (WorkOrders) → Операции** — сквозная цепочка: заказ клиента → производственный наряд → операции наряда → техпроцессы → учёт затрат
- [ ] **BOM (спецификации)** — связка продуктов с материалами и операциями; расчёт потребности в материалах под заказ
- [ ] **Техпроцессы (TechProcesses)** — маршрутные карты: последовательность операций, нормы времени, оборудование
- [ ] **Складской учёт производства** — движения материалов (stockMovements) под наряды, списание, резервирование
- [ ] **Калькуляция себестоимости** — costCalculations: плановая + фактическая; actualCosts: прямые затраты (материалы/труд/накладные)
- [ ] **Планирование** — очередь работ, загрузка мощностей, календарь производства

## Плейсхолдеры документов (2026-05-29)

Система токенов `{{category.field}}` для шаблонов документов (КП, счета, договоры).

- [x] **placeholder.registry.ts** — 30 токенов (org 12 + client 9 + doc 4 + item 6), категории, PlaceholderContext
- [x] **TemplatePlaceholderService** — `resolve()`, `resolveBlock()`, `extractTokens()`
- [x] **kp-placeholder-picker** — диалог-пикер: поиск, группировка по категориям, emits `placeholderSelected`
- [x] **Barrel-экспорты** — `shared/placeholder/index.ts`, `shared/ui/index.ts`
- [x] **Интеграция пикера в редактор шаблонов** — кнопка «Вставить плейсхолдер» у текстовых блоков в `document-template-editor` (готово, 2026-05-29)
- [ ] **resolve() при генерации КП** — вызов `TemplatePlaceholderService.resolveBlock()` в `quotation-editor` для подстановки org/client/doc/item
- [ ] **Unit-тесты** для `TemplatePlaceholderService` (resolve, extractTokens, resolveBlock, краевые случаи)
- [ ] **Вложенные пути** в `lookup()` — поддержка `org.address.street` (сейчас только одноуровневые поля)

## Интеграция шаблонов: дизайн vs экземпляр (2026-05-29)

Архитектурный план стыковки админ-редактора шаблонов и редактора КП.

### Фаза 0 — Seed + BL (P0 блокер, v3.3)
- [x] Минимальный фикс seed.ts: убрать firstTenderId stub + tender EAV, UTF-8 кодировка, dead imports (2026-05-29). Полное восстановление (~700 строк) НЕ нужно — пишем свежие данные под production-контур когда дойдём.
- [x] Разделить userData/EAV (было сделано ранее)
- [x] **Seed users + login** — `UserModel.create` вместо `insertMany` (bcrypt через save middleware); e2e `auth.seed-login.e2e.test.ts` (2026-05-29)
- [x] Добавить DocumentTableTypes (3 для quotation: products/services/work)
- [x] Добавить DocumentTemplates (2: Стандартное КП + Типовой договор)
- [x] `cd backend && npm run seed` → exit 0
- [x] **BL-документ** → [docs/DOCUMENT-TEMPLATES-BL.md](../../docs/DOCUMENT-TEMPLATES-BL.md) (2026-05-29)
- [x] **IDocumentDesignSnapshot** — `{ blocks, backgroundImage }` в `shared/types` + barrel + Mongoose `designSnapshot: Mixed` в quotation model (2026-05-29)
- [x] **quotationBg() → designSnapshot.backgroundImage** — убран live-лукап по templateId (2026-05-29)
- [x] **applyBackgroundUrl/removeBackgroundImage → designSnapshot** — без API-вызовов к /document-templates (2026-05-29)
- [x] **save() — designSnapshot** — пишет `{ blocks, backgroundImage }` + `templateSnapshot` (deprecated, обратная совместимость) (2026-05-29)
- [x] **loadQuotation() — приоритет:** designSnapshot > templateSnapshot > templateId > isDefault > DEFAULT_BLOCKS (2026-05-29)
- [x] **Immutability invariant в AGENTS.md** — запрет авто-re-sync снапшота из мастера (2026-05-29)

### Фаза 1A — Админ-редактор шаблонов (P0, не frozen)
- [x] Кнопка «Сохранить» в editor → PUT /document-templates/:id { blocks } (2026-05-29: firstValueFrom fix)
- [x] Dirty state + toast успех/ошибка (2026-05-29: NotificationService)
- [x] Fix insertPlaceholder sync → обновлять template().blocks[idx].content (2026-05-29: syncBlockContent)
- [x] ROUTE_PARENTS: 'document-templates': 'documents' (уже было сделано)
- [x] Starter blocks при create (1 header-block + redirect в editor) (2026-05-29: STARTER_BLOCKS + store wrapper)
- [x] e2e API тесты для document-templates (2026-05-29: document-template.e2e.test.ts)

### Фаза 2 — Стыковка QuotationEditor (P0, frozen → нужен unfreeze)
- [x] save() → писать designSnapshot + templateSnapshot (deprecated) в payload (2026-05-29, Фаза 0 v3.3)
- [x] loadQuotation() → приоритет designSnapshot > templateSnapshot > templateId > default > DEFAULT_BLOCKS (2026-05-29, Фаза 0 v3.3)
- [ ] Исправить race loadQuotation / loadTemplates
- [ ] docType filter: только quotation в picker КП
- [ ] Ссылка «Открыть шаблон в библиотеке» в sidebar КП
- [ ] Rename «Сохранить как шаблон» → «Сохранить копию в библиотеку»
- [ ] Разморозка → wip → правки → freeze:update → frozen

### Фаза 2b — Плейсхолдеры и preview (P1)
- [ ] Toggle «Предпросмотр с данными» в КП
- [ ] TemplatePlaceholderService.resolveBlock() для text/header блоков
- [ ] Unit-тесты resolve/extractTokens

### Фаза 1B — Общий block editor (P2, опционально)
- [ ] Вынести A4-редактор из QuotationEditor → shared/ui/kp-document-block-editor/

---

## Новое от 2026-05-28
- [x] **QuotationEditor UX (PLM-126 / 140)** — таблицы `products`+`services`, product picker, заголовок КП без «КП №КП», UI-кит в диалогах, разделитель на экране. Док: [QUOTATION-EDITOR-BLOCKS.md](../../src/app/features/quotations/QUOTATION-EDITOR-BLOCKS.md).
- [ ] **Деплой обновлённого мониторинга на Synology** — дашборд обновлён (график времени ответа sport-set.ru, фикс `os.uname()` для Windows, добавлен User-Agent для Cloudflare). Нужно задеплоить `deploy/monitoring/server.py` и `monitoring/index.html` на Synology.
- [ ] **e2e quotation API: почистить `any`** — файл существует, но 68 ошибок `no-explicit-any`. Образец: document-template.e2e.test.ts.
- [ ] **Система скидок в КП (отдельный этап)** — спроектировать модель скидок для строк коммерческого предложения (`%`/`₽`, правила расчёта, округления, приоритеты), UI-настройки и серверную валидацию без нарушения текущего формата данных.

---

---

## 🔴 P0: Визуальный A4-редактор шаблонов (аудит 2026-05-29)

> **Проблема:** Пользователь заходит в «Шаблоны документов» → редактировать и видит **список блоков + textarea**.
> Никакого A4-листа, drag-and-drop, фона, визуальных таблиц. Это не редактор шаблона — это JSON-редактор.
> Весь визуальный редактор (A4-канвас, drag-drop, фон, таблицы) живёт **только в `quotation-editor.component.ts`** (2861 строка).

### 📊 Аудит: что где есть

| Возможность | QE (КП) | Template Editor | Должно быть |
|-------------|---------|-----------------|-------------|
| A4-лист (белый, тени) | ✅ | ❌ | ✅ оба |
| Drag-drop блоков (CDK) | ✅ | ❌ | ✅ template |
| FAB «Добавить блок» | ✅ текст/разделитель/таблица | ❌ | ✅ template |
| Фоновый рисунок (dropzone) | ✅ | ❌ | ✅ template |
| Настройки: выравнивание | ✅ | ❌ | ✅ template |
| Настройки: цвет текста/фона | ✅ | ❌ | ✅ template |
| Настройки: жирный/рамка | ✅ | ❌ | ✅ template |
| Текстовые блоки с колонками | ✅ split-text-card | ❌ | ✅ template |
| Заголовки (header) | ✅ | ❌ | ✅ template |
| Разделители | ✅ | ❌ | ✅ template |
| Визуальные таблицы | ✅ (с позициями) | ❌ | ✅ template (структура) |
| Плейсхолдеры {{токены}} | ❌ | ✅ (пикер + textarea) | ✅ template (в канвасе!) |
| Product picker | ✅ | ❌ не нужен | ❌ |
| Инлайн-редактирование позиций | ✅ | ❌ не нужен | ❌ |
| Сохранение (PUT blocks) | ❌ | ✅ | ✅ template |
| Dirty state + toast | ❌ | ✅ | ✅ template |

### 🎯 План: правильная архитектура

#### Шаг 1 — Shared A4 canvas (`kp-document-block-editor`) ✅
> **Цель:** вынести весь визуальный A4-редактор из `quotation-editor.component.ts` в `shared/ui/kp-document-block-editor/`.
> Компонент с двумя режимами: `mode='template'` (редактирование) и `mode='instance'` (read-only).

- [x] **Создать `shared/ui/kp-document-block-editor/`** — директория с index.ts, компонентом, SCSS, HTML (2026-05-29)
- [x] **Интерфейс:** `@Input() mode: 'template' | 'instance'`, `@Input() blocks`, `@Output() blocksChange` (2026-05-29)
- [x] **Перенести A4-канвас:** CSS-классы `editor__canvas`, `editor__blocks`, `editor__block` → BEM `kp-doc-canvas__*` (2026-05-29)
- [x] **Перенести drag-drop:** `KpSortableList` + `KpSortableItem` + `KpSortableHandle` для блоков (2026-05-29)
- [x] **Перенести рендер блоков:** header (HTML), text (split-text-card), separator, table (структура) (2026-05-29)
- [x] **Перенести block controls (mode=template):** выравнивание, цвет текста/фона, жирный, рамка, padding (2026-05-29)
- [x] **Перенести FAB-меню (mode=template):** добавить текст/разделитель/таблицу (2026-05-29)
- [x] **Перенести bg-dropzone (mode=template):** drag-and-drop фона + file input + preview + remove (2026-05-29)
- [x] **Перенести настройки блоков (mode=template):** диалоги padding, text editor (2026-05-29)
- [x] **Интегрировать плейсхолдер-пикер (mode=template):** кнопка «Вставить плейсхолдер» у текстовых блоков (2026-05-29)
- [x] **Barrel-экспорт** в `shared/ui/index.ts` (2026-05-29)

#### Шаг 2 — Подключить в редактор шаблонов ✅
> **Цель:** `document-template-editor.component.ts` получает визуальный A4-редактор.

- [x] **Заменить textarea-редактор** на `<app-kp-document-block-editor mode="template">` (2026-05-29)
- [x] **Сохранить toolbar:** шапка с названием, dirty badge, кнопка «Сохранить» (2026-05-29)
- [x] **Связать `blocks`:** template.blocks → `@Input() blocks`; `blocksChange` → dirty + save (2026-05-29)
- [x] **Связать `backgroundImage`:** template.backgroundImage → bg-dropzone; `bgChange` → dirty + save (2026-05-29)
- [x] **Сохранить плейсхолдер-пикер:** уже есть — перенести в shared canvas (2026-05-29)
- [x] **Удалить старый код:** список блоков в левой панели, textarea, block controls (всё ушло в shared) (2026-05-29)
- [x] **Проверить:** зайти в шаблон → визуальный A4, drag блоков, фон, таблицы, плейсхолдеры (2026-05-29)

#### Шаг 3 — Переключить КП на режим instance (инкрементально) 🔄
> **Цель:** QE делегирует отрисовку канваса shared-компоненту.
> **Внимание:** QuotationEditor — P0 защищён. Менять осторожно, не сломать.

- [x] **Инкремент 1 (2026-05-29): A4-оболочка + фон** — `<app-kp-document-block-editor mode="instance" [showBlocks]="false">` с `<ng-content>`. Убраны bg-методы (–80 строк). CSS-переменные проброшены. Layout: A4 по центру, sidebar 300px, block-controls rail.
- [x] **mode=instance layout fix (2026-05-29):** shell-режим в canvas SCSS (flex:1, overflow-y:auto, bg-soft, центрирование, padding-right под rail). Убраны мёртвые `.editor__canvas*` правила (–156 строк).
- [ ] **Инкремент 2 (следующая сессия):** Перенести block controls в canvas
- [ ] **Инкремент 3 (следующая сессия):** Перенести рендер не-табличных блоков в canvas
- [x] **Оставить в QE:** sidebar (реквизиты, шаблон, контрагент), таблицы с позициями, product picker, row actions
- [x] **Таблицы в instance-режиме:** инлайн-редактирование qty/price остаётся в QE (не в shared)
- [ ] **Return-flow:** кнопка «Изменить оформление» → `/document-templates/:id?returnUrl=...`
- [x] **Проверить:** КП открывается, блоки отображаются, позиции редактируются, layout не сломан

#### Шаг 4 — Обратная совместимость и зачистка
- [ ] **Удалить дублирующийся код из QE** — всё что ушло в shared (canvas, block controls, bg dropzone)
- [ ] **Проверить `DEFAULT_BLOCKS`** — используются и в QE, и в template editor
- [ ] **Проверить `STARTER_BLOCKS`** — создание нового шаблона
- [ ] **e2e тесты:** quotation + document-template (CRUD + snapshot + immutability)
- [ ] **`ng build` + `ng lint` + backend tests + `freeze:check`** — все зелёные

### ⏱️ Оценка

| Шаг | Время | Риск |
|-----|-------|------|
| Шаг 1 — Shared canvas | 2–4 ч | Средний: много кода перенести, сохранить сигналы и CDK |
| Шаг 2 — Template editor | 1–2 ч | Низкий: замена компонента |
| Шаг 3 — QE instance | 1–2 ч | **Высокий:** P0 фича, нельзя сломать |
| Шаг 4 — Зачистка + тесты | 1 ч | Низкий |
| **Итого** | **5–9 ч** | |

### 🎯 Что получится в итоге

**Редактор шаблонов** (`/document-templates/:id`):
```
┌─ Шапка ────────────────────────────────────────────┐
│ ← Шаблоны   Типовой договор   [Не сохранено] [Сохранить]│
├─ A4-канвас ───────────────────┬─ Свойства ─────────┤
│ ┌──────────────────────────┐  │ Название: ...      │
│ │ 🖼️ фон (опционально)     │  │ Тип: Договор       │
│ │                          │  │ По умолчанию: Да   │
│ │  ▬▬▬ ЗАГОЛОВОК ▬▬▬      │  │                    │
│ │  (drag handle)           │  │ 🖼️ Фон: [dropzone] │
│ │                          │  │ [превью] [удалить] │
│ │  ┌─ Текст (2 колонки) ─┐ │  │                    │
│ │  │ Поставщик  │ Клиент  │ │  │ Плейсхолдеры:     │
│ │  └──────────────────────┘ │  │ [вставить токен]  │
│ │                          │  │                    │
│ │  ┌─ Таблица (Товары) ───┐│  │                    │
│ │  │ №│Арт.│Наим.│Кол│Сум││  │                    │
│ │  │ (структура, без строк)│  │                    │
│ │  └──────────────────────┘│  │                    │
│ │                          │  │                    │
│ │  [+ Добавить блок]       │  │                    │
│ └──────────────────────────┘  │                    │
└───────────────────────────────┴────────────────────┘
```

### 🧊 FreezeGuard
- ✅ `shared/ui/` — всегда wip, можно создавать
- ✅ `document-template-editor` — wip, можно менять
- 🧊 `quotation-editor` — **P0 защищён.** Менять только осторожно в Шаге 3, не удаляя

---

## Сессия 2026-05-29 (часть 2) — Canvas migration + багфиксы

### Шаг 1–2: Shared canvas + template editor ✅
- [x] `kp-document-block-editor` — shared компонент с mode='template'|'instance'
- [x] Drag-drop, FAB, bg-dropzone, block controls, плейсхолдер-пикер — всё в shared
- [x] `document-template-editor` переписан: textarea → визуальный A4-канвас (–170 строк SCSS, –120 строк ручного управления блоками)

### Шаг 3 Инкремент 1: QE shell mode ✅
- [x] QE: `div.editor__page` → `<app-kp-document-block-editor mode="instance" [showBlocks]="false">` с `<ng-content>`
- [x] `showBlocks` input + `isShell()` computed в canvas TS
- [x] Убраны `bgDragOver`, `bgProcessing` + 8 методов фона (–80 строк QE)
- [x] `onBackgroundChange(url)` через `signal.update()`
- [x] Shell-layout в canvas SCSS: flex:1, overflow-y:auto, bg-soft, центрирование, padding-right под rail
- [x] CSS vars: `--kp-a4-padding-x`, `--kp-block-rail-width` (280px), `--kp-block-rail-gap` (12px) на `.kp-doc-canvas`
- [x] Убраны мёртвые `.editor__canvas-wrapper`, `.editor__canvas`, `.editor__canvas-bg` из QE SCSS (–156 строк)
- [x] Host-класс `kp-doc-canvas--shell` через `host` property

### Багфиксы ✅
- [x] **Хлебные крошки ObjectId:** `EDITOR_ROUTES` Set + `OBJECT_ID_RE` (24 hex) → «Редактирование»
- [x] **NG0951 в document-template-editor:** `viewChild.required` → `viewChild` + `setTimeout(0)` для `setBlocks()`

### Осталось на следующую сессию
- [ ] Инкремент 2: перенести block controls рендер в shared canvas
- [ ] Инкремент 3: перенести рендер не-табличных блоков в shared canvas
- [ ] QE: убрать прямые импорты primeng/* (P2 UI-консистентности)
- [ ] Возвратный поток: кнопка «Изменить оформление» → `/document-templates/:id?returnUrl=...`
