# Comanda Flow 1.0.8

## Correcao

- Corrige sincronizacao da fila offline do Mobile Web.
- Evita reenviar itens que ja foram confirmados quando a conexao cai no meio do envio do carrinho.
- Impede sincronizacoes simultaneas da mesma fila.
- Exibe estado "Sincronizando pedidos pendentes..." durante o envio automatico/manual.
- Atualiza a comanda apos sincronizar a fila com sucesso.

## Validacao

- Backend Jest: 6 suites, 11 testes.
- Build frontend Vite concluido.
