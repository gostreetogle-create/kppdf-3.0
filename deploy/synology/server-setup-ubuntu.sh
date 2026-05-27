#!/bin/bash
# ====================================================================
# server-setup-ubuntu.sh — первичная настройка чистого Ubuntu-сервера
# Запуск на сервере: scp + ssh
#
# Ubuntu 22.04 / 24.04 LTS
# ====================================================================
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/kppdf-3.0}"
DATA_DIR="${KPPDF_DATA_DIR:-/var/lib/kppdf}"
DEPLOY_USER="${DEPLOY_USER:-$USER}"

echo ""
echo "=== KPPDF 3.0 — Ubuntu server setup ==="
echo "  User: $DEPLOY_USER"
echo "  App:  $APP_DIR"
echo "  Data: $DATA_DIR"
echo ""

if [[ $EUID -ne 0 ]]; then
  echo "Запусти от root: sudo bash server-setup-ubuntu.sh"
  exit 1
fi

echo "[1/7] Обновление пакетов..."
apt-get update -qq
apt-get install -y -qq ca-certificates curl gnupg ufw

echo "[2/7] Установка Docker..."
if ! command -v docker &>/dev/null; then
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
  chmod a+r /etc/apt/keyrings/docker.asc
  echo \
    "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu \
    $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
    > /etc/apt/sources.list.d/docker.list
  apt-get update -qq
  apt-get install -y -qq docker-ce docker-ce-cli containerd.io docker-compose-plugin
fi
systemctl enable docker
systemctl start docker
docker --version
docker compose version

echo "[3/7] Пользователь $DEPLOY_USER в группе docker..."
usermod -aG docker "$DEPLOY_USER" 2>/dev/null || true

echo "[4/7] Каталог приложения..."
mkdir -p "$APP_DIR"
chown -R "$DEPLOY_USER:$DEPLOY_USER" "$APP_DIR"

echo "[5/7] Каталоги данных (MongoDB, медиа, бэкапы)..."
mkdir -p "$DATA_DIR"/{mongodb,media,backups}
chown -R 999:999 "$DATA_DIR/mongodb"
chown -R "$DEPLOY_USER:$DEPLOY_USER" "$DATA_DIR/media" "$DATA_DIR/backups"
chmod 755 "$DATA_DIR" "$DATA_DIR/mongodb" "$DATA_DIR/media" "$DATA_DIR/backups"
echo "  $DATA_DIR/mongodb  — база данных"
echo "  $DATA_DIR/media    — загруженные файлы"
echo "  $DATA_DIR/backups  — ручные бэкапы"

echo "[6/7] Firewall (UFW)..."
ufw --force enable
ufw allow OpenSSH
ufw allow 3000/tcp comment 'KPPDF API+Frontend'
ufw status

echo "[7/7] SSH-ключ..."
AUTH_KEYS="/home/$DEPLOY_USER/.ssh/authorized_keys"
if [[ -f "$AUTH_KEYS" ]] && [[ -s "$AUTH_KEYS" ]]; then
  echo "  authorized_keys уже есть"
else
  echo "  Добавь публичный ключ dev-машины в $AUTH_KEYS"
  mkdir -p "/home/$DEPLOY_USER/.ssh"
  chmod 700 "/home/$DEPLOY_USER/.ssh"
  touch "$AUTH_KEYS"
  chmod 600 "$AUTH_KEYS"
  chown -R "$DEPLOY_USER:$DEPLOY_USER" "/home/$DEPLOY_USER/.ssh"
fi

echo ""
echo "=== Готово ==="
echo ""
echo "  Проверка с dev-машины:"
echo "    ssh $DEPLOY_USER@$(hostname -I | awk '{print $1}') 'docker ps && ls -la $DATA_DIR'"
echo ""
echo "  Деплой:"
echo "    python deploy/synology/deploy.py --seed"
echo ""
