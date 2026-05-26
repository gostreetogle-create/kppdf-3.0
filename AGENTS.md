# KPPDF 3.0 — Архитектурные инварианты

> **Цель:** Защитить целостность проекта через жёсткие правила, а не через "роли агентов".
> Нарушение любого инварианта — архитектурный долг, который нужно немедленно исправить.

---

## 🏗️ Слои зависимостей

```
core → shared → features → layout
          ↕              ↕
      externals      externals
```

### Правила импортов

| Слой | Паттерн | Разрешено импортировать |
|------|---------|------------------------|
| `core` | `src/app/core/**` | ✅ externals (rxjs, @angular) |
| `shared` | `src/app/shared/**` | ✅ `core` + externals |
| `feature` | `src/app/features/**` | ✅ `core`, `shared` + externals |
| `layout` | `src/app/layout/**` | ✅ всё |

### Запреты

- 🔴 **`core` → `shared`, `feature`, `layout`** — core ничего не знает о вышележащих слоях
- 🔴 **`shared` → `feature`, `layout`** — shared не знает о фичах
- 🔴 **`features/X` → `features/Y`** — фичи изолированы. Если нужна общая логика → выносить в `shared/`
- 🔴 **`features` → `layout`** — фичи не знают о шаблонах layout

> **ESLint rule:** Все запреты защищены `eslint-plugin-boundaries` (`boundaries/dependencies`).
> Попытка нарушить → ошибка сборки.

---

## 📦 Public API (Barrel-файлы)

Каждая фича экспортирует ТОЛЬКО через `index.ts`:

```typescript
// features/products/index.ts — единственное, что видно снаружи
export { ProductsComponent } from './products.component';
export type { Product } from './models/product.model';
// всё остальное — ПРИВАТНО
```

### Правила

- ✅ **Импорт из фичи — ТОЛЬКО через barrel:** `import('./features/products')`
- 🔴 **Прямой импорт во внутренности фичи ЗАПРЕЩЁН:** `import('./features/products/products.internal.service')`
- 🔴 **Импорт из barrel за пределами `app.routes.ts` — только через lazy routes

---

## 🎨 UI-кит и PrimeNG

### Иерархия

```
shared/ui/           ← единственное место, где разрешён прямой импорт PrimeNG
  ├── kp-button      ← обёртка над PrimeNG
  ├── kp-input       ← обёртка над PrimeNG
  ├── kp-table       ← обёртка над PrimeNG
  ├── empty-state    ← компонент без PrimeNG
  ├── page-layout    ← компонент без PrimeNG
  └── index.ts       ← публичный API UI-кита
```

### Правила

- ✅ **Новые компоненты** — только через `kp-*` обёртки из `shared/ui/`
- 🔴 **Прямой импорт `primeng/*` в `features/*` ЗАПРЕЩЁН** — только через `shared/ui/`
- 🔴 **Прямой импорт `primeng/*` в `core/*` ЗАПРЕЩЁН** — утилиты не зависят от UI
- 🔴 **Inline-стили ЗАПРЕЩЕНЫ** — только SCSS
- 🔴 **Raw HTML-элементы** (`<button>`, `<input>`, `<table>`, `<dialog>`) — только через PrimeNG или kp-обёртки

> **Note:** Существующий код в `features/*` может содержать прямые импорты PrimeNG.
> Это **технический долг**, который мигрируется по мере рефакторинга в `kp-crud-page`.

---

## 🔐 Permissions (RBAC)

### Единый источник

```typescript
// core/permissions.ts — единственное место, где определяются префиксы
export const MODULE_PERM_PREFIX: Record<string, string> = { ... };
export const DIR_PERM_PREFIX: Record<string, string> = { ... };
```

### Правила

- ✅ **Проверка прав — только через `*appHasPermission` или `auth.hasPermission()`**
- ✅ **Префиксы — только из `core/permissions`**
- 🔴 **Хардкод строк разрешений в шаблонах ЗАПРЕЩЁН** (кроме композиции с префиксом)
- 🔴 **Каждый эндпоинт на бэке — через `crud-factory` с `permPrefix`**

---

## 🔄 CRUD и данные

### Единый поток

```
Компонент → CrudStore / CrudApiService → API → Сервер
```

### Правила

- ✅ **Все CRUD-страницы используют `kp-table` + `CrudStore` / `CrudApiService`**
- ✅ **Все API-ответы — через `ApiResponse<T>` wrapper**
- ✅ **Пагинация для всех списков** (page, limit, total)
- 🔴 **Прямой `http.get` в компонентах ЗАПРЕЩЁН** — только через сервисы
- 🔴 **Ручной CRUD без `crud-factory` на бэке ЗАПРЕЩЁН**

---

## 📐 Технологический стек

| Слой | Технологии |
|------|------------|
| Frontend | Angular 21+, Standalone, Signals, OnPush |
| UI | PrimeNG 21 (через `shared/ui/kp-*`) |
| Стили | SCSS+BEM, CSS-переменные в `_tokens.scss` |
| Backend | Express.js + TypeScript |
| DB | MongoDB + Mongoose |
| Auth | JWT + bcrypt, RBAC |
| Code quality | ESLint + boundaries, TypeScript strict |

---

## 🚦 Процесс работы

### Перед каждой задачей

1. **Прочитать `AGENTS.md`** — убедиться, что все инварианты актуальны
2. **Собрать контекст** — file-picker, code-searcher, read_files
3. **Проверить наличие существующих решений** — не дублировать `CrudStore`, `kp-*`, `core/permissions`

### После каждого изменения

1. **`ng build`** — сборка должна проходить без ошибок
2. **`ng lint`** — проверить ESLint (границы, запрещённые импорты, стиль)
3. **Проверить импорты** — не нарушены ли архитектурные слои
4. **Code review** — запустить `code-reviewer-deepseek-flash` для проверки стандартов качества
5. **Документация** — обновить README/AGENTS.md если изменилась структура

---

## ⛔ Что НЕЛЬЗЯ делать

- 🔴 Использовать `any` — только `unknown` с type guard
- 🔴 Использовать constructor DI — только `inject()`
- 🔴 Использовать NgModules — только Standalone
- 🔴 Использовать `subscribe()` без DestroyRef/OnDestroy
- 🔴 Хранить секреты или JWT в коде — только `.env`
- 🔴 Менять shared/types без синхронизации FE и BE
- 🔴 Игнорировать ESLint-ошибки — `// eslint-disable-next-line` только с обоснованием
