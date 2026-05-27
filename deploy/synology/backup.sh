#!/bin/bash
# ====================================================================
# backup.sh — бэкап MongoDB + медиа (hot backup, без остановки)
#
# Запуск на сервере из каталога приложения:
#   cd /opt/kppdf-3.0 && bash backup.sh
#
# Или с явным путём данных:
#   KPPDF_DATA_DIR=/var/lib/kppdf bash backup.sh
# ====================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="${SCRIPT_DIR}/.env"

if [[ -f "$ENV_FILE" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
fi

DATA_DIR="${KPPDF_DATA_DIR:-/var/lib/kppdf}"
DOCKER="${DOCKER_CMD:-docker}"
DATE="$(date +%Y-%m-%d_%H%M)"
BACKUP_ROOT="${DATA_DIR}/backups"
MONGO_BACKUP="${BACKUP_ROOT}/mongo-${DATE}"
MEDIA_BACKUP="${BACKUP_ROOT}/media-${DATE}"

echo ""
echo "=== KPPDF Backup ==="
echo "  Data:   $DATA_DIR"
echo "  Output: $BACKUP_ROOT"
echo ""

mkdir -p "$BACKUP_ROOT"

echo "[1/2] MongoDB dump..."
if ! $DOCKER ps --format '{{.Names}}' | grep -q '^kppdf-mongodb$'; then
  echo "  ERROR: контейнер kppdf-mongodb не запущен"
  exit 1
fi

$DOCKER exec kppdf-mongodb mongodump \
  --db kppdf30 \
  --out "/tmp/dump-${DATE}"

$DOCKER cp "kppdf-mongodb:/tmp/dump-${DATE}" "$MONGO_BACKUP"
$DOCKER exec kppdf-mongodb rm -rf "/tmp/dump-${DATE}"

echo "  OK: $MONGO_BACKUP"

echo "[2/2] Media copy..."
if [[ -d "${DATA_DIR}/media" ]]; then
  cp -a "${DATA_DIR}/media" "$MEDIA_BACKUP"
  echo "  OK: $MEDIA_BACKUP"
else
  echo "  SKIP: ${DATA_DIR}/media не существует"
fi

echo ""
echo "=== Backup complete ==="
echo ""
echo "  MongoDB: $MONGO_BACKUP"
echo "  Media:   $MEDIA_BACKUP"
echo ""
echo "  Восстановление MongoDB:"
echo "    docker exec -i kppdf-mongodb mongorestore --drop --db kppdf30 /tmp/restore"
echo "    (предварительно: docker cp $MONGO_BACKUP/kppdf30 kppdf-mongodb:/tmp/restore)"
echo ""
