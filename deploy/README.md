# KPPDF 3.0 — Деплой (конфигурация и ресурсы)

> 📗 **Полная инструкция по деплою — в [DEPLOY.md](../DEPLOY.md) в корне проекта.**

Этот файл содержит вспомогательную информацию о сервере и Nginx.

## Конфиг `deploy/.env`

| Переменная | Описание | Пример |
|-----------|----------|--------|
| `DEPLOY_HOST` | IP сервера | `192.168.1.46` |
| `DEPLOY_USER` | SSH пользователь | `tiit` |
| `DEPLOY_PASSWORD` | SSH пароль | `Tg30121986` |
| `REMOTE_DIR` | Путь к приложению на сервере | `/opt/kppdf-3.0` |
| `KPPDF_DATA_DIR` | Путь к данным | `/var/lib/kppdf` |
| `JWT_SECRET` | Секрет JWT (32 байта hex) | `014fd310...` |
| `JWT_REFRESH_SECRET` | Секрет refresh JWT | `ceb70bc5...` |
| `CORS_ORIGIN` | Домен для CORS | `https://sport-set.ru` |

## Архитектура

```
🌍 sport-set.ru → Cloudflare Tunnel → Nginx (порт 80)
  ├── /       → Angular статика (frontend/browser/)
  └── /api/*  → Backend Docker (порт 3000)
```

## Пути на сервере

```
/opt/kppdf-3.0/
├── backend/
├── shared/
├── frontend/browser/   ← Angular bundle
├── docker-compose.prod.yml
├── deploy.sh           ← серверный скрипт
└── .env

/var/lib/kppdf/
├── mongodb/
├── media/
└── backups/
```

## Команды для сервера

```bash
# Docker
sudo docker ps
sudo docker logs kppdf-backend --tail 50
sudo docker compose -f /opt/kppdf-3.0/docker-compose.prod.yml logs -f backend

# Cloudflare Tunnel
sudo systemctl status cloudflared
sudo systemctl restart cloudflared

# Seed
sudo docker exec kppdf-backend node dist/backend/src/seed.js
```

## Nginx конфиг

Если нужно настроить Nginx заново:

```nginx
server {
    listen 80;
    server_name sport-set.ru www.sport-set.ru;

    root /opt/kppdf-3.0/frontend/browser;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
sudo ln -sf /etc/nginx/sites-available/kppdf /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx
```
