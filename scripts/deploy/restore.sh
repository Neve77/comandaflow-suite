#!/usr/bin/env bash
set -euo pipefail

if [[ $# -ne 1 || ! -f "$1" ]]; then
  echo "Uso: $0 <arquivo-backup.db>" >&2
  exit 1
fi

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"
BACKUP_FILE="$(cd "$(dirname "$1")" && pwd)/$(basename "$1")"

cd "$PROJECT_ROOT"
read -r -p "Restaurar $BACKUP_FILE e substituir o banco atual? [s/N] " RESPONSE
[[ "$RESPONSE" == "s" || "$RESPONSE" == "S" ]] || exit 0

docker compose -f "$COMPOSE_FILE" stop backend
trap 'docker compose -f "$COMPOSE_FILE" start backend >/dev/null' EXIT
docker compose -f "$COMPOSE_FILE" run --rm --no-deps backend sh -c \
  'rm -f /app/data/comandaflow.db-wal /app/data/comandaflow.db-shm'
docker compose -f "$COMPOSE_FILE" cp "$BACKUP_FILE" "backend:/app/data/comandaflow.db"
docker compose -f "$COMPOSE_FILE" start backend
trap - EXIT

echo "Banco restaurado com sucesso."
