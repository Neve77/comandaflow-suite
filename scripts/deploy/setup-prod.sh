#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$PROJECT_ROOT"

docker compose version >/dev/null

if [[ ! -f .env ]]; then
  cp .env.example .env
  echo "Arquivo .env criado. Gere um JWT_SECRET forte, ajuste as URLs e execute este script novamente."
  exit 1
fi

docker compose -f docker-compose.prod.yml up -d --build
docker compose -f docker-compose.prod.yml exec -T backend npm run migrate:prod

echo "ComandaFlow iniciado. Crie o primeiro administrador na tela inicial."
