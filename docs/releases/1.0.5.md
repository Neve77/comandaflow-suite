# Comanda Flow 1.0.5

## Correcao

- Corrige erro `EADDRINUSE` no Electron quando a porta `3002` ja esta ocupada por um backend Comanda Flow saudavel.
- O app agora verifica `/health` antes de iniciar outro backend e reutiliza o processo existente quando possivel.
- O backend tambem registra conflito de porta sem derrubar o processo principal do Electron.

## Validacao

- `node --check electron-main.js`
- `node --check backend/src/server.js`
- Backend Jest: 6 suites, 10 testes.
- Build frontend Vite concluido.
