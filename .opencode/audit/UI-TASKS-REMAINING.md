# Оставшиеся задачи UI-консистентности (P1 + P2)

> **Дата:** 2026-05-29
> **Источник:** `.opencode/audit/UI-CONSISTENCY-PLAN.md`
> **P0 выполнено:** kp-search, kp-tag, kp-tab-group, kp-paginator созданы и интегрированы

---

## ✅ Canvas migration (2026-05-29 сессия 2)

- [x] **Шаг 1:** `kp-document-block-editor` — shared A4-канвас с mode='template'|'instance'
- [x] **Шаг 2:** `document-template-editor` → визуальный A4-редактор (–170 строк SCSS)
- [x] **Шаг 3 Инкремент 1:** QE shell mode — A4-оболочка + фон на shared-канвасе (–80 строк QE)
- [x] **Layout fix:** shell-режим (flex:1, центрирование, rail), CSS vars, host-класс
- [x] **Багфиксы:** ObjectId в хлебных крошках → «Редактирование»; NG0951 → setTimeout(0)
- [ ] **Инкремент 2:** перенести block controls в shared canvas
- [ ] **Инкремент 3:** перенести рендер не-табличных блоков в shared canvas

---

## P1 — CRUD patterns + tab hubs (3–4 недели)

### Tab migration
- [ ] `directories-page`: заменить `dir-dept__btn` tabs на `app-kp-tab-group`, удалить `::ng-deep` overrides
- [ ] `modules-page`: заменить tabs на `app-kp-tab-group`, удалить `::ng-deep .p-datatable` / `.p-paginator` overrides

### Severity maps
- [ ] Создать `shared/utils/status-severity.util.ts` — централизованные severity maps для quotations, orders, products, modules

### CRUD audit
- [ ] Стандартизировать CRUD dialog forms: вынести `app-kp-form-section` из `_form-fields.scss`
- [ ] `quotations-page`: проверить columns `type:'select'/'tag'`, entityLabel, extraRowActions — эталон
- [ ] `orders-page`, `tenders-page`, `shipments-page`, `work-orders-page`, `purchase-orders-page`: audit columns vs seed statuses (tag + options, не ObjectId)
- [ ] `attributes-editor`: заменить custom empty/loading на `app-empty-state` + skeleton
- [ ] `dashboard-page`: KpStatGrid cards — те же radius/shadow что kp-table panel
- [ ] `documents-page`: align с dashboard pattern

### QA
- [ ] Прогнать `@ui-qa` manifest checks на quotations + orders
- [ ] `@ui-auditor` checklist (15 пунктов) на 5 CRUD-страницах

### FreezeGuard
- 🧊 `directories-page` (frozen — нужна разморозка)
- 🧊 `modules-page` (frozen — нужна разморозка)
- 🧊 `products-page` (frozen — нужна разморозка)

---

## P2 — Kill PrimeNG in features + editor + enforcement (4–6 недель)

### quotation-editor (wip — можно)
- [ ] Inventory всех `<p-button>` (9×), `<p-tag>`, `<p-select>`, raw `<button>` (8×)
- [ ] Block-controls toggle panel: `app-kp-button` mode `[toggle]` или отдельный компонент
- [ ] Заменить 9× `<p-button>` → `app-kp-button`
- [ ] Заменить 8× raw `<button>` → `app-kp-button` (icon-only/text)
- [ ] `TagModule` → `app-kp-tag`, `SelectModule` → `app-kp-select`, `ToastModule` → `app-kp-toast`
- [ ] Удалить `eslint-disable no-restricted-imports` из quotation-editor
- [ ] Рефактор SCSS: hex → tokens где возможно

### Enforcement
- [ ] ESLint rule / кастомный скрипт: `grep "from 'primeng/" src/app/features` → CI fail
- [ ] Storybook или ui-kit showcase route для всех kp-*
- [ ] Полный `@ui-auditor` pass по всем routes из `app.routes.ts`

### Разморозка (@chief-architect)
- 🧊 `products` → мигрировать если нужны UI fixes
- 🧊 `modules-page`, `directories-page` → финальная tab migration
- 🧊 `login` (locked) → hardcoded gradients на tokens (нужен approval)

---

## P0 — несделанное

- [ ] Unit smoke-тесты для kp-search, kp-tag (ui-kit wip)

---

## Definition of Done (финальный)

- `grep "from 'primeng/" src/app/features` → только `primeng/api` и spec files
- `grep "<p-button" src/app/features` → 0
- `grep "<button" src/app/features` → 0
- quotation-editor проходит QUOTATION-EDITOR-BLOCKS.md UX без visual regression
- `npm run freeze:check` exit 0
