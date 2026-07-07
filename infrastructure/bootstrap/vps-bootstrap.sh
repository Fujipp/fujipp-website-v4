#!/usr/bin/env bash
#
# One-time bootstrap for the backend VPS (154.215.14.227).
#
# IMPORTANT: this server is SHARED. It already runs pm2 Discord bots and an nginx
# install with a Let's Encrypt cert for api.fujipp.com (proxying to 127.0.0.1:3600).
# This script therefore only installs what is missing — Docker — and prepares the
# app directory. It deliberately does NOT touch nginx, certificates, or the firewall,
# so the running bots and existing TLS are left alone.
#
# Usage (from your machine):
#   scp infrastructure/bootstrap/vps-bootstrap.sh root@154.215.14.227:/root/
#   ssh root@154.215.14.227 'DEPLOY_PUBKEY="$(cat)" bash /root/vps-bootstrap.sh' < fujipp-deploy.pub
#
# The backend container publishes 127.0.0.1:3600, which the pre-existing nginx
# vhost already proxies for https://api.fujipp.com.

set -euo pipefail

APP_DIR="/opt/fujipp"
DEPLOY_PUBKEY="${DEPLOY_PUBKEY:-}"   # optional: CI deploy key, appended to authorized_keys

log() { printf '\n\033[1;34m==> %s\033[0m\n' "$*"; }

if [[ "${EUID}" -ne 0 ]]; then
  echo "Run as root." >&2
  exit 1
fi

log "Installing Docker Engine + Compose plugin (if missing)"
if ! command -v docker >/dev/null 2>&1; then
  export DEBIAN_FRONTEND=noninteractive
  apt-get update -y
  apt-get install -y ca-certificates curl gnupg
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg \
    | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
  chmod a+r /etc/apt/keyrings/docker.gpg
  . /etc/os-release
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
https://download.docker.com/linux/ubuntu ${VERSION_CODENAME} stable" \
    > /etc/apt/sources.list.d/docker.list
  apt-get update -y
  apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
else
  echo "Docker already installed: $(docker --version)"
fi
systemctl enable --now docker

log "Creating app directory ${APP_DIR}"
mkdir -p "${APP_DIR}"

if [[ -n "${DEPLOY_PUBKEY}" ]]; then
  log "Installing CI deploy public key"
  mkdir -p /root/.ssh && chmod 700 /root/.ssh
  touch /root/.ssh/authorized_keys && chmod 600 /root/.ssh/authorized_keys
  grep -qxF "${DEPLOY_PUBKEY}" /root/.ssh/authorized_keys \
    || echo "${DEPLOY_PUBKEY}" >> /root/.ssh/authorized_keys
fi

cat <<'NOTE'

==> Bootstrap complete.

Left untouched on purpose (already configured / shared with other services):
  - nginx + Let's Encrypt for api.fujipp.com  (proxies to 127.0.0.1:3600)
  - the pm2 Discord bots
  - the firewall (ufw stays as-is)

The GitHub Actions deploy workflow will manage /opt/fujipp/docker-compose.yml and
/opt/fujipp/.env, then run `docker compose up -d`. The backend container publishes
127.0.0.1:3600 to match the existing nginx vhost.
NOTE
