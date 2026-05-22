# Контекст проекта

> **Шаблон.** Заполни описание проекта, предметную область и ключевые сценарии.

## О проекте

<!--
Опишите:
- Что делает проект
- Кто целевые пользователи
- Какие ключевые сценарии
- Какой стек
-->

## Архитектура

```
core/ → shared/ → entities/ → features/ → pages/
```

- `core/` — глобальные сервисы, guards, interceptors
- `shared/` — переиспользуемые UI-компоненты, типы, константы
- `entities/` — бизнес-сущности
- `features/` — пользовательские сценарии
- `pages/` — экранные компоненты (маршруты)

## Технологический стек (по умолчанию)

| Компонент | Технология |
|-----------|-----------|
| Frontend | Angular 21+, Standalone, Signals, OnPush |
| UI-kit | PrimeNG + Aura + PrimeIcons |
| Стили | SCSS + BEM (только для layout) |
| Состояние | Signals (NO NGRX) |
| Backend | Express.js + TypeScript |
| БД | MongoDB + Mongoose |
| Аутентификация | JWT + bcrypt + RBAC |
