#!/usr/bin/env bash
# Tencent HK Lighthouse — install system deps only (run once on fresh Ubuntu).
# Usage: bash deploy/bootstrap-ubuntu.sh

set -euo pipefail

if [[ "${EUID:-$(id -u)}" -ne 0 ]]; then
  echo "Run with sudo: sudo bash deploy/bootstrap-ubuntu.sh"
  exit 1
fi

export DEBIAN_FRONTEND=noninteractive

apt update
apt install -y git curl nginx certbot python3-certbot-nginx \
  python3.11 python3.11-venv python3-pip ffmpeg libsndfile1

if ! command -v node >/dev/null 2>&1 || [[ "$(node -v | cut -d. -f1 | tr -d v)" -lt 20 ]]; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt install -y nodejs
fi

npm install -g pm2

echo ""
echo "Done. Versions:"
node -v
npm -v
python3.11 --version
pm2 -v
echo ""
echo "Next: clone repo, configure .env.local + python/.env, then npm ci && npm run build && pm2 start deploy/ecosystem.config.cjs"
echo "See deploy/DEPLOY-TENCENT-HK.md"
