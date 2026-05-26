# Этап 5 (Stage 5): Compliance

> **Статус: ⏳ В ПЛАНАХ**

## Что нужно сделать
- [ ] Compliance Engine (проверка атрибутов изделия на соответствие ТЗ)
- [ ] 8 операторов: =, ≠, >, <, ≥, ≤, ±, range
- [ ] Двухфазная сверка стадий жизненного цикла (as_designed → as_built)
- [ ] `checkCompliance(source, target, rules)` — проверка атрибутов
- [ ] `checkPassportFinalization(specId)` — блокирующие проверки
- [ ] Интеграция с `advanceLifecycle()`
- [ ] UI для отчётов compliance
- [ ] UI для паспорта изделия
- [ ] Статусная модель compliance (passed / warning / blocked)

## Правила
- Не блокировать advance при soft warning (только при hard block)
- Не выполнять проверку если одно из значений null
- Не изменять compliance-флаг без повторной проверки

## Планируемые агенты
- `@compliance-validator` — проверка соответствия
- `@backend-specialist` — backend
- `@api-specialist` — API-контракты
- `@ui-specialist` — frontend
