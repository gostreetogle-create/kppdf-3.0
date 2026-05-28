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

## 3. Кнопки (`app-kp-button`)

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

## 4. Формы и инпуты

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

## 5. Глобальные стили (`styles.scss`)

### Человеческое правило

- Все hex-цвета ТОЛЬКО в `:root { }` блоке как CSS-переменные. В компонентах — ТОЛЬКО через `var(--color-*)`.
- НИКОГДА `!important` в `styles.scss` (только в `::ng-deep` компонента, и то в крайнем случае).
- `max-width: 1400px` для `.page`.
- Системный стек шрифтов (Google Fonts запрещены).

---

## 6. Сборка

- `ng build` — 0 errors, 0 warnings.
- `ng lint` — 0 errors.
- Бюджеты CSS — не превышены (warning 8kB, error 14kB).
