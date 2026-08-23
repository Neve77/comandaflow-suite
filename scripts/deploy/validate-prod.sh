#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$PROJECT_ROOT"

docker version >/dev/null
docker compose version >/dev/null
[[ -f .env ]] || { echo "Arquivo .env ausente; copie .env.example." >&2; exit 1; }

docker compose -f docker-compose.prod.yml config --quiet
docker compose -f docker-compose.prod.yml build
docker compose -f docker-compose.prod.yml up -d

for ATTEMPT in {1..30}; do
  if curl --fail --silent "http://localhost:${PORT:-3000}/health" >/dev/null; then
    echo "Validação de produção concluída com sucesso."
    exit 0
  fi
  sleep 2
done

docker compose -f docker-compose.prod.yml logs --tail=100 backend
echo "O backend não ficou saudável dentro do prazo." >&2
exit 1
