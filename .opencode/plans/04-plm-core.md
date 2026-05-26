# Этап 3 (Stage 3): PLM-ядро (Digital Twin)

> **Статус: ✅ БАЗОВЫЙ CRUD ЗАВЕРШЁН. ⏳ Бизнес-логика — в планах.**

## Что сделано
- [x] 18 бизнес-модулей с CRUD через CRUD Factory
- [x] CRM: Quotations, Orders, Interactions — модели + роуты + API
- [x] PLM: BOM, Operations, Tech-Processes — модели + роуты + API
- [x] ERP: Purchase-requests, Purchase-orders — модели + роуты + API
- [x] Склад: Warehouses, Stock-movements, Reservations — модели + роуты + API
- [x] Производство: Work-orders, Work-order-operations — модели + роуты + API
- [x] Себестоимость: Cost-calculations, Actual-costs — модели + роуты + API
- [x] Отгрузка: Shipments, Shipping-docs — модели + роуты + API
- [x] Админ: Counters (автонумерация) — модель + сервис + роуты
- [x] Взаимодействия: Interactions — модель + роуты + API
- [x] Dashboard stats — счётчики по всем 26 таблицам
- [x] Frontend ModulesPage — CRUD UI для всех 18 модулей
- [x] Shared types для всех 26 сущностей

## Что нужно сделать (⏳)
- [ ] EAV-атрибуты (Entity-Attribute-Value) — гибкая расширяемость
- [ ] BOM-деревья — многоуровневые спецификации
- [ ] Product Categories — иерархия + наследование атрибутов
- [ ] Жизненный цикл: as_ordered → as_designed → as_built → as_maintained
- [ ] `advanceLifecycle()` — продвижение по стадиям
- [ ] `removeBomNode()` с reparenting
- [ ] `resyncFromCategory()` — синхронизация с категорией
- [ ] Парсинг dimension (80x80x3 → площадь/объём/вес)

## Планируемые агенты
- `@meta-architect` — EAV, BOM, категории, жизненный цикл
- `@backend-specialist` — backend
- `@ui-specialist` — frontend
- `@api-specialist` — API-контракты
