# Backlog

## Session 2026-05-28

**Закрыто сегодня** (коммиты до `e084cee` включительно):

- [x] **kp-button inline → scss** — стили в `kp-button.component.scss` + `_kp-button.scss`, глобальный блок 390–425 удалён
- [x] **kp-button `variant="premium"`** — миксины, host-классы, матрица в `ui-manifest.md`
- [x] **Login polish** — premium-кнопка входа, карточка auth, freeze-хеши login/platform
- [x] **P0 readiness / FreezeGuard** — синхронизация lock-хешей после UI-кита (`e084cee`)
- [x] **QuotationEditor UX** — таблицы products+services, product picker, заголовок КП, UI-кит в диалогах

**Открыто на следующую сессию** (P1/P2 — не трогать без задачи):

- [ ] Динамические колонки таблицы из конфига типа (`IDocumentTableType.columns`)
- [ ] Настройки типов таблиц — `dataSource` кроме `products` (productKind ✅ в модели)
- [ ] EAV в tenders / orders; login MessageService → NotificationService
- [ ] Деплой мониторинга Synology; e2e quotation API; система скидок в КП; chief-architect в opencode.json

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
- [ ] **Динамические колонки таблицы из конфига типа** — рендер по `IDocumentTableType.columns` (сейчас фиксированная сетка колонок).
- [ ] **Настройки типов таблиц — доработки** — `productKind` в модели ✅ (2026-05-28); остаётся: другие `dataSource` кроме `products`.
      План: [.opencode/audit/plans/quotation-document-tables.md](plans/quotation-document-tables.md).

## P2 (опционально)
- [ ] EAV в tenders / orders
- [ ] login MessageService → NotificationService
- [x] kp-button inline → scss (UniButton: стили в kp-button.component.scss, global 390–425 удалён)
- [x] **[AUDIT] kp-button `variant="premium"`** — реализован (2026-05-28). Миксины в `_kp-button.scss`, host-классы `kp-button--variant-*/severity-*`, матрица severity×variant задокументирована в `ui-manifest.md`. Login: `[block]="true"` + `styleClass="auth__submit-btn"` только для purple-цвета; интеракции из `variant='premium'`.
- [ ] chief-architect в opencode.json

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

### Фаза 0 — Seed (P0 блокер)
- [x] Восстановить seed.ts: разделить userData/EAV, объявить attrDefs, исправить firstTenderId (минимум сделан 2026-05-29: убран firstTenderId stub, UTF-8, dead imports)
- [x] **Seed users + login** — `UserModel.create` вместо `insertMany` (bcrypt через save middleware); e2e `auth.seed-login.e2e.test.ts` (2026-05-29)
- [x] Добавить DocumentTableTypes (3 для quotation: products/services/work)
- [x] Добавить DocumentTemplates (2: Стандартное КП + Типовой договор)
- [x] `cd backend && npm run seed` → exit 0

### Фаза 1A — Админ-редактор шаблонов (P0, не frozen)
- [x] Кнопка «Сохранить» в editor → PUT /document-templates/:id { blocks } (2026-05-29: firstValueFrom fix)
- [x] Dirty state + toast успех/ошибка (2026-05-29: NotificationService)
- [x] Fix insertPlaceholder sync → обновлять template().blocks[idx].content (2026-05-29: syncBlockContent)
- [x] ROUTE_PARENTS: 'document-templates': 'documents' (уже было сделано)
- [x] Starter blocks при create (1 header-block + redirect в editor) (2026-05-29: STARTER_BLOCKS + store wrapper)
- [x] e2e API тесты для document-templates (2026-05-29: document-template.e2e.test.ts)

### Фаза 2 — Стыковка QuotationEditor (P0, frozen → нужен unfreeze)
- [ ] save() → писать templateSnapshot в payload
- [ ] loadQuotation() → приоритет snapshot > templateId > default > DEFAULT_BLOCKS
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
- [ ] **e2e тесты для quotation API** — supertest установлен (`backend/package.json`), тесты не написаны. Нужно создать `backend/src/__tests__/quotation.e2e.test.ts` с CRUD + permissions.
- [ ] **Система скидок в КП (отдельный этап)** — спроектировать модель скидок для строк коммерческого предложения (`%`/`₽`, правила расчёта, округления, приоритеты), UI-настройки и серверную валидацию без нарушения текущего формата данных.
