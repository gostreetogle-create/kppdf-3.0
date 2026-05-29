# Шаблоны документов — бизнес-логика

> **Дата:** 2026-05-29 · **Версия:** v3.3  
> **Связано:** план `a4_admin_template_editor_c70762ef.plan.md`  
> **Статус:** Фаза 0 ✅ · **Шаг 1 в процессе** (shared A4 canvas) · План: [CHECKLIST-BACKLOG.md](../.opencode/audit/CHECKLIST-BACKLOG.md#-p0-визуальный-a4-редактор-шаблонов-аудит-2026-05-29)

---

## 1. Цель и scope

Документ описывает бизнес-логику системы шаблонов документов KPPDF 3.0: как дизайн шаблона (библиотека) отделяется от данных экземпляра (КП, счёт, договор), как работает снапшот, immutability, return-flow и preview.

**Scope:** все типы документов на платформе (КП, счета, договоры, отгрузочные). Фокус P0 — Коммерческое предложение (quotation).

## 2. Термины

| Термин | Определение |
|--------|-------------|
| **Дизайн шаблона** | Мастер `DocumentTemplate`: `blocks` (layout), `backgroundImage` (фон), `docType`, токены `{{...}}` |
| **Экземпляр** | Конкретный документ (КП): `items[]` (товарные позиции), реквизиты (контрагент, дата), **снапшот** |
| **Снапшот** | `designSnapshot` — копия `{ blocks, backgroundImage }` с шаблона на момент создания/применения |
| **Рендер** | Preview/печать: `resolveDocument()` — подстановка орг/клиент/док/позиции вместо токенов |

## 3. Три слоя

```
Дизайн шаблона (DocumentTemplate)  →  Экземпляр (IQuotation.designSnapshot)  →  Рендер (resolveDocument → preview)
       ↑ библиотека                          ↑ данные + read-only preview                 ↑ печать/предпросмотр
```

- **Дизайн шаблона:** хранится в коллекции `document-templates`. Редактируется в админке `/document-templates/:id`.
- **Экземпляр:** хранит `designSnapshot` — копию блоков и фона. Никогда не обновляется автоматически при изменении шаблона-мастера.
- **Рендер:** `resolveDocument(quotation, org, client)` → подставляет токены → preview/печать.

## 4. Дизайн шаблона (UI, API)

### 4.1 Модель данных

```typescript
interface IDocumentTemplate {
  _id?: string;
  name: string;
  docType: DocType;          // 'quotation' | 'contract' | 'invoice' | 'shipping'
  organizationId: string;    // Counterparty._id с role='company'
  isDefault: boolean;
  isActive: boolean;
  pageSize: 'A4';
  backgroundImage?: string;  // data URL или путь к файлу
  blocks: IDocumentBlock[];  // макет страницы
}
```

### 4.2 Редактирование (Фаза 1)

- **Компонент:** `kp-document-block-editor` mode=`template`
- **Сабжект:** full edit — drag блоков, FAB добавления, настройки стилей, фон
- **Sidebar:** `kp-template-editor-sidebar` — meta, docType, org, фон, плейсхолдеры
- **Сохранение:** `PUT /document-templates/:id { blocks, backgroundImage }`

### 4.3 Права

- `office.documentTemplates.*` — CRUD через `createCrudRouter`

## 5. Экземпляр (read-only canvas)

### 5.1 Модель

```typescript
interface IQuotation {
  // ... реквизиты
  templateId?: string;               // audit only — какой шаблон использовался
  designSnapshot?: IDocumentDesignSnapshot;  // снапшот блоков + фона
  items: IQuotationItem[];
}
```

### 5.2 Отображение (Фаза 2)

- **Компонент:** `kp-document-block-editor` mode=`instance` (read-only)
- **Что видно:** блоки из снапшота; фон из снапшота; товарные позиции в таблицах
- **Что нельзя:** drag блоков, FAB, bg-dropzone, редактирование стилей
- **Что можно:** редактировать позиции (qty/price), менять контрагента, реквизиты

### 5.3 Return-flow (Фаза 2)

1. Пользователь в КП жмёт «Изменить оформление»
2. Переход в редактор шаблона с `returnUrl=/quotations/:id`
3. После сохранения шаблона — диалог «Новый» / «Перезаписать»
4. Возврат в КП — **снапшот НЕ меняется** (immutability)

## 6. Снапшот (состав, immutability, no re-sync)

### 6.1 Интерфейс

```typescript
interface IDocumentDesignSnapshot {
  blocks: IDocumentBlock[];    // полный layout — все настройки, cells, tableKind, токены
  backgroundImage?: string;    // data URL фона
}
```

### 6.2 Что в снапшоте / что нет

| В снапшоте | Не в снапшоте |
|------------|---------------|
| `blocks` — все блоки с полными settings | `items[]` — товарные позиции |
| `backgroundImage` — фон страницы | `counterpartyId`, `organizationId` |
| Токены `{{org.name}}` (неразрешённые) | `date`, `number`, `statusId` |
| `tableKind` структура | `notes` |

### 6.3 Ключевой инвариант: immutability

> **Сохранённый экземпляр НЕ меняется при правке мастер-шаблона.**

- После save КП — `designSnapshot` зафиксирован.
- Изменение `DocumentTemplate.blocks` или `.backgroundImage` **не влияет** на уже созданные КП.
- Единственный способ обновить снапшот — явное действие пользователя «Применить шаблон» (P1, с confirm-диалогом).
- Никакого автоматического re-sync из мастера.

### 6.4 `templateId`

- Хранится на экземпляре как **audit trail** (какой шаблон использовался).
- **Не используется** для live-подгрузки блоков или фона после save.
- Используется для навигации «Открыть шаблон в библиотеке».

### 6.5 Приоритет загрузки

При открытии КП:
1. `designSnapshot` → blocks + backgroundImage (основной источник)
2. `templateSnapshot` (устаревшее) → только blocks, без backgroundImage (обратная совместимость)
3. `templateId` → если нет снапшота, загрузить blocks из шаблона (только для старых КП без снапшота)
4. `isDefault` → применить шаблон по умолчанию
5. `DEFAULT_BLOCKS` → жёстко заданные блоки (fallback)

## 7. Таблицы (structure vs items, resolve)

### 7.1 В шаблоне (structure)

- Блок `type: 'table'` с `tableKind: 'products' | 'services' | 'work'`
- Демо-строка или токены `{{item.sku}}`, `{{item.name}}`
- Колонки из `IDocumentTableType.columns` или `DEFAULT_TABLE_COLUMNS`

### 7.2 В экземпляре (items)

- Строки таблицы формируются из `quotation.items[]` по `tableKind`
- Одна таблица каждого `tableKind` на листе
- Редактирование: qty, price — inline; замена/удаление — через actions

### 7.3 resolveDocument (Фаза 3)

- Цикл: для каждого table-блока → строки из `items[]` того же `tableKind`
- Подстановка плейсхолдеров: `TemplatePlaceholderService.resolve()`
- Результат — готовый к preview/печати документ

## 8. Плейсхолдеры

См. канон: [docs/PLACEHOLDER-SYSTEM.md](PLACEHOLDER-SYSTEM.md).

Кратко:
- Токены `{{org.name}}`, `{{client.inn}}`, `{{doc.number}}`, `{{item.sku}}`
- Реестр: 30+ токенов в `placeholder.registry.ts`
- Сервис: `TemplatePlaceholderService.resolve()` / `resolveBlock()` / `extractTokens()`
- Пикер: `kp-placeholder-picker` — диалог выбора токена
- Интеграция: кнопка «Вставить плейсхолдер» в редакторе шаблонов (Фаза 1A ✅)

## 9. Return-flow

```
КП → «Изменить оформление» → /document-templates/:id?returnUrl=/quotations/:kpId
  → Редактирование шаблона → Save
  → Диалог: «Новый шаблон» / «Перезаписать текущий»
  → Навигация обратно в КП (returnUrl)
  → Снапшот КП НЕ меняется
```

## 10. «Применить шаблон» (P1, опционально)

- Явное действие из КП: «Применить шаблон X к этому КП»
- Confirm-диалог: «Заменить оформление? Позиции сохранятся.»
- Перезаписывает `designSnapshot` на текущий шаблон
- **Не** меняет `items[]`, реквизиты, контрагента

## 11. docType routing

- `docType: 'quotation'` — фильтр шаблонов в пикере КП
- `docType: 'contract'` — для будущего редактора договоров
- `docType: 'invoice'` — для будущего редактора счетов
- `docType: 'shipping'` — для отгрузочных документов

## 12. Preview и печать (Фаза 3)

- `resolveDocument(quotation, org, client)` → готовый документ
- `kp-document-preview` — компонент предпросмотра
- Toggle «Предпросмотр с данными» в КП — переключение между снапшотом с токенами и разрешённым документом
- Печать: `window.print()` на подготовленном preview

## 13. UI-инварианты

- Все названия в UI — **только русский**
- `ROUTE_LABELS` — обязателен для каждого маршрута
- ObjectId не показывать — только через `*OptionsService`
- `kp-*` компоненты из `shared/ui`; нет raw HTML controls
- BEM: `kp-doc-canvas__*` для shared canvas компонента
- Inline-стили запрещены — SCSS
- QuotationEditor `/quotations/:id` — **не удалять**, P0-защита

## 14. Карта файлов

| Файл | Роль |
|------|------|
| `shared/types/quotation.interface.ts` | `IDocumentDesignSnapshot`, `designSnapshot` на `IQuotation` |
| `shared/types/documentTemplate.interface.ts` | `IDocumentTemplate`, `IDocumentBlock` |
| `backend/src/modules/quotations/quotation.model.ts` | Mongoose schema — поле `designSnapshot` |
| `backend/src/modules/document-templates/documentTemplate.model.ts` | Mongoose schema — `blocks`, `backgroundImage` |
| `src/app/features/quotations/quotation-editor.component.ts` | КП: снапшот при save/load, bg из снапшота |
| `src/app/features/document-templates/document-template-editor.component.ts` | Админка шаблонов |
| `src/app/shared/ui/kp-document-block-editor/` | Shared canvas (Фаза 1–2) |
| `src/app/shared/placeholder/` | Плейсхолдеры: реестр + сервис |
| `docs/PLACEHOLDER-SYSTEM.md` | Канон плейсхолдеров |
| `AGENTS.md` | Архитектурные инварианты |

## 15. Regression checklist КП (после Фазы 0)

> **Статус:** Код реализован. Верификация — в Фазе 0b (e2e тесты).

- [ ] Создание нового КП (блоки по умолчанию) — проверено вручную ✅, e2e pending
- [ ] Загрузка существующего КП (блоки из снапшота) — код готов, e2e pending
- [ ] Сохранение КП — снапшот с блоками + фоном — код готов, e2e pending
- [ ] Фон из снапшота, не из live-шаблона — `quotationBg()` читает `designSnapshot`
- [ ] Изменение шаблона не ломает существующие КП (immutability) — инвариант в AGENTS.md, e2e pending
- [ ] `quotationBg()` больше не зависит от `templates[]` (только снапшот) ✅
- [ ] Обратная совместимость: старые КП с `templateSnapshot` (без фона) загружаются — код готов, e2e pending
- [ ] Старые КП с `templateId` + фоном шаблона: фон **не покажется** (дизайн-решение v3.3 — только снапшот). При необходимости — миграция в Фазе 0b.
