# FreezeGuard — для пользователя (zero-touch)

> **Вам не нужно знать команды.** Код правит только AI. Защита включена автоматически.

## Что делаете вы

1. Описываете задачу в чат Cursor: «добавь поле в quotations», «исправь баг на dashboard»
2. Ждёте ответ AI

В git, терминал и lockfile **не заходите**.

## Что делает система сама

| Слой | Когда | Что происходит |
|------|-------|----------------|
| **Cursor hook** | AI пытается сохранить файл | Frozen/locked → правка **запрещена** |
| **Правила AI** | Каждый запрос | AI проверяет INDEX перед правкой |
| **pre-commit** | AI делает commit | Frozen-файл в commit → **блок** |
| **CI (GitHub)** | Push на сервер | Проверка хешей frozen-модулей |

Pre-commit включается автоматически при `npm install` или `.\start.ps1`.

## Если AI ответил «products frozen»

Это **нормально** — модуль принят и защищён.

**Что сказать AI:**

- «Нужно изменить products — разморозь через chief-architect»
- AI сам проведёт unfreeze (статус wip → правки → audit → freeze)

**Не нужно:**

- Запускать `npm run freeze:*`
- Вводить `GIT_ALLOW_FREEZE=1`
- Редактировать `.opencode/lock/` вручную

## WIP-модули (можно менять)

Сейчас в разработке: **quotations**, **orders**, **ui-kit** и ERP-модули в scope `modules-page`.

Frozen (не трогать без unfreeze): products, categories, counterparties, users, roles, dashboard, directories, modules-page shell.

Locked (архитектура): login, auth, AGENTS.md, eslint configs.

## Первая настройка на новом ПК

Один раз после clone:

```powershell
npm install
# или
.\start.ps1
```

Больше ничего для FreezeGuard не требуется.

## Технические детали (если интересно)

- [README.md](README.md) — для AI и @chief-architect
- [FREEZE-RULES.md](FREEZE-RULES.md) — правила для агентов
