# Этап 4 (Stage 4): ERP-функции

> **Статус: ⏳ В ПЛАНАХ** (CRUD для ERP-сущностей готов на этапе 3)

## Базовый CRUD (уже готово — этап 3)
- [x] Закупки: Purchase-requests, Purchase-orders (CRUD)
- [x] Склад: Warehouses, Stock-movements, Reservations (CRUD)
- [x] Производство: Work-orders, Work-order-operations (CRUD)
- [x] Себестоимость: Cost-calculations, Actual-costs (CRUD)
- [x] Отгрузка: Shipments, Shipping-docs (CRUD)
- [x] Счётчики автонумерации: Counters (сервис + CRUD)

## Что нужно сделать (⏳)
- [ ] Расчёт себестоимости (cost roll-up) — рекурсивный расчёт BOM
- [ ] Расчёт сроков (lead time) — критический путь
- [ ] Триггеры создания WorkTask при advance → as_designed
- [ ] Триггеры создания MaterialRequest для purchased-узлов
- [ ] Планирование производства (график, загрузка мощностей)
- [ ] Управление материалами и ресурсами
- [ ] Интеграция закупок с BOM (автоматическое создание заявок)
- [ ] UI для планирования (Gantt / kanban)

## Планируемые агенты
- `@production-planner` — расчёты, планирование
- `@backend-specialist` — backend
- `@api-specialist` — API-контракты
- `@ui-specialist` — frontend UI
