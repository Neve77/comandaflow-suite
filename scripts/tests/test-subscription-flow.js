const path = require('path');
const fs = require('fs');
const os = require('os');
const { execFileSync } = require('child_process');

const rootDir = path.resolve(__dirname, '..', '..');
const backendDir = path.join(rootDir, 'backend');
const testUserData = fs.mkdtempSync(path.join(os.tmpdir(), 'comandaflow-manager-service-test-'));
const testDatabaseName = `subscription-test-${process.pid}.db`;
const testDatabasePath = path.join(backendDir, 'prisma', testDatabaseName);
process.env.COMANDAFLOW_MANAGER_MODE = 'true';
process.env.COMANDAFLOW_USER_DATA = testUserData;
process.env.COMANDAFLOW_APP_VERSION = '2.3.0';
process.env.APPDATA = testUserData;
process.env.DATABASE_URL = `file:./${testDatabaseName}`;
process.env.JWT_SECRET = 'test-only-subscription-secret-with-more-than-32-characters';
process.env.CF_LICENSE_PRIVATE_KEY_PATH = path.join(rootDir, '.secrets', 'license-private.pem');
process.env.NODE_ENV = 'test';

fs.closeSync(fs.openSync(testDatabasePath, 'a'));
execFileSync(process.execPath, [
  path.join(backendDir, 'node_modules', 'prisma', 'build', 'index.js'),
  'migrate',
  'deploy',
  '--schema',
  path.join(backendDir, 'prisma', 'schema.prisma'),
], {
  cwd: backendDir,
  env: process.env,
  stdio: 'pipe',
});

const request = require(path.join(rootDir, 'backend', 'node_modules', 'supertest'));
const app = require(path.join(rootDir, 'backend', 'src', 'app'));
const prisma = require(path.join(rootDir, 'backend', 'src', 'infra', 'prisma', 'client'));
const licenseService = require(path.join(rootDir, 'backend', 'src', 'services', 'license.service'));
const updateService = require(path.join(rootDir, 'backend', 'src', 'services', 'app-update.service'));

async function main() {
  await prisma.auditLog.deleteMany();
  await prisma.subscription.deleteMany();
  await prisma.subscriber.deleteMany();
  await prisma.systemSetting.deleteMany();
  await prisma.user.deleteMany();

  await request(app).post('/auth/setup').send({
    name: 'Proprietario de Teste',
    email: 'owner@test.local',
    password: 'Subscription@Test123',
  }).expect(201);

  const login = await request(app).post('/auth/login').send({
    email: 'owner@test.local',
    password: 'Subscription@Test123',
  }).expect(200);
  const authorization = `Bearer ${login.body.token}`;

  await request(app)
    .put('/subscriptions/settings')
    .set('Authorization', authorization)
    .send({
      publicServerUrl: 'https://assinaturas.test.local',
      offlineGraceHours: 24,
      syncIntervalMinutes: 1,
      defaultSuspensionMessage: 'Pagamento pendente. Entre em contato com o atendimento.',
    })
    .expect(200);

  const created = await request(app)
    .post('/subscriptions/subscribers')
    .set('Authorization', authorization)
    .send({ businessName: 'Restaurante de Teste', email: 'cliente@test.local' })
    .expect(201);

  const issued = await request(app)
    .post(`/subscriptions/subscribers/${created.body.subscriber.id}/issue`)
    .set('Authorization', authorization)
    .send({ plan: 'Mensal', days: 30, maxDevices: 2 })
    .expect(201);

  const verified = licenseService.verifyLicenseKey(issued.body.subscription.licenseKey);
  if (!issued.body.subscription.licenseKey.startsWith('CF3-') || !verified.valid || verified.clientName !== 'Restaurante de Teste' || verified.maxDevices !== 2 || verified.serverUrl !== 'https://assinaturas.test.local') {
    throw new Error('A chave emitida nao passou na verificacao criptografica.');
  }

  const syncPayload = {
    licenseKey: issued.body.subscription.licenseKey,
    installationId: 'test-installation-001',
    deviceName: 'Caixa Teste',
  };
  await request(app).post('/license/sync').send(syncPayload).expect(200).expect(({ body }) => {
    if (!body.allowed || body.warning) throw new Error('A assinatura ativa foi negada pelo servidor.');
  });

  const suspensionMessage = 'Pagamento nao identificado. Fale conosco para liberar o sistema.';
  await request(app)
    .post(`/subscriptions/subscribers/${created.body.subscriber.id}/suspend`)
    .set('Authorization', authorization)
    .send({ mode: 'imediato', accessUntil: null, message: suspensionMessage })
    .expect(200);
  await request(app).post('/license/sync').send(syncPayload).expect(200).expect(({ body }) => {
    if (body.allowed || body.status !== 'suspenso' || body.message !== suspensionMessage) {
      throw new Error('O bloqueio imediato nao foi aplicado corretamente.');
    }
  });

  await request(app)
    .post(`/subscriptions/subscribers/${created.body.subscriber.id}/reactivate`)
    .set('Authorization', authorization)
    .expect(200);

  const accessUntil = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  await request(app)
    .post(`/subscriptions/subscribers/${created.body.subscriber.id}/suspend`)
    .set('Authorization', authorization)
    .send({ mode: 'prazo', accessUntil, message: 'Acesso liberado ate o prazo combinado.' })
    .expect(200);
  await request(app).post('/license/sync').send(syncPayload).expect(200).expect(({ body }) => {
    if (!body.allowed || !body.warning || body.status !== 'prazo_pagamento') {
      throw new Error('O prazo de pagamento nao foi aplicado corretamente.');
    }
  });

  const summary = await request(app)
    .get('/subscriptions/summary')
    .set('Authorization', authorization)
    .expect(200);
  if (summary.body.total !== 1 || summary.body.suspended !== 1) {
    throw new Error('O resumo do gestor retornou valores inesperados.');
  }

  const fakeInstaller = Buffer.from('MZComandaFlow test installer payload');
  const publishStart = await request(app)
    .post('/updates/publish/start')
    .set('Authorization', authorization)
    .send({
      version: '9.9.9',
      releaseNotes: 'Atualizacao automatica usada no teste integrado.',
      mandatory: true,
      fileName: 'ComandaFlow-Setup-9.9.9.exe',
      size: fakeInstaller.length,
    })
    .expect(201);
  const published = await request(app)
    .put(`/updates/publish/${publishStart.body.uploadToken}`)
    .set('Authorization', authorization)
    .set('Content-Type', 'application/octet-stream')
    .send(fakeInstaller)
    .expect(201);
  if (!licenseService.verifyUpdateManifest(published.body.manifest, published.body.signature)) {
    throw new Error('A assinatura digital da atualizacao publicada e invalida.');
  }
  const latest = await request(app)
    .get('/updates/latest?currentVersion=2.3.0')
    .expect(200);
  if (!latest.body.available || latest.body.manifest.version !== '9.9.9') {
    throw new Error('O Gestor nao anunciou a nova versao aos restaurantes.');
  }
  await request(app)
    .get(`/updates/download/${published.body.manifest.id}`)
    .expect(200)
    .expect('Content-Length', String(fakeInstaller.length));

  const originalFetch = global.fetch;
  process.env.COMANDAFLOW_MANAGER_MODE = 'false';
  licenseService.activateLicense(issued.body.subscription.licenseKey);
  global.fetch = async (url) => {
    if (String(url).includes('/updates/latest')) {
      return new Response(JSON.stringify(latest.body), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }
    if (String(url).includes('/updates/download/')) {
      return new Response(fakeInstaller, { status: 200, headers: { 'Content-Type': 'application/octet-stream' } });
    }
    throw new Error(`URL inesperada no teste de atualizacao: ${url}`);
  };
  const clientUpdate = await updateService.checkNow();
  if (clientUpdate.status !== 'available' || clientUpdate.manifest.version !== '9.9.9') {
    throw new Error('O cliente nao reconheceu a atualizacao assinada.');
  }
  await updateService.beginDownload();
  for (let attempt = 0; attempt < 50 && updateService.getClientState().status === 'downloading'; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  if (updateService.getClientState().status !== 'ready') {
    throw new Error(`O cliente nao concluiu o download verificado: ${JSON.stringify(updateService.getClientState())}`);
  }
  global.fetch = originalFetch;
  process.env.COMANDAFLOW_MANAGER_MODE = 'true';

  console.log('[TEST] Assinaturas online e publicacao assinada de atualizacao aprovadas.');
}

main()
  .catch((error) => {
    console.error(`[TEST] ${error.stack || error.message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.auditLog.deleteMany();
    await prisma.subscription.deleteMany();
    await prisma.subscriber.deleteMany();
    await prisma.systemSetting.deleteMany();
    await prisma.user.deleteMany();
    await prisma.$disconnect();
    fs.rmSync(testUserData, { recursive: true, force: true });
    for (const suffix of ['', '-journal', '-wal', '-shm']) {
      fs.rmSync(`${testDatabasePath}${suffix}`, { force: true });
    }
  });
