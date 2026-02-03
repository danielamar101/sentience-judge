#!/bin/bash
# Deploy script for Mirror Arena
# Rebuilds and restarts the app container

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_DIR"

echo "🔄 Rebuilding and restarting Mirror Arena..."

# Rebuild and restart only the app container (faster)
docker compose up -d --build app

echo "⏳ Waiting for app to be healthy..."
sleep 5

# Check if app is running
if docker compose ps app | grep -q "Up"; then
    echo "✅ Mirror Arena deployed successfully!"
    echo ""
    echo "View logs: docker compose logs -f app"
else
    echo "❌ Deployment may have failed. Check logs:"
    docker compose logs --tail=50 app
    exit 1
fi
