#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$PROJECT_ROOT"

FILES=(
  ".env.example"
  "backend/Dockerfile"
  "frontend/Dockerfile"
  "docker-compose.prod.yml"
  "docs/implantacao.md"
  "scripts/deploy/backup.sh"
  "scripts/deploy/restore.sh"
  "scripts/deploy/health-check.sh"
)

for FILE in "${FILES[@]}"; do
  [[ -f "$FILE" ]] || { echo "Arquivo obrigatório ausente: $FILE" >&2; exit 1; }
done

echo "Arquivos de produção verificados."
