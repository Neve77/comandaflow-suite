const request = require('supertest');
const app = require('../src/app');
const prisma = require('../src/infra/prisma/client');

describe('Comanda E2E', () => {
  let token;
  let comandaId;

  beforeAll(async () => {
    // login with seeded admin
    const res = await request(app).post('/auth/login').send({ email: 'admin@comanda.local', password: 'Pass@1234' });
    token = res.body.token;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  test('open -> add pedido -> close', async () => {
    const braceletNumber = `TEST-${Date.now()}`;
    const openRes = await request(app)
      .post('/comandas/open')
      .set('Authorization', `Bearer ${token}`)
      .send({ number: braceletNumber, clienteNome: 'Teste E2E', clienteCpf: '12345678901', clienteTelefone: '11999999999' })
      .expect(201);

    comandaId = openRes.body.comanda.id;
    expect(comandaId).toBeTruthy();

    const prod = await prisma.produto.create({
      data: {
        nome: `Produto E2E ${Date.now()}`,
        preco: 12.5,
        categoria: 'Teste',
        estoque: 10
      }
    });
    expect(prod).toBeTruthy();

    const pedidoRes = await request(app)
      .post('/pedidos')
      .set('Authorization', `Bearer ${token}`)
      .send({ comandaId, produtoId: prod.id, nome: 'Nome adulterado', quantidade: '1', valorUnitario: '0.01' })
      .expect(201);

    expect(pedidoRes.body.pedido).toBeTruthy();
    expect(pedidoRes.body.pedido.nome).toBe(prod.nome);
    expect(Number(pedidoRes.body.pedido.valorUnitario)).toBe(Number(prod.preco));

    const productAfterPedido = await prisma.produto.findUnique({ where: { id: prod.id } });
    expect(productAfterPedido.estoque).toBe(prod.estoque - 1);

    await request(app)
      .post(`/comandas/${comandaId}/close`)
      .set('Authorization', `Bearer ${token}`)
      .send({ id: comandaId })
      .expect(200);

    const final = await prisma.comanda.findUnique({ where: { id: comandaId }, include: { bracelet: true } });
    expect(final.status).toBe('fechada');
    expect(final.bracelet.status).toBe('livre');
  });
});
