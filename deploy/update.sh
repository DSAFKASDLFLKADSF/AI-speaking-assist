#!/usr/bin/env bash
# Server update after git push — run from repo root:
#   bash deploy/update.sh

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "==> Pull latest"
git pull origin master

echo "==> Next.js build (stop web first — prebuild checks port 3000)"
pm2 stop ai-speaking-web 2>/dev/null || true
npm ci
npm run build

echo "==> Python deps"
cd python
./venv/bin/pip install -r requirements.txt
cd "$ROOT"

echo "==> Restart PM2"
pm2 restart deploy/ecosystem.config.cjs
pm2 save

echo "Done."
