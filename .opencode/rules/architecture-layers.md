# Архитектурные слои

## Структура папок
```
src/app/
├── core/       # Auth, guards, interceptors, permissions
├── shared/     # kp-*, crud, services, types
├── features/   # Страницы и сценарии (lazy routes)
└── layout/     # admin-layout, shell
```

## Правила импортов
- `core/` — только externals (@angular, rxjs)
- `shared/` — `core/` + externals; не `features/`, не `layout/`
- `features/` — `core/`, `shared/` + externals; не `layout/`; не другие `features/*`
- `layout/` — может импортировать всё выше

## Запрещено
- Циклические импорты
- Импорты «вверх» по слоям
- Backend-модули во frontend (только `shared/types`)
- Папок `entities/`, `pages/` в этом проекте нет
