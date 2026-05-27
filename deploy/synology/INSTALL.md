# Установка KPPDF 3.0 на Ubuntu — пошаговая инструкция

> Полная инструкция для первого развёртывания и последующих обновлений.
> Краткий чеклист: [RUNBOOK.md](./RUNBOOK.md)

---

## 1. Архитектурные решения

### MongoDB: Docker + bind-mount (не native, не named volume)

| Вариант | Решение |
|---------|---------|
| MongoDB native на Ubuntu | **Нет** — backend в контейнере, сложнее сеть и версии |
| Docker named volume | **Нет** — данные спрятаны, неудобно копировать |
| **Docker + bind-mount на диск** | **Да** — папка видна, копируется, переживает обновления |

MongoDB работает **в контейнере**, но файлы базы лежат на диске Ubuntu в `/var/lib/kppdf/mongodb/`.

### Что переживает обновление сайта

| Путь | Содержимое | При `deploy.py` |
|------|------------|-----------------|
| `/opt/kppdf-3.0/` | Код, frontend, docker-compose | **Перезаписывается** |
| `/var/lib/kppdf/mongodb/` | База данных | **Сохраняется** |
| `/var/lib/kppdf/media/` | Загруженные файлы | **Сохраняется** |
| `/var/lib/kppdf/backups/` | Ручные бэкапы | **Сохраняется** |

`docker compose down` **без** флага `-v` не удаляет bind-mount данные.

### Схема

```
/var/lib/kppdf/              ← данные (вне каталога деплоя)
  mongodb/    → контейнер kppdf-mongodb:/data/db
  media/      → контейнер kppdf-backend:/app/uploads
  backups/    → mongodump + копии media

/opt/kppdf-3.0/              ← код (деплой перезаписывает)
  docker-compose.prod.yml
  backend/
  frontend/
  .env                       ← JWT + KPPDF_DATA_DIR
  backup.sh
```

---

## 2. Подготовка Ubuntu-сервера (один раз)

### 2.1. Требования

- Ubuntu 22.04 или 24.04 LTS
- SSH-доступ
- Минимум 2 GB RAM, 10 GB диск

### 2.2. Setup-скрипт

**На dev-машине (Windows PowerShell):**

```powershell
scp deploy/synology/server-setup-ubuntu.sh ubuntu@YOUR_IP:/tmp/
ssh ubuntu@YOUR_IP "sudo bash /tmp/server-setup-ubuntu.sh"
```

Скрипт установит Docker, создаст каталоги, настроит firewall.

### 2.3. SSH-ключ

```powershell
ssh-keygen -t ed25519 -f $env:USERPROFILE\.ssh\id_ed25519 -N '""'
type $env:USERPROFILE\.ssh\id_ed25519.pub
```

Публичный ключ добавить на сервер:

```bash
echo "ssh-ed25519 AAAA..." >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
```

### 2.4. Проверка

```powershell
ssh ubuntu@YOUR_IP "docker ps && ls -la /var/lib/kppdf/"
```

Ожидаемый вывод: `mongodb`, `media`, `backups`.

---

## 3. Подготовка dev-машины

### 3.1. Конфиг деплоя

```powershell
copy deploy\synology\config.env.example deploy\synology\config.env
```

Заполнить `deploy/synology/config.env`:

```env
PLATFORM=ubuntu
DEPLOY_HOST=YOUR_IP
DEPLOY_USER=ubuntu
REMOTE_DIR=/opt/kppdf-3.0
KPPDF_DATA_DIR=/var/lib/kppdf
JWT_SECRET=<64 hex символов>
JWT_REFRESH_SECRET=<64 hex символов>
CORS_ORIGIN=https://sport-set.ru
SEED=true
```

Генерация JWT:

```powershell
py -3 -c "import secrets; print(secrets.token_hex(32))"
```

### 3.2. Python-зависимости

```powershell
pip install -r deploy/synology/requirements.txt
```

### 3.3. Preflight

```powershell
.\deploy\synology\preflight.ps1
```

---

## 4. Первый деплой

```powershell
.\deploy\synology\deploy-synology.ps1 -Seed
```

Или:

```powershell
python deploy/synology/deploy.py --seed
```

Скрипт:
1. Соберёт Angular frontend
2. Создаст архив (backend + shared + frontend + compose + backup.sh)
3. Загрузит на сервер в `/opt/kppdf-3.0/`
4. Создаст `/var/lib/kppdf/{mongodb,media,backups}` (если ещё нет)
5. Запишет `.env` с JWT и `KPPDF_DATA_DIR`
6. `docker compose build && up -d`
7. Seed базы данных
8. Проверит health + auth + frontend

---

## 5. Проверка после установки

### 5.1. Health

```bash
curl http://YOUR_IP:3000/api/v1/health
```

```json
{"success":true,"data":{"status":"ok","mongodb":"connected"}}
```

### 5.2. Login

```bash
curl -X POST http://YOUR_IP:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
```

### 5.3. Данные на диске

```bash
ssh ubuntu@YOUR_IP "ls -la /var/lib/kppdf/ && du -sh /var/lib/kppdf/*"
```

### 5.4. Контейнеры

```bash
ssh ubuntu@YOUR_IP "cd /opt/kppdf-3.0 && docker compose -f docker-compose.prod.yml ps"
```

| URL | Назначение |
|-----|------------|
| `http://IP:3000/` | Frontend |
| `http://IP:3000/api/v1/health` | Health |
| `https://sport-set.ru` | Prod (Cloudflare A-запись → IP) |

**Логин:** admin / admin123

---

## 6. Обновление сайта (без потери данных)

```powershell
python deploy/synology/deploy.py
```

**Без** `--seed` — база не перезаписывается.

Что происходит:
- Пересборка frontend и backend image
- Архив распаковывается в `/opt/kppdf-3.0/`
- `/var/lib/kppdf/*` **не затрагивается**
- `docker compose up -d` перезапускает контейнеры

---

## 7. Бэкап и восстановление

### 7.1. Автоматический бэкап (на сервере)

```bash
ssh ubuntu@YOUR_IP
cd /opt/kppdf-3.0
bash backup.sh
```

Создаёт:
- `/var/lib/kppdf/backups/mongo-YYYY-MM-DD_HHMM/` — mongodump
- `/var/lib/kppdf/backups/media-YYYY-MM-DD_HHMM/` — копия media

Hot backup — MongoDB **не останавливается**.

### 7.2. Ручной копипаст (простой способ)

Скопировать целиком на внешний диск или другой сервер:

```bash
# На сервере — архив данных
sudo tar czf /tmp/kppdf-data-backup.tar.gz -C /var/lib kppdf/

# С dev-машины — скачать
scp ubuntu@YOUR_IP:/tmp/kppdf-data-backup.tar.gz .
```

Папки для копирования:
- `/var/lib/kppdf/mongodb/` — база
- `/var/lib/kppdf/media/` — файлы

### 7.3. Восстановление MongoDB из mongodump

```bash
cd /opt/kppdf-3.0
BACKUP=/var/lib/kppdf/backups/mongo-2026-05-27_2000

docker cp "$BACKUP/kppdf30" kppdf-mongodb:/tmp/restore
docker exec kppdf-mongodb mongorestore --drop --db kppdf30 /tmp/restore
docker exec kppdf-mongodb rm -rf /tmp/restore
docker restart kppdf-backend
```

### 7.4. Восстановление media

```bash
cp -a /var/lib/kppdf/backups/media-YYYY-MM-DD_HHMM/* /var/lib/kppdf/media/
```

### 7.5. Рекомендация

- Бэкап **перед каждым деплоем**: `bash backup.sh`
- Хранить копии `/var/lib/kppdf/` на Synology / внешнем диске
- Cron (опционально): `0 3 * * * cd /opt/kppdf-3.0 && bash backup.sh`

---

## 8. Миграция со старого named volume (если был тест)

Если ранее использовался Docker volume `kppdf-mongodb-data`:

```bash
docker run --rm \
  -v kppdf-mongodb-data:/from \
  -v /var/lib/kppdf/mongodb:/to \
  alpine sh -c "cp -a /from/. /to/"
sudo chown -R 999:999 /var/lib/kppdf/mongodb
cd /opt/kppdf-3.0 && docker compose -f docker-compose.prod.yml up -d
```

---

## 9. Troubleshooting

| Проблема | Решение |
|----------|---------|
| `JWT_SECRET is required` | Заполнить JWT в config.env, redeploy |
| MongoDB permission denied | `sudo chown -R 999:999 /var/lib/kppdf/mongodb` |
| Backend не видит MongoDB | `docker compose -f docker-compose.prod.yml up -d mongodb` |
| Seed fail | `docker exec kppdf-backend node dist/backend/src/seed.js` |
| Permission denied docker | `sudo usermod -aG docker $USER`, re-login |
| Media не сохраняются | Проверить mount: `docker inspect kppdf-backend` → `/app/uploads` |
| Порт 3000 закрыт | `sudo ufw allow 3000/tcp` |

### Логи

```bash
cd /opt/kppdf-3.0
docker compose -f docker-compose.prod.yml logs -f --tail=50
docker compose -f docker-compose.prod.yml logs -f backend
docker compose -f docker-compose.prod.yml logs -f mongodb
```

---

## 10. Synology NAS (альтернатива)

В `config.env`:

```env
PLATFORM=synology
DEPLOY_USER=nastiit
KPPDF_DATA_DIR=/volume1/docker/kppdf-data
REMOTE_DIR=/volume1/docker/kppdf-3.0
```

Структура данных та же: `mongodb/`, `media/`, `backups/` внутри `KPPDF_DATA_DIR`.

---

## Файлы

| Файл | Назначение |
|------|------------|
| [INSTALL.md](./INSTALL.md) | Эта инструкция |
| [RUNBOOK.md](./RUNBOOK.md) | Краткий чеклист |
| [config.env.example](./config.env.example) | Шаблон конфига |
| [server-setup-ubuntu.sh](./server-setup-ubuntu.sh) | Первичная настройка Ubuntu |
| [deploy.py](./deploy.py) | Скрипт деплоя |
| [backup.sh](./backup.sh) | Бэкап MongoDB + media |
| [preflight.ps1](./preflight.ps1) | Проверка перед деплоем |
