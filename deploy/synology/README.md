# 🚀 Деплой KPPDF 3.0 на Synology NAS

## 📋 Требования

- **Synology NAS** с доступом по SSH (DSM 7+)
- **Docker** — установить через Package Center
- **Node.js 22** — установить через Package Center (или используем Docker)

## 🔧 Быстрый старт (через Docker)

### 1. Подготовить Synology

```bash
# Подключиться по SSH
ssh nastiit@192.168.1.134

# Создать папку для проекта
sudo mkdir -p /volume1/docker/kppdf-3.0
```

### 2. Скопировать проект на Synology

На вашем dev-компьютере (в корне проекта):

```bash
# Собрать Angular frontend
npx ng build --configuration production

# Создать deploy.tar.gz
tar czf deploy.tar.gz \
  dist/kppdf-3.0 \
  backend \
  docker-compose.prod.yml \
  --exclude='backend/node_modules' \
  --exclude='backend/src/__tests__'

# Копировать на Synology
scp deploy.tar.gz nastiit@192.168.1.134:/volume1/docker/kppdf-3.0/
```

### 3. Распаковать и запустить на Synology

```bash
# На Synology
cd /volume1/docker/kppdf-3.0
tar xzf deploy.tar.gz

# Запустить MongoDB + backend
sudo docker compose -f docker-compose.prod.yml up -d

# Проверить
curl http://localhost:3000/api/v1/health
```

### 4. Настроить Cloudflare DNS

В панели Cloudflare → sport-set.ru → DNS:

| Тип | Имя | Значение | Прокси |
|-----|-----|----------|--------|
| A | `@` | `192.168.1.134` | DNS only |
| CNAME | `www` | `sport-set.ru` | DNS only |

> ⚠️ Прокси Cloudflare (оранжевое облако) может не работать с динамическим IP Synology.
> Если у вас статический IP — включите прокси для HTTPS и кеширования.

### 5. Настроить Reverse Proxy в DSM

Если вы **не** используете Docker для backend, настройте Reverse Proxy:

**DSM → Control Panel → Application Portal → Reverse Proxy:**

| Поле | Значение |
|------|----------|
| Source Protocol | HTTPS |
| Source Hostname | sport-set.ru |
| Source Port | 443 |
| Destination Protocol | HTTP |
| Destination Hostname | localhost |
| Destination Port | 3000 |

### 6. Seed данных (первый запуск)

После запуска Docker-стека — наполнить БД тестовыми данными:

```bash
# Подключиться к контейнеру backend
docker exec -it kppdf-backend sh

# Запустить seed
node dist/seed.js
```

## 📁 Структура на Synology

```
/volume1/docker/kppdf-3.0/
├── docker-compose.prod.yml   # Docker Compose (MongoDB + Backend)
├── backend/                   # Backend (Node.js + Express)
│   ├── dist/                  # Скомпилированный backend
│   ├── node_modules/
│   └── .env.production        # Переменные окружения
└── frontend/                  # Angular SPA (раздаётся через backend)
    └── (собранные файлы)
```

## 🔄 Обновление

```bash
# 1. На dev-машине — собрать фронтенд
npx ng build --configuration production

# 2. Скопировать фронтенд на Synology
rsync -avz --delete dist/kppdf-3.0/ nastiit@192.168.1.134:/volume1/docker/kppdf-3.0/frontend/

# 3. Перезапустить backend
ssh nastiit@192.168.1.134 "docker restart kppdf-backend"
```

## 🛑 Остановка

```bash
ssh nastiit@192.168.1.134
cd /volume1/docker/kppdf-3.0
sudo docker compose -f docker-compose.prod.yml down
```

## 📊 Логи

```bash
# Логи backend
docker logs -f kppdf-backend

# Логи MongoDB
docker logs -f kppdf-mongodb
```
