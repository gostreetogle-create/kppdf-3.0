# Этап 2 (Stage 2): Frontend scaffold

> **Статус: ✅ ЗАВЕРШЁН**

## Что сделано
- [x] Angular 21 standalone проект с PrimeNG Aura compact пресетом
- [x] Ленивая загрузка маршрутов (dashboard + directories + modules + login + 404)
- [x] Admin layout — сайдбар (220px), навигация, router-outlet
- [x] Дизайн-токены (Linear-inspired) — `src/styles/_tokens.scss`
- [x] Глобальные стили — `src/styles/styles.scss`
- [x] ApiService — типизированный HTTP-клиент
- [x] AuthService — JWT логин/рефреш/логаут
- [x] DirectoryService — универсальный CRUD для 8 справочников
- [x] CrudApiService — универсальный CRUD для 18 бизнес-модулей
- [x] NotificationService — Toast-уведомления
- [x] DirectoriesPage — CRUD для 8 справочников (табы, пагинация, поиск, диалоги)
- [x] ModulesPage — CRUD для 18 бизнес-модулей
- [x] DashboardPage — реальная статистика из API (26 таблиц)
- [x] LoginPage — рабочая страница входа
- [x] NotFoundPage — 404 с дизайном
- [x] AuthGuard + AuthInterceptor — защита маршрутов + Bearer token
- [x] proxy.conf.json — /api/* → localhost:3000
- [x] Shared types (26 интерфейсов + index.ts)
- [x] Shared UI (EmptyState, PageLayout)
- [x] PrimeNG: Table, Dialog, Button, InputText, InputNumber, Select, Tag, Card, Toast, ConfirmDialog, Tooltip, Password, Textarea, DatePicker

## Использованные агенты
- `@ui-specialist` — PrimeNG компоненты, стили
- `@auth-specialist` — JWT, guards, interceptors
- `@design-system` — дизайн-токены, CSS-переменные
