# FreezeGuard — блокировка завершённых модулей

> **Пользователю:** [USER-GUIDE.md](USER-GUIDE.md) — zero-touch, команды не нужны.

Машиночитаемые lockfiles + CLI для защиты принятых модулей от случайных правок AI и разработчиков.

## Структура

```
.opencode/lock/
├── INDEX.yaml          # реестр модулей и статусов
├── FREEZE-RULES.md     # инструкции для AI (обязательное чтение)
├── freeze-check.mjs    # CLI
├── README.md
└── modules/
    └── *.yaml          # lockfile на модуль
```

## Workflow: заморозка

1. Модуль прошёл 6 критериев (см. AGENTS.md → FreezeGuard).
2. @chief-architect создаёт `modules/<name>.yaml` с `locked_files`.
3. `npm run freeze:update -- --module <name>` — записать SHA256.
4. `npm run freeze:check` — убедиться, что хеши совпадают.
5. Коммит `.opencode/lock/`.

## Workflow: разморозка

1. Задача + approval @chief-architect.
2. Статус в lockfile → `wip`.
3. Изменения в коде.
4. Аудит заново.
5. `npm run freeze:update` → статус `frozen` / `locked`.

## CLI

| Команда | Описание |
|---------|----------|
| `npm run freeze:status` | Таблица модулей из INDEX |
| `npm run freeze:check` | SHA256 всех frozen/locked с `check_hash: true` |
| `npm run freeze:update` | Пересчёт `file_hashes` в lockfiles |

Флаги `freeze-check.mjs`:

| Флаг | Назначение |
|------|------------|
| `--status` | Таблица (default через npm script) |
| `--check-hashes` | Проверка целостности |
| `--list-frozen-paths` | Список путей для pre-commit |
| `--update-hashes` | Запись хешей в YAML |
| `--stale` | WARNING: файлы модуля вне lockfile |
| `--module <name>` | Один модуль |

Exit codes: `0` OK · `1` mismatch / staged frozen · `2` config error.

## Pre-commit (автоматически)

Активация через `npm prepare` (после `npm install`) или `.\start.ps1`:

```bash
node .opencode/lock/setup-githooks.mjs   # git config core.hooksPath .githooks
```

Override только @chief-architect: `GIT_ALLOW_FREEZE=1 git commit ...`

### Pre-commit для AI (пользователь не коммитит)

См. [FREEZE-RULES.md](FREEZE-RULES.md) — раздел **«Pre-commit протокол»**.

```bash
# 1. Quality gates
npm run lint && npm run build
npx ng test --no-watch --no-progress --browsers=ChromeHeadlessCI
cd backend && npm test && cd ..

# 2. FreezeGuard (после изменений frozen/locked — с approval)
npm run freeze:update   # пересчёт SHA256 в modules/*.yaml
npm run freeze:check    # exit 0 → можно commit

# 3. Commit (только AI)
git add … && git commit -m "…"
```

**2026-05-27:** после auth httpOnly cookies — `freeze:update` обновил 7 хешей в `modules/auth.yaml`; `freeze:check` → OK.

## Cursor hook (автоматически)

[`.cursor/hooks.json`](../../.cursor/hooks.json) — `preToolUse` блокирует Write/StrReplace на frozen-файлах **до** записи.

## Политика shared-файлов

| Файл | Политика |
|------|----------|
| `directories-page/*` | Один lockfile на весь FE справочников |
| `attributes-editor/*` | В `products.yaml`; generic EAV — tenders/orders WIP |
| `seed.ts`, `app.ts` | `platform.yaml`, `policy: manual-review`, без hash |
| `shared/types/*.interface.ts` | Per-module в entity lockfiles, не весь каталог |

## История фаз

- **Phase 1 (скелет):** INDEX, CLI, WIP-заглушки, документация.
- **Phase 2:** lockfiles для 8 frozen + 3 locked + `--update-hashes`.
- **Phase 3:** pre-commit, `quality.yml`, Cursor rule.
- **Zero-touch:** Cursor hook, `setup-githooks.mjs`, USER-GUIDE.

## Project Readiness (дашборд)

Источник: [`.opencode/project-readiness.yaml`](../project-readiness.yaml) → `npm run readiness:sync` → `public/project-readiness.json`.

### Граница ответственности: Readiness vs FreezeGuard

- **Readiness**: прогресс проекта (проценты, чеклисты, этапы) и UI-полоски готовности.
- **FreezeGuard**: правила изменения файлов (wip/locked/frozen + hash-контроль).
- Эти системы не заменяют друг друга: readiness не блокирует изменения, freeze не отражает готовность.

| Действие | Команда |
|----------|---------|
| Обновить JSON после правки YAML | `npm run readiness:sync` |
| Скрыть полоски и кнопку на 100% | `enabled: false` в YAML + sync |

После отключения фичи UI не показывает полоски и диалог «Статус реализации» — код можно оставить, данные не грузятся.

## Readiness Feedback (замечания для AI)

Источник: [`.opencode/readiness-feedback.yaml`](../readiness-feedback.yaml) → `node .opencode/lock/readiness-feedback-sync.mjs` → `public/readiness-feedback.json`.

| Действие | Команда |
|----------|---------|
| Список open issues | `npm run readiness:feedback` |
| Промпты для AI | `npm run readiness:prompt` |
| Sync YAML → JSON | `node .opencode/lock/readiness-feedback-sync.mjs` |

Не в FreezeGuard — живой backlog пользователя. Canonical plan (% и галочки) — в `project-readiness.yaml` (правит AI).

### Decommission readiness UI

**Мягкое выключение** (проект 100%, UI больше не нужен):

1. `.opencode/project-readiness.yaml` → `enabled: false`
2. `npm run readiness:sync`
3. Commit — дашборд без полосок и кнопки

**Полное удаление** (~15 мин, один PR):

1. Удалить: `project-readiness.yaml`, `readiness-sync.mjs`, `public/project-readiness.json`, `kp-readiness-bar/`, `readiness-showcase.*`, `project-readiness.model.ts`
2. Откатить: `dashboard-page`, `dashboard.service`, `kp-stat-grid` (убрать `readinessPercent` и bar)
3. Убрать `readiness:sync` из `package.json`
4. Unfreeze `dashboard.yaml` → удалить readiness-код → `npm run freeze:update -- --module dashboard`
5. `ng build` + `ng lint`
