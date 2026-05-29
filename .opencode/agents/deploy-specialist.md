# @deploy-specialist — KPPDF 3.0 Deployment Agent

> **Цель:** Обеспечить надёжный, воспроизводимый деплой KPPDF 3.0 на Ubuntu-сервер.
> Этот документ — **единственный source of truth** для процесса деплоя.
> Все проблемы и их решения задокументированы здесь.

---

## 📋 Быстрый старт (чекаут)

```bash
# 1. Обновить код локально
git pull

# 2. Проверить deploy/.env (должны быть заполнены все поля)
grep -v "^#" deploy/.env | grep -v "^$" | grep -v "^\["

# 3. Конвертировать .sh в LF (ВАЖНО! Иначе CRLF ошибки на сервере)
sed -i 's/\r$//' deploy.sh deploy/deploy.sh deploy/synology/deploy.sh

# 4. Проверить SSH-доступ
ssh -o ConnectTimeout=10 tiit@192.168.1.46 "echo OK"

# 5. Проверить sudo (с паролем или NOPASSWD)
ssh tiit@192.168.1.46 "echo 'PASSWORD' | sudo -S echo SUDO_OK"

# 6. Запустить деплой
bash deploy.sh --skip-seed   # для обновления (без seed)
# bash deploy.sh             # для первого деплоя (с seed)
```

---

## 🏗️ Архитектура деплоя

```
[Windows Dev Machine]                          [Ubuntu Server 192.168.1.46]
┌─────────────────────────┐                   ┌──────────────────────────┐
│  git pull               │  SCP archive       │  /opt/kppdf-3.0/        │
│  npm run build          │ ─────────────────→ │    backend/             │
│  tar archive            │                   │    frontend/browser/    │
│  scp → server:/tmp/     │                   │    docker-compose.prod.yml│
│  ssh → server deploy.sh │                   │    .env                 │
└─────────────────────────┘                   │                          │
                                              │  /var/lib/kppdf/         │
                                              │    mongodb/  ← bind-mount│
                                              │    media/    ← bind-mount│
                                              │    backups/              │
                                              └──────────────────────────┘
```

### Что переживает обновление

| Путь на сервере | Содержимое | При деплое |
|-----------------|------------|------------|
| `/opt/kppdf-3.0/*` | Код, frontend, docker-compose | **Перезаписывается** |
| `/var/lib/kppdf/mongodb/` | База MongoDB | **Сохраняется** ✅ |
| `/var/lib/kppdf/media/` | Файлы | **Сохраняется** ✅ |

---

## 🔒 Безопасность: .env и секреты

- `deploy/.env` содержит JWT_SECRET, пароль sudo, Telegram токены
- **Файл в `.gitignore`** — не попадёт в git ни при каких обстоятельствах
- При деплое .env передаётся на сервер через **base64** (не открытым текстом в SSH)
- На сервере .env хранится в `/opt/kppdf-3.0/.env` с правами `chmod 600`

## 🚨 Известные проблемы и решения

> ⚠️ **Прочитай этот раздел КАЖДЫЙ раз перед деплоем!**

### 1. CRLF (Windows) vs LF (Linux) в .sh файлах

**Симптом:** На сервере ошибки: `$'\r': command not found`, `set: pipefail: invalid option name`
**Причина:** Git на Windows клонирует с CRLF окончаниями. Bash на Ubuntu не понимает `\r`.
**Решение:** **Всегда** конвертировать .sh файлы перед отправкой на сервер:

```bash
sed -i 's/\r$//' deploy.sh deploy/deploy.sh deploy/synology/deploy.sh
```

**Проверка:** `file deploy.sh` → должен показать `ASCII text` (не `with CRLF`)

---

### 2. PowerShell `.ps1` без UTF-8 BOM (локальный dev на Windows)

**Симптом:** `ParserError` при `.\start.ps1`, «Отсутствует закрывающий знак "}"», кракозябры в сообщениях.
**Причина:** PowerShell 5.1 без BOM читает файл как CP1251; кириллица в строках ломает парсер.
**Решение:**

```powershell
npm run ps1:bom
npm run ps1:check
```

**Протокол:** [`.opencode/rules/encoding-windows.md`](../rules/encoding-windows.md) — только ASCII `-` / `->` в строках, русский в одинарных кавычках, pre-commit выставляет BOM.

---

### 3. Sudo требует пароль

**Симптом:** `sudo: a password is required`
**Причина:** По умолчанию `tiit` на Ubuntu требует пароль для sudo.
**Решение:** 
- Пароль уже сохранён в `deploy/.env` → `DEPLOY_PASSWORD`
- Скрипт `deploy.sh` использует `echo 'PASSWORD' | sudo -S`
- SSH-команды с sudo экранировать правильно: `echo 'PASSWORD' | sudo -S bash -c 'command'`

**Важно:** Команды с пайпом и sudo требуют особого экранирования:
```bash
# ✅ Правильно (через bash -c)
ssh tiit@HOST "echo 'PASSWORD' | sudo -S bash -c 'cd /opt/kppdf-3.0 && docker compose ps'"

# ❌ Неправильно (sudo не получит пароль из пайпа)
ssh tiit@HOST "cd /opt/kppdf-3.0 && echo 'PASSWORD' | sudo -S docker compose ps"
```

---

### 3. Monitoring слушает только localhost (127.0.0.1)

**Симптом:** `http://192.168.1.46:3001` не открывается (ERR_CONNECTION_REFUSED),
но изнутри сервера `curl http://localhost:3001` работает.
**Причина:** Monitoring server.py по умолчанию слушает `127.0.0.1`.
**Решение:**

1. Убедиться, что дефолт в `deploy/monitoring/server.py` — `0.0.0.0`:
   ```python
   HOST = os.getenv("MONITOR_HOST", "0.0.0.0")  # не 127.0.0.1!
   ```

2. **ВАЖНО:** Если файл был изменён локально **после** последнего деплоя, нужно сначала скопировать его на сервер, иначе пересборка будет из старого файла:
   ```bash
   scp deploy/monitoring/server.py tiit@HOST:/tmp/
   ssh tiit@HOST "echo 'PASSWORD' | sudo -S cp /tmp/server.py /opt/kppdf-3.0/deploy/monitoring/server.py"
   ```
   Альтернатива — перезапустить полный деплой (который скопирует весь архив).

3. Пересобрать monitoring **с `--no-cache`** (иначе Docker возьмёт старый слой с `127.0.0.1`):
   ```bash
   ssh tiit@HOST "echo 'PASSWORD' | sudo -S bash -c 'cd /opt/kppdf-3.0 && docker compose build --no-cache monitoring && docker compose up -d monitoring'"
   ```

4. **Проверить, что порт слушает на всех интерфейсах:**
   ```bash
   ssh tiit@HOST "echo 'PASSWORD' | sudo -S ss -tlnp | grep 3001"
   # Должен быть: 0.0.0.0:3001, НЕ 127.0.0.1:3001
   ```

5. **Проверить firewall (ufw/iptables):**
   ```bash
   ssh tiit@HOST "echo 'PASSWORD' | sudo -S ufw status"
   # Если inactive — firewall не блокирует.
   # Если active — убедиться, что порт 3001 открыт:
   # sudo ufw allow 3001/tcp
   ```

---

### 4. Angular build: budget exceeded

**Симптом:** `Warning: quotation-editor.component.scss exceeded maximum budget`
**Причина:** CSS-файл quotation-editor (21 kB) превышает бюджет 18 kB.
**Решение:** Это warning, **не ошибка** — сборка проходит успешно.
Можно игнорировать. Для исправления — увеличить бюджет в `angular.json`.

---

### 5. Seed на существующих данных

**Симптом:** Seed падает, потому что данные уже есть (дубликаты).
**Решение:** При обновлении — **всегда использовать `--skip-seed`**.
Только при первом деплое на чистый сервер — без флага.

---

### 6. Docker build на сервере без интернета или медленный

**Симптом:** Docker build зависает или падает по таймауту.
**Решение:** Увеличить таймаут или использовать `--skip-build` при повторном деплое.

---

## 📦 Процесс деплоя (пошагово)

### Preflight (перед каждым деплоем)

```bash
# 1. Убедиться, что репозиторий чист и обновлён
cd C:\Users\user\WebstormProjects\kppdf-3.0
git status          # должно быть clean
git pull            # обновить до последнего коммита

# 2. Проверить deploy/.env
#    Должны быть заполнены: DEPLOY_HOST, DEPLOY_USER, JWT_SECRET, JWT_REFRESH_SECRET
#    DEPLOY_PASSWORD — опционально (если sudo с паролем)
grep -v "^#" deploy/.env | grep -v "^$"

# 3. Конвертировать .sh файлы в LF (обязательно!)
#    Иначе CRLF ошибки на сервере!
sed -i 's/\r$//' deploy.sh deploy/deploy.sh deploy/synology/deploy.sh

# 4. Проверить SSH
ssh -o ConnectTimeout=10 tiit@192.168.1.46 "echo OK"
```

### Деплой (для AI-агента)

**AI-агент должен выполнить следующие шаги последовательно:**

1. **Убедиться, что код обновлён** — выполнить `git pull`
2. **Проверить наличие deploy/.env** — если нет, создать из `.env.example` и попросить пользователя заполнить
3. **Конвертировать .sh в LF** — `sed -i 's/\r$//' deploy.sh deploy/deploy.sh deploy/synology/deploy.sh`
4. **Проверить SSH** — `ssh -o ConnectTimeout=10 tiit@192.168.1.46 "echo OK"`
5. **Проверить HOST в monitoring server.py** — должен быть `0.0.0.0` (не `127.0.0.1`)
6. **Запустить deploy.sh** с правильными флагами:
   - `bash deploy.sh --skip-seed` — для обновления
   - `bash deploy.sh` — для первого деплоя
7. **Проверить результат:**
   - `curl http://192.168.1.46:3000/api/v1/health` — backend
   - `curl -s -o /dev/null -w '%{http_code}' http://192.168.1.46:3001/` — monitoring
   - Docker контейнеры: backend, mongodb, monitor — все Up

### После деплоя (верификация)

```bash
# 1. Проверить health
curl http://192.168.1.46:3000/api/v1/health

# 2. Проверить контейнеры
ssh tiit@192.168.1.46 "echo 'PASSWORD' | sudo -S docker ps"

# 3. Проверить мониторинг (сначала с сервера, потом из браузера)
ssh tiit@192.168.1.46 "curl -sf http://localhost:3001/ | head -10"
# И проверить, что порт слушает на 0.0.0.0:
ssh tiit@192.168.1.46 "echo 'PASSWORD' | sudo -S ss -tlnp | grep 3001"
# Снаружи:
curl http://192.168.1.46:3001/

# 4. Проверить логи (если что-то не так)
ssh tiit@192.168.1.46 "echo 'PASSWORD' | sudo -S docker logs kppdf-backend --tail 50"

# 5. Проверить frontend через браузер
# Открыть: http://192.168.1.46:3000/ или https://sport-set.ru
```

---

## 🐳 Docker Compose — полезные команды на сервере

```bash
# Статус
sudo docker compose -f /opt/kppdf-3.0/docker-compose.prod.yml ps

# Логи
sudo docker compose -f /opt/kppdf-3.0/docker-compose.prod.yml logs -f --tail=50
sudo docker compose -f /opt/kppdf-3.0/docker-compose.prod.yml logs -f backend
sudo docker compose -f /opt/kppdf-3.0/docker-compose.prod.yml logs -f mongodb

# Перезапуск конкретного сервиса
sudo docker compose -f /opt/kppdf-3.0/docker-compose.prod.yml up -d monitoring

# Полная пересборка одного сервиса
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
| `ssh: connect to host 192.168.1.46 port 22: Connection refused` | Сервер не доступен | Проверить VPN/сеть |
| `sudo: a password is required` | Нет NOPASSWD | Использовать `echo 'PASS' \| sudo -S` |
| `ERR_CONNECTION_REFUSED` на :3001 | Monitoring на 127.0.0.1 | Исправить на 0.0.0.0, rebuild |
| Backend не видит MongoDB | MongoDB не стартанула | `docker compose up -d mongodb` |
| Docker permission denied | /var/lib/kppdf/mongodb | `chown -R 999:999 /var/lib/kppdf/mongodb` |

---

## ⛔ Что НЕ ДЕЛАТЬ

- 🔴 **НЕ деплоить без `git pull`** — будет старая версия
- 🔴 **НЕ забывать конвертировать CRLF→LF** — скрипты упадут
- 🔴 **Не использовать `--skip-seed` при первом деплое** — не будет данных
- 🔴 **Не редактировать файлы напрямую на сервере** — изменения пропадут при деплое
- 🔴 **Не менять docker-compose.prod.yml без синхронизации с deploy/.env**
- 🔴 **Не запускать seed поверх существующих данных** — дубликаты

---

## 📁 Файлы, участвующие в деплое

| Файл | Роль |
|------|------|
| `deploy/.env` | Конфигурация (хост, юзер, JWT, пароль) — **в `.gitignore`, не коммитится** |
| `deploy/.env.example` | Шаблон конфига |
| `deploy.sh` | Основной скрипт деплоя (локальный + серверный режим) |
| `deploy/deploy.sh` | Альтернативный скрипт деплоя |
| `docker-compose.prod.yml` | Production Docker Compose |
| `deploy/monitoring/server.py` | Monitoring server (проверить HOST=0.0.0.0!) |
| `deploy/monitoring/Dockerfile` | Dockerfile для monitoring |
| `backend/Dockerfile` | Dockerfile для backend |
| `deploy/synology/deploy.py` | Python-деплой (альтернатива) |
