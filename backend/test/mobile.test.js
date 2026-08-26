const request = require('supertest');
const app = require('../src/app');
const prisma = require('../src/infra/prisma/client');

describe('Mobile waiter module', () => {
  let token;
  let adminToken;

  afterAll(async () => {
    await prisma.$disconnect();
  });

  test('accepts requests from the native iOS webview origin', async () => {
    const response = await request(app)
      .get('/health')
      .set('Origin', 'capacitor://localhost')
      .expect(200);

    expect(response.headers['access-control-allow-origin']).toBe('capacitor://localhost');
  });

  test('waiter can login with PIN and access mobile dashboard', async () => {
    const login = await request(app)
      .post('/mobile/auth/login')
      .send({ pin: process.env.MOBILE_WAITER_PIN || '1234' })
      .expect(200);

    expect(login.body.user.role).toBe('garcom');
    expect(login.body.token).toBeTruthy();
    token = login.body.token;

    const dashboard = await request(app)
      .get('/mobile/dashboard')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(typeof dashboard.body.dashboard.openComandas).toBe('number');
    expect(typeof dashboard.body.dashboard.pedidosHoje).toBe('number');
  });

  test('mobile device can confirm desktop pairing code', async () => {
    const adminLogin = await request(app)
      .post('/auth/login')
      .send({ email: 'admin@comanda.local', password: 'Pass@1234' })
      .expect(200);
    adminToken = adminLogin.body.token;

    const pairing = await request(app)
      .post('/devices/pairing')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ role: 'garcom', ttlMinutes: 5 })
      .expect(201);

    const confirm = await request(app)
      .post('/devices/pairing/confirm')
      .send({ pairingCode: pairing.body.pairingCode, name: 'Celular Teste' })
      .expect(200);

    expect(confirm.body.session.name).toBe('Celular Teste');
    expect(confirm.body.session.role).toBe('garcom');
    expect(confirm.body.session.status).toBe('ativo');
    expect(confirm.body.session.pairingCode).toBeNull();
  });

  test('mobile exposes universal search and does not expose forbidden close action', async () => {
    const search = await request(app)
      .get('/mobile/search?q=teste')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(Array.isArray(search.body.clients)).toBe(true);
    expect(Array.isArray(search.body.bracelets)).toBe(true);
    expect(Array.isArray(search.body.comandas)).toBe(true);

    await request(app)
      .post('/mobile/comandas/not-a-real-id/close')
      .set('Authorization', `Bearer ${token}`)
      .expect(404);
  });
});
