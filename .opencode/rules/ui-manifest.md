# UI Manifest — Конституция интерфейсов KPPDF 3.0

> Двуслойный документ: человеческие правила (ALWAYS / NEVER) + машиночитаемые YAML-проверки для `@ui-qa`.

---

## 1. Таблицы (`p-table`)

### Человеческое правило

- ВСЕГДА `[stripedRows]="true"` + `[paginator]="true"` + `[rows]="10"` (или `15`).
- ВСЕГДА `styleClass="p-datatable-striped"`.
- ВСЕГДА есть `emptymessage` через `ng-template pTemplate="emptymessage"`.
- Статусы / роли — ТОЛЬКО через `<p-tag [severity]="...">`, НИКОГДА plain text.
- Колонка «Действия» — только iconOnly кнопки: `pi pi-pencil` (secondary) + `pi pi-trash` (danger).
- НИКОГДА raw `<table>`, `<tr>`, `<td>` вне `p-table`.

### Машиночитаемая проверка

```yaml
- rule: "p-table must have paginator"
  selector: "p-table"
  check: "attr"
  attr: "paginator"
  expected: "true"
- rule: "p-table must have stripedRows"
  selector: "p-table"
  check: "attr"
  attr: "stripedRows"
  expected: "true"
- rule: "p-table must have styleClass striped"
  selector: "p-table"
  check: "attr"
  attr: "styleClass"
  expected: "p-datatable-striped"
- rule: "even rows must have non-white background"
  selector: ".p-datatable-tbody > tr:nth-child(even)"
  check: "computed"
  property: "background-color"
  expected: "rgb(248, 250, 252)"
- rule: "roles/statuses must use p-tag, not plain text"
  selector: "td .p-tag"
  check: "exist"
  expected: "true"
  hint: "Each status/role column must contain p-tag component"
- rule: "no raw buttons in templates"
  selector: "template"
  check: "no-raw"
  tag: "button"
  hint: "Use p-button instead"
```

---

## 2. Диалоги (`p-dialog`)

### Человеческое правило

- НИКОГДА не вставляй форму создания/редактирования инлайн на странице. ВСЕГДА в `p-dialog`.
- ВСЕГДА `[modal]="true"`.
- ВСЕГДА `[header]="..."` (заголовок).
- ВСЕГДА есть `ng-template pTemplate="footer"` с кнопками «Отмена» (secondary) и «Сохранить» (primary / default).
- ВСЕГДА `style="width:100%"` на всех контролах внутри формы (`pInputText`, `p-inputNumber`, `p-select`).
- ВСЕГДА `size="small"` на всех инпутах и кнопках в диалоге.

### Машиночитаемая проверка

```yaml
- rule: "dialog must be modal"
  selector: "p-dialog"
  check: "attr"
  attr: "modal"
  expected: "true"
- rule: "dialog must have header"
  selector: "p-dialog"
  check: "attr"
  attr: "header"
  expected: ".+"
  hint: "header attribute must be non-empty"
- rule: "dialog must have footer template"
  selector: "p-dialog"
  check: "has-footer"
  expected: "true"
- rule: "all controls in dialog must be size=small"
  selector: "p-dialog .p-inputtext, p-dialog .p-button"
  check: "attr"
  attr: "size"
  expected: "small"
- rule: "dialog cancel button must be secondary"
  selector: "p-dialog ng-template[pTemplate=footer] p-button:first-child"
  check: "attr"
  attr: "severity"
  expected: "secondary"
```

---

## 3. Поиск (`app-kp-search`)

### Человеческое правило

- ВСЕГДА `app-kp-search` для поисковых полей в toolbar и фильтрах.
- НИКОГДА raw `<input pInputText>` с иконкой — только `app-kp-search`.
- ВСЕГДА `[(query)]` для two-way binding + `(search)` для debounced событий.
- ВСЕГДА `[debounceMs]="300"` для списковых страниц; `0` для мгновенного поиска если нужно.

### Машиночитаемая проверка

```yaml
- rule: "search fields use app-kp-search"
  selector: "app-kp-search"
  check: "exists-in-features"
- rule: "no raw pInputText with search icon in toolbar"
  selector: ".p-input-icon-left input[pInputText]"
  check: "not-exist"
  expected: "true"
  hint: "Use app-kp-search component"
```

---

## 4. Теги (`app-kp-tag`)

### Человеческое правило

- ВСЕГДА `app-kp-tag` для статусов и badges. НИКОГДА raw `<p-tag>` в features.
- Severity: `'info' | 'success' | 'warn' | 'danger' | 'secondary' | 'contrast'`.
- Централизовать severity maps в `shared/utils/status-severity.util.ts`.

### Машиночитаемая проверка

```yaml
- rule: "tags use app-kp-tag not p-tag"
  selector: "app-kp-tag"
  check: "exists-in-features"
  hint: "Use app-kp-tag wrapper"
```

---

## 5. Tab Group (`app-kp-tab-group`)

### Человеческое правило

- ВСЕГДА `app-kp-tab-group` для segmented controls (вкладки справочников, модулей).
- НИКОГДА кастомные `::ng-deep` над raw кнопками для таб-навигации.
- Options: `{ label: string; value: string; icon?: string }[]`.
- Active tab: `[(activeTab)]` two-way binding.

### Машиночитаемая проверка

```yaml
- rule: "tab groups use app-kp-tab-group"
  selector: "app-kp-tab-group"
  check: "exists"
  hint: "Use app-kp-tab-group for segmented navigation"
```

---

## 6. Кнопки (`app-kp-button`)

### Матрица severity × variant

| severity \ variant | `premium` (default)                          | `flat`                  |
|--------------------|----------------------------------------------|-------------------------|
| `primary`          | gradient синий + lift + shadow               | solid синий, без lift   |
| `secondary`        | outlined + gradient border + lift            | outlined, без lift      |
| `danger`           | solid red + red glow + lift                  | solid red, без lift     |

- **`variant='premium'` — default**. Не указывать явно, если не нужен opt-out.
- **`variant='flat'`** — аварийный opt-out для перегруженных toolbar или legacy-контекстов.
- **`styleClass` нельзя использовать для стилизации** — только для исключений с цветом (пример: login, который переопределяет только gradient-цвет, оставляя интеракции из `premium`).

### Человеческое правило

- В `features/*` — **только** `<app-kp-button>` (обёртка `shared/ui/kp-button`).
- **Исключения:** block-controls toggle-панель в `quotation-editor` (`p-button` + локальный SCSS); login submit — `[block]="true" styleClass="auth__submit-btn"` (только цвет, интеракции из `variant='premium'`).
- ВСЕГДА `size="small"`. Severity: `primary` | `secondary` | `danger`.
- IconOnly: `severity="secondary"` (edit) / `severity="danger"` (delete); `[rounded]="true"` + `[text]="true"`.
- Диалоги: «Отмена» — `severity="secondary" [outlined]="true"`; подтверждение — default primary.
- Событие клика: `(buttonClick)`, не `(click)`.

### Машиночитаемая проверка

```yaml
- rule: "features use app-kp-button not p-button"
  selector: "app-kp-button"
  check: "exists-in-features"
- rule: "all buttons must be size=small"
  selector: "app-kp-button:not(.p-button-lg)"
  check: "attr"
  attr: "size"
  expected: "small"
- rule: "icon-only edit buttons are secondary"
  selector: "app-kp-button[icon=pi pi-pencil]"
  check: "attr"
  attr: "severity"
  expected: "secondary"
- rule: "icon-only delete buttons are danger"
  selector: "app-kp-button[icon=pi pi-trash]"
  check: "attr"
  attr: "severity"
  expected: "danger"
```

---

## 7. Формы и инпуты

### Человеческое правило

- ВСЕГДА `pInputText` для текстовых полей. НИКОГДА raw `<input>`.
- ВСЕГДА `style="width:100%"` на всех контролах формы.
- Password поля — ТОЛЬКО через `<p-password [feedback]="false">`.
- Все контролы в форме — одинаковый `padding`, `font-size`, `border-radius`.

### Машиночитаемая проверка

```yaml
- rule: "all inputs use pInputText"
  selector: "input"
  check: "attr"
  attr: "pInputText"
  expected: ""
  hint: "Every input must have pInputText directive"
- rule: "password fields use p-password"
  selector: "input[type=password]"
  check: "not-exist"
  expected: "true"
  hint: "Use p-password component, not raw input[type=password]"
- rule: "form controls have width 100%"
  selector: ".dialog-form .p-inputtext, .dialog-form .p-inputnumber, .dialog-form .p-select"
  check: "computed"
  property: "width"
  expected: "100%"
```

---

## 8. Дизайн-токены (`_tokens.scss`)

> **Аудит 2026-05-29:** сверили 24 kp-* SCSS, `app.config.ts` KppdfPreset, и `_tokens.scss`.

### Человеческое правило

- ВСЕГДА `var(--kp-*)` токены в компонентах. НИКОГДА хардкод `#fff`, `13px`, `16px`.
- Fallback-значения в `var(--kp-*, #fallback)` должны совпадать с реальным значением токена из `_tokens.scss`.
- `--p-*` токены дублированы в `app.config.ts` (KppdfPreset). При изменении — синхронизировать ОБА файла. Preset имеет приоритет.

### Карта токенов (канонический источник — `_tokens.scss`)

| Токен | Значение | Где используется |
|-------|----------|-----------------|
| `--kp-text` | `#0f172a` | base текст |
| `--kp-text-secondary` | `#475569` | подписи, label |
| `--kp-text-soft` | `#64748b` | muted описания |
| `--kp-text-muted` | `#94a3b8` | placeholder, disabled |
| `--kp-text-on-primary` | `#ffffff` | текст на primary-фоне |
| `--kp-border` | `#e2e8f0` | рамки |
| `--kp-surface` | `#ffffff` | карточки, панели |
| `--kp-surface-muted` | `#f1f5f9` | muted фон |
| `--kp-bg-soft` | `#f1f5f9` | фоновые области |
| `--kp-primary` | `#2563eb` | акцент |
| `--kp-primary-hover` | `#1d4ed8` | hover акцента |
| `--kp-primary-dark` | `#1d4ed8` | alias для hover |
| `--kp-primary-soft` | `#dbeafe` | selected-фон |
| `--kp-primary-muted` | `#eff6ff` | hover-фон |

### Результаты аудита (исправлено 2026-05-29)

| Проблема | Было | Стало | Файлы |
|----------|------|-------|-------|
| Расхождение `--p-button-padding-x` | `1rem` | `0.85rem` | `_tokens.scss` ↔ `app.config.ts` |
| Расхождение `--p-dialog-content-padding` | `0 1.5rem 1rem` | `0.5rem 1.5rem 1rem` | `_tokens.scss` ↔ `app.config.ts` |
| Неверный fallback `--kp-text-muted` | `#6b7280` | `#64748b` | `kp-product-picker.scss` (×4) |
| Неверный fallback `--kp-border` | `#d1d5db` | `#e2e8f0` | `kp-product-picker.scss` (×2) |
| Неверный fallback `--kp-surface-muted` | `#f9fafb`, `#f3f4f6` | `#f1f5f9` | `kp-product-picker.scss` (×4) |
| Хардкод `#fff` | literal `#fff` | `var(--kp-text-on-primary)` | `kp-table.scss`, `kp-photo-uploader.scss` (×3), `kp-product-picker.scss` |
| Хардкод `13px` font-size | `font-size: 13px` | `var(--kp-font-size-body)` | `kp-stat-grid.scss` (×2) |
| Хардкод `16px` font-size | `font-size: 16px` | `var(--kp-font-size-h3)` | `kp-stat-grid.scss` |
| Хардкод `4px` gap/padding | `gap: 4px` | `var(--kp-space-1)` | `kp-tab-group.scss` |
| Хардкод `0.75rem` icon position | `left: 0.75rem` | `var(--kp-space-3)` | `kp-search.scss` |
| Хардкод `12px` font-size | `font-size: 12px` | `var(--kp-font-size-sm)` | `kp-paginator.scss` (×2) |
| Нет токена `--kp-surface-muted` | — | `#f1f5f9` | `_tokens.scss` |
| Нет токена `--kp-primary-dark` | — | `#1d4ed8` | `_tokens.scss` |

### Машиночитаемая проверка

```yaml
- rule: "no hardcoded #fff in component SCSS"
  selector: "src/app/shared/ui/**/*.scss"
  check: "no-hardcoded"
  value: "#fff"
  hint: "Use var(--kp-text-on-primary)"
- rule: "no hardcoded #e5e7eb in component SCSS"
  selector: "src/app/shared/ui/**/*.scss"
  check: "no-hardcoded"
  value: "#e5e7eb"
  hint: "Use var(--kp-border) or #e2e8f0"
- rule: "fallback values must match token definitions"
  selector: "src/app/shared/ui/**/*.scss"
  check: "fallback-match"
  tokens:
    --kp-text: "#0f172a"
    --kp-text-secondary: "#475569"
    --kp-text-muted: "#94a3b8"
    --kp-border: "#e2e8f0"
    --kp-surface: "#ffffff"
    --kp-surface-muted: "#f1f5f9"
```

---

## 9. Глобальные стили (`styles.scss`)

### Человеческое правило

- Все hex-цвета ТОЛЬКО в `:root { }` блоке как CSS-переменные. В компонентах — ТОЛЬКО через `var(--color-*)`.
- НИКОГДА `!important` в `styles.scss` (только в `::ng-deep` компонента, и то в крайнем случае).
- `max-width: 1400px` для `.page`.
- Системный стек шрифтов (Google Fonts запрещены).

---

## 9. Плейсхолдер-пикер (`app-kp-placeholder-picker`)

### Человеческое правило

- Диалог выбора токенов `{{category.field}}` для вставки в текстовые блоки шаблонов документов.
- Использовать в редакторе шаблонов рядом с текстовыми полями.
- ВСЕГДА `[(visible)]` two-way binding + `(placeholderSelected)` для получения токена.
- `allowedCategories` — фильтр по категориям (`['org', 'client', 'doc', 'item']`). Пустой массив = все.
- Эмитит строку вида `{{org.name}}` — готовую к вставке в `content` блока.

### Машиночитаемая проверка

```yaml
- rule: "placeholder picker uses app-kp-placeholder-picker"
  selector: "app-kp-placeholder-picker"
  check: "exists"
  hint: "Use app-kp-placeholder-picker for token selection in template editor"
```

---

## 10. Сборка

- `ng build` — 0 errors, 0 warnings.
- `ng lint` — 0 errors.
- Бюджеты CSS — не превышены (warning 8kB, error 14kB).
