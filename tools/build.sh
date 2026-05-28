#!/usr/bin/env bash
# ============================================================================
# KPPDF 3.0 — Build Archive (обёртка над deploy.sh --archive-only)
# ============================================================================
# Запускать локально:
#   bash build.sh
#
# Что делает:
#   1. Собирает Angular фронтенд (npm run build)
#   2. Копирует результат в frontend/browser/
#   3. Создаёт архив kppdf-deploy.tar.gz
#
# Готовый архив закинуть на сервер и запустить:
#   sudo bash deploy.sh kppdf-deploy.tar.gz
#
# Флаги:
#   bash build.sh --skip-build    # не пересобирать Angular (если уже собирали)
#   bash build.sh --help          # справка
# ============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo ""
echo "╔══════════════════════════════════════════════════╗"
echo "║   KPPDF 3.0 — Build Archive                     ║"
echo "╚══════════════════════════════════════════════════╝"
echo ""

DEPLOY_SH="$(dirname "${SCRIPT_DIR}")/deploy.sh"

if [[ ! -f "${DEPLOY_SH}" ]]; then
  echo "[build] ОШИБКА: deploy.sh не найден (ищем: ${DEPLOY_SH})" >&2
  exit 1
fi

# Вызываем deploy.sh в локальном режиме, только сборка + архив
# --archive-only  = не загружать на сервер
# --skip-seed     = не запускать seed (на сервере он сам запустится)
# $@              = передаём остальные флаги (--skip-build, --help)
exec bash "${DEPLOY_SH}" --archive-only --skip-seed "$@"
