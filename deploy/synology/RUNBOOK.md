# Деплой Synology / Ubuntu — вечерний runbook

## Source of Truth

- Canonical deployment flow: `DEPLOY.md`
- Этот документ: только platform-specific шаги Synology/Ubuntu

> **Полная пошаговая инструкция:** [INSTALL.md](./INSTALL.md)
> Когда скажешь **«деплой на синологи»** — агент выполняет этот чеклист.

## Быстрый старт (вечер)

```powershell
# 1. Preflight
.\deploy\synology\preflight.ps1

# 2. Деплой (первый раз — с seed)
python deploy/synology/deploy.py --seed
```

## Первый раз: чистый Ubuntu-сервер

См. [INSTALL.md §2–4](./INSTALL.md) — подробные шаги.

```powershell
# Сервер (один раз)
scp deploy/synology/server-setup-ubuntu.sh ubuntu@YOUR_IP:/tmp/
ssh ubuntu@YOUR_IP "sudo bash /tmp/server-setup-ubuntu.sh"

# Dev-машина
copy deploy\synology\config.env.example deploy\synology\config.env
# Заполнить: DEPLOY_HOST, JWT_SECRET, JWT_REFRESH_SECRET

pip install -r deploy/synology/requirements.txt
.\deploy\synology\preflight.ps1
python deploy/synology/deploy.py --seed
```

## Персистентные данные

| Путь | Что | При обновлении |
|------|-----|----------------|
| `/opt/kppdf-3.0/` | Код приложения | перезаписывается |
| `/var/lib/kppdf/mongodb/` | База MongoDB | **сохраняется** |
| `/var/lib/kppdf/media/` | Медиа/файлы | **сохраняется** |
| `/var/lib/kppdf/backups/` | Бэкапы | **сохраняется** |

MongoDB: **Docker + bind-mount** (не native, не named volume).

## Обновление (без seed)

```powershell
python deploy/synology/deploy.py
```

## Бэкап перед деплоем

```bash
ssh ubuntu@YOUR_IP "cd /opt/kppdf-3.0 && bash backup.sh"
```

## Проверка после деплоя

```bash
curl http://YOUR_IP:3000/api/v1/health
ls -la /var/lib/kppdf/
```

**Логин:** admin / admin123

## Troubleshooting

| Проблема | Решение |
|----------|---------|
| `JWT_SECRET is required` | Заполни JWT в config.env |
| MongoDB permission denied | `sudo chown -R 999:999 /var/lib/kppdf/mongodb` |
| `docker: command not found` (Synology) | `DOCKER_CMD=/usr/local/bin/docker` |
| Seed fail | `docker exec kppdf-backend node dist/backend/src/seed.js` |

Подробнее: [INSTALL.md §9](./INSTALL.md)

## Файлы

```
deploy/synology/
  INSTALL.md           ← полная инструкция (начни отсюда)
  RUNBOOK.md           ← этот чеклист
  config.env.example
  backup.sh
  deploy.py
  preflight.ps1
  server-setup-ubuntu.sh
```

