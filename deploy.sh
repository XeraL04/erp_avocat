#!/bin/bash
set -euo pipefail

PORT=5000
HOST="127.0.0.1"
APP_NAME="erp-backend"
ROOT="/home/fares/fares/erp_avocat"
BACKEND_DIR="$ROOT/apps/backend"
FRONTEND_DIR="$ROOT/apps/frontend"
BACKEND_ENTRY="$BACKEND_DIR/dist/server.js"
HEALTH_URL="http://$HOST:$PORT/api/health"

echo "🔨 Build frontend..."
cd "$FRONTEND_DIR"
pnpm build

echo "🔨 Build backend..."
cd "$BACKEND_DIR"
pnpm build

echo "🔄 Restart backend with PM2..."

if pm2 describe "$APP_NAME" >/dev/null 2>&1; then
  pm2 restart "$APP_NAME"
else
  pm2 start "$BACKEND_ENTRY" --name "$APP_NAME"
fi

pm2 save >/dev/null

ATTEMPTS=20
COUNT=0
until curl -fsS "$HEALTH_URL" >/dev/null 2>&1; do
  COUNT=$((COUNT + 1))
  if [ "$COUNT" -ge "$ATTEMPTS" ]; then
    echo "❌ Le backend ne répond pas correctement après redémarrage"
    echo "👉 Logs PM2 :"
    pm2 logs "$APP_NAME" --lines 50 --nostream || true
    exit 1
  fi
  sleep 1
done

echo "✅ Backend démarré via PM2"
echo "✅ Healthcheck OK : $HEALTH_URL"
echo "✅ Déployé avec succès !"