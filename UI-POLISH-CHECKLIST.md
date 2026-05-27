# KPPDF 3.0 — UI-Полировка: Полный Чеклист

> **Цель:** Пройтись по каждому компоненту, странице и диалогу, привести UI к единому стандарту.
> **Процесс:** Buffy даёт задачу → Cursor делает → Buffy проверяет → ✅ / 🔄 доработка
> **Эталоны:** `.opencode/golden-samples.ts`, `.opencode/rules/ui-manifest.md`, `.opencode/rules/ui-standards.md`
> **Существующие аудиты:** `.opencode/audit/CHECKLIST-BACKLOG.md`, `.opencode/audit/reports/2026-05-27.md`
> **Дата создания:** 2026-05-27

---

## Как работаем

```
[Buffy] даёт задачу из этого чеклиста → [Cursor] делает → [Buffy] проверяет → ✅ / 🔄
```

- **Buffy** выбирает задачу, говорит Cursor что делать
- **Cursor** выполняет, обновляет статус в чеклисте (ставит ✅), запускает `ng build`
- **Buffy** проверяет результат, говорит что дальше
- За один подход: **только одна задача** (не больше 1 компонента/страницы за раз)
- Cursor **ждёт указаний Buffy**, не выбирает задачу сам

---

## 🏗️ 1. UI-Kit (shared/ui) — БАЗА

_Проверить каждый kp-* компонент на соответствие дизайн-токенам и golden-samples_

### 1.1 KpButtonComponent ✅
- [x] `size="small"` — везде в таблицах и диалогах
- [x] Иконки: `pi pi-pencil` — ред., `pi pi-trash` — удал., `pi pi-plus` — создать
- [x] Inline-стили → SCSS (нет `style="..."` в шаблоне)
- [x] `[ariaLabel]` на иконках действий (edit/delete)
- [x] Кнопка "Отмена" — `severity="secondary" outlined`
- [x] Кнопка "Сохранить" — primary, с `[loading]`
- [x] Danger-кнопки (удаление) — `severity="danger"`
- [x] Action-кнопки (редакт) — `severity="secondary" [text]="true" [rounded]="true"`
- [x] Hover-эффекты: 150ms ease transition
- [x] Нет `p-button` напрямую в features/ (мигрировать на kp-button)

### 1.2 KpInputComponent ✅
- [x] Использует `pInputText` с `size="small"`
- [x] Лейбл + required-звёздочка
- [x] Состояние ошибки: красная рамка + сообщение
- [x] Placeholder — на русском
- [x] `[ariaLabel]` — для доступности
- [x] Все инпуты в формах — через kp-input (не raw `<input>`)

### 1.3 KpSelectComponent ✅
- [x] Использует PrimeNG `p-select` (переписан 2026-05-27)
- [x] `size="small"` везде
- [x] `[showClear]="!required()"`
- [x] Лейбл + required-звёздочка
- [x] Error-стили: `styleClass` динамический (не class-binding)
- [x] Placeholder "Выберите..."
- [x] `[loading]` — спиннер
- [x] `[ariaLabel]` — для доступности

### 1.4 KpTextareaComponent ✅
- [x] Использует `pTextarea` с `size="small"`
- [x] Лейбл + required-звёздочка
- [x] Состояние ошибки
- [x] `[autoResize]="true"`

### 1.5 KpInputNumberComponent ✅
- [x] Использует `pInputNumber` с `size="small"`
- [x] Лейбл + required-звёздочка
- [x] `[min]`, `[max]`, `[step]` где нужно
- [x] Состояние ошибки

### 1.6 KpDatepickerComponent ✅
- [x] `pDatePicker` с `size="small"`
- [x] Лейбл + required-звёздочка
- [x] `[showIcon]="true"` + `[iconDisplay]="input"`
- [x] Формат даты: `dd.mm.yy`
- [x] `[ariaLabel]`

### 1.7 KpCheckboxComponent ✅
- [x] `pCheckbox` с `binary="true"`
- [x] Лейбл справа, `size="small"`

### 1.8 KpMultiselectComponent ✅
- [x] `p-multiselect` с `size="small"`
- [x] Лейбл + required-звёздочка
- [x] `[showClear]="true"`, `[filter]="true"`
- [x] `[maxSelectedLabels]` — не больше 2-3

### 1.9 KpPasswordComponent ✅
- [x] `pPassword` с `toggleMask`
- [x] `[weakLabel]`, `[mediumLabel]`, `[strongLabel]` — русский
- [x] `size="small"`

### 1.10 KpFormFieldComponent ✅
- [x] Обёртка: label + control + error в CSS grid
- [x] BEM-стили (`kp-form-field__*`)
- [x] ⚠️ **Не используется в features** — только экспорт в `index.ts` (формы используют встроенные label в kp-input/kp-select)

### 1.11 KpDialogComponent ✅
- [x] Создан .scss (2026-05-27)
- [x] `[modal]="true"`, `[draggable]="false"`, `[resizable]="false"`
- [x] `[blockScroll]="true"`
- [x] Footer через `kpDialogFooter` content projection
- [x] Закрытие: крестик + Escape (`closeOnEscape`)
- [x] Ширина: `480px`, `max-width: 90vw` (адаптив)
- [x] Фокус на первом поле при открытии (`onShow` + effect)
- [x] `[ariaLabel]` / fallback на `header`

### 1.12 KpTableComponent ✅
- [x] `[stripedRows]="true"` — зебра
- [x] Сортировка по заголовку
- [x] Пагинация: `[paginator]="true"` `[rowsPerPageOptions]="[10,25,50]"`
- [x] `[showCurrentPageReport]="true"` + report на русском
- [x] `[size]="'small'"` — компактная
- [x] `[globalFilterFields]` — поиск
- [x] Row actions: pi-pencil (edit) + pi-trash (delete)
- [x] Empty state: "Нет данных"
- [x] Loading state
- [x] `[resizableColumns]="true"` + `pResizableColumn` на колонках
- [x] Focus management при сортировке/пагинации — нативный фокус PrimeNG (sort icon, paginator)

### 1.13 KpToastComponent ✅
- [x] `position="top-right"`
- [x] `[breakpoints]` — адаптив

### 1.14 KpConfirmDialogComponent ✅
- [x] `p-confirmDialog`
- [x] Кнопка подтверждения — `p-button-danger`
- [x] Кнопка отмены — `severity="secondary"`
- [x] Иконка: `pi pi-exclamation-triangle`

### 1.15 KpCardComponent ✅
- [x] Header + content + optional footer (`[kpCardHeader]`, default body, `[kpCardFooter]`)
- [x] Тени: `var(--kp-shadow-sm)`
- [x] Радиус: `var(--kp-radius-lg)`
- [x] Padding: `var(--kp-space-4)` на body/header/footer
- [x] BEM: `kp-card__header`, `kp-card__body`, `kp-card__footer`

### 1.16 PageLayoutComponent ✅
- [x] Используется: `kp-crud-page`, directories, documents, dashboard
- [x] `[page-header]`, `[page-toolbar]`, контент (ng-content)
- [x] BEM/токены в `page-layout.component.scss` (класс `.page`)

### 1.17 EmptyStateComponent ✅
- [x] Иконка + заголовок + описание (+ `role="status"`, `aria-label`)
- [x] Используется в `kp-table` (emptymessage, title «Нет данных»)

### 1.18 A11y (общее для UI-kit) ✅
- [x] ariaLabel: kp-input, textarea, number, date, password, checkbox, multiselect, select, button, table, empty-state, dialog
- [x] Фокус-кольцо: `var(--kp-focus-ring)` на button, select, dialog close
- [x] Диалоги — modal + PrimeNG focus trap; автофокус первого поля в kp-dialog
- [x] TabIndex: нативный порядок DOM в form-layout (без положительных tabindex)

---

## 📄 2. Feature-страницы — ДИАЛОГИ И ФОРМЫ

_Проверить каждую: форма редактирования, диалог, кнопки, entityLabel_

### 2.1 Товары (products) ✅
- [x] Форма: все поля через kp-* (нет raw `<input>`, `<select>`)
- [x] select для categoryId — с опциями из сервиса
- [x] select для status — с русскими подписями
- [x] EAV-атрибуты встроены в форму
- [x] entityLabel: "товара"
- [x] Заголовок: "Создание товара" / "Редактирование товара"
- [x] Кнопки: pi-plus, pi-pencil, pi-trash

### 2.2 Заказы (orders) ✅
- [x] select для statusId, counterpartyId, productId
- [x] datepicker для дат
- [x] inputnumber для quantity
- [x] entityLabel: "заказа"

### 2.3 Коммерческие предложения (quotations) ✅
- [x] select для statusId, counterpartyId
- [x] inputnumber для сумм
- [x] entityLabel: "коммерческого предложения"

### 2.4 Тендеры (tenders) ✅
- [x] select для статусов, datepicker для сроков
- [x] entityLabel: "тендера"

### 2.5 Производственные заказы (work-orders) ✅
- [x] select для orderId, productId, statusId
- [x] entityLabel: "производственного заказа"

### 2.6 Отгрузки (shipments) ✅
- [x] select для warehouseId, orderId
- [x] entityLabel: "отгрузки"

### 2.7 Закупки (purchase-orders) ✅
- [x] select для counterpartyId, statusId
- [x] entityLabel: "закупки"

### 2.8 Паспорта продуктов (product-passports) ✅
- [x] select для productId
- [x] entityLabel: "паспорта продукта"

### 2.9 Определения атрибутов (attribute-definitions) ✅
- [x] select для entityType, type
- [x] checkbox для required
- [x] entityLabel: "атрибута"

### 2.10 Модули (modules) ✅
- [x] select для статуса
- [x] entityLabel: "модуля"

### 2.11 Справочники (directories) — 7 видов ✅
- [x] Контрагенты: name, inn, kpp, phone, email
- [x] Категории: name, description
- [x] Статусы: name, color
- [x] Роли: name, permissions
- [x] Типы работ: name
- [x] Единицы измерения: name
- [x] entityLabel для каждого (контрагента, категории, статуса...)

### 2.12 Вход (login) ✅
- [x] username + password (kp-password с toggleMask)
- [x] Кнопка "Войти" с loading
- [x] Ошибка: тост + подсветка полей
- [x] Redirect после успеха
- [x] Фокус на username при загрузке

### 2.13 Dashboard ✅
- [x] kp-stat-grid с KPI
- [x] Загрузка данных, ссылки на разделы

### 2.14 Not-found (404) ✅
- [x] Сообщение + кнопка "На главную"

### 2.15 Error-состояния (общее) ✅
- [x] Ошибка загрузки данных — тост + повторная попытка (`CrudStore.onError` + баннер «Повторить» в `kp-crud-page`; dashboard — `EmptyState` + кнопка)
- [x] Ошибка сохранения — тост с деталями (`kp-crud-page.save()`)
- [x] Пустой список — `EmptyStateComponent` в `kp-table`
- [x] Спиннер при загрузке (`kp-table__loading`, `kp-stat-grid` skeleton, dashboard loading)

---

## 🎨 3. Стилизация — ГЛОБАЛЬНО

### 3.1 Дизайн-токены ✅
- [x] Цвета в component SCSS — `var(--kp-*)` (hex только в `_tokens.scss`)
- [x] Радиусы — `var(--kp-radius-*)`
- [x] Тени — `var(--kp-shadow-*)`
- [x] Отступы — `var(--kp-space-*)`
- [x] Шрифты — `var(--kp-font-*)`
- [x] BEM в shared/ui component.scss
- [x] Legacy `--color-*` только в `styles.scss` (compat aliases)

### 3.2 PrimeNG-кастомизация (styles.scss) ✅
- [x] Таблицы: header uppercase, striped, hover
- [x] Диалоги: 16px скругления, backdrop-filter blur
- [x] p-tag: pill-стиль (глобально)
- [x] Кнопки: transition 150ms, hover, focus-visible

### 3.3 Анимации ✅
- [x] `kp-fade-in` — утилита + page animation
- [x] `kp-spin` — утилита + loading-state
- [x] Transitions на hover: `var(--kp-transition-base)` (150ms ease)

---

## 🔍 4. Архитектурные проверки

### 4.1 Импорты (AGENTS.md инварианты) ✅
- [x] Нет `primeng/*` UI-компонентов в features (⚠️ `primeng/api` MessageService — допустимый долг)
- [x] Нет `style="..."` в шаблонах приложения
- [x] Нет raw `<button>`, `<input>`, `<select>` в features/*
- [x] `subscribe()` с `takeUntilDestroyed` (login, attributes-editor исправлены)
- [x] Нет constructor DI — только `inject()`
- [x] Нет `: any` в src/app

### 4.2 CRUD-страницы ✅
- [x] Все 14 CRUD через `kp-crud-page` + `kp-table`
- [x] У всех `entityLabel` (включая directories ×7, modules)
- [x] Поля *Id — `type: 'select'` + OptionsService
- [x] Статусы — `type: 'tag'` с русскими подписями

### 4.3 Backend ✅ (аудит 2026-05-27, без правок кода)
- [x] CRUD-сущности (~30 роутов) — через `createCrudRouter` / `crud-factory`
- [x] `permPrefix` — везде, включая `documentTemplateRouter`
- [x] `ApiResponse<T>` wrapper — `success` / `paginated` / `error` из `api-response.ts`
- [x] Пагинация — `page`, `limit`, `total` в crud-factory LIST
- ⚠️ Исключения (не CRUD): `auth`, `health`, `dashboard/stats`, `entity-attribute-values` (EAV GET/PUT), `compliance/check*` (engine)

---

## 🧪 5. Ручное тестирование (не для Cursor — для человека)

_Эти пункты выполняет человек в браузере. Cursor их НЕ трогает._

- [ ] Создание записи → диалог → поля → сохранить → появилась в таблице
- [ ] Редактирование → данные обновились
- [ ] Удаление → confirm dialog → запись исчезла
- [ ] Поиск → таблица отфильтровалась
- [ ] Пагинация → данные подгрузились
- [ ] Сортировка → данные отсортировались
- [ ] Валидация → пустая форма → ошибки под полями
- [ ] Загрузка → spinner в кнопке "Сохранить"
- [ ] Ошибка сети → тост "Ошибка сохранения"
- [ ] Мобильная версия → меню, таблицы, диалоги
- [ ] Клавиатура → Tab по полям, Escape закрывает диалог

---

## 📱 6. Адаптивность

- [x] Меню сворачивается (hamburger) на мобильных
- [x] Таблицы — горизонтальный скролл на мобильных
- [x] Диалоги — `max-width: 90vw`
- [x] Формы — 1 колонка на мобильных
- [x] Кнопки — full-width на мобильных (footer диалогов)
- [x] `--kp-touch-target: 44px` на мобильных

---

## 🧭 7. Навигация и UX

- [x] Названия разделов — на языке производства
- [x] Группировка: Продажи / Производство / Склад / Справочники (+ Главная)
- [x] Ключевое действие (Создать) — видно без поиска (toolbar kp-table)
- [x] Breadcrumbs — `app-kp-breadcrumbs` (PrimeNG p-breadcrumb, auto из Router, в admin-layout)
- [x] ≤ 3 кликов до цели
- [x] Учитывает RBAC (`requiresAny` + `hasPermission`)

---

## 📊 Статистика выполнения

| Категория | Всего пунктов | ✅ Готово | 🔄 Осталось |
|-----------|--------------|-----------|-------------|
| 1. UI-Kit (18 подразделов) | ~80 | 80 | 0 |
| 2. Feature-страницы (15) | 28 | 28 | 0 |
| 3. Стилизация (3) | 16 | 16 | 0 |
| 4. Архитектура (3) | 12 | 12 | 0 |
| 5. Ручное тестирование (11) | 11 | 0 | 11 (человек) |
| 6. Адаптивность (6) | 6 | 6 | 0 |
| 7. Навигация (6) | 6 | 6 | 0 |
| **Итого** | **~155** | **148** | **7** |

> **Финальный микро-раунд 2026-05-27:** KpSelect (все пункты ✅), kp-table resizableColumns + focus, documentTemplateRouter permPrefix. `ng build` OK.

---

## Статус проекта

UI-polish **завершён** для Cursor-задач. Осталось:
- **§5** — ручное тестирование в браузере (человек, 11 пунктов)
