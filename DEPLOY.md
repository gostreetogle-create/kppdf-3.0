# KPPDF 3.0 Deployment

## Purpose

Каноническая инструкция деплоя KPPDF 3.0 для production-окружения.

## Scope

- Общий deployment flow
- Обязательные переменные и проверки
- Ссылки на platform-specific инструкции

## Source of Truth

- Общий деплой-процесс: этот файл
- Synology/Ubuntu специфика: `deploy/synology/RUNBOOK.md`, `deploy/synology/INSTALL.md`
- Freeze-процесс перед релизом: `.opencode/lock/FREEZE-RULES.md`

## Main Content

### Standard flow

1. Подготовить конфиг (`deploy/.env` или `deploy/synology/config.env`).
2. Запустить preflight/checks.
3. Выполнить деплой-скрипт.
4. Проверить health, auth и фронтенд.
5. Зафиксировать результат в release/ops отчете.

### Minimal commands

```bash
# Canonical commands
bash deploy.sh
bash deploy.sh --skip-build
bash tools/build.sh
```

Synology/Ubuntu variants см. в `deploy/synology/RUNBOOK.md`.

### Required checks after deploy

- `GET /api/v1/health` возвращает `success: true`
- авторизация `POST /api/v1/auth/login` работает
- frontend отдает актуальную сборку
- контейнеры `backend`, `mongodb` и прокси в статусе running

## References

- `deploy/synology/RUNBOOK.md`
- `deploy/synology/INSTALL.md`
- `docs/INDEX.md`

