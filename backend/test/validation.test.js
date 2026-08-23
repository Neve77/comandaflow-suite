const request = require('supertest');
const app = require('../src/app');

describe('Validation', () => {
  test('open comanda with invalid cpf returns 400', async () => {
    const login = await request(app).post('/auth/login').send({ email: 'admin@comanda.local', password: 'Pass@1234' });
    const token = login.body.token;
    const res = await request(app).post('/comandas/open').set('Authorization', `Bearer ${token}`).send({ number: 'X', clienteNome: 'A', clienteCpf: '123', clienteTelefone: '11999999999' });
    expect(res.status).toBe(400);
  });

  test('create product with zero price returns 400', async () => {
    const login = await request(app).post('/auth/login').send({ email: 'admin@comanda.local', password: 'Pass@1234' });
    const token = login.body.token;
    const res = await request(app).post('/products').set('Authorization', `Bearer ${token}`).send({ nome: 'X', preco: '0', categoria: 'T', estoque: '1' });
    expect(res.status).toBe(400);
  });

  test('create product with malformed price returns 400', async () => {
    const login = await request(app).post('/auth/login').send({ email: 'admin@comanda.local', password: 'Pass@1234' });
    const token = login.body.token;
    const res = await request(app).post('/products').set('Authorization', `Bearer ${token}`).send({ nome: 'X', preco: '10abc', categoria: 'T', estoque: '1' });
    expect(res.status).toBe(400);
  });
});
