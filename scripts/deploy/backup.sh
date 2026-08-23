#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"
BACKUP_DIR="$PROJECT_ROOT/backups"
BACKUP_FILE="$BACKUP_DIR/comandaflow-$(date +%Y%m%d-%H%M%S).db"

cd "$PROJECT_ROOT"
mkdir -p "$BACKUP_DIR"

docker compose -f "$COMPOSE_FILE" exec -T backend node -e \
  'const prisma=require("./src/infra/prisma/client"); prisma.$executeRawUnsafe("PRAGMA wal_checkpoint(FULL)").finally(() => prisma.$disconnect())'
docker compose -f "$COMPOSE_FILE" cp "backend:/app/data/comandaflow.db" "$BACKUP_FILE"

echo "Backup criado em $BACKUP_FILE"
