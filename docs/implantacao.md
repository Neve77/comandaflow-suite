# Implantação com Docker

Este modo publica frontend e backend em contêineres e persiste o SQLite em um volume Docker. Para o aplicativo Windows instalado no restaurante, use os comandos de instalador descritos no README.

## Preparação

1. Instale Docker com suporte a `docker compose`.
2. Copie `.env.example` para `.env`.
3. Substitua `JWT_SECRET` por uma chave aleatória de ao menos 32 caracteres.
4. Configure `FRONTEND_URL` e `VITE_API_URL` com os endereços públicos corretos.

O arquivo `.env` é local e não deve ser enviado ao Git.

## Subir os serviços

```bash
./scripts/deploy/setup-prod.sh
```

Ou execute diretamente:

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

A criação das tabelas ocorre pelas migrações versionadas do Prisma, compatíveis com o SQLite adotado pelo aplicativo. O primeiro administrador é criado pela interface; o seed de demonstração não roda em produção.

## Verificação

```bash
./scripts/deploy/verify-production.sh
./scripts/deploy/validate-prod.sh
./scripts/deploy/health-check.sh
```

## Backup e restauração

```bash
./scripts/deploy/backup.sh
./scripts/deploy/restore.sh backups/comandaflow-AAAAMMDD-HHMMSS.db
```

O backup força um checkpoint do SQLite antes da cópia. A restauração interrompe temporariamente o backend, pede confirmação e reinicia o serviço ao final.

## Atualização

```bash
./scripts/deploy/upgrade.sh
```

O script cria um backup, aceita apenas avanço direto do Git, reconstrói os contêineres e sincroniza o schema.

## HTTPS

O `docker-compose.prod.complete.yml` inclui um proxy Nginx de referência. Configure domínio e certificados antes de expor a aplicação. Credenciais, certificados e chaves privadas nunca devem ser adicionados ao repositório.

## Solução rápida de problemas

```bash
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs --tail=100 backend
docker compose -f docker-compose.prod.yml logs --tail=100 frontend
```

Se a porta estiver ocupada, ajuste `PORT` no `.env`. Se o frontend não alcançar a API, confirme se `VITE_API_URL` foi definido antes do build.
