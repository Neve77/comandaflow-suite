# Documentação Técnica do ComandaFlow

## 1. Resumo executivo

O ComandaFlow é uma plataforma de gestão operacional para restaurantes, bares e eventos, com foco em comandas, pedidos, estoque, clientes, caixa, relatórios e operação mobile/desktop. A solução combina um frontend React/Vite, um backend Node.js/Express, comunicação em tempo real via Socket.IO e persistência com Prisma.

A arquitetura atual é modular e preparada para operação local ou em ambientes controlados. O sistema já implementa autenticação JWT, autorização por permissões, validação de entrada, auditoria, transações críticas e fluxo mobile com pareamento.

## 2. Escopo e visão do produto

### Usuários e papéis

- Administrador: controle completo do ambiente.
- Gerente: operações financeiras, estoque e relatórios.
- Caixa: gestão de caixa e fechamento.
- Garçom: abertura de comandas e lançamento de pedidos.
- Cozinha/Bar: recebimento de eventos de pedidos em tempo real.

### Capacidades principais

- Autenticação e autorização.
- Abertura, transferência, união e fechamento de comandas.
- Gestão de pulseiras e status operacional.
- Pedidos com controle de estoque e cancelamento rastreável.
- Cadastro de produtos, categorias e estoque mínimo.
- Cadastro e fidelidade de clientes.
- Caixa, sessões e movimentos financeiros.
- Eventos, check-ins e painel operacional.
- Relatórios em tela e exportação.
- Backup local e restauração administrativa.
- Integração opcional com IA via OpenAI.

## 3. Arquitetura técnica

```text
Frontend React/Vite
  └── API HTTP/JSON + Socket.IO
        └── Backend Express/Node.js
              └── Prisma + SQLite
```

### Camada de apresentação

- Frontend em React 18 com Vite.
- React Router para navegação.
- Tailwind CSS para interface.
- Axios para comunicação HTTP.
- Socket.IO Client para atualização em tempo real.

### Camada de aplicação

- Backend em Express.
- Estrutura organizada em rotas, controladores e serviços.
- Regras de negócio centralizadas em serviços.
- Validação com Zod.

### Persistência

- Prisma com SQLite como banco atual.
- Migrações versionadas e estrutura preparada para expansão.

### Tempo real

- Socket.IO com salas operacionais como admin, caixa, bar, cozinha e mobile.

## 4. Estrutura do repositório

- backend/src/app.js: configuração express, middlewares e rotas.
- backend/src/server.js: inicialização do servidor HTTP e Socket.IO.
- backend/src/http/routes: definição de endpoints e schemas.
- backend/src/controllers: adaptação HTTP e integração com serviços.
- backend/src/services: regras de negócio e acesso a dados.
- backend/src/realtime: autenticação e eventos em tempo real.
- backend/src/mobile: interface mobile web.
- backend/prisma: schema, migrações e banco.
- backend/test: testes automatizados.
- frontend/src/app: composição da aplicação e provedores globais.
- frontend/src/features: telas agrupadas por domínio.
- frontend/src/shared: componentes, serviços, configuração e utilitários reutilizáveis.
- electron-main.js: processo principal do aplicativo do restaurante.
- electron-manager-main.js: entrada do painel privado do Gestor.
- scripts/build: preparação do runtime e dos instaladores.
- scripts/database: aplicação das migrações Prisma.
- scripts/deploy: implantação, backup, restauração e atualização.
- scripts/tests: validações dos serviços e executáveis empacotados.
- docs: arquitetura, guias, requisitos históricos e notas de versão.

## 5. Módulos funcionais

### Dashboard

Painel operacional com indicadores e alertas.

### Comandas e pulseiras

Abertura, transferência, união, fechamento e controle de estado das pulseiras.

### Pedidos

Criação, desconto, controle de estoque e cancelamento rastreável.

### Produtos e estoque

CRUD de produtos, categorias, preços, estoque mínimo e movimentos.

### Clientes e fidelidade

Cadastro, bloqueio, histórico, pontos e cashback.

### Assinaturas e atualizações

O Gestor emite licenças Ed25519, controla instalações, sincroniza suspensão imediata ou programada e publica instaladores com manifesto assinado e hash SHA-256.

### Financeiro

Sessões de caixa, movimentações, sangrias e fechamento.

### Eventos

Gestão de eventos, capacidade e check-ins vinculados a comandas.

### Relatórios

Painel, vendas, produtos e exportação de dados.

### Backup

Cópia local do banco e restauração administrativa.

## 6. Fluxos operacionais

### Abertura de comanda

1. Usuário informa pulseira e cliente.
2. Validação e autenticação são aplicadas.
3. A pulseira é reservada para a nova comanda.
4. O sistema grava auditoria e atualiza os clientes conectados via Socket.IO.

### Inclusão de pedido

1. Verifica se a comanda está aberta.
2. Confere se o produto está ativo e há estoque.
3. Atualiza estoque e grava o pedido na mesma transação.

### Cancelamento

1. Requer permissão apropriada.
2. Registra motivo e operador.
3. Devolve estoque e atualiza o total da comanda.

### Fechamento

1. Recalcula itens não cancelados.
2. Valida valores, formas de pagamento e caixa.
3. Libera pulseira e registra movimento financeiro.

## 7. Modelo de dados

Principais entidades:

- User
- BusinessSettings
- Notification
- Bracelet
- Comanda
- Pedido
- Produto
- Client
- Event
- CashSession / CashMovement
- StockMovement
- AuditLog
- DeviceSession
- BackupRecord

### Integridade

- UUIDs como chave primária.
- Unicidade para e-mail, CPF, pulseira e fingerprint de alertas.
- Transações em fluxos críticos.
- Valores monetários representados por Decimal.

## 8. API HTTP

A API usa JSON sobre HTTP com autenticação via Bearer Token.

### Principais áreas

- Saúde: GET /health
- Autenticação: POST /auth/login
- Pulseiras, produtos, comandas, pedidos, clientes, financeiro, estoque, relatórios, usuários, backup e dispositivos

## 9. Comunicação em tempo real

O backend expõe eventos Socket.IO para atualizar dashboards, caixas, cozinha, bar e telas mobile. As principais salas e eventos incluem:

- admin
- caixa
- bar
- cozinha
- mobile
- comanda

## 10. Sistema mobile

A aplicação mobile web é voltada para garçons e oferece:

- indicadores de turno
- busca rápida por cliente/pulseira/comanda
- abertura de comandas
- cadastro de pedidos
- fila offline e sincronização ao reconectar
- tema claro/escuro e layout adaptado para toque

## 11. Aplicação Electron

A aplicação desktop usa Electron para abrir uma janela local, controlar o backend embutido e fornecer uma experiência integrada. O fluxo inclui:

- janela principal configurada para uso local
- reutilização do backend local
- logs persistentes
- empacotamento para distribuição Windows

## 12. Segurança implementada

### Controles existentes

- Hash de senha com bcrypt.
- Autenticação JWT.
- Autorização por permissões em partes do sistema.
- Validação de entrada com Zod.
- Rate limiting.
- Helmet e middlewares de segurança básicos.
- Auditoria de ações.
- Transações para operações críticas.

### Pontos que exigem atenção

- Segredos e credenciais padrão.
- CSP e CORS mais restritivos.
- Rejeição de conexões Socket.IO sem autenticação.
- Atualizações de dependências vulneráveis.
- Melhorias em RBAC para rotas específicas.

## 13. Riscos e plano de tratamento

### Prioridade crítica

- Substituir segredos e senhas padrão.
- Reforçar autenticação do Socket.IO.
- Atualizar dependências com alertas conhecidos.
- Revisar Electron para ambientes hostis.

### Prioridade alta

- Habilitar CSP restritiva.
- Restringir CORS.
- Implementar melhor controle de sessão e revogação.
- Completar RBAC e idempotência mobile.
- Aperfeiçoar backup externo e restauração.

## 14. Instalação e implantação

### Desenvolvimento local

```bash
cd /caminho/do/projeto
npm run install:all
npm run dev
```

### Variáveis relevantes

- DATABASE_URL
- JWT_SECRET
- PORT
- FRONTEND_URL
- PUBLIC_MOBILE_URL
- MOBILE_WAITER_PIN
- OPENAI_API_KEY
- OPENAI_MODEL

## 15. Operação, backup e recuperação

- Health check em /health.
- Logs de operação e erros.
- Backup local do banco SQLite.
- Recomenda-se backup externo automatizado e testes periódicos de restauração.

## 16. Testes e qualidade

Os testes automatizados do backend incluem cenários de comandas, pedidos, produtos, mobile, validações e configurações. A suíte mobile foi validada em ambiente local.

## 17. Manutenção e evolução

- Revisar dependências regularmente.
- Validar autenticação e autorização após mudanças.
- Testar backup e restauração.
- Acompanhar evolução da arquitetura e necessidades operacionais.

## 18. Apêndices

### Stack verificada

- Backend: Node.js, Express, Prisma, Zod, JWT, bcrypt, Socket.IO.
- Frontend: React 18, Vite, Tailwind CSS, Axios, React Router.
- Desktop: Electron.
- Persistência: SQLite.
- Testes: Jest e Supertest.

### Checklist de liberação

- [ ] Segredos e senhas padrão substituídos.
- [ ] Dependências vulneráveis tratadas.
- [ ] Socket.IO autenticado adequadamente.
- [ ] CSP e CORS revisados.
- [ ] Backup e restauração validados.
- [ ] RBAC revisado.
