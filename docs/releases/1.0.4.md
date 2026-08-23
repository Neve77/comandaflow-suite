# Comanda Flow 1.0.4

## Destaques

- Mobile Web exclusivo para garcons em `/mobile`.
- Socket.IO com salas operacionais, autenticacao JWT e eventos de clientes, pulseiras, comandas, pedidos e estoque.
- Painel "Conexao Mobile" no desktop com IP local, porta, URL, QR Code e contagem de celulares conectados.
- Busca universal mobile por cliente, telefone, CPF, pulseira e comanda.
- Carrinho mobile com envio de pedidos e fila offline em `localStorage`.
- Auditoria das acoes mobile de login, abertura de comanda, vinculo de pulseira e criacao de pedido.

## Validacao

- Backend Jest: 6 suites, 10 testes.
- Build frontend Vite concluido.
- Smoke Socket.IO com 100 conexoes simultaneas validado antes da publicacao.
