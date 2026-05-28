# KPPDF 3.0 — Deployment

> **Каноническая инструкция деплоя.** Единый source of truth для процесса обновления production-сервера.
> Перед каждым деплоем — читать **весь** документ, особенно раздел «🚨 Известные проблемы».

---

## 📋 Быстрый старт (чекаут)

```bash
# 1. Обновить код
cd C:\Users\user\WebstormProjects\kppdf-3.0
git pull

# 2. Конвертировать .sh в LF (ОБЯЗАТЕЛЬНО на Windows!)
sed -i 's/\r$//' deploy.sh deploy/deploy.sh deploy/synology/deploy.sh

# 3. Проверить deploy/.env (должны быть заполнены все поля)
grep -v "^#" deploy/.env | grep -v "^$"

# 4. Проверить monitoring HOST (должен быть 0.0.0.0)
grep "HOST = os.getenv" deploy/monitoring/server.py

# 5. Проверить SSH
ssh -o ConnectTimeout=10 tiit@192.168.1.46 "echo OK"

# 6. Запустить деплой
bash deploy.sh --skip-seed   # для обновления
# bash deploy.sh             # для первого деплоя
```

---

## 🏗️ Архитектура

```
[Windows Dev Machine]                         [Ubuntu Server 192.168.1.46]
┌──────────────────────────┐                 ┌──────────────────────────────┐
│  git pull                │  SCP archive     │  /opt/kppdf-3.0/            │
│  npm run build           │ ───────────────→ │    backend/                  │
│  tar → kppdf-deploy.tar.gz│                 │    frontend/browser/         │
│  scp → server:/tmp/      │                 │    docker-compose.prod.yml   │
│  ssh → deploy.sh server   │                 │    .env                      │
└──────────────────────────┘                 │                              │
                                             │  /var/lib/kppdf/             │
                                             │    mongodb/  ← bind-mount    │
                                             │    media/    ← bind-mount    │
                                             └──────────────────────────────┘
```

### Что переживает обновление

| Путь на сервере | Содержимое | При деплое |
|-----------------|------------|------------|
| `/opt/kppdf-3.0/*` | Код, frontend, docker-compose | **Перезаписывается** |
| `/var/lib/kppdf/mongodb/` | База MongoDB | **Сохраняется** ✅ |
| `/var/lib/kppdf/media/` | Загруженные файлы | **Сохраняется** ✅ |

---

## 🔧 Предварительная настройка (один раз)

### 1. deploy/.env

Создать из шаблона:

```bash
cp deploy/.env.example deploy/.env
```

Заполнить поля:

```
DEPLOY_HOST=192.168.1.46
DEPLOY_USER=tiit
DEPLOY_PASSWORD=<пароль sudo>
JWT_SECRET=<64 hex символа>
JWT_REFRESH_SECRET=<64 hex символа>
CORS_ORIGIN=https://sport-set.ru
```

> Файл в `.gitignore` — не попадёт в git.

### 2. SSH-ключ

```powershell
ssh-keygen -t ed25519 -f $env:USERPROFILE\.ssh\id_ed25519 -N '""'
type $env:USERPROFILE\.ssh\id_ed25519.pub
```

Ключ добавить на сервер:

```bash
echo "ssh-ed25519 AAAA..." >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
```

---

## 🚨 Известные проблемы и решения

> ⚠️ **Прочитай этот раздел КАЖДЫЙ раз перед деплоем! Все проблемы ниже реально возникали.**

### 1. CRLF (Windows) vs LF (Linux)

**Симптом:** `$'\r': command not found`, `set: pipefail: invalid option name`
**Причина:** Git на Windows клонирует с CRLF. Bash на Ubuntu не понимает.

**Решение:** **Всегда** конвертировать .sh перед деплоем:
```bash
sed -i 's/\r$//' deploy.sh deploy/deploy.sh deploy/synology/deploy.sh
```

### 2. Sudo требует пароль

**Симптом:** `sudo: a password is required`
**Причина:** По умолчанию `tiit` требует пароль для sudo.

**Решение:** Пароль сохранён в `deploy/.env` → `DEPLOY_PASSWORD`.
SSH-команды с sudo через `bash -c`:
```bash
# ✅ Правильно
ssh tiit@HOST "echo 'PASSWORD' | sudo -S bash -c 'docker ps'"

# ❌ Неправильно (пайп не дойдёт)
ssh tiit@HOST "echo 'PASSWORD' | sudo -S docker ps"
```

### 3. Monitoring не открывается (127.0.0.1)

**Симптом:** `http://192.168.1.46:3001` — ERR_CONNECTION_REFUSED,
но `curl http://localhost:3001` изнутри сервера работает.
**Причина:** `server.py` по умолчанию слушает `127.0.0.1`.

**Решение:**
1. В `deploy/monitoring/server.py` должно быть:
   ```python
   HOST = os.getenv("MONITOR_HOST", "0.0.0.0")  # НЕ 127.0.0.1!
   ```
2. Если правили файл **после** деплоя — скопировать на сервер:
   ```bash
   scp deploy/monitoring/server.py tiit@HOST:/tmp/
   ssh tiit@HOST "echo 'PASS' | sudo -S cp /tmp/server.py /opt/kppdf-3.0/deploy/monitoring/server.py"
   ```
3. Пересобрать с `--no-cache`:
   ```bash
   ssh tiit@HOST "echo 'PASS' | sudo -S bash -c 'cd /opt/kppdf-3.0 && docker compose build --no-cache monitoring && docker compose up -d monitoring'"
   ```
4. Проверить:
   ```bash
   ssh tiit@HOST "echo 'PASS' | sudo -S ss -tlnp | grep 3001"
   # Должен быть 0.0.0.0:3001, НЕ 127.0.0.1
   ```

### 4. Angular budget exceeded

**Симптом:** `Warning: quotation-editor.component.scss exceeded maximum budget`
**Решение:** Это **warning**, а не ошибка. Сборка проходит успешно. Можно игнорировать.

### 5. Seed дублирует данные

**Симптом:** Seed падает при повторном запуске.
**Решение:** При обновлении — **всегда `--skip-seed`**. Только первый деплой — без флага.

---

## 📦 Полный процесс деплоя

### Preflight (5 проверок)

```bash
# 1. Код свежий?
cd C:\Users\user\WebstormProjects\kppdf-3.0
git status                    # должно быть clean
git pull                      # обновить

# 2. deploy/.env заполнен?
grep -v "^#" deploy/.env | grep -v "^$"

# 3. .sh сконвертированы?
sed -i 's/\r$//' deploy.sh deploy/deploy.sh deploy/synology/deploy.sh

# 4. Monitoring HOST = 0.0.0.0?
grep "HOST = os.getenv" deploy/monitoring/server.py

# 5. SSH работает?
ssh -o ConnectTimeout=10 tiit@192.168.1.46 "echo OK"
```

### Деплой

```bash
# Обновление (без seed)
bash deploy.sh --skip-seed

# Первый деплой (с seed)
bash deploy.sh
```

### Верификация (6 проверок)

```bash
# 1. Health API
curl http://192.168.1.46:3000/api/v1/health
# → {"success":true,"data":{"status":"ok","mongodb":"connected"}}

# 2. Docker контейнеры
ssh tiit@192.168.1.46 "echo 'PASS' | sudo -S docker ps"
# → Все 3 контейнера: Up (kppdf-backend, kppdf-monitor, kppdf-mongodb)

# 3. Мониторинг
curl http://192.168.1.46:3001/
# → HTML дашборд (проверить в браузере)

# 4. Monitoring порт (0.0.0.0:3001, а не 127.0.0.1)
ssh tiit@192.168.1.46 "echo 'PASS' | sudo -S ss -tlnp | grep 3001"

# 5. Frontend
curl -s -o /dev/null -w '%{http_code}' http://192.168.1.46/
# → 200

# 6. Логи backend (если что-то не так)
ssh tiit@192.168.1.46 "echo 'PASS' | sudo -S docker logs kppdf-backend --tail 50"
```

---

## 🐳 Docker на сервере (полезные команды)

```bash
# Статус контейнеров
sudo docker ps

# Логи
sudo docker compose -f /opt/kppdf-3.0/docker-compose.prod.yml logs -f --tail=50
sudo docker compose -f /opt/kppdf-3.0/docker-compose.prod.yml logs -f backend
sudo docker compose -f /opt/kppdf-3.0/docker-compose.prod.yml logs -f monitoring

# Перезапуск сервиса
sudo docker compose -f /opt/kppdf-3.0/docker-compose.prod.yml up -d monitoring

# Полная пересборка
sudo docker compose -f /opt/kppdf-3.0/docker-compose.prod.yml build --no-cache monitoring
sudo docker compose -f /opt/kppdf-3.0/docker-compose.prod.yml up -d monitoring

# Seed вручную
sudo docker exec kppdf-backend node dist/backend/src/seed.js
```

---

## 🔧 Troubleshooting Matrix

| Проблема | Причина | Решение |
|----------|---------|---------|
| `$'\r': command not found` | CRLF в .sh | `sed -i 's/\r$//' deploy.sh` |
| `JWT_SECRET is required` | Не заполнен .env | Заполнить `JWT_SECRET` в deploy/.env |
| SSH не коннектится | Сервер не доступен | Проверить VPN/сеть |
| `sudo: a password is required` | Нет NOPASSWD | Использовать `echo 'PASS' \| sudo -S` |
| ERR_CONNECTION_REFUSED на :3001 | Monitoring на 127.0.0.1 | Исправить на 0.0.0.0, rebuild с --no-cache |
| ERR_CONNECTION_REFUSED на :3001 даже после rebuild | Файл не обновлён на сервере | SCP обновлённый server.py, rebuild |
| Backend не видит MongoDB | MongoDB не стартанула | `docker compose up -d mongodb` |
| Docker permission denied | Права на /var/lib/kppdf/mongodb | `chown -R 999:999 /var/lib/kppdf/mongodb` |
| Seed fail | Данные уже есть | Использовать `--skip-seed` |

---

## 🔒 Безопасность

- `deploy/.env` — в `.gitignore`, не коммитится
- На сервере `.env` — `chmod 600`
- JWT генерировать через `openssl rand -hex 32` (или `py -3 -c "import secrets; print(secrets.token_hex(32))"` на Windows)
- Monitoring доступен без аутентификации — только в локальной сети

---

## 📁 Связанные файлы

| Файл | Роль |
|------|------|
| `deploy/.env` | Конфигурация деплоя (не коммитится) |
| `deploy/.env.example` | Шаблон конфига |
| `deploy.sh` | Единый скрипт деплоя |
| `docker-compose.prod.yml` | Production Docker Compose |
| `deploy/monitoring/server.py` | Monitoring сервер (проверить HOST=0.0.0.0!) |
| `.opencode/agents/deploy-specialist.md` | Полная инструкция для AI-агента деплоя |
| `AGENTS.md` → @deploy-specialist | Краткий чек-лист |
