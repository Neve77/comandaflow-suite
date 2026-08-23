# ComandaFlow

Sistema de gestão para restaurantes e bares, com aplicativo Windows para o estabelecimento e painel privado para administração de assinantes, licenças e atualizações.

## Principais recursos

- Comandas, mesas, pedidos, produtos, estoque, clientes e relatórios.
- Operação mobile na rede local e eventos em tempo real com Socket.IO.
- Perfis de acesso, auditoria, backup e restauração.
- Licenças assinadas com Ed25519, período de avaliação e bloqueio remoto.
- Suspensão imediata ou programada, com mensagem personalizada ao assinante.
- Publicação de atualizações assinadas, validação SHA-256 e instalação assistida.

## Tecnologia

- Electron 43 e instalador NSIS para Windows.
- React 18, Vite 8 e Tailwind CSS no frontend.
- Node.js 20, Express, Prisma e SQLite no backend.
- Jest e Supertest nos testes automatizados.

## Estrutura

```text
backend/
├── prisma/                 schema e histórico de migrações
├── src/
│   ├── controllers/        adaptação HTTP
│   ├── http/               rotas e middlewares
│   ├── infra/prisma/       cliente e seed opcional
│   ├── mobile/             interface web para a equipe
│   ├── realtime/           Socket.IO
│   └── services/           regras de negócio
└── test/                   testes automatizados
frontend/src/
├── app/                    composição e provedores
├── features/               telas agrupadas por domínio
└── shared/                 componentes, serviços, configuração e utilitários
scripts/
├── build/                  empacotamento Windows
├── database/               sincronização do Prisma
├── deploy/                 implantação, backup e restauração
└── tests/                  validações de assinatura e pacotes
docs/                       arquitetura, guias e notas de versão
```

## Desenvolvimento

Pré-requisitos: Node.js 20.19 ou superior e npm.

```bash
npm run install:all
copy backend\.env.example backend\.env
npm run dev
```

O backend usa SQLite. No primeiro acesso, a tela inicial solicita a criação do administrador; não existem credenciais padrão de produção.

Para executar também o Electron:

```bash
npm run electron:dev
```

## Validação

```bash
npm --prefix backend test
npm run test:subscriptions
npm run build:frontend
```

Os testes de backend precisam de um banco SQLite inicializado. O pipeline de CI cria esse banco e carrega o seed de demonstração exclusivamente com `npm --prefix backend run seed -- --demo`.

## Instaladores Windows

```bash
npm run build:client
npm run build:manager
```

Os arquivos são gerados em `dist/client` e `dist/manager`. O instalador do Gestor inclui a chave privada de licenciamento e deve permanecer somente com o proprietário. O instalador de cliente contém apenas a chave pública.

## Segurança

- `.env`, `.env.production`, bancos, logs, artefatos e `.secrets/` são ignorados pelo Git.
- Use `.env.example` e `backend/.env.example` somente como modelos.
- Gere um `JWT_SECRET` aleatório com pelo menos 32 caracteres.
- Nunca envie `.secrets/license-private.pem` ou o instalador do Gestor aos restaurantes.
- Para controle online, publique o Gestor por um endereço HTTPS fixo; não exponha diretamente a porta local.

## Documentação

- [Arquitetura](docs/arquitetura.md)
- [Implantação com Docker](docs/implantacao.md)
- [Assinaturas e atualizações](docs/guias/assinaturas-e-atualizacoes.md)
- [Scripts operacionais](scripts/README.md)

## Licença

Software proprietário da Orqium. Todos os direitos reservados.
