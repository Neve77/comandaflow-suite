const request = require('supertest');
const app = require('../src/app');
const prisma = require('../src/infra/prisma/client');

describe('Products API', () => {
  let token;
  beforeAll(async () => {
    const res = await request(app).post('/auth/login').send({ email: 'admin@comanda.local', password: 'Pass@1234' });
    token = res.body.token;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  test('create and delete product', async () => {
    const payload = { nome: 'Teste Produto', preco: '9.99', categoria: 'Teste', estoque: '5' };
    const res = await request(app).post('/products').set('Authorization', `Bearer ${token}`).send(payload).expect(201);
    const prod = res.body.product;
    expect(prod).toBeTruthy();
    expect(prod.nome).toBe('Teste Produto');

    await request(app).delete(`/products/${prod.id}`).set('Authorization', `Bearer ${token}`).expect(204);
    const deleted = await prisma.produto.findUnique({ where: { id: prod.id } });
    expect(deleted).toBeNull();
  });
});
