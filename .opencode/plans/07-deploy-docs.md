# Этап 6 (Stage 6): Документация и деплой

> **Статус: ⏳ ЧАСТИЧНО ВЫПОЛНЕНО**

## Что сделано
- [x] `PROJECT.md` — полное описание проекта (10 секций)
- [x] `README.md` — быстрый старт (установка, запуск, логины)
- [x] `AGENTS.md` — система агентов с ролями и правилами
- [x] `DESIGN.md` — дизайн-система Linear
- [x] `.opencode/AI_CONTEXT.md` — мастер-документ для AI-агентов
- [x] `.opencode/rules/` — 7 файлов правил
- [x] `.opencode/plans/` — 8 планов разработки
- [x] `deploy/synology/` — nginx.conf, deploy.sh, README для Synology
- [x] `docker-compose.yml` + `docker-compose.prod.yml` — контейнеризация
- [x] Proxy.conf.json для dev-сервера
- [x] ESLint flat config для frontend и backend
- [x] Pre-commit hook (ESLint на изменённых файлах)

## Что нужно сделать (⏳)
- [ ] Документация API (OpenAPI / Swagger)
- [ ] CI/CD pipeline (GitHub Actions / GitLab CI)
- [ ] Docker оптимизация (multi-stage build)
- [ ] systemd unit для backend
- [ ] Мониторинг (healthcheck, логи)
- [ ] Руководство пользователя (user manual)
- [ ] Документация по развёртыванию

## Планируемые агенты
- `@deploy-specialist` — деплой, инфраструктура
- `@api-specialist` — API документация
- `@reviewer` — финальный code review
