#!/usr/bin/env bash
set -euo pipefail

: "${DATABASE_URL:=file:./dev.db}"
export DATABASE_URL

echo "Aplicando migrações do Prisma"

cd "$(dirname "$0")/../.."
cd backend

npm run migrate:prod
