const request = require('supertest');
const app = require('../src/app');
const prisma = require('../src/infra/prisma/client');

describe('Comanda Flow modules', () => {
  let token;

  beforeAll(async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'admin@comanda.local', password: 'Pass@1234' });
    token = res.body.token;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  test('reports complete and ai insights return operational data', async () => {
    const report = await request(app)
      .get('/reports/complete')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(report.body.executive).toBeTruthy();
    expect(Array.isArray(report.body.insights)).toBe(true);

    const ai = await request(app)
      .get('/ai/insights')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(ai.body.provider).toBeTruthy();
    expect(Array.isArray(ai.body.recommendations)).toBe(true);
  });

  test('events, devices and loyalty endpoints are available', async () => {
    const eventRes = await request(app)
      .post('/events')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: `Evento Teste ${Date.now()}`, capacity: 50, status: 'planejado' })
      .expect(201);

    expect(eventRes.body.event.id).toBeTruthy();

    await request(app)
      .get('/devices/status')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const pairing = await request(app)
      .post('/devices/pairing')
      .set('Authorization', `Bearer ${token}`)
      .send({ role: 'garcom', ttlMinutes: 5 })
      .expect(201);

    expect(pairing.body.pairingCode).toMatch(/^[0-9]{6}$/);

    const loyalty = await request(app)
      .get('/loyalty/summary')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(typeof loyalty.body.totalClients).toBe('number');
  });
});
