#!/usr/bin/env bash
# ============================================================================
# KPPDF 3.0 — Deploy Script (Docker + Nginx + Cloudflare Tunnel)
# ============================================================================
# Usage:
#   sudo bash deploy/deploy.sh [--skip-build] [--skip-seed] [--skip-pull] [--help]
#
# Что делает:
#   1. Проверяет deploy/.env и обязательные переменные
#   2. Делает git pull (если не --skip-pull)
#   3. Собирает Angular фронтенд (если не --skip-build)
#   4. Собирает backend Docker образ на сервере
#   5. Загружает и распаковывает код на сервер
#   6. Запускает docker compose
#   7. Запускает seed (если не --skip-seed)
#   8. Проверяет health backend + frontend
#   9. Проверяет Cloudflare tunnel
# ============================================================================

set -euo pipefail

# --- Флаги ---
SKIP_PULL=0
SKIP_BUILD=0
SKIP_SEED=0
SHOW_HELP=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --skip-pull)    SKIP_PULL=1;   shift ;;
    --skip-build)   SKIP_BUILD=1;  shift ;;
    --skip-seed)    SKIP_SEED=1;   shift ;;
    -h|--help)      SHOW_HELP=1;   shift ;;
    *)
      echo "[deploy] ОШИБКА: неизвестный аргумент: $1. Используйте --help." >&2
      exit 1
      ;;
  esac
done

if [[ "${SHOW_HELP}" -eq 1 ]]; then
  cat <<'EOF'
Usage:
  sudo bash deploy/deploy.sh [--skip-build] [--skip-seed] [--skip-pull]
  sudo bash deploy/deploy.sh --help

Опции:
  --skip-pull    не выполнять git pull
  --skip-build   не пересобирать Angular фронтенд и Docker образ
  --skip-seed    не запускать seed (если данные уже есть)

Что делает:
  1. Проверяет deploy/.env и обязательные переменные
  2. Делает git pull (если не --skip-pull)
  3. Собирает Angular фронтенд (npm run build)
  4. Собирает backend Docker образ на сервере
  5. Загружает код на сервер через SCP
  6. Запускает docker compose (backend + mongodb)
  7. Запускает seed (админ, роли, тестовые данные)
  8. Проверяет health backend и доступность frontend
  9. Проверяет статус Cloudflare tunnel

Требования:
  - root (для копирования файлов в /opt/kppdf-3.0)
  - SSH-доступ к серверу (DEPLOY_HOST в deploy/.env)
  - Python + paramiko на dev-машине (для deploy.py)
EOF
  exit 0
fi

# --- Пути ---
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
ENV_FILE="${SCRIPT_DIR}/.env"
ARCHIVE_NAME="kppdf-deploy.tar.gz"
ARCHIVE_PATH="/tmp/${ARCHIVE_NAME}"

# --- Цвета ---
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

log()    { echo -e "${CYAN}[deploy]${NC} $*"; }
ok()     { echo -e "  ${GREEN}[OK]${NC} $*"; }
warn()   { echo -e "  ${YELLOW}[WARN]${NC} $*"; }
err()    { echo -e "  ${RED}[FAIL]${NC} $*" >&2; exit 1; }
step()   { echo; echo -e "${GREEN}━━━ $* ━━━${NC}"; }

require_cmd() { command -v "$1" >/dev/null 2>&1 || err "Команда '$1' не найдена."; }

# --- Проверка прав ---
# На dev-машине root не требуется — деплой идёт через SSH/SCP на сервер
# Если нужен root на сервере, используется DEPLOY_PASSWORD или NOPASSWD в sudoers

# --- Проверка .env ---
if [[ ! -f "${ENV_FILE}" ]]; then
  log "Файл deploy/.env не найден — копирую из .env.example"
  if [[ -f "${SCRIPT_DIR}/.env.example" ]]; then
    cp "${SCRIPT_DIR}/.env.example" "${ENV_FILE}"
    warn "Создан ${ENV_FILE}. Заполните его перед запуском!"
    exit 1
  else
    cat > "${ENV_FILE}" <<'EXAMPLEEOF'
# KPPDF 3.0 — конфиг деплоя
DEPLOY_HOST=192.168.1.46
DEPLOY_USER=tiit
DEPLOY_PASSWORD=CHANGE_ME

REMOTE_DIR=/opt/kppdf-3.0
KPPDF_DATA_DIR=/var/lib/kppdf

JWT_SECRET=CHANGE_ME_generate_random_hex_64_chars
JWT_REFRESH_SECRET=CHANGE_ME_generate_random_hex_64_chars
CORS_ORIGIN=https://sport-set.ru
EXAMPLEEOF
    warn "Создан ${ENV_FILE}. Заполните его перед запуском!"
    exit 1
  fi
fi

# shellcheck source=/dev/null
source "${ENV_FILE}"

# --- Валидация ---
[[ -n "${DEPLOY_HOST:-}" ]]      || err "DEPLOY_HOST не задан в deploy/.env"
[[ -n "${DEPLOY_USER:-}" ]]      || err "DEPLOY_USER не задан в deploy/.env"
[[ -n "${REMOTE_DIR:-}" ]]       || err "REMOTE_DIR не задан в deploy/.env"
[[ -n "${KPPDF_DATA_DIR:-}" ]]   || err "KPPDF_DATA_DIR не задан в deploy/.env"
[[ -n "${JWT_SECRET:-}" ]]       || err "JWT_SECRET не задан в deploy/.env"
[[ -n "${JWT_REFRESH_SECRET:-}" ]] || err "JWT_REFRESH_SECRET не задан в deploy/.env"
[[ -n "${CORS_ORIGIN:-}" ]]      || err "CORS_ORIGIN не задан в deploy/.env"

if [[ "${JWT_SECRET}" == "CHANGE_ME"* ]]; then
  err "JWT_SECRET не изменён! Сгенерируйте: openssl rand -hex 32"
fi
if [[ "${JWT_REFRESH_SECRET}" == "CHANGE_ME"* ]]; then
  err "JWT_REFRESH_SECRET не изменён! Сгенерируйте: openssl rand -hex 32"
fi

require_cmd git
require_cmd node
require_cmd npm
require_cmd curl
require_cmd scp
require_cmd ssh

# --- Настройки ---
REMOTE_SSH="${DEPLOY_USER}@${DEPLOY_HOST}"
SSH_OPTS="-o ConnectTimeout=10 -o StrictHostKeyChecking=accept-new"
SSH_CMD="ssh ${SSH_OPTS} ${REMOTE_SSH}"
SCP_CMD="scp ${SSH_OPTS}"

# --- Вывод конфигурации ---
echo ""
echo "╔══════════════════════════════════════════════════╗"
echo "║        KPPDF 3.0 — Deploy                       ║"
echo "╚══════════════════════════════════════════════════╝"
echo ""
echo "  Сервер:     ${DEPLOY_USER}@${DEPLOY_HOST}"
echo "  App:        ${REMOTE_DIR}"
echo "  Data:       ${KPPDF_DATA_DIR}"
echo "  Domain:     ${CORS_ORIGIN}"
echo "  Флаги:      skip-pull=${SKIP_PULL}, skip-build=${SKIP_BUILD}, skip-seed=${SKIP_SEED}"
echo ""

# ============================================================================
# Шаг 1: Git pull
# ============================================================================
step "1/8: Проверка git"

if git -C "${REPO_ROOT}" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  if [[ -n "$(git -C "${REPO_ROOT}" status --porcelain)" ]]; then
    warn "В репозитории есть незакоммиченные изменения."
    log "Текущие изменения:"
    git -C "${REPO_ROOT}" status --short
    log "Продолжаю с незакоммиченными файлами (они попадут в архив)."
  fi

  if [[ "${SKIP_PULL}" -eq 1 ]]; then
    log "git pull пропущен (--skip-pull)."
  else
    log "Обновляю код из git..."
    git -C "${REPO_ROOT}" fetch origin
    git -C "${REPO_ROOT}" pull --ff-only || warn "Не удалось сделать pull. Продолжаю с текущей версией."
    COMMIT_HASH=$(git -C "${REPO_ROOT}" rev-parse --short HEAD)
    ok "Commit: ${COMMIT_HASH}"
  fi
else
  log "Не git-репозиторий — пропускаю."
fi

# ============================================================================
# Шаг 2: Сборка Angular фронтенда
# ============================================================================
step "2/8: Сборка фронтенда"

if [[ "${SKIP_BUILD}" -eq 1 ]]; then
  log "Сборка пропущена (--skip-build). Использую существующий frontend/browser/"
else
  log "Собираю Angular фронтенд..."
  if ! npm --prefix "${REPO_ROOT}" run build 2>&1; then
    err "Angular build failed!"
  fi

  # Копируем в frontend/browser/
  DIST_BROWSER="${REPO_ROOT}/dist/kppdf-3.0/browser"
  FRONTEND_BROWSER="${REPO_ROOT}/frontend/browser"

  if [[ ! -d "${DIST_BROWSER}" ]]; then
    err "dist/kppdf-3.0/browser не найден после сборки!"
  fi

  rm -rf "${FRONTEND_BROWSER}"
  mkdir -p "${FRONTEND_BROWSER}"
  cp -r "${DIST_BROWSER}/"* "${FRONTEND_BROWSER}/"
  ok "Фронтенд собран: ${FRONTEND_BROWSER}/"
fi

# ============================================================================
# Шаг 3: Создание архива
# ============================================================================
step "3/8: Создание архива для отправки"

log "Создаю архив ${ARCHIVE_PATH}..."

# --exclude ДО аргументов с файлами (GNU tar, совместимо с Windows Git Bash)
tar czf "${ARCHIVE_PATH}" \
  --exclude='backend/node_modules' \
  --exclude='backend/dist' \
  --exclude='backend/.git' \
  --exclude='backend/src/__tests__' \
  --exclude='backend/.env' \
  --exclude='backend/coverage' \
  --exclude='frontend/browser' \
  backend/ shared/ frontend/ docker-compose.prod.yml \
  2>&1

ARCHIVE_SIZE=$(du -h "${ARCHIVE_PATH}" | cut -f1)
ok "Архив создан: ${ARCHIVE_SIZE}"

# ============================================================================
# Шаг 4: Подготовка .env для сервера
# ============================================================================
step "4/8: Подготовка .env для сервера"

# Base64-кодирование .env для безопасной передачи через SSH
# (защищает от проблем со спецсимволами в JWT_SECRET)
ENV_CONTENT=$(cat <<EOF
JWT_SECRET=${JWT_SECRET}
JWT_REFRESH_SECRET=${JWT_REFRESH_SECRET}
CORS_ORIGIN=${CORS_ORIGIN}
KPPDF_DATA_DIR=${KPPDF_DATA_DIR}
EOF
)

require_cmd base64
ENV_B64=$(echo "${ENV_CONTENT}" | base64 -w0)

# ============================================================================
# Определение SUDO_PREFIX (должен быть перед шагом 5, где используются sudo)
# ============================================================================
step "4b/8: Проверка sudo на сервере"

# Определяем, как выполнять sudo команды:
#   - с паролем → sudo -S (читает из stdin)
#   - без пароля → проверяем sudo -n (должен быть NOPASSWD в sudoers)
SUDO_PREFIX=""
if [[ -n "${DEPLOY_PASSWORD:-}" ]]; then
  SUDO_PREFIX="echo '${DEPLOY_PASSWORD}' | sudo -S"
  log "Режим: sudo с паролем"
else
  # Проверяем, работает ли sudo без пароля
  log "Проверяю sudo без пароля на сервере..."
  if ${SSH_CMD} "sudo -n true" >/dev/null 2>&1; then
    SUDO_PREFIX="sudo"
    ok "sudo без пароля (NOPASSWD) - работает"
  else
    warn "Пароль не указан, а sudo требует пароля."
    warn "Настройте NOPASSWD в /etc/sudoers или укажите DEPLOY_PASSWORD в .env"
    err "Невозможно выполнять sudo команды на сервере"
  fi
fi

# ============================================================================
# Шаг 5: Загрузка на сервер
# ============================================================================
step "5/8: Загрузка на сервер ${DEPLOY_HOST}"

log "Проверяю соединение..."
${SSH_CMD} "echo OK" >/dev/null 2>&1 || err "SSH не работает! Проверьте DEPLOY_HOST/DEPLOY_USER"

log "Создаю директории на сервере..."
${SSH_CMD} "${SUDO_PREFIX} mkdir -p ${REMOTE_DIR} && ${SUDO_PREFIX} chown -R ${DEPLOY_USER}:${DEPLOY_USER} ${REMOTE_DIR}" || err "Не удалось создать директории"
${SSH_CMD} "${SUDO_PREFIX} mkdir -p ${KPPDF_DATA_DIR}/mongodb ${KPPDF_DATA_DIR}/media ${KPPDF_DATA_DIR}/backups" || true

log "Загружаю архив (может занять несколько минут)..."
${SCP_CMD} "${ARCHIVE_PATH}" "${REMOTE_SSH}:${REMOTE_DIR}/" || err "SCP не удался!"

log "Распаковываю на сервере..."
${SSH_CMD} "cd ${REMOTE_DIR} && tar xzf ${ARCHIVE_NAME} && rm -f ${ARCHIVE_NAME} && ls -d */" || err "Распаковка не удалась!"

# Загружаем .env через base64 (безопасная передача спецсимволов)
log "Загружаю .env..."
${SSH_CMD} "echo '${ENV_B64}' | base64 -d > ${REMOTE_DIR}/.env && chmod 600 ${REMOTE_DIR}/.env" || warn ".env не записался"

rm -f "${ARCHIVE_PATH}"
ok "Код загружен и распакован"

# ============================================================================
# Шаг 6: Docker build & start
# ============================================================================
step "6/8: Docker сборка и запуск"

if [[ "${SKIP_BUILD}" -eq 1 ]]; then
  log "Docker build пропущен. Просто перезапускаю контейнеры..."
  ${SSH_CMD} "${SUDO_PREFIX} bash -c 'cd ${REMOTE_DIR} && docker compose -f docker-compose.prod.yml up -d 2>&1'" || err "Docker up failed!"
else
  log "Собираю Docker образ backend (может занять 2-5 минут)..."
  ${SSH_CMD} "${SUDO_PREFIX} bash -c 'cd ${REMOTE_DIR} && docker compose -f docker-compose.prod.yml down 2>/dev/null; docker compose -f docker-compose.prod.yml build --no-cache backend 2>&1'" || err "Docker build failed!"

  log "Запускаю контейнеры..."
  ${SSH_CMD} "${SUDO_PREFIX} bash -c 'cd ${REMOTE_DIR} && docker compose -f docker-compose.prod.yml up -d 2>&1'" || err "Docker up failed!"
fi

ok "Docker compose запущен"

# ============================================================================
# Шаг 7: Wait for backend + seed
# ============================================================================
step "7/8: Ожидание backend и seed"

log "Ожидаю готовности backend (до 90 секунд)..."
BACKEND_READY=0
for i in $(seq 1 18); do
  sleep 5
  HEALTH=$(${SSH_CMD} "curl -sf http://localhost:3000/api/v1/health 2>/dev/null" 2>/dev/null || echo "")
  if echo "${HEALTH}" | grep -q "mongodb.*connected"; then
    ok "Backend готов! (MongoDB connected)"
    BACKEND_READY=1
    break
  fi
  if echo "${HEALTH}" | grep -qi "ok"; then
    log "  Backend up, жду MongoDB... ($(( i * 5 ))с)"
    continue
  fi
  if [[ $((i % 3)) -eq 0 ]]; then
    log "  Ждём... ($(( i * 5 ))с)"
  fi
done

if [[ "${BACKEND_READY}" -eq 0 ]]; then
  warn "Backend не ответил за отведённое время. Проверьте вручную:"
  warn "  ssh ${REMOTE_SSH} && sudo docker logs kppdf-backend --tail 50"
fi

# Seed
if [[ "${SKIP_SEED}" -eq 1 ]]; then
  log "Seed пропущен (--skip-seed)"
else
  if [[ "${BACKEND_READY}" -eq 1 ]]; then
    log "Запускаю seed..."
    SEED_OUTPUT=$(${SSH_CMD} "${SUDO_PREFIX} docker exec kppdf-backend node dist/backend/src/seed.js 2>&1" 2>/dev/null || echo "ERROR")
    if echo "${SEED_OUTPUT}" | grep -iq "error"; then
      warn "Seed: ошибка. Вывод:"
      echo "${SEED_OUTPUT}" | tail -5
    else
      # Показываем последние строки seed
      echo "${SEED_OUTPUT}" | tail -10 | while IFS= read -r line; do
        echo "    ${line}"
      done
      ok "Seed выполнен"
    fi
  else
    warn "Backend не готов — seed пропущен. Запустите вручную:"
    warn "  ssh ${REMOTE_SSH}"
    warn "  sudo docker exec kppdf-backend node dist/backend/src/seed.js"
  fi
fi

# ============================================================================
# Шаг 8: Проверка
# ============================================================================
step "8/8: Проверка развёртывания"

echo ""
echo "── Проверка backend ──"
HEALTH=$(${SSH_CMD} "curl -sf http://localhost:3000/api/v1/health 2>/dev/null" 2>/dev/null || echo "ERROR")
if [[ "${HEALTH}" != "ERROR" ]]; then
  ok "Health: ${HEALTH:0:80}"
else
  warn "Health check не ответил"
fi

echo ""
echo "── Проверка frontend через Nginx ──"
FRONTEND=$(${SSH_CMD} "curl -s -o /dev/null -w '%{http_code}' http://localhost:80/ 2>/dev/null" 2>/dev/null || echo "ERROR")
if [[ "${FRONTEND}" == "200" ]]; then
  ok "Frontend HTTP 200 OK"
else
  warn "Frontend: HTTP ${FRONTEND}"
fi

echo ""
echo "── Проверка API через Nginx ──"
API=$(${SSH_CMD} "curl -sf http://localhost:80/api/v1/health 2>/dev/null" 2>/dev/null || echo "ERROR")
if [[ "${API}" != "ERROR" ]]; then
  ok "API через Nginx: OK"
else
  warn "API через Nginx не ответил"
fi

echo ""
echo "── Проверка Cloudflare Tunnel ──"
TUNNEL=$(${SSH_CMD} "${SUDO_PREFIX} systemctl is-active cloudflared 2>/dev/null" 2>/dev/null || echo "inactive")
if [[ "${TUNNEL}" == "active" ]]; then
  ok "Cloudflare Tunnel: active (running)"
  TUNNEL_CONNS=$(${SSH_CMD} "${SUDO_PREFIX} systemctl status cloudflared --no-pager -l 2>/dev/null | grep -c 'Connected to' || true" 2>/dev/null)
  if [[ "${TUNNEL_CONNS}" -gt 0 ]]; then
    ok "  Подключения к edge: ${TUNNEL_CONNS}"
  fi
else
  warn "Cloudflare Tunnel: ${TUNNEL} (возможно, без sudo не видно)"
fi

echo ""
echo "── Проверка Docker контейнеров ──"
CONTAINERS=$(${SSH_CMD} "${SUDO_PREFIX} docker ps --format '{{.Names}} {{.Status}}' 2>/dev/null" 2>/dev/null || echo "ERROR")
if [[ "${CONTAINERS}" != "ERROR" ]]; then
  echo "${CONTAINERS}" | while IFS= read -r line; do
    if echo "${line}" | grep -q "Up"; then
      ok "  ${line}"
    else
      warn "  ${line}"
    fi
  done
fi

# ============================================================================
# Результат
# ============================================================================
echo ""
echo "╔══════════════════════════════════════════════════╗"
echo "║     ✅ Деплой завершён!                         ║"
echo "╚══════════════════════════════════════════════════╝"
echo ""
echo "  Frontend:   http://${DEPLOY_HOST}/"
echo "  API:        http://${DEPLOY_HOST}/api/v1/health"
echo "  Production: ${CORS_ORIGIN}"
echo "  Auth:       admin / admin123"
echo ""
echo "  Для управления на сервере:"
echo "    ssh ${REMOTE_SSH}"
echo "    cd ${REMOTE_DIR}"
echo "    sudo docker compose -f docker-compose.prod.yml ps"
echo "    sudo docker compose -f docker-compose.prod.yml logs -f backend"
echo ""

# Запоминаем коммит для отладки
if git -C "${REPO_ROOT}" rev-parse --short HEAD >/dev/null 2>&1; then
  COMMIT_HASH=$(git -C "${REPO_ROOT}" rev-parse --short HEAD)
  log "Deployed commit: ${COMMIT_HASH}"
fi
