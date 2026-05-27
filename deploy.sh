#!/usr/bin/env bash
# ============================================================================
# KPPDF 3.0 — Единый скрипт деплоя
# ============================================================================
#
# 1) ЗАПУСК ЛОКАЛЬНО (на машине разработчика):
#    bash deploy.sh
#      → собирает Angular
#      → создаёт архив kppdf-deploy.tar.gz
#      → загружает на сервер через SCP
#      → подключается по SSH и запускает деплой на сервере
#
#    Флаги:
#      bash deploy.sh --skip-build    # не пересобирать Angular
#      bash deploy.sh --skip-seed     # не запускать seed
#      bash deploy.sh --help          # справка
#
# 2) ЗАПУСК НА СЕРВЕРЕ (Ubuntu):
#    sudo bash deploy.sh [путь_к_архиву.tar.gz]
#      → распаковывает архив в /opt/kppdf-3.0/
#      → собирает Docker образ backend
#      → запускает контейнеры
#      → запускает seed (пользователи, тестовые данные)
#      → проверяет health backend / frontend / Cloudflare Tunnel
#
#    Если архив лежит рядом со скриптом:
#      sudo bash deploy.sh
# ============================================================================

set -euo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; NC='\033[0m'
log()    { echo -e "${CYAN}[deploy]${NC} $*"; }
ok()     { echo -e "  ${GREEN}[OK]${NC} $*"; }
warn()   { echo -e "  ${YELLOW}[WARN]${NC} $*"; }
err()    { echo -e "  ${RED}[FAIL]${NC} $*" >&2; exit 1; }
step()   { echo; echo -e "${GREEN}━━━ $* ━━━${NC}"; }
require_cmd() { command -v "$1" >/dev/null 2>&1 || err "Команда '$1' не найдена."; }

# ============================================================================
# ЧТЕНИЕ ФЛАГОВ (единые для всех режимов)
# ============================================================================
SKIP_BUILD=0
SKIP_SEED=0
SHOW_HELP=0
ARCHIVE_ONLY=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --skip-build)    SKIP_BUILD=1;    shift ;;
    --skip-seed)     SKIP_SEED=1;     shift ;;
    --archive-only)  ARCHIVE_ONLY=1;  shift ;;

    -h|--help)       SHOW_HELP=1;     shift ;;
    -*)
      echo "[deploy] ОШИБКА: неизвестный аргумент: $1. Используйте --help." >&2
      exit 1
      ;;
    *)
      # Первый не-флаг аргумент — это путь к архиву (режим сервера)
      ARCHIVE_ARG="$1"
      shift
      ;;
  esac
done

if [[ "${SHOW_HELP}" -eq 1 ]]; then
  cat <<'EOF'
╔══════════════════════════════════════════════════╗
║   KPPDF 3.0 — Deploy                            ║
╚══════════════════════════════════════════════════╝

На своём ПК:
  bash deploy.sh [--skip-build] [--skip-seed]

На сервере:
  sudo bash deploy.sh [путь_к_архиву.tar.gz]

Только архив:
  bash deploy.sh --archive-only

Флаги:
  --skip-build     не пересобирать Angular и Docker
  --skip-seed      не запускать seed
  --archive-only   только создать архив
  --help           справка
EOF
  exit 0
fi

# ============================================================================
# ОПРЕДЕЛЕНИЕ РЕЖИМА
# ============================================================================
# Если скрипт запущен с sudo — скорее всего на сервере
# Если есть ARCHIVE_ARG или файл архива рядом — серверный режим
# Если есть angular.json рядом — локальный режим

if [[ -n "${ARCHIVE_ARG}" ]]; then
  # Передан путь к архиву — серверный режим
  MODE="server"
elif [[ "$(id -u)" -eq 0 ]] || [[ -f "/opt/kppdf-3.0/deploy.sh" ]]; then
  # Запущен от root или скрипт уже в /opt/kppdf-3.0/ — серверный режим
  MODE="server"
elif [[ -f "$(dirname "$0")/angular.json" ]]; then
  # Есть angular.json рядом — локальный режим (есть проект)
  MODE="local"
else
  # По умолчанию — серверный (безопаснее)
  MODE="server"
fi

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

if [[ "${MODE}" == "local" ]]; then
  # ==========================================================================
  # ЛОКАЛЬНЫЙ РЕЖИМ — сборка + загрузка на сервер
  # ==========================================================================
  REPO_ROOT="${SCRIPT_DIR}"
  ARCHIVE_NAME="kppdf-deploy.tar.gz"
  ARCHIVE_PATH="${REPO_ROOT}/${ARCHIVE_NAME}"

  echo ""
  echo "╔══════════════════════════════════════════════════╗"
  echo "║   KPPDF 3.0 — Deploy (локальный режим)          ║"
  echo "╚══════════════════════════════════════════════════╝"
  echo ""

  # ─── Чтение настроек сервера из deploy/.env ───
  ENV_FILE="${REPO_ROOT}/deploy/.env"
  if [[ ! -f "${ENV_FILE}" ]]; then
    if [[ -f "${REPO_ROOT}/deploy/.env.example" ]]; then
      cp "${REPO_ROOT}/deploy/.env.example" "${ENV_FILE}"
      warn "Создан ${ENV_FILE}. Заполните его перед запуском!"
      cat "${ENV_FILE}"
      exit 1
    fi
    err "Файл deploy/.env не найден. Скопируйте deploy/.env.example → deploy/.env и заполните."
  fi

  # shellcheck source=/dev/null
  source "${ENV_FILE}"

  [[ -n "${DEPLOY_HOST:-}" ]]     || err "DEPLOY_HOST не задан в deploy/.env"
  [[ -n "${DEPLOY_USER:-}" ]]     || err "DEPLOY_USER не задан в deploy/.env"
  [[ -n "${JWT_SECRET:-}" ]]      || err "JWT_SECRET не задан в deploy/.env"

  REMOTE_SSH="${DEPLOY_USER}@${DEPLOY_HOST}"
  SSH_OPTS="-o ConnectTimeout=10 -o StrictHostKeyChecking=accept-new"
  SSH_CMD="ssh ${SSH_OPTS} ${REMOTE_SSH}"
  SCP_CMD="scp ${SSH_OPTS}"
  REMOTE_DIR="${REMOTE_DIR:-/opt/kppdf-3.0}"

  echo "  Сервер:   ${DEPLOY_USER}@${DEPLOY_HOST}"
  echo "  Папка:    ${REMOTE_DIR}"
  echo "  Флаги:    skip-build=${SKIP_BUILD}, skip-seed=${SKIP_SEED}"
  echo ""

  # ─── Шаг 1: Сборка Angular ───
  step "1/4: Сборка Angular"
  if [[ "${SKIP_BUILD}" -eq 1 ]]; then
    log "Сборка пропущена (--skip-build)"
    if [[ ! -d "${REPO_ROOT}/frontend/browser" ]]; then
      err "frontend/browser/ не существует. Запустите без --skip-build"
    fi
  else
    require_cmd node; require_cmd npm
    log "Собираю Angular..."
    if ! npm --prefix "${REPO_ROOT}" run build 2>&1; then
      err "Angular build failed!"
    fi
    DIST_BROWSER="${REPO_ROOT}/dist/kppdf-3.0/browser"
    [[ -d "${DIST_BROWSER}" ]] || err "dist/kppdf-3.0/browser не найден после сборки!"
    rm -rf "${REPO_ROOT}/frontend/browser"
    mkdir -p "${REPO_ROOT}/frontend/browser"
    cp -r "${DIST_BROWSER}/"* "${REPO_ROOT}/frontend/browser/"
    # Очистка старых файлов на верхнем уровне frontend/
    rm -f "${REPO_ROOT}"/frontend/main-*.js \
          "${REPO_ROOT}"/frontend/polyfills-*.js \
          "${REPO_ROOT}"/frontend/styles-*.css \
          "${REPO_ROOT}"/frontend/chunk-*.js \
          "${REPO_ROOT}"/frontend/favicon.svg
    ok "Angular собран → frontend/browser/"
  fi

  # ─── Шаг 2: Создание архива ───
  step "2/4: Создание архива"
  rm -f "${ARCHIVE_PATH}"
  tar czf "${ARCHIVE_PATH}" \
    --exclude='backend/node_modules' \
    --exclude='backend/dist' \
    --exclude='backend/.git' \
    --exclude='backend/src/__tests__' \
    --exclude='backend/.env' \
    --exclude='backend/coverage' \
    --exclude='node_modules' \
    --exclude='.git' \
    --exclude='dist' \
    backend/ shared/ frontend/ monitoring/ docker-compose.prod.yml deploy.sh 2>&1
  ARCHIVE_SIZE=$(du -h "${ARCHIVE_PATH}" | cut -f1)
  ok "Архив: ${ARCHIVE_NAME} (${ARCHIVE_SIZE})"

  # Если --archive-only — останавливаемся после создания архива
  if [[ "${ARCHIVE_ONLY}" -eq 1 ]]; then
    echo ""
    echo "╔══════════════════════════════════════════════════╗"
    echo "║     ✅ Архив готов!                             ║"
    echo "╚══════════════════════════════════════════════════╝"
    echo ""
    echo "  Файл:     ${ARCHIVE_NAME} (${ARCHIVE_SIZE})"
    echo "  Папка:    $(dirname "${ARCHIVE_PATH}")"
    echo ""
    echo "  Закинь архив на сервер и запусти:"
    echo "    sudo bash deploy.sh ${ARCHIVE_NAME}"
    echo ""
    exit 0
  fi

  # ─── Шаг 3: Подготовка .env + загрузка ───
  step "3/4: Загрузка на ${DEPLOY_HOST}"

  # Кодируем .env в base64 для безопасной передачи
  ENV_CONTENT=$(cat <<EOF
JWT_SECRET=${JWT_SECRET}
JWT_REFRESH_SECRET=${JWT_REFRESH_SECRET}
CORS_ORIGIN=${CORS_ORIGIN:-https://sport-set.ru}
KPPDF_DATA_DIR=${KPPDF_DATA_DIR:-/var/lib/kppdf}
EOF
)
  ENV_B64=$(echo "${ENV_CONTENT}" | base64 -w0 2>/dev/null || echo "${ENV_CONTENT}" | base64)
  ok "Конфиг закодирован (base64)"

  require_cmd ssh; require_cmd scp

  ${SSH_CMD} "echo OK" >/dev/null 2>&1 || err "SSH не работает: ${REMOTE_SSH}"
  ${SSH_CMD} "sudo mkdir -p ${REMOTE_DIR}" || err "Не удалось создать ${REMOTE_DIR}"
  ${SSH_CMD} "sudo mkdir -p ${KPPDF_DATA_DIR:-/var/lib/kppdf}/mongodb ${KPPDF_DATA_DIR:-/var/lib/kppdf}/media ${KPPDF_DATA_DIR:-/var/lib/kppdf}/backups" 2>/dev/null || true

  log "Загружаю архив..."
  ${SCP_CMD} "${ARCHIVE_PATH}" "${REMOTE_SSH}:/tmp/" || err "SCP не удался!"
  ok "Архив загружен в /tmp/"

  rm -f "${ARCHIVE_PATH}"

  # ─── Шаг 4: Запуск deploy.sh на сервере ───
  step "4/4: Деплой на сервере"

  log "Запускаю deploy.sh в серверном режиме..."
  echo ""

  # 1) Пишем .env на сервер через base64 (безопасная передача спецсимволов)
  ${SSH_CMD} "echo '${ENV_B64}' | base64 -d | sudo tee ${REMOTE_DIR}/.env >/dev/null && sudo chmod 600 ${REMOTE_DIR}/.env" 2>&1

  # 2) Извлекаем deploy.sh из архива и запускаем его в серверном режиме
  # Не передаём --skip-build — сервер должен пересобрать Docker образ с новым кодом
  ${SSH_CMD} "sudo tar xzf /tmp/${ARCHIVE_NAME} -C ${REMOTE_DIR}/ deploy.sh && sudo bash ${REMOTE_DIR}/deploy.sh /tmp/${ARCHIVE_NAME}" 2>&1 | sed 's/^/  /'

  # 3) Чистим архив
  ${SSH_CMD} "rm -f /tmp/${ARCHIVE_NAME}" 2>&1

  echo ""
  log "Локальный деплой завершён."

else
  # ==========================================================================
  # СЕРВЕРНЫЙ РЕЖИМ — распаковка + Docker + seed
  # ==========================================================================
  if [[ "$(id -u)" -ne 0 ]]; then
    err "Запустите с sudo: sudo bash deploy.sh [путь_к_архиву]"
  fi

  APP_DIR="/opt/kppdf-3.0"
  DATA_DIR="${KPPDF_DATA_DIR:-/var/lib/kppdf}"
  ARCHIVE=""

  # Определяем путь к архиву
  if [[ -n "${ARCHIVE_ARG}" ]]; then
    ARCHIVE="${ARCHIVE_ARG}"
  elif [[ -f "${SCRIPT_DIR}/kppdf-deploy.tar.gz" ]]; then
    ARCHIVE="${SCRIPT_DIR}/kppdf-deploy.tar.gz"
  elif [[ -f "/tmp/kppdf-deploy.tar.gz" ]]; then
    ARCHIVE="/tmp/kppdf-deploy.tar.gz"
  else
    err "Архив не найден. Укажите путь: sudo bash deploy.sh /путь/к/kppdf-deploy.tar.gz"
  fi

  [[ -f "${ARCHIVE}" ]] || err "Файл не существует: ${ARCHIVE}"
  ARCHIVE_SIZE=$(du -h "${ARCHIVE}" | cut -f1)

  echo ""
  echo "╔══════════════════════════════════════════════════╗"
  echo "║   KPPDF 3.0 — Deploy (серверный режим)          ║"
  echo "╚══════════════════════════════════════════════════╝"
  echo ""
  echo "  Архив:    ${ARCHIVE} (${ARCHIVE_SIZE})"
  echo "  App:      ${APP_DIR}"
  echo "  Data:     ${DATA_DIR}"
  echo ""

  # ─── Шаг 1: Распаковка ───
  step "1/6: Распаковка в ${APP_DIR}"
  mkdir -p "${APP_DIR}" "${DATA_DIR}/mongodb" "${DATA_DIR}/media" "${DATA_DIR}/backups"
  tar xzf "${ARCHIVE}" -C "${APP_DIR}/"

  # Если в архиве есть dist/ — копируем оттуда фронтенд
  if [[ -d "${APP_DIR}/dist/kppdf-3.0/browser" ]]; then
    rm -rf "${APP_DIR}/frontend/browser"
    mkdir -p "${APP_DIR}/frontend/browser"
    cp -r "${APP_DIR}/dist/kppdf-3.0/browser/"* "${APP_DIR}/frontend/browser/"
  fi

  # Очистка старых файлов на верхнем уровне frontend/
  rm -f "${APP_DIR}"/frontend/main-*.js \
        "${APP_DIR}"/frontend/polyfills-*.js \
        "${APP_DIR}"/frontend/styles-*.css \
        "${APP_DIR}"/frontend/chunk-*.js \
        "${APP_DIR}"/frontend/favicon.svg

  # Удаляем dist/ после копирования (не нужно на сервере)
  rm -rf "${APP_DIR}/dist" 2>/dev/null || true
  ok "Архив распакован, фронтенд на месте"

  # ─── Шаг 2: .env ───
  step "2/6: Настройка .env"

  # Если .env передан через base64 (из локального режима)
  if [[ -n "${KPPDF_ENV_B64:-}" ]]; then
    echo "${KPPDF_ENV_B64}" | base64 -d > "${APP_DIR}/.env" 2>/dev/null
    chmod 600 "${APP_DIR}/.env"
    ok ".env получен из локального конфига"
  # Если .env уже существует
  elif [[ -f "${APP_DIR}/.env" ]]; then
    ok ".env уже существует"
  # Если есть deploy/.env в архиве
  elif [[ -f "${APP_DIR}/deploy/.env" ]]; then
    cp "${APP_DIR}/deploy/.env" "${APP_DIR}/.env"
    chmod 600 "${APP_DIR}/.env"
    ok ".env скопирован из deploy/.env"
  else
    warn ".env не найден! Создаю со случайными JWT..."
    JWT_SECRET=$(openssl rand -hex 32 2>/dev/null || echo "CHANGE_ME_RANDOM_HEX_32_BYTES")
    JWT_REFRESH=$(openssl rand -hex 32 2>/dev/null || echo "CHANGE_ME_RANDOM_HEX_32_BYTES")
    cat > "${APP_DIR}/.env" <<EOF
JWT_SECRET=${JWT_SECRET}
JWT_REFRESH_SECRET=${JWT_REFRESH}
CORS_ORIGIN=https://sport-set.ru
KPPDF_DATA_DIR=${DATA_DIR}
EOF
    chmod 600 "${APP_DIR}/.env"
    warn ".env создан со случайными JWT. При необходимости измените CORS_ORIGIN"
  fi

  # Удаляем архив
  rm -f "${ARCHIVE}"

  # ─── Шаг 3: Docker ───
  step "3/6: Docker сборка и запуск"
  require_cmd docker

  if [[ ! -f "${APP_DIR}/docker-compose.prod.yml" ]]; then
    err "docker-compose.prod.yml не найден в ${APP_DIR}"
  fi

  cd "${APP_DIR}"

  log "Останавливаю старые контейнеры..."
  docker compose -f docker-compose.prod.yml down 2>/dev/null || true

  if [[ "${SKIP_BUILD}" -eq 1 ]]; then
    log "Docker build пропущен (--skip-build)"
  else
    log "Собираю Docker образы (может занять 2-5 минут)..."
    docker compose -f docker-compose.prod.yml build --no-cache backend monitoring 2>&1
  fi

  log "Запускаю контейнеры..."
  docker compose -f docker-compose.prod.yml up -d 2>&1
  ok "Docker compose запущен"

  # ─── Шаг 4: Ожидание backend ───
  step "4/6: Ожидание backend"
  log "Жду готовности (до 90 секунд)..."
  BACKEND_READY=0
  for i in $(seq 1 18); do
    sleep 5
    HEALTH=$(curl -sf http://localhost:3000/api/v1/health 2>/dev/null || echo "")
    if echo "${HEALTH}" | grep -q "mongodb.*connected"; then
      ok "Backend готов! (MongoDB connected)"
      BACKEND_READY=1
      break
    fi
    if [[ $((i % 3)) -eq 0 ]]; then
      log "  Ждём... ($(( i * 5 ))с)"
    fi
  done

  if [[ "${BACKEND_READY}" -eq 0 ]]; then
    warn "Backend не ответил. Проверьте: docker logs kppdf-backend --tail 50"
  fi

  # ─── Шаг 5: Seed ───
  step "5/6: Seed"
  if [[ "${SKIP_SEED}" -eq 1 ]]; then
    log "Seed пропущен (--skip-seed)"
  elif [[ "${BACKEND_READY}" -eq 1 ]]; then
    log "Запускаю seed..."
    docker exec kppdf-backend node dist/backend/src/seed.js 2>&1 | grep -E "(✅|Категории|Товары|Пользователи|Seed completed|✅)" || true
    ok "Seed выполнен"
  else
    warn "Backend не готов. Seed вручную:"
    warn "  docker exec kppdf-backend node dist/backend/src/seed.js"
  fi

  # ─── Шаг 6: Проверка ───
  step "6/6: Проверка"

  echo ""
  echo "── Backend ──"
  HEALTH=$(curl -sf http://localhost:3000/api/v1/health 2>/dev/null || echo "ERROR")
  if [[ "${HEALTH}" != "ERROR" ]]; then
    ok "Health: ${HEALTH:0:80}"
  else
    warn "Health check не ответил"
  fi

  echo ""
  echo "── Frontend через Nginx ──"
  HTTP_CODE=$(curl -s -o /dev/null -w '%{http_code}' http://localhost:80/ 2>/dev/null || echo "ERROR")
  if [[ "${HTTP_CODE}" == "200" ]]; then
    MODIFIED=$(curl -sI http://localhost:80/ 2>/dev/null | grep -i "last-modified" | cut -d' ' -f2-)
    ok "Frontend: HTTP 200 (${MODIFIED})"
  else
    warn "Frontend: HTTP ${HTTP_CODE}"
  fi

  echo ""
  echo "── API через Nginx ──"
  API=$(curl -sf http://localhost:80/api/v1/health 2>/dev/null || echo "ERROR")
  if [[ "${API}" != "ERROR" ]]; then
    ok "API через Nginx: OK"
  else
    warn "API через Nginx не ответил"
  fi

  echo ""
  echo "── Docker контейнеры ──"
  docker ps --format "table {{.Names}}\t{{.Status}}" 2>/dev/null | tail -n +2 | while IFS= read -r line; do
    if echo "${line}" | grep -q "Up"; then ok "  ${line}"; else warn "  ${line}"; fi
  done

  echo ""
  echo "── Мониторинг ──"
  MONITOR_HTTP=$(curl -sf http://localhost:3001/ 2>/dev/null | grep -c "KPPDF" || true)
  if [[ "${MONITOR_HTTP}" -gt 0 ]]; then
    ok "Дашборд мониторинга: http://localhost:3001/"
  else
    warn "Мониторинг не отвечает на порту 3001"
  fi

  echo ""
  echo "── Cloudflare Tunnel ──"
  if command -v systemctl >/dev/null 2>&1; then
    TUNNEL=$(systemctl is-active cloudflared 2>/dev/null || echo "not_found")
    if [[ "${TUNNEL}" == "active" ]]; then
      ok "Cloudflare Tunnel: active"
      # Если туннель работает — проверяем что сайт отвечает через него
      TUNNEL_OK=$(curl -sI --connect-timeout 10 https://sport-set.ru 2>/dev/null | grep -c "200\|302" || true)
      if [[ "${TUNNEL_OK}" -gt 0 ]]; then
        ok "  Сайт через туннель: HTTP 200"
      else
        warn "  Сайт через туннель не отвечает (проверьте cloudflared)"
      fi
    else
      warn "Cloudflare Tunnel: ${TUNNEL}"
      log "Перезапускаю туннель..."
      systemctl restart cloudflared 2>/dev/null || warn "Не удалось перезапустить cloudflared"
      sleep 2
      if systemctl is-active cloudflared >/dev/null 2>&1; then
        ok "Cloudflare Tunnel перезапущен"
      fi
    fi
  fi

  # Итог
  echo ""
  echo "╔══════════════════════════════════════════════════╗"
  echo "║     ✅ Деплой завершён!                         ║"
  echo "╚══════════════════════════════════════════════════╝"
  echo ""
  echo "  Сайт:     https://sport-set.ru"
  echo "  API:      https://sport-set.ru/api/v1/health"
  echo "  Логин:    admin"
  echo "  Пароль:   admin123"
  echo ""

fi
