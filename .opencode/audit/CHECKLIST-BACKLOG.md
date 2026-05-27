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
- [x] **Панель блоков и порядок секций** — rail 280px, форматирование, drag по контенту, замок порядка (по умолчанию открыт), без дублей toolbar/tooltip.
      Док: [src/app/features/quotations/QUOTATION-EDITOR-BLOCKS.md](../../src/app/features/quotations/QUOTATION-EDITOR-BLOCKS.md).
- [x] **Добавление таблицы после удаления** — меню «+» → выпадающий список типа таблицы → «Добавить таблицу».
      Сейчас один тип: **Товары** (`tableKind: 'products'`).
- [ ] **Настройки типов таблиц документов** (отдельный план) — админка приложения:
      реестр таблиц (товары, услуги, спецификация…), колонки, источник данных, RBAC.
      См. [.opencode/audit/plans/quotation-document-tables.md](plans/quotation-document-tables.md).
- [ ] **QuotationEditor: таблицы из настроек** — выпадающий список типов таблиц из API/конфига, не хардкод.
- [ ] **Персистенция `tableKind`** — поле в `IDocumentBlock` + Mongoose (сейчас только локально в редакторе).

## P2 (опционально)
- [ ] EAV в tenders / orders
- [ ] login MessageService → NotificationService
- [x] kp-button inline → scss (UniButton: стили в kp-button.component.scss, global 390–425 удалён)
- [ ] **[AUDIT] kp-button `variant="premium"`** — вынести градиент login из `styleClass="auth__submit-btn"` + `::ng-deep` в API `app-kp-button`. Градиент #5e6ad2 → #4f5bc7, hover lift, disabled — после миграции всех features.
- [ ] chief-architect в opencode.json

## Новое от 2026-05-28
- [ ] **Деплой обновлённого мониторинга на Synology** — дашборд обновлён (график времени ответа sport-set.ru, фикс `os.uname()` для Windows, добавлен User-Agent для Cloudflare). Нужно задеплоить `monitoring/server.py` и `monitoring/index.html` на Synology.
- [ ] **e2e тесты для quotation API** — supertest установлен (`backend/package.json`), тесты не написаны. Нужно создать `backend/src/__tests__/quotation.e2e.test.ts` с CRUD + permissions.
