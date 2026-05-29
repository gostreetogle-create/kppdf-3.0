# QuotationEditor — блоки, таблицы, подбор позиций

> **YouGile:** [PLM-126](https://yougile.com/team/0bdbccb0610e/#PLM-126) (редактор) · [PLM-139](https://yougile.com/team/0bdbccb0610e/#PLM-139) (8.1.1 шаблоны) · [PLM-140](https://yougile.com/team/0bdbccb0610e/#PLM-140) (8.1.2 таблицы)  
> Маршрут: `/quotations/:id` · компонент: `quotation-editor.component.ts`  
> Реестр: `config/yougile-task-registry.yaml`  
> Последнее обновление: **2026-05-29** (разделитель, фон A4, шаблоны, рамки) · `ng build` OK

Документ фиксирует UX и технические решения редактора коммерческого предложения: панель блоков, таблицы разных типов, product picker, диалоги на UI-ките.

---

## Цель

Удобное редактирование листа A4: настройка блоков без дублирования UI, несколько таблиц (товары + услуги), понятный подбор позиций из справочника, единый UI-кит в формах.

---

## Панель блока (`editor__block-controls`) — 2026-05-27…28

- Расположение: **серая зона справа от листа A4** (не печатается, `@media print`).
- Ширина: **`--kp-block-rail-width: 280px`**.
- **Открытие: по клику на блок** (не hover). Закрытие: клик по листу вне блока, Escape.
- Секции: выравнивание, **цвет текста**, **цвет фона**, жирный, **рамка** (`borderStyle`: нет → пунктир → сплошная → нет; экран = печать), колонки / карандаш (text), отступ (separator/header), **«Скрыть заголовок»** (header), удалить.
- **Рамка блока:** одна — через `borderStyle`; без серых подложек drag-surface; новые text-блоки — `none`, старые без поля — `dashed` (обратная совместимость).
- **Разделитель:** max отступ **500 px**; постоянный grip (opacity ~0.35, hover ~0.7); на печати — только линия.
- Свотч **«Авто»** для цвета текста — шахматка + «А» (не белый прямоугольник).
- Палитра фона — **светлые оттенки** (серый, голубой, жёлтый…) только для экрана.

### Перетаскивание блоков на A4

- CDK: `appKpSortableList` / `appKpSortableItem`.
- **Таблица:** drag с **toolbar + thead** (не только grip); `stopTableBlockDrag` на `tbody` и кнопках toolbar.
- **Замок порядка** в шапке редактора (по умолчанию **открыт**).

---

## Таблицы документа — 2026-05-28 (PLM-140)

### Несколько типов на одном листе

| `tableKind` | Заголовок | Позиции в `items[]` | Подбор из справочника |
|-------------|-----------|---------------------|------------------------|
| `products` | Товары | `tableKind: 'products'` | да, фильтр `ITEM` |
| `services` | Услуги | `tableKind: 'services'` | да, фильтр `SERVICE` |
| `work` | Работы | `tableKind: 'work'` | да, фильтр `WORK` |

- **Один блок каждого типа** — нельзя две таблицы «Товары»; можно **Товары + Услуги + Работы** одновременно.
- Меню **«+» → Таблица**: всегда видны селект и «Добавить таблицу»; занятые типы скрыты из списка (не блокируют меню целиком).
- Fallback типов: `FALLBACK_TABLE_BLOCK_OPTIONS` + merge с API `/document-table-types?docType=quotation`.
- Seed: типы `products`, `services`, `work` (`backend/src/seed.ts`).

### Кнопка подбора в toolbar таблицы

- **«Выбрать товары»** / **«Выбрать услуги»** — `app-kp-button` с подписью и иконкой корзины.
- Видимость: `tableBlockHasPicker(block)` — по `pickerMetaByKind` (**не затирать fallback при загрузке API**).
- Default meta: `DEFAULT_PICKER_META` (`products` → `dataSource: 'products'` / `ITEM`, `services` → `dataSource: 'services'` / `SERVICE`, `work` → `dataSource: 'work'` / `WORK`).

### Персистенция

- `EditorBlock.tableKind`, `QuotationItem.tableKind` — `shared/types`, Mongoose (`quotation.model.ts`).
- Старые блоки без `tableKind` → нормализация в `'products'`.

Подробный план: [.opencode/audit/plans/quotation-document-tables.md](../../../.opencode/audit/plans/quotation-document-tables.md).

---

## Product picker (`app-kp-product-picker`) — 2026-05-28

Док компонента: [shared/ui/kp-product-picker/README.md](../../shared/ui/kp-product-picker/README.md).

**Сценарий пользователя:**

1. В блоке «Товары» → **«Выбрать товары»**.
2. Клик по строкам в модалке (или «выбрать все на странице»).
3. Внизу окна → **«Добавить N товаров»** (футер всегда виден).

Убраны чипы «Корзина (N)» внизу модалки. Пагинация — полноценный paginator.

---

## 8.1.1 Шаблоны и оформление — PLM-139 (2026-05-28…29)

| Пункт чеклиста YouGile | Реализация |
|------------------------|------------|
| Фон документа — файл / drag-and-drop | Сайдбар «Оформление документа»: dropzone + preview; data URL → `document-templates.backgroundImage` |
| Контрагент — выпадающий список | `kp-select` + `CounterpartyOptionsService` |
| Шаблоны с категориями | `TEMPLATE_DOC_TYPE_OPTIONS`; select категории + шаблона в сайдбаре «Оформление документа» |
| Toolbar «Шаблоны» | Scroll к секции «Оформление документа» (без modal-списка) |
| Смена шаблона | Confirm-диалог перед заменой блоков; смена категории — только фильтр списка |
| Фон A4 | Слой `::before` на `.editor__canvas`, `background-size: cover`, поля 15/5 mm; печать — «Фоновая графика» в браузере |
| Ширина колонок таблиц | `table-layout: fixed`, % ширины, `word-break` — текст не выходит за A4 |

Синхронизация карточки: `node tools/sync-plm-checklist.js PLM-139 --done`

---

## Прочие правки UX — 2026-05-28

| Тема | Решение |
|------|---------|
| **Заголовок КП** | `formatQuotationLabel()` — не дублировать «КП №» если номер уже `КП-2026-001` → **«КП №2026-001»** |
| **Разделитель** | Grip + `<hr>`; без постоянной серой подложки; max отступ **500 px**; print — только линия |
| **Фон A4** | `::before` + `--kp-canvas-bg-image`; preview sidebar: `contain`, aspect-ratio 210/297 |
| **Заголовок на PNG** | Toggle «Скрыть заголовок» в панели header + кнопка в сайдбаре |
| **Текстовые блоки** | Внешний вертикальный отступ — только `paddingTop/Bottom` из settings; без скрытого CSS 4px |
| **Кнопки** | block-controls без `::ng-deep` переопределений; raw `<button>` — 4 editor-specific exceptions (swatch, table-photo, item-nav, photo-zoom) |
| **Диалоги редактора** | `app-kp-dialog`, `app-kp-input`, `app-kp-input-number`, `app-kp-textarea`, `app-kp-select` (не сырой PrimeNG) |
| **FAB «+»** | Крупная круглая кнопка 52px, тень |

---

## Затронутые файлы (2026-05-28)

| Файл | Изменения |
|------|-----------|
| `quotation-editor.component.ts` | tableKind, picker meta, заголовок КП, UI-кит в диалогах |
| `quotation-editor.component.scss` | separator, FAB, dialog, text-card width |
| `kp-product-picker/*` | row click, paginator, footer, без cart chips |
| `document-table-type-options.service.ts` | `loadFullTypes`, кеш |
| `backend/src/seed.ts` | типы таблиц `products`, `services`, `work` |
| `shared/types/quotationItem.interface.ts` | `tableKind` |

---

## Поведение для пользователя (кратко)

1. **Кликнуть блок** → справа панель настроек.
2. **Товары:** «Выбрать товары» → отметить строки → **«Добавить N товаров»** внизу модалки.
3. **Вторая таблица:** «+» → тип «Услуги» → «Добавить таблицу».
4. **Порядок блоков:** замок открыт → тянуть за toolbar/заголовок таблицы или текстовый блок.
5. **Печать:** outline выделения блока и grip разделителя не попадают на лист; фон A4 — при включённой «Фоновой графике» в Chrome/Edge.

---

## Технический долг

- **Raw `<button>` в редакторе:** 4 исключения (color-swatch, table-photo, item-nav, photo-zoom) — задокументированы выше.
- **Кодировка** `quotation-editor.component.ts`: на Windows иногда UTF-16 → ломает сборку; сохранять UTF-8.
- **Колонки таблицы из `document-table-types`** — пока фиксированная вёрстка в редакторе, не из JSON columns.
- **ProductPicker:** ✅ фильтр по `productKind` из поля модели `document-table-types` (ITEM/SERVICE/WORK). Убран fallback `PRODUCT_KIND_BY_NAME`.

---

## Связанные документы

- [AGENTS.md](../../../AGENTS.md) — P0: не удалять QuotationEditor
- [docs/integrations/yougile/adding-tasks.md](../../../docs/integrations/yougile/adding-tasks.md) — 8.1 Редактор КП, 8.1.2 Таблица товаров
- [.opencode/audit/plans/quotation-document-tables.md](../../../.opencode/audit/plans/quotation-document-tables.md)
- [.opencode/audit/CHECKLIST-BACKLOG.md](../../../.opencode/audit/CHECKLIST-BACKLOG.md)
- [kp-product-picker/README.md](../../shared/ui/kp-product-picker/README.md)
