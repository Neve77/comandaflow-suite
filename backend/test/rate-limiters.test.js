const express = require('express');
const request = require('supertest');
const {
  createGlobalLimiter,
  createLicenseActivationLimiter,
  createLicenseStatusLimiter,
} = require('../src/http/middleware/rate-limiters.middleware');

const createApp = () => {
  const app = express();

  app.get('/license/status', createLicenseStatusLimiter({ limit: 2 }));
  app.post('/license/activate', createLicenseActivationLimiter({ limit: 2 }));
  app.use(createGlobalLimiter({ limit: 2 }));

  app.get('/regular', (req, res) => res.sendStatus(204));
  app.get('/license/status', (req, res) => res.json({ valid: false }));
  app.post('/license/activate', (req, res) => res.sendStatus(204));

  return app;
};

describe('limitadores das rotas de recuperacao da assinatura', () => {
  test('o limite global nao impede consultar ou ativar a assinatura', async () => {
    const app = createApp();

    await request(app).get('/regular').expect(204);
    await request(app).get('/regular').expect(204);
    await request(app).get('/regular').expect(429);

    await request(app).get('/license/status').expect(200);
    await request(app).post('/license/activate').expect(204);
  });

  test('as rotas de recuperacao mantem limites proprios', async () => {
    const app = createApp();

    await request(app).get('/license/status').expect(200);
    await request(app).get('/license/status').expect(200);
    await request(app).get('/license/status').expect(429);

    await request(app).post('/license/activate').expect(204);
    await request(app).post('/license/activate').expect(204);
    await request(app).post('/license/activate').expect(429);
  });
});
