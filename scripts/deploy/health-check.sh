#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"
PORT="${PORT:-3000}"

cd "$PROJECT_ROOT"
docker compose -f "$COMPOSE_FILE" ps
curl --fail --silent --show-error "http://localhost:$PORT/health"
echo
