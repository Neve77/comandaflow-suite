# Release 1.0.3

Data: 2026-06-04
Versão: 1.0.3
Tag Git: `v1.0.3`
Commit: `61a2d06f8f9800f589781619e218d24eefc5df14`

## Principais melhorias

- Corrigido problema de layout na barra de navegação do painel administrativo.
- Ajustada a renderização dos botões de menu lateral para evitar quebras no painel de dashboard / estoque.
- Atualizado o estilo de navegação em `frontend/src/components/Layout.jsx` e `frontend/src/index.css`.
- Construído e validado o frontend com sucesso após a correção.

## Recursos implementados

- `frontend/src/pages/InventoryPage.jsx`
  - Gerenciamento de estoque com indicadores de baixo estoque.
  - Atualização rápida de quantidade diretamente pelo painel.
- `frontend/src/pages/ClientsPage.jsx`
  - Listagem de clientes baseada em comandas existentes.
  - Histórico de consumo por cliente e visualização de pedidos.
- Backend `/clients`
  - `GET /clients`
  - `GET /clients/:cpf/history`
  - Arquivos criados:
    - `backend/src/routes/clients.routes.js`
    - `backend/src/controllers/clients.controller.js`
    - `backend/src/services/clients.service.js`

## Build e release

- Frontend build executado com sucesso em `frontend/dist`
- Aplicativo Electron empacotado com sucesso em `dist\win-unpacked`
- ZIP final gerado em `dist\ComandaFlow-win32-x64.zip`

## Git

- Branch: `main`
- Commit final: `Bump version to 1.0.3`
- Tag remota enviada: `v1.0.3`

## Observações

- A versão foi disponibilizada pronta para download e uso.
- O executável testado foi `dist\win-unpacked\ComandaFlow.exe`.
