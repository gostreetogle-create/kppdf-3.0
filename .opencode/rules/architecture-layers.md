# Архитектурные слои

## Структура папок
```
src/app/
├── core/           # ApiService, AuthService, guards
├── shared/         # UI-компоненты, типы, константы, пайпы
├── entities/       # Бизнес-сущности (Product, Order)
├── features/       # Пользовательские сценарии
└── pages/          # Экранные компоненты (маршруты)
```

## Правила импортов
- `shared/` НЕ может импортировать `entities/`, `features/`, `pages/`, `core/`
- `entities/` может импортировать `shared/` и `core/`
- `features/` может импортировать `entities/`, `shared/`, `core/`
- `pages/` может импортировать `features/`, `entities/`, `shared/`, `core/`

## Запрещено
- Циклические импорты
- Импорты из `../` выше своего слоя
- Прямые импорты модулей backend из frontend (только через shared/types)
