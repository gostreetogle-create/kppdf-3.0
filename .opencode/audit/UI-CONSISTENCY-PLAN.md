# Аудит UI-консистентности KPPDF 3.0 + план миграции

> **Дата:** 2026-05-29  
> **Связанные документы:**
> - [AGENTS.md](../../AGENTS.md) — инварианты UI-кита, FreezeGuard, агенты
> - [.opencode/rules/ui-manifest.md](../rules/ui-manifest.md) — канон кнопок, таблиц, диалогов
> - [.opencode/rules/ui-audit-checklist.md](../rules/ui-audit-checklist.md) — финальный чеклист @ui-auditor

---

## 1. Executive summary

В проекте уже есть зрелый каркас дизайн-системы: **22+ kp-* компонента** в `src/app/shared/ui/`, единый CRUD-шаблон `app-kp-crud-page` + `app-kp-table`, токены в `src/styles/_tokens.scss`, правила в `.opencode/rules/ui-manifest.md` и `.opencode/rules/ui-audit-checklist.md`. **~80% списковых страниц** (12 из 15) уже сидят на `kp-crud-page` и не тянут PrimeNG напрямую.

Технический долг сосредоточен не «везде», а в **точечных разрывах паттернов**: поиск в toolbar таблицы — raw `<input pInputText>`, в product-picker — `app-kp-input`; таб-навигация directories/modules — дублирующий SCSS с `::ng-deep`; пагинация — три реализации (встроенная в `p-table`, standalone `p-paginator` в picker, overrides в `modules-page`); теги — только внутри `kp-table`, без `kp-tag`. **Единственное production-нарушение ESLint `no-restricted-imports` для `primeng/*` в features** — `quotation-editor.component.ts` (~2700 строк, 9× `<p-button>`, 8× raw `<button>`).

ESLint уже запрещает `primeng/*` в features (кроме `primeng/api`), но enforcement неполный: frozen-модули (products, directories/справочники, modules-page) блокируют массовый рефакторинг без разморозки @chief-architect.

---

## 2. Inventory table

### 2.1 Канонические компоненты (`src/app/shared/ui/` + CRUD)

| Компонент | Путь | Назначение |
|-----------|------|------------|
| `app-kp-button` | `kp-button.component.ts` | Обёртка `p-button`, variant premium/flat |
| `app-kp-input` | `kp-input.component.ts` | Текстовые поля с label/error |
| `app-kp-password` | `kp-password.component.ts` | Пароль |
| `app-kp-select` | `kp-select.component.ts` | Select |
| `app-kp-textarea` | `kp-textarea.component.ts` | Textarea |
| `app-kp-input-number` | `kp-input-number.component.ts` | Числа |
| `app-kp-datepicker` | `kp-datepicker.component.ts` | Даты |
| `app-kp-checkbox` | `kp-checkbox.component.ts` | Checkbox |
| `app-kp-multiselect` | `kp-multiselect.component.ts` | Multiselect |
| `app-kp-form-field` | `kp-form-field.component.ts` | Label+control для кастомных полей |
| `app-kp-table` | `kp-table.component.ts` | Таблица: search toolbar, p-table, tags, actions, pagination |
| `app-kp-dialog` | `kp-dialog.component.ts` | Модалки |
| `app-kp-toast` | `kp-toast.component.ts` | Toast |
| `app-kp-confirm-dialog` | `kp-confirm-dialog.component.ts` | Confirm |
| `app-kp-card` | `kp-card.component.ts` | Карточки |
| `app-kp-breadcrumbs` | `kp-breadcrumbs.component.ts` | Хлебные крошки |
| `app-kp-stat-grid` | `kp-stat-grid/` | Dashboard/documents hub |
| `app-kp-photo-uploader` | `kp-photo-uploader.component.ts` | Фото |
| `app-kp-product-picker` | `kp-product-picker/` | Подбор товаров |
| `app-kp-split-text-card` | `kp-split-text-card/` | Split-text для КП |
| `kp-sortable` | `kp-sortable/` | DnD списки |
| `app-empty-state` | `empty-state/` | Пустые состояния |
| `app-page-layout` | `page-layout/` | Layout страницы |
| **`app-kp-crud-page`** | `src/app/shared/crud/kp-crud-page.component.ts` | CRUD-оболочка (не в ui/index, но канон) |

**Shared SCSS (не компоненты, но канон стилей):**
- `src/styles/_tokens.scss` — design tokens
- `src/app/shared/styles/_form-fields.scss` — `.form-layout`, `.form-section`
- `src/app/shared/styles/_kp-button.scss`, `_kp-field.scss`

**Отсутствуют (gap):** `kp-search`, `kp-tag`, `kp-tab-group` / `kp-segmented-control`, `kp-paginator`, `kp-form-layout` (как компонент).

---

### 2.2 Features: kp-crud-page vs custom vs primeng

| Категория | Кол-во | Файлы |
|-----------|--------|-------|
| **На `kp-crud-page`** | **12** | `products-page`, `orders-page`, `quotations-page`, `tenders-page`, `shipments-page`, `work-orders-page`, `purchase-orders-page`, `product-passports-page`, `document-table-types-page`, `attribute-definitions-page`, `directories-page`, `modules-page` |
| **Custom hub/special** | **6** | `login-page`, `dashboard-page`, `not-found-page`, `documents-page`, `quotation-editor`, `attributes-editor` (embedded) |
| **`primeng/*` import в features (prod)** | **1 файл** | `quotation-editor.component.ts` — `ButtonModule`, `SelectModule`, `ToastModule`, `TagModule` + `eslint-disable` |
| **`primeng/api` only (разрешено)** | **2** | `login-page`, `dashboard-page` |
| **Spec/test primeng** | **2** | `products-page.component.spec.ts`, `quotations-page.component.spec.ts` |

**Итого:** из ~18 feature-страниц **12 полностью на design system для списков**; прямой PrimeNG в features — по сути один outlier (`quotation-editor`).

---

### 2.3 Найденные inconsistent patterns (с evidence)

| Паттерн | Канон | Где расходится | Пример путей |
|---------|-------|----------------|--------------|
| **Search bar** | Должен быть единый `kp-search` | Toolbar таблицы: raw `<input pInputText>` + icon CSS; picker: `app-kp-input` без иконки | `kp-table.component.ts:64-76` vs `kp-product-picker.component.ts:66-70` |
| **Tags/badges** | `p-tag` через обёртку + централизованный severity | Только внутри `kp-table`; editor тянет `TagModule` напрямую; `severityFn` дублируется в каждой feature | `quotations-page.component.ts:37-47`, `products-page.component.ts:32-42`, `quotation-editor.component.ts:15` |
| **Icon action buttons** | `app-kp-button` rounded+text secondary/danger | Канон в `kp-table`; editor — raw `<button class="editor__table-cell-action">` | `kp-table.component.ts:185-200`, `quotation-editor.component.ts:589+` |
| **Pagination** | Единый вид/поведение | `p-table` paginator в kp-table; standalone `p-paginator` в picker; `::ng-deep` overrides в modules | `kp-product-picker.component.ts:230`, `modules-page.component.scss:139-159` |
| **Tab navigation** | Переиспользуемый segmented control | Дубли SCSS: `dir-dept__tabs` vs `mod-dept__tabs` с разными overrides | `directories-page.component.scss:39-56`, `modules-page.component.scss:39-51` |
| **Dialogs** | `app-kp-dialog` + footer kp-button | Канон в crud-page; editor — mix kp-dialog + inline p-button | `kp-crud-page.component.ts:107-136`, `quotation-editor.component.ts:345+` |
| **Empty states** | `app-empty-state` | attributes-editor — custom `<div class="...__empty">`; crud/table/picker — канон | `attributes-editor.component.html:13`, `kp-table.component.ts` (EmptyStateComponent) |
| **Form layout** | Компонент или единый partial | `.form-layout` / `.form-section` — SCSS-классы, копируются в 10+ page templates | `_form-fields.scss`, `quotations-page.component.ts:75+` |
| **Golden samples** | `app-kp-button` | `.opencode/golden-samples.ts` всё ещё показывает `<p-button>` | `golden-samples.ts:46+` (зафиксировано в audit 2026-05-27) |
| **Hardcoded colors** | `--kp-*` tokens | login-page, quotation-editor SCSS с hex | `login-page.component.scss:43+`, `quotation-editor.component.scss:73+` |

---

## 3. Phased action plan (P0 / P1 / P2)

### P0 — Foundation: tokens + baseline kp-* (2–3 недели)

**Goal:** Закрыть gaps в design system; все новые экраны используют только kp-*; эталоны синхронизированы с реальностью.

**Owner:** `@design-system` (tokens, новые kp-*), `@ui-specialist` (интеграция в kp-table/crud), `@guardian` (ESLint/barrel)

**FreezeGuard risk:** `ui-kit` = **wip** (можно менять `shared/ui/**`); frozen modules **не трогаем**.

| # | Задача |
|---|--------|
| ☐ | Аудит `_tokens.scss`: выровнять `--kp-control-height-sm` (28px) vs фактическая высота search в kp-table vs kp-input |
| ☐ | Создать **`app-kp-search`**: icon-left, placeholder, size small, debounce input — единый для toolbar |
| ☐ | Заменить search в `kp-table.component.ts` на `app-kp-search` |
| ☐ | Заменить search в `kp-product-picker` на `app-kp-search` (с label optional) |
| ☐ | Создать **`app-kp-tag`**: wrap `p-tag`, severity map hook, size consistent |
| ☐ | Перевести `kp-table` tag cells на `app-kp-tag` |
| ☐ | Создать **`app-kp-tab-group`** (segmented buttons): severity primary/secondary, size small — замена dir/mod-dept tabs |
| ☐ | Вынести **`app-kp-paginator`** или стандартизировать SCSS для `p-paginator` / `p-table` paginator в одном файле |
| ☐ | Унифицировать `.table-actions` hit-area: min 32px (`--kp-touch-target`) в `kp-table.component.scss` |
| ☐ | Обновить `.opencode/golden-samples.ts`: `app-kp-button`, `app-kp-table`, `app-kp-search` |
| ☐ | Дополнить `.opencode/rules/ui-manifest.md` секцией Search + TabGroup + Tag |
| ☐ | Добавить unit smoke-тесты для kp-search, kp-tag (ui-kit wip) |
| ☐ | `ng build` + `ng lint` + visual pass на 1 CRUD-странице (quotations — wip) |

**Файлы:** `src/app/shared/ui/kp-search*`, `kp-tag*`, `kp-tab-group*`, `kp-table.*`, `kp-product-picker/*`, `_tokens.scss`, `golden-samples.ts`, `ui-manifest.md`

**Definition of Done:**
- Search на quotations list и product-picker визуально идентичен (height, radius, icon, focus ring)
- Tags рендерятся только через `app-kp-tag` в shared layer
- golden-samples и ui-manifest описывают актуальные паттерны
- `grep 'pInputText'` в kp-table toolbar = 0 (только через kp-search)

---

### P1 — CRUD patterns + quotations + tab hubs (3–4 недели)

**Goal:** Все list/CRUD страницы ведут себя одинаково; directories/modules без дублирующего SCSS; quotations — эталон для остальных.

**Owner:** `@ui-specialist`, `@ui-qa` (Red Team), `@ui-auditor`

**FreezeGuard risk:**
- ✅ **quotations** (wip), **orders** (wip) — можно менять
- 🧊 **products**, **categories/counterparties/users/roles** (frozen via directories), **modules-page** (frozen) — **только после разморозки** или через изменения в `shared/ui` без правок frozen feature files
- 🧊 **login** (locked) — не трогать без approval

| # | Задача |
|---|--------|
| ☐ | Мигрировать `directories-page` tabs на `app-kp-tab-group`; удалить `dir-dept__btn` ::ng-deep overrides |
| ☐ | Мигрировать `modules-page` tabs на `app-kp-tab-group`; **удалить** `modules-page.component.scss` overrides для `.p-datatable` и `.p-paginator` (строки 53–159) |
| ☐ | Централизовать severity maps: `shared/utils/status-severity.util.ts` (quotations, orders, products, modules) |
| ☐ | Стандартизировать CRUD dialog forms: вынести `app-kp-form-section` из `_form-fields.scss` |
| ☐ | Quotations list (`quotations-page`): проверить columns `type:'select'/'tag'`, entityLabel, extraRowActions — эталон для ui-qa |
| ☐ | Orders, tenders, shipments, work-orders, purchase-orders: audit columns vs seed statuses (tag + options, не ObjectId) |
| ☐ | `attributes-editor`: заменить custom empty/loading на `app-empty-state` + skeleton pattern |
| ☐ | Dashboard: убедиться что `KpStatGrid` cards = те же radius/shadow что kp-table panel |
| ☐ | Documents hub: align с dashboard pattern |
| ☐ | Прогнать `@ui-qa` manifest checks на quotations + orders |
| ☐ | `@ui-auditor` checklist (см. §5) на 5 CRUD-страницах |

**Файлы (wip-safe):** `quotations-page.*`, `orders-page.*`, `tenders-page.*`, `shipments-page.*`, `work-orders-page.*`, `purchase-orders-page.*`, `attributes-editor.*`, `dashboard-page.*`, `documents-page.*`

**Файлы (требуют разморозки):** `directories-page.*`, `modules-page.*`, `products-page.*`

**Definition of Done:**
- directories и modules визуально используют один tab component (screenshot diff < 2px padding)
- modules-page не содержит `::ng-deep .p-datatable` / `.p-paginator` overrides
- 5 CRUD-страниц проходят ui-audit-checklist без ⚠️
- Нет дублирующих `severityFn` в feature files (кроме module-specific edge cases)

---

### P2 — Kill direct PrimeNG in features + editor + enforcement (4–6 недель)

**Goal:** Zero `primeng/*` imports в `features/**` (кроме `primeng/api`); quotation-editor на kp-*; ESLint/CI ловит регрессии.

**Owner:** `@ui-specialist`, `@design-system`, `@guardian`, `@chief-architect` (для frozen)

**FreezeGuard risk:** **quotation-editor** в wip module quotations — можно; **products frozen** blocks attributes if bundled; **login locked**.

| # | Задача |
|---|--------|
| ☐ | Inventory всех `<p-button>`, `<p-tag>`, `<p-select>`, raw `<button>` в `quotation-editor.component.ts` |
| ☐ | Block-controls toggle panel: создать `app-kp-toggle-button` или kp-button mode `[toggle]="true"` |
| ☐ | Заменить 9× `<p-button>` → `app-kp-button` в editor |
| ☐ | Заменить 8× raw `<button>` → `app-kp-button` (icon-only/text) или kp-icon-button |
| ☐ | `TagModule` → `app-kp-tag`; `SelectModule` → `app-kp-select`; `ToastModule` → `app-kp-toast` |
| ☐ | Удалить `eslint-disable no-restricted-imports` из quotation-editor |
| ☐ | Рефактор `quotation-editor.component.scss`: hex → tokens где возможно |
| ☐ | Разморозить @chief-architect: **products** → мигрировать products-page если нужны UI fixes |
| ☐ | Разморозить: **modules-page**, **directories-page** → финальная tab migration |
| ☐ | Login page: перевести hardcoded gradients на tokens (login = locked, нужен approval) |
| ☐ | Добавить ESLint rule / custom lint script: grep `from 'primeng/` in features → CI fail |
| ☐ | Storybook или ui-kit showcase route (`ui-kit` wip module) для всех kp-* |
| ☐ | Полный `@ui-auditor` pass по всем routes из `app.routes.ts` |

**Definition of Done:**
- `grep "from 'primeng/" src/app/features` → только `primeng/api` и spec files
- `grep "<p-button" src/app/features` → 0
- `grep "<button" src/app/features` → 0 (кроме layout overlay если обосновано)
- quotation-editor проходит QUOTATION-EDITOR-BLOCKS.md UX без visual regression
- `npm run freeze:check` exit 0 после всех freeze:update

---

## 4. Reusable «грамматический» prompt для AI-сессий

```markdown
## Задача: UI Consistency — Phase [P0|P1|P2] KPPDF 3.0

Контекст (обязательно прочитать перед кодом):
- AGENTS.md → секции «UI-кит», «QuotationEditor», FreezeGuard
- .opencode/rules/ui-manifest.md — канон кнопок, таблиц, диалогов
- .opencode/rules/ui-audit-checklist.md — финальный чеклист
- .opencode/golden-samples.ts — эталонные паттерны (после P0 — app-kp-*)
- src/styles/_tokens.scss — единственный источник цветов/spacing/radius

Инварианты (НЕ нарушать):
1. В features/* — ТОЛЬКО import из shared/ui/kp-* и shared/crud; primeng/* ЗАПРЕЩЁН (кроме primeng/api)
2. CRUD-списки — app-kp-crud-page + KpColumn type select/tag + *OptionsService для *Id
3. Кнопки — app-kp-button size="small", (buttonClick), severity явный
4. Таблицы — через app-kp-table (не p-table в features)
5. Перед правкой файла — проверить .opencode/lock/INDEX.yaml; frozen → STOP

Phase scope:
- P0: shared/ui only — kp-search, kp-tag, kp-tab-group; обновить kp-table, golden-samples
- P1: quotations-page, orders, wip CRUD; tab migration directories/modules (если разморожено)
- P2: quotation-editor — убрать все primeng/* и raw button; ESLint enforcement

Workflow:
1. @design-system — tokens + новый kp-* component
2. @ui-specialist — интеграция в feature/shared
3. @ui-qa — manifest + golden-samples compliance
4. @ui-auditor — ui-audit-checklist.md
5. ng build && ng lint && (если frozen touched) freeze:update + freeze:check

Deliverable: PR с описанием «до/после» + список затронутых routes для visual QA.
```

---

## 5. QA checklist (visual, 15 пунктов)

После миграции любой страницы проверить:

| # | Check |
|---|-------|
| 1 | **Page padding** совпадает с `--kp-layout-page-padding-x/y` (28px) |
| 2 | **Table panel** (`kp-table-panel`): radius `--kp-radius-lg`, border `--kp-border`, shadow `--kp-shadow-sm` |
| 3 | **Search field height** = `--kp-control-height-sm` (28px) или `--kp-control-height` (32px) — едино на странице |
| 4 | **Search icon** слева, отступ текста ≥ 2.25rem, focus ring `--kp-focus-ring-premium` |
| 5 | **Primary CTA** («Создать…»): `app-kp-button` size small, не overlapping search |
| 6 | **Tag badges**: rounded pill, readable contrast, severity map (не plain text для статусов) |
| 7 | **Table row striping**: even rows `rgb(248, 250, 252)` per ui-manifest |
| 8 | **Action column**: edit = secondary rounded text; delete = danger; hit area ≥ 32px |
| 9 | **Pagination**: «Записи X–Y из Z», rows-per-page dropdown, active page highlighted |
| 10 | **Empty state**: иконка + текст через `app-empty-state`, не голый `<div>` |
| 11 | **Dialog**: modal, header, footer Отмена (secondary outlined) + Сохранить (primary), controls width 100% |
| 12 | **Form fields** в dialog: одинаковый padding/radius у input/select/datepicker |
| 13 | **Tab/segment control**: active = primary filled; inactive = secondary outlined; gap 4px |
| 14 | **No horizontal scroll** на 1280px viewport для CRUD-страницы |
| 15 | **Dark-on-light contrast** WCAG AA для text `--kp-text` на `--kp-surface` |

---

## 6. Существующая документация + рекомендация

| Документ | Путь | Статус |
|----------|------|--------|
| UI Manifest (канон правил) | `.opencode/rules/ui-manifest.md` | ✅ актуален, дополнить Search/Tab |
| UI Audit Checklist | `.opencode/rules/ui-audit-checklist.md` | ✅ для @ui-auditor |
| Golden Samples | `.opencode/golden-samples.ts` | ⚠️ устарел (p-button) |
| Full audit 2026-05-27 | `docs/archive/analysis/AUDIT-2026-05-27-FULL.md` | архив, упоминает UI-kit gap |
| QuotationEditor UX | `src/app/features/quotations/QUOTATION-EDITOR-BLOCKS.md` | P0 feature doc |
| Product picker | `src/app/shared/ui/kp-product-picker/README.md` | локальный README |

**Canonical path этого плана:** `.opencode/audit/UI-CONSISTENCY-PLAN.md`

**Почему:** `.opencode/` уже содержит ui-manifest, ui-audit-checklist, golden-samples, audit reports — единый контур для AI-агентов. `docs/INDEX.md` ссылается на него как bridge.

---

### Краткая матрица FreezeGuard для плана

| Module | Status | UI migration |
|--------|--------|--------------|
| ui-kit | wip | ✅ P0 — primary target |
| quotations, orders | wip | ✅ P1/P2 |
| dashboard, directories-page | wip | ✅ P1 (directories tabs) |
| products, categories, counterparties, users, roles | frozen | 🧊 P1/P2 только через shared/ui или после разморозки |
| modules-page | frozen | 🧊 tab/paginator overrides — после разморозки |
| login, auth, platform | locked | 🧊 не трогать без approval |
