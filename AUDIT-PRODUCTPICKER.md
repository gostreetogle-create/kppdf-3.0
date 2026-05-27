# Аудит реализации ProductPicker — 27 мая 2026

## Общий вердикт: ✅ 95% готово

| Фаза | Статус |
|------|--------|
| 0 — Product fields + API + CRUD | ✅ Всё корректно |
| 1-2 — Picker scaffold + data layer + UI | ✅ Всё корректно |
| 3 — Polish | ✅ Всё корректно |
| 4 — Интеграция в QuotationEditor | ✅ Всё корректно |
| 5 — Тесты | ⚠️ 1 тест упадёт (несуществующий метод) |
| Build | ✅ Успешно |
| Lint | ✅ 0 errors, 15 warnings |

## 🔴 Найденные проблемы

### 1. Тест использует несуществующий метод `onRowActivate`

**Файл:** `src/app/shared/ui/kp-product-picker/kp-product-picker.component.spec.ts`
**Строка:** 88
**Проблема:** Последний тест вызывает `component.onRowActivate(mockProduct)`, но такого метода в компоненте нет. Правильный метод — `onRowDblClick`. Тест упадёт с runtime error.

### 2. Неиспользуемый импорт (warning)

**Файл:** `src/app/shared/ui/kp-product-picker/kp-product-picker.component.spec.ts`
**Строка:** 5
**Проблема:** `import { KpProductPickerService }` не используется напрямую (TestBed создаёт его через providers компонента). Warning не блокирует pre-commit, но лучше убрать.

## Всё остальное — корректно (см. детальную проверку ниже)

### Phase 0 проверка
- ✅ `IProduct.listPrice?: number` / `stockQty?: number` в shared/types
- ✅ Mongoose model: `listPrice: { type: Number, default: 0 }` / `stockQty: { type: Number, default: 0 }`
- ✅ `product.router.ts`: `createCrudRouter(ProductModel, ['name', 'sku'], ...)` 
- ✅ Seed: ВСЕ 23 товара имеют `listPrice` и `stockQty`
- ✅ Products page: `app-kp-input-number` для listPrice/stockQty + колонки `type: 'number'`

### Phase 1-2 проверка
- ✅ Все файлы созданы: types, service, component, SCSS, spec, index, barrel
- ✅ `providers: [KpProductPickerService]` — scoped service (не root singleton)
- ✅ `OnPush` change detection
- ✅ Signals: computed/effect/input/model/signal
- ✅ Debounce 300ms через Subject
- ✅ Search, category (select), kind (select), activeOnly (checkbox)
- ✅ Skeleton 6 rows при loading
- ✅ Empty state с EmptyStateComponent
- ✅ Error state
- ✅ Multi mode: checkbox + master checkbox + корзина снизу
- ✅ Single mode: radio + dblclick → emit + close
- ✅ maxSelection блокировка + disabled rows
- ✅ isAlreadyInDoc — товары уже в КП отключены
- ✅ Пагинация «Показано X–Y из Z» + prev/next
- ✅ cartList, cartCount, cartTotal (сумма listPrice)
- ✅ confirmMulti / cancel / resetFilters
- ✅ No PrimeNG imports — только kp-*
- ✅ No feature imports — только shared + core
- ✅ BEM SCSS, shimmer animation, responsive media queries

### Phase 3 проверка
- ✅ Skeleton animation (shimmer)
- ✅ CSS transitions: row hover 0.15s ease, `:focus-visible` outline
- ✅ @media (max-width: 640px) — flex column, full width

### Phase 4 проверка
- ✅ `KpProductPickerComponent` imported + in imports array
- ✅ Кнопка «Выбрать товары» рядом с «Добавить товар»
- ✅ `<app-kp-product-picker>` с правильными bindings
- ✅ `productPickerVisible = signal(false)`
- ✅ `replaceItemIndex = signal<number | null>(null)`
- ✅ `existingProductIds = computed(...)`
- ✅ `[multiple]="replaceItemIndex() === null"` — умный режим
- ✅ `[selectedIds]="existingProductIds()"`
- ✅ `onProductsSelected` — batch-add + recalcItem в цикле для каждой строки
- ✅ `onProductReplaced` — замена одной строки с сохранением qty
- ✅ `onTableRowDblclick` — stopPropagation на INPUT/SELECT
- ✅ Маршрут `/quotations/:id` не удалён

### Phase 5 проверка
- ✅ service.spec.ts: 3 теста (loadProductsImmediate filters, debounce, reset)
- ⚠️ component.spec.ts: 6-й тест вызовет ошибку
