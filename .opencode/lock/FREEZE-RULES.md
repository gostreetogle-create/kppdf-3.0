# FreezeGuard — правила для AI-агентов

> **Обязательно прочитать перед редактированием любого файла проекта.**

## Для пользователя (zero-touch)

**Вам ничего не нужно запускать.** Код и git — зона AI.

| Кто | Что делает |
|-----|------------|
| **Вы** | Описываете задачу в чат |
| **AI** | Правит код, `npm run freeze:check`, `git commit` |
| **Cursor hook** | Блокирует правку frozen-файлов до записи |
| **pre-commit** | Блокирует commit frozen-файлов (авто после `npm install`) |
| **CI** | Проверяет хеши на GitHub |

Памятка: [USER-GUIDE.md](USER-GUIDE.md)

## Алгоритм

1. Открыть [INDEX.yaml](INDEX.yaml) — найти модуль по пути или домену задачи.
2. Открыть lockfile модуля (`modules/*.yaml`) — проверить `locked_files`.
3. Если редактируемый файл попадает в `locked_files` модуля со статусом **frozen** или **locked** → **STOP**.
4. Если статус **wip** → можно менять.
5. Если статус **deprecated** → не трогать, не рефакторить.

## Сообщение пользователю при блокировке

```
🧊 [module] frozen — файл [path] защищён FreezeGuard. Изменение запрещено.
```

Для **locked**:

```
🔒 [module] locked — архитектурный файл. Только @chief-architect.
```

**Не предлагать** «чуть-чуть подправим». **Не игнорировать** — нарушение = архитектурный долг.

## Уровни блокировки

| Статус | Значение | Кто разблокирует |
|--------|----------|------------------|
| `frozen` | Модуль завершён, принят, протестирован | @chief-architect + approval |
| `locked` | Критическая архитектура (auth, AGENTS.md) | @chief-architect |
| `wip` | В разработке — можно менять | — |
| `deprecated` | Будет удалён — не трогать | @chief-architect |

## Как разблокировать (unfreeze)

1. Создать задачу на изменение (issue / YouGile).
2. @chief-architect меняет статус в lockfile на `wip`.
3. Выполнить изменения.
4. Пройти полный цикл аудита (build, lint, UI, guardian).
5. `npm run freeze:update` — пересчитать хеши.
6. Вернуть статус `frozen` / `locked`.

## Override (только @chief-architect через AI, не пользователю)

Pre-commit override — только chief-architect:

```bash
GIT_ALLOW_FREEZE=1 git commit -m "..."
```

**Не предлагать** пользователю `GIT_ALLOW_FREEZE` или `--no-verify`.

CI: комментарий `#freeze-override` в PR + approval @chief-architect.

## CLI (только AI / CI)

```bash
npm run freeze:status   # сводка модулей
npm run freeze:check    # перед git commit — обязательно для AI
npm run freeze:update   # после изменений frozen/locked (@chief-architect approval)
```

Подробнее: [README.md](README.md) · [USER-GUIDE.md](USER-GUIDE.md)

---

## Pre-commit протокол (только AI — пользователь не коммитит)

> **Пользователь не запускает freeze-команды и не делает `git commit`.** Весь цикл ниже — зона ответственности AI перед каждым коммитом.

### Быстрая шпаргалка

```text
1. ng lint && ng build && ng test (ChromeHeadlessCI)
2. cd backend && npm test
3. npm run freeze:update   ← если менялись frozen/locked файлы (с approval)
4. npm run freeze:check    ← exit 0 обязателен
5. git add … && git commit   ← только AI, только если шаг 4 OK
```

### Когда что запускать

| Ситуация | `freeze:update` | `freeze:check` |
|----------|-----------------|----------------|
| Меняли только **wip** (quotations, orders, ui-kit) | ❌ не нужен | ✅ перед commit |
| Меняли **frozen/locked** с approval @chief-architect | ✅ **обязателен** | ✅ после update |
| Только docs / `.opencode/lock/` без кода | ❌ | ✅ |
| `freeze:check` → hash mismatch | Сначала `freeze:update` (если правки легитимны) или откатить код | повторить до exit 0 |

### Полный чеклист перед `git commit`

1. **Качество кода**
   - `npm run lint` — 0 errors
   - `npm run build` — success (допустимы известные budget warnings, см. AUDIT)
   - `npx ng test --no-watch --no-progress --browsers=ChromeHeadlessCI`
   - `cd backend && npm test`

2. **FreezeGuard**
   - `npm run freeze:check`
   - При **hash mismatch** в locked/frozen модуле:
     - Если изменения **без approval** → **STOP**, откатить или сообщить пользователю
     - Если изменения **одобрены** (задача, audit, explicit user OK) → `npm run freeze:update` → снова `freeze:check`

3. **Staging**
   - В commit включить **и код, и обновлённые** `.opencode/lock/modules/*.yaml` (если был `freeze:update`)
   - Не коммитить секреты (`.env`, tokens)

4. **Commit**
   - Только AI, только при `freeze:check` exit 0
   - Pre-commit hook сработает автоматически (дублирует проверку)
   - **Не предлагать** пользователю `--no-verify` или `GIT_ALLOW_FREEZE=1`

### Пример: auth module (2026-05-27)

После миграции JWT → httpOnly cookies затронут **locked** модуль `auth`:

| Файл | Статус |
|------|--------|
| `src/app/core/auth.service.ts` | locked (auth.*) |
| `src/app/core/auth.interceptor.ts` | locked |
| `src/app/core/auth.service.spec.ts` | locked |
| `backend/src/modules/auth/*` | locked |
| `backend/src/types/auth.ts` | locked |
| `backend/src/utils/auth-cookies.ts` | **не в lockfile** — новый файл, OK |
| `src/app/core/credentials.interceptor.ts` | **не в lockfile** — новый файл, OK |
| `backend/src/middleware/auth.ts` | **не в lockfile** — при необходимости добавить в platform/auth |

**Действия AI после approval:**

```bash
npm run lint && npm run build
npx ng test --no-watch --no-progress --browsers=ChromeHeadlessCI
cd backend && npm test && cd ..
npm run freeze:update    # пересчитать хеши auth + других затронутых модулей
npm run freeze:check     # ✅ FreezeGuard: integrity OK
git add -A && git commit -m "..."
```

### Если `freeze:check` падает

```
❌ auth: hash mismatch: src/app/core/auth.service.ts
```

**AI не коммитит.** Варианты:

1. Легитимные правки + approval → `npm run freeze:update` → `freeze:check` → commit
2. Случайная правка locked-файла → откатить файл → `freeze:check`
3. Нужен unfreeze → статус `wip` в lockfile (@chief-architect) → правки → audit → `freeze:update`

### Override (исключение)

`GIT_ALLOW_FREEZE=1 git commit` — **только @chief-architect**, не пользователю, не «на всякий случай».
