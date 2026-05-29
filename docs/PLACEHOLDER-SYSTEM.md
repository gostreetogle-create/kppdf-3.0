# Плейсхолдеры шаблонов документов

> **Создано:** 2026-05-29. **Статус:** Фаза A (реестр + сервис + пикер) — готово. Фаза B (интеграция в редактор + генерация КП) — в бэклоге.

---

## Бизнес-логика

### Зачем нужны плейсхолдеры

Шаблоны документов (КП, счета, договоры) содержат **переменные поля** — данные организации, клиента, номера и даты документа. Вместо того чтобы жёстко вшивать эти данные в шаблон, мы используем **токены** `{{категория.поле}}`, которые подставляются в момент генерации документа.

### Категории токенов

| Категория | Префикс | Источник данных | Примеры |
|-----------|---------|-----------------|---------|
| **Организация** (исполнитель) | `org.*` | `ICounterparty` с `role='company'` | `{{org.name}}`, `{{org.inn}}`, `{{org.bankName}}` |
| **Клиент** | `client.*` | `ICounterparty` с `role='client'` | `{{client.name}}`, `{{client.inn}}`, `{{client.legalAddress}}` |
| **Документ** | `doc.*` | `IQuotation` / `IOrder` | `{{doc.number}}`, `{{doc.date}}`, `{{doc.total}}` |
| **Позиция** (строка таблицы) | `item.*` | `IQuotationItem` | `{{item.sku}}`, `{{item.name}}`, `{{item.qty}}`, `{{item.sum}}` |

### Поток данных

```
1. Пользователь создаёт шаблон → вставляет токены {{org.name}} в блоки
2. При создании КП из шаблона — снимается templateSnapshot (блоки с токенами)
3. При просмотре/печати КП — TemplatePlaceholderService.resolve() подставляет реальные значения
```

### PlaceholderContext

```typescript
interface PlaceholderContext {
  org?: ICounterparty | null;      // организация-исполнитель
  client?: ICounterparty | null;   // клиент из КП
  doc?: {                          // данные документа
    number?: string;
    date?: string;
    validUntil?: string;
    total?: number;
  } | null;
  item?: IQuotationItem | null;    // позиция (для строк таблиц)
}
```

---

## 🌐 Язык интерфейса — жёсткое правило

> **Все названия в UI — только на русском.** Никаких «Document Templates», «Product Picker» или fallback-ов из кода.

### Где это касается плейсхолдеров

| Элемент UI | Правило | Пример |
|------------|---------|--------|
| **Breadcrumbs** | Каждый маршрут → запись в `ROUTE_LABELS` | `'document-templates': 'Шаблоны документов'` |
| **Заголовки страниц** | `title` на `app-kp-crud-page` — русский | `«Шаблоны документов»`, не `«Document Templates»` |
| **Пункты меню** | `label` в `admin-layout` — русский | `«Шаблоны документов»` |
| **Кнопки/подписи** | `label`, `placeholder`, `tooltip` — русский | `«Вставить плейсхолдер»` |
| **Названия категорий/токенов** | `PLACEHOLDER_REGISTRY[*].label` — русский | `'ИНН организации'` |

### ROUTE_LABELS — обязателен для каждого нового маршрута

Файл: [`src/app/shared/ui/kp-breadcrumbs.component.ts`](../../src/app/shared/ui/kp-breadcrumbs.component.ts)

```typescript
const ROUTE_LABELS: Record<string, string> = {
  dashboard: 'Главная',
  documents: 'Документы',
  'document-templates': 'Шаблоны документов',   // ← каждый новый маршрут
  // ...
};
```

**При создании нового lazy-маршрута в `app.routes.ts`:**
1. Добавить русскую метку в `ROUTE_LABELS`
2. Добавить родителя в `ROUTE_PARENTS` (если вложенный маршрут)
3. Проверить breadcrumbs: Главная → Родитель → Страница (все на русском)

> 🔴 **Без записи в `ROUTE_LABELS`** — `humanizeSegment()` выдаст английский fallback из пути URL. Это баг, а не фича.

---

## Как кодить: использование в проекте

### 1. Вставить плейсхолдер в шаблон (UI)

```typescript
// В компоненте редактора шаблона:
// <app-kp-placeholder-picker
//   [(visible)]="pickerVisible"
//   [allowedCategories]="['org', 'client', 'doc']"
//   (placeholderSelected)="onPlaceholderSelected($event)"
// />

onPlaceholderSelected(token: string): void {
  // token = "{{org.name}}" — готовая строка для вставки
  this.activeBlock.content += token;
}
```

### 2. Разрешить токены в строке

```typescript
import { TemplatePlaceholderService } from '../../shared/placeholder';

// В сервисе/компоненте:
const service = inject(TemplatePlaceholderService);
const context: PlaceholderContext = {
  org: organization,           // ICounterparty
  client: quotationClient,     // ICounterparty
  doc: { number: 'КП-001', date: '2026-05-29' },
};

const resolved = service.resolve('Поставщик: {{org.name}}, ИНН {{org.inn}}', context);
// → "Поставщик: ООО Ромашка, ИНН 1234567890"
```

### 3. Разрешить целый блок

```typescript
const resolvedBlock = service.resolveBlock(templateBlock, context);
// Все токены в block.content и block.cells[*].content заменены
```

### 4. Извлечь все токены из шаблона

```typescript
const tokens = service.extractTokens('{{org.name}} — {{doc.number}} от {{doc.date}}');
// → ['doc.date', 'doc.number', 'org.name'] (отсортированы)
```

### 5. Добавить новый токен в реестр

1. Открыть `src/app/shared/placeholder/placeholder.registry.ts`
2. Добавить запись в `PLACEHOLDER_REGISTRY`:
```typescript
{
  token: 'org.bankName',
  label: 'Банк организации',
  category: 'org',
  description: 'Наименование обслуживающего банка',
}
```
3. Убедиться, что поле существует в `ICounterparty` (для org/client) или `IQuotation`/`IQuotationItem` (для doc/item)
4. Сервис `TemplatePlaceholderService.lookup()` автоматически подхватит новое поле через `ctx.org[field]`

---

## Архитектура файлов

```
src/app/shared/
├── placeholder/
│   ├── placeholder.registry.ts        ← реестр: 30 токенов + PlaceholderContext
│   ├── template-placeholder.service.ts ← resolve / resolveBlock / extractTokens
│   └── index.ts                       ← barrel
└── ui/
    └── kp-placeholder-picker/
        ├── kp-placeholder-picker.component.ts   ← диалог-пикер
        ├── kp-placeholder-picker.component.scss ← стили
        └── index.ts                             ← barrel
```

### Правила (инварианты)

- 🔴 **Токены только из реестра** — не хардкодить строки `{{...}}` в компонентах, использовать `PLACEHOLDER_REGISTRY`
- 🔴 **Названия UI — только русские** — breadcrumbs, заголовки, меню, кнопки, подписи. Никакого английского в интерфейсе.
- 🔴 **ROUTE_LABELS обязателен** — каждый новый маршрут в `app.routes.ts` должен иметь запись в `ROUTE_LABELS` (см. выше «Язык интерфейса»)
- 🔴 **resolve() перед рендерингом** — документ с неразрешёнными токенами не должен показываться пользователю (фаза B)
- ✅ **Неизвестные токены остаются без изменений** — `{{unknown.token}}` → `{{unknown.token}}`, не ошибка
- ✅ **Null/undefined значения → токен остаётся** — если поле не заполнено, токен не заменяется на пустую строку

---

## Связи с другими модулями

| Модуль | Как связан |
|--------|-----------|
| `shared/types/documentTemplate.interface.ts` | `IDocumentBlock.content` — поле, куда вставляются токены |
| `shared/types/counterparty.interface.ts` | `ICounterparty` — источник данных для org и client |
| `shared/types/quotation.interface.ts` | `IQuotation` — источник doc.*; `templateSnapshot` — снапшот блоков |
| `shared/types/quotationItem.interface.ts` | `IQuotationItem` — источник item.* |
| `features/document-templates/` | CRUD шаблонов + редактор → использует picker |
| `features/quotations/` | Генерация КП → использует resolve() |
