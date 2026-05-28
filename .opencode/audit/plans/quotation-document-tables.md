# План: таблицы в документах (QuotationEditor и др.)

> **Статус:** фазы 0–3 **частично внедрены** (2026-05-28).  
> Актуальное поведение: [QUOTATION-EDITOR-BLOCKS.md](../../../src/app/features/quotations/QUOTATION-EDITOR-BLOCKS.md).

---

## Проблема (исходная)

Пользователь может удалить блок «Товары». Нужно вернуть таблицу и добавлять **разные типы** (товары, услуги) на одном листе.

---

## Фаза 0 — сделано

- [x] Меню «+» → секция **Таблица** + select + «Добавить таблицу».
- [x] FAB «+» — заметная круглая кнопка.

---

## Фаза 1 — типы в shared/types + BE — сделано

- [x] `IDocumentBlock.tableKind`, `IQuotationItem.tableKind` в shared/types.
- [x] Mongoose: `tableKind` в блоках и позициях (`quotation.model.ts`).
- [x] Seed: `products`, `services` (`DocumentTableTypeModel`).

---

## Фаза 2 — админка — частично

- [x] CRUD **Типы таблиц документов** (`/document-table-types`), RBAC `admin.documentTableTypes.*`.
- [ ] Колонки из JSON в рендере редактора (пока фиксированная таблица в QuotationEditor).
- [ ] `productKind` / фильтр picker как поле типа таблицы (сейчас `PRODUCT_KIND_BY_NAME` в FE).

---

## Фаза 3 — QuotationEditor — сделано (MVP)

- [x] Dropdown типов из API + fallback `Товары` / `Услуги`.
- [x] Отдельные позиции по `tableKind` в `items[]`.
- [x] Одна таблица каждого типа на документ.
- [x] Product picker по `dataSource` + фильтр kind.
- [x] Кнопка «Выбрать товары/услуги» (`DEFAULT_PICKER_META`, merge с API).
- [x] Drag блока таблицы на A4.

---

## Фаза 4 — другие документы

- [ ] Счёт, договор, отгрузка — те же `tableKind`, другие `docTypes`.

---

## Чеклист перед релизом

- [x] `tableKind` в shared/types + BE
- [x] CRUD типов таблиц в админке
- [x] RBAC на настройку типов
- [x] Редактор: dropdown из API + fallback
- [x] Сохранение позиций с `tableKind`
- [x] Нормализация старых блоков без `tableKind` → `products`
- [ ] Динамические колонки из конфига типа
- [x] `ng build`

---

## Оценка остатка

| Задача | Объём |
|--------|--------|
| Динамические колонки в редакторе | 1–2 дня |
| productKind в модели типа таблицы | 0.5 дня |
| Фаза 4 (другие документы) | по документам |
