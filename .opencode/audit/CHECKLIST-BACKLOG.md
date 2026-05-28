# Backlog

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
- [ ] **Настройки типов таблиц — доработки** — `productKind` в модели, другие `dataSource` кроме `products`.
      План: [.opencode/audit/plans/quotation-document-tables.md](plans/quotation-document-tables.md).

## P2 (опционально)
- [ ] EAV в tenders / orders
- [ ] login MessageService → NotificationService
- [x] kp-button inline → scss (UniButton: стили в kp-button.component.scss, global 390–425 удалён)
- [x] **[AUDIT] kp-button `variant="premium"`** — реализован (2026-05-28). Миксины в `_kp-button.scss`, host-классы `kp-button--variant-*/severity-*`, матрица severity×variant задокументирована в `ui-manifest.md`. Login: `[block]="true"` + `styleClass="auth__submit-btn"` только для purple-цвета; интеракции из `variant='premium'`.
- [ ] chief-architect в opencode.json

## Новое от 2026-05-28
- [x] **QuotationEditor UX (PLM-126 / 140)** — таблицы `products`+`services`, product picker, заголовок КП без «КП №КП», UI-кит в диалогах, разделитель на экране. Док: [QUOTATION-EDITOR-BLOCKS.md](../../src/app/features/quotations/QUOTATION-EDITOR-BLOCKS.md).
- [ ] **Товары: недостающие поля (Sheets ↔ MongoDB ↔ UI)** — после импорта 666 позиций из Google Sheets в MongoDB часть колонок не переносится: **Фото URL / Фото JSON**, **Себестоимость**, **Заметки** (и при необходимости явная **Подкатегория**). Нужно: расширить `IProduct` + `product.model.ts`, форму «Товары», `sync-sheet-to-mongo.js`; синхронизировать `shared/types` FE/BE; не ломать существующие 689 записей (миграция fill-empty).
- [ ] **Деплой обновлённого мониторинга на Synology** — дашборд обновлён (график времени ответа sport-set.ru, фикс `os.uname()` для Windows, добавлен User-Agent для Cloudflare). Нужно задеплоить `deploy/monitoring/server.py` и `monitoring/index.html` на Synology.
- [ ] **e2e тесты для quotation API** — supertest установлен (`backend/package.json`), тесты не написаны. Нужно создать `backend/src/__tests__/quotation.e2e.test.ts` с CRUD + permissions.
- [ ] **Система скидок в КП (отдельный этап)** — спроектировать модель скидок для строк коммерческого предложения (`%`/`₽`, правила расчёта, округления, приоритеты), UI-настройки и серверную валидацию без нарушения текущего формата данных.
