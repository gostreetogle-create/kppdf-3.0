# Добавление задач в YouGile

> Пошаговые примеры для доски KPPDF 3.0. Общие правила названий, `columnId` и иерархии — в **[conventions.md](conventions.md)**.

---

## Иерархия CRM

```
01 CRM: Клиенты и КП (ID-109)           ← на доске «План развития»
├─ [EPIC #CRM] Управление клиентами…    (ID-13)
│   ├─ 1.1 Customers — контрагенты
│   ├─ 1.2 Quotations — сущность БД
│   ├─ 1.3 API: CRUD КП
│   ├─ 1.4 UI: форма КП с таблицей товаров
│   ├─ 1.5 Генерация PDF
│   └─ 1.6 История взаимодействий
└─ [EPIC #CRM] Оформление заказа        (ID-14)
```

**1.4** — список и форма КП. **Редактор документа** — в модуле **08 Документы** (`8.1`), не под `1.4`.

---

## Модуль 08 Документы

> **ID карточки** = `PLM-xxx` из ссылки YouGile. Реестр: `config/yougile-task-registry.yaml`

| PLM | Ссылка `#PLM-xxx` → задача на доске |
|-----|-------------------------------------|
| PLM-127 | 08 Документы |
| PLM-142 | EPIC #DOCS |
| PLM-126 | 8.1 Редактор КП → `/quotations/:id` |
| **PLM-139** | **8.1.1 Шаблоны блоков документа** |
| PLM-140 | 8.1.2 Таблица товаров из настроек |
| PLM-141 | 8.1.3 Скидки и итоги в документе |
| PLM-138, PLM-137 | PDF, UI /documents |

> **Важно:** ключ реестра = hash в URL (`#PLM-139`), не `idTaskCommon`. UUID в `config/yougile-task-registry.yaml` проверять через `node tools/yougile-registry.js resolve PLM-139`.

```
08 Документы (ID-127)                   ← на доске «План развития»
└─ [EPIC #DOCS] Редакторы и печатные формы (ID-142)
    ├─ 8.1 Редактор документа КП (PLM-126)     ← /quotations/:id
    │   ├─ 8.1.1 Шаблоны блоков (PLM-139)
    │   ├─ 8.1.2 Таблица товаров (PLM-140)
    │   └─ 8.1.3 Скидки и итоги (PLM-141)
    ├─ 8.2 PDF / печатная форма КП (ID-138)
    └─ 8.3 UI: раздел «Документы» (ID-137)    ← /documents
```

| Поле | Значение |
|------|----------|
| **Категория** | 08 Документы (`ID-127`) |
| **EPIC** | [EPIC #DOCS] Редакторы и печатные формы (`ID-142`) |
| **Редактор КП** | 8.1 Редактор документа КП (`ID-126`) |
| **Маршрут** | `/quotations/:id` |
| **Dev** | http://localhost:4200/quotations/6a16902ab80b864c10674123 |

Связь с CRM: **1.4 UI**, **1.3 API**, **1.5 PDF** (серверная генерация).

> ID подзадач могут меняться после пересоздания без `columnId` — актуальные id: `node tools/fix-documents-links.js` (дерево в консоли).

---

## Создать / исправить через API

```bash
node tools/setup-documents-yougile-module.js
node tools/setup-documents-yougile-module.js --dry-run
node tools/fix-documents-links.js
node tools/fix-documents-board-visibility.js
```

Скрипт `setup-documents-yougile-module.js`:
1. держит **08 Документы** (с `columnId`) и EPIC **#DOCS** (без `columnId`);
2. вкладывает **8.1** и **8.1.x**;
3. создаёт **8.2**, **8.3**;
4. убирает редактор из **1.4 UI**.

Кратко про API:

- иерархия — только **`subtasks`** у родителя ([conventions.md](conventions.md));
- вложенные задачи — **без `columnId`**, иначе «вылезут» на доску.

---

## Вручную в UI YouGile

1. Откройте **08 Документы** → добавьте **стикер** (не карточку в колонке).
2. EPIC: `[EPIC #DOCS] …`, задачи: **8.1**, **8.2**, …
3. В описании — маршрут, dev-ссылка, путь к компоненту ([шаблон](conventions.md#шаблон-описания-карточки)).

---

## CLI

```powershell
pwsh tools/yougile-sync.ps1 -Action report
```

---

## Связанные документы

- [conventions.md](conventions.md) — **правила оформления** (главный документ)
- [api-reference.md](api-reference.md) — REST API
- [QUOTATION-EDITOR-BLOCKS.md](../../../src/app/features/quotations/QUOTATION-EDITOR-BLOCKS.md)
