#!/bin/bash
# ====================================================================
# deploy.sh — Deploy KPPDF 3.0 to Synology NAS
# ====================================================================
# Чистый Docker-подход — весь стек работает в контейнерах.
# Не требует установки Node.js на Synology.
#
# Использование:
#   ./deploy/synology/deploy.sh [host] [user]
#
# Пример:
#   ./deploy/synology/deploy.sh 192.168.1.134 nastiit
# ====================================================================

set -euo pipefail

HOST="${1:-192.168.1.134}"
USER="${2:-nastiit}"
REMOTE_DIR="/volume1/docker/kppdf-3.0"
BUILD_DIR="dist/kppdf-3.0"

echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║         KPPDF 3.0 — Deploy to Synology NAS                  ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

echo "🔨 1. Сборка Angular frontend..."
cd "$(dirname "$0")/../.."
npx ng build --configuration production
echo "   ✅ Frontend собран: $BUILD_DIR"

echo ""
echo "📦 2. Создание deploy-архива..."
DEPLOY_ARCHIVE="/tmp/kppdf-deploy.tar.gz"
tar czf "$DEPLOY_ARCHIVE" \
  "$BUILD_DIR" \
  backend/Dockerfile \
  backend/.dockerignore \
  backend/.env.production \
  backend/package.json \
  backend/package-lock.json \
  backend/tsconfig.json \
  backend/src \
  docker-compose.prod.yml \
  --transform 's|^dist/kppdf-3.0|frontend|'
echo "   ✅ Архив готов: $DEPLOY_ARCHIVE"

echo ""
echo "📡 3. Копирование на Synology ($USER@$HOST)..."
ssh "$USER@$HOST" "mkdir -p $REMOTE_DIR"
scp "$DEPLOY_ARCHIVE" "$USER@$HOST:$REMOTE_DIR/"
rm -f "$DEPLOY_ARCHIVE"

echo ""
echo "📦 4. Распаковка на Synology..."
ssh "$USER@$HOST" "cd $REMOTE_DIR && tar xzf kppdf-deploy.tar.gz && rm kppdf-deploy.tar.gz && ls -la"

echo ""
echo "🐳 5. Сборка и запуск Docker-стека..."
ssh "$USER@$HOST" "cd $REMOTE_DIR && docker compose -f docker-compose.prod.yml up -d --build"

echo ""
echo "⏳ 6. Ожидание готовности backend..."
sleep 5
ssh "$USER@$HOST" "for i in 1 2 3 4 5; do
  if curl -sf http://localhost:3000/api/v1/health > /dev/null 2>&1; then
    echo '   ✅ Backend ready';
    break;
  fi;
  echo '   ⏳ Waiting... (\$i/5)';
  sleep 3;
done"

echo ""
echo "🌱 7. Seed данных (если нужно)..."
ssh "$USER@$HOST" "docker exec kppdf-backend node dist/backend/src/seed.js 2>/dev/null && echo '   ✅ Seed complete' || echo '   ⚠️  Seed skipped (already seeded or no seed.ts)'"

echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║         ✅ Деплой завершён!                                 ║"
echo "║                                                              ║"
echo "║   Frontend:  https://sport-set.ru                           ║"
echo "║   API:       http://$HOST:3000/api/v1/health               ║"
echo "║                                                              ║"
echo "║   Управление:                                               ║"
echo "║   ssh $USER@$HOST                                            ║"
echo "║   cd $REMOTE_DIR                                            ║"
echo "║   docker compose -f docker-compose.prod.yml ps              ║"
echo "║   docker compose -f docker-compose.prod.yml logs -f          ║"
echo "║   docker compose -f docker-compose.prod.yml down            ║"
echo "╚══════════════════════════════════════════════════════════════╝"
