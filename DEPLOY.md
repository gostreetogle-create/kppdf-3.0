# KPPDF 3.0 — Инструкция по деплою 🚀

> Один файл: `deploy.sh` — и локально собрать, и на сервер загрузить, и развернуть.

---

## 📦 Что есть в проекте

| Файл | Когда использовать |
|------|------------------|
| **`deploy.sh`** | Главный скрипт. Работает и локально (сборка + отправка), и на сервере (распаковка + Docker + seed) |
| **`build.sh`** | Обёртка: только собрать архив `kppdf-deploy.tar.gz` (не отправляет на сервер) |
| **`deploy/.env`** | Конфиг: IP сервера, пароль, JWT-секреты |
| **`deploy/.env.example`** | Шаблон конфига — скопировать в `.env` и заполнить |

---

## 🔹 Первый раз — настроить `deploy/.env`

```bash
# Копируем шаблон
cp deploy/.env.example deploy/.env
```

Открой `deploy/.env` в редакторе и заполни:

```ini
DEPLOY_HOST=192.168.1.46       # IP твоего сервера
DEPLOY_USER=tiit               # SSH пользователь
DEPLOY_PASSWORD=Tg30121986      # SSH пароль

REMOTE_DIR=/opt/kppdf-3.0
KPPDF_DATA_DIR=/var/lib/kppdf

# Секреты JWT — сгенерируй:
#   openssl rand -hex 32
JWT_SECRET=CHANGE_ME_generate_random_hex_64_chars
JWT_REFRESH_SECRET=CHANGE_ME_generate_random_hex_64_chars

CORS_ORIGIN=https://sport-set.ru
```

Сгенерировать новые секреты (по желанию):
```bash
openssl rand -hex 32
```

---

## 🔹 Вариант 1: Полный деплой (рекомендуется)

Всё сам: соберёт Angular → создаст архив → загрузит на сервер → запустит Docker → seed → проверит.

```bash
cd C:\Users\user\WebstormProjects\kppdf-3.0
bash deploy.sh
```

**Что происходит:**
1. ✅ Сборка Angular (`npm run build`)
2. ✅ Копирование в `frontend/browser/`
3. ✅ Создание архива `kppdf-deploy.tar.gz`
4. ✅ SCP на сервер в `/tmp/`
5. ✅ SSH: распаковка архива в `/opt/kppdf-3.0/`
6. ✅ SSH: `docker compose build --no-cache backend`
7. ✅ SSH: `docker compose up -d`
8. ✅ Ожидание backend (health check, до 90 сек)
9. ✅ Seed (тестовые данные)
10. ✅ Проверка: backend, frontend, API, Docker, Cloudflare Tunnel

**Время:** ~5-8 минут (самое долгое — Docker build).

---

## 🔹 Вариант 2: Только собрать архив (без отправки)

Закинуть вручную через WinSCP и запустить на сервере.

**Локально:**
```bash
bash build.sh
```

Готовый архив: **`kppdf-deploy.tar.gz`** в папке проекта.

**Закинь на сервер** (через WinSCP):
- Подключись к `192.168.1.46` (пользователь `tiit`, пароль `Tg30121986`)
- Перетащи `kppdf-deploy.tar.gz` в `/tmp/`

**На сервере (SSH):**
```bash
sudo bash /opt/kppdf-3.0/deploy.sh /tmp/kppdf-deploy.tar.gz
```

---

## 🔹 Вариант 3: Быстрый деплой (без пересборки)

Если код не менялся — просто перезапустить контейнеры:

```bash
bash deploy.sh --skip-build
```

---

## 🔹 Полезные флаги

| Флаг | Что делает |
|------|-----------|
| `--skip-build` | Не пересобирать Angular и Docker |
| `--skip-seed` | Не запускать seed (данные уже есть) |
| `--archive-only` | Только создать архив (как `build.sh`) |
| `--help` | Справка |

Можно комбинировать:
```bash
bash deploy.sh --skip-build --skip-seed   # Только обновить код + перезапустить
```

---

## 🔹 Команды для сервера (если что-то пошло не так)

Подключиться:
```bash
ssh tiit@192.168.1.46
```

| Что нужно | Команда |
|-----------|---------|
| Список контейнеров | `sudo docker ps` |
| Логи backend | `sudo docker logs kppdf-backend --tail 50` |
| Перезапустить backend | `sudo docker restart kppdf-backend` |
| Перезапустить туннель | `sudo systemctl restart cloudflared` |
| Статус туннеля | `sudo systemctl status cloudflared` |
| Seed вручную | `sudo docker exec kppdf-backend node dist/backend/src/seed.js` |
| Проверить backend | `curl http://localhost:3000/api/v1/health` |
| Проверить Nginx | `sudo nginx -t` |
| Перезагрузить Nginx | `sudo systemctl reload nginx` |

---

## 🔹 Структура на сервере

```
/opt/kppdf-3.0/
├── backend/                    ← Исходники backend + Dockerfile
├── shared/                     ← Общие типы TypeScript
├── frontend/
│   └── browser/                ← Собранный Angular (index.html + *.js)
├── docker-compose.prod.yml     ← Docker compose
├── deploy.sh                   ← Скрипт деплоя (серверный режим)
└── .env                        ← Секреты

/var/lib/kppdf/
├── mongodb/                    ← Данные MongoDB
├── media/                      ← Загруженные файлы
└── backups/                    ← Бекапы
```

---

## 🔹 Логин в систему

- **Сайт:** https://sport-set.ru
- **Логин:** `admin`
- **Пароль:** `admin123`

---

## 🔹 Типичные проблемы и решения

### "Архив не найден"
```bash
# Проверь что файл на месте
ls -la /tmp/kppdf-deploy.tar.gz
# Если нет — залей через WinSCP снова
```

### "Docker build падает"
```bash
# Смотри логи сборки
cd /opt/kppdf-3.0
sudo docker compose -f docker-compose.prod.yml logs backend
```

### "Сайт не открывается (ERR_CONNECTION_RESET)"
```bash
# Перезапусти Cloudflare Tunnel
sudo systemctl restart cloudflared
sudo systemctl status cloudflared
```

### "Открывается старая версия"
Очисти кеш браузера (Ctrl+F5) или открой в инкогнито.

---

## 🔹 Быстрый список команд для деплоя

```bash
# Полный деплой
bash deploy.sh

# Только архив
bash build.sh

# Быстрый (без сборки)
bash deploy.sh --skip-build

# На сервере вручную
sudo bash deploy.sh /tmp/kppdf-deploy.tar.gz
```
