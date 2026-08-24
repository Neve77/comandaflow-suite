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
const twoFactorService = require(path.join(rootDir, 'backend', 'src', 'services', 'two-factor.service'));

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
      automaticSuspensionEnabled: true,
      paymentGraceDays: 0,
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
    appVersion: '2.3.0',
    platform: 'win32-x64',
  };
  await request(app).post('/license/sync').send(syncPayload).expect(200).expect(({ body }) => {
    if (!body.allowed || body.warning) throw new Error('A assinatura ativa foi negada pelo servidor.');
  });

  const monitoring = await request(app).get('/manager/monitoring').set('Authorization', authorization).expect(200);
  if (!monitoring.body.clients[0]?.online || monitoring.body.clients[0]?.appVersion !== '2.3.0' || monitoring.body.clients[0]?.activeDevices !== 1) {
    throw new Error('O monitoramento não registrou conexão, versão e dispositivo corretamente.');
  }

  const sentMessage = await request(app).post('/manager/messages').set('Authorization', authorization).send({
    subscriberIds: [created.body.subscriber.id], title: 'Aviso de teste', body: 'Mensagem integrada do Gestor.', severity: 'aviso',
  }).expect(201);
  await request(app).post('/license/sync').send(syncPayload).expect(200).expect(({ body }) => {
    if (body.messages?.[0]?.title !== 'Aviso de teste') throw new Error('A mensagem individual não chegou ao restaurante.');
  });
  await request(app).post(`/license/messages/${sentMessage.body.messages[0].id}/read`).send({
    licenseKey: syncPayload.licenseKey, installationId: syncPayload.installationId,
  }).expect(200);

  const ticket = await request(app).post('/manager/tickets').set('Authorization', authorization).send({
    subscriberId: created.body.subscriber.id, subject: 'Impressora não responde', description: 'Chamado de integração.', priority: 'alta',
  }).expect(201);
  await request(app).put(`/manager/tickets/${ticket.body.ticket.id}`).set('Authorization', authorization).send({ status: 'em_atendimento', priority: 'alta' }).expect(200);
  await request(app).post(`/manager/tickets/${ticket.body.ticket.id}/comments`).set('Authorization', authorization).send({ body: 'Atendimento iniciado.' }).expect(201);
  await request(app).get('/manager/notifications').set('Authorization', authorization).expect(200).expect(({ body }) => {
    if (!body.notifications.some((notification) => notification.category === 'support')) {
      throw new Error('A central de notificações não informou o chamado em andamento.');
    }
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

  const overdueCharge = await request(app).post(`/billing/subscribers/${created.body.subscriber.id}/charges`).set('Authorization', authorization).send({
    subscriberId: created.body.subscriber.id,
    amount: 149.9,
    dueDate: new Date(Date.now() - 86400000).toISOString(),
    description: 'Mensalidade vencida',
    recurring: true,
    billingCycleDays: 30,
  }).expect(201);
  await request(app).post('/billing/process').set('Authorization', authorization).expect(200);
  await request(app).post('/license/sync').send(syncPayload).expect(200).expect(({ body }) => {
    if (body.allowed || body.status !== 'suspenso') throw new Error('A suspensão automática por inadimplência não foi aplicada.');
  });
  const payment = await request(app).post(`/billing/charges/${overdueCharge.body.charge.id}/pay`).set('Authorization', authorization).send({ paymentMethod: 'pix', notes: 'Pagamento de teste' }).expect(200);
  if (!payment.body.reactivated) throw new Error('O pagamento não reativou o acesso suspenso por inadimplência.');
  const billingSummary = await request(app).get('/billing/summary').set('Authorization', authorization).expect(200);
  if (billingSummary.body.receivedThisMonth !== 149.9 || billingSummary.body.recurringMonthly !== 149.9) {
    throw new Error('O painel financeiro retornou totais incorretos.');
  }

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
  const previousPublishStart = await request(app)
    .post('/updates/publish/start')
    .set('Authorization', authorization)
    .send({
      product: 'client',
      version: '9.9.8',
      releaseNotes: 'Instalador anterior usado para validar a limpeza.',
      mandatory: false,
      fileName: 'ComandaFlow-Setup-9.9.8.exe',
      size: fakeInstaller.length,
      rollout: 'all',
    })
    .expect(201);
  await request(app)
    .put(`/updates/publish/${previousPublishStart.body.uploadToken}`)
    .set('Authorization', authorization)
    .set('Content-Type', 'application/octet-stream')
    .send(fakeInstaller)
    .expect(201);
  const previousClientInstaller = (await updateService.getPublished('client')).filePath;
  const publishStart = await request(app)
    .post('/updates/publish/start')
    .set('Authorization', authorization)
    .send({
      product: 'client',
      version: '9.9.9',
      releaseNotes: 'Atualizacao automatica usada no teste integrado.',
      mandatory: true,
      fileName: 'ComandaFlow-Setup-9.9.9.exe',
      size: fakeInstaller.length,
      rollout: 'pilot',
      pilotSubscriberIds: [created.body.subscriber.id],
    })
    .expect(201);
  const published = await request(app)
    .put(`/updates/publish/${publishStart.body.uploadToken}`)
    .set('Authorization', authorization)
    .set('Content-Type', 'application/octet-stream')
    .send(fakeInstaller)
    .expect(201);
  if (fs.existsSync(previousClientInstaller)) {
    throw new Error('O instalador anterior do restaurante não foi removido após a nova publicação.');
  }
  if (!licenseService.verifyUpdateManifest(published.body.manifest, published.body.signature)) {
    throw new Error('A assinatura digital da atualizacao publicada e invalida.');
  }
  const latest = await request(app)
    .get(`/updates/latest?currentVersion=2.3.0&licenseId=${issued.body.subscription.id}`)
    .expect(200);
  if (!latest.body.available || latest.body.manifest.version !== '9.9.9') {
    throw new Error('O Gestor nao anunciou a nova versao aos restaurantes.');
  }
  await request(app).patch('/updates/published/control').set('Authorization', authorization).send({ action: 'pause' }).expect(200);
  await request(app).get(`/updates/latest?currentVersion=2.3.0&licenseId=${issued.body.subscription.id}`).expect(200).expect(({ body }) => {
    if (body.available) throw new Error('A atualização pausada ainda foi anunciada.');
  });
  await request(app).patch('/updates/published/control').set('Authorization', authorization).send({ action: 'resume' }).expect(200);
  await request(app)
    .get(`/updates/download/${published.body.manifest.id}?licenseId=${issued.body.subscription.id}`)
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

  await request(app).patch('/updates/published/control').set('Authorization', authorization).send({ action: 'promote' }).expect(200);
  await request(app).get('/updates/latest?currentVersion=2.3.0').expect(200).expect(({ body }) => {
    if (!body.available) throw new Error('A atualização não foi promovida para todos.');
  });
  await request(app).patch('/updates/published/control').set('Authorization', authorization).send({ action: 'withdraw' }).expect(200);
  await request(app).get(`/updates/latest?currentVersion=2.3.0&licenseId=${issued.body.subscription.id}`).expect(200).expect(({ body }) => {
    if (body.available) throw new Error('A atualização retirada ainda foi anunciada.');
  });

  const managerPublishStart = await request(app)
    .post('/updates/publish/start')
    .set('Authorization', authorization)
    .send({
      product: 'manager',
      version: '9.9.9',
      releaseNotes: 'Atualização integrada do aplicativo Gestor.',
      mandatory: false,
      fileName: 'ComandaFlow-Gestor-Setup-9.9.9.exe',
      size: fakeInstaller.length,
      rollout: 'all',
    })
    .expect(201);
  await request(app)
    .put(`/updates/publish/${managerPublishStart.body.uploadToken}`)
    .set('Authorization', authorization)
    .set('Content-Type', 'application/octet-stream')
    .send(fakeInstaller)
    .expect(201);
  await request(app).get('/updates/manager/status').set('Authorization', authorization).expect(200).expect(({ body }) => {
    if (!body.available || body.manifest?.version !== '9.9.9') throw new Error('O Gestor não reconheceu sua própria atualização.');
  });
  const managerInstaller = (await updateService.getPublished('manager')).filePath;
  const orphanInstaller = path.join(testUserData, 'updates', 'ComandaFlow-Gestor-Setup-orphan.exe');
  fs.writeFileSync(orphanInstaller, fakeInstaller);
  process.env.COMANDAFLOW_APP_VERSION = '10.0.0';
  await updateService.cleanupUpdateArtifacts();
  if (fs.existsSync(managerInstaller) || fs.existsSync(orphanInstaller) || await updateService.getPublished('manager')) {
    throw new Error('A limpeza pós-atualização do Gestor manteve arquivos da versão antiga.');
  }
  process.env.COMANDAFLOW_APP_VERSION = '2.3.0';

  await request(app).post('/users').set('Authorization', authorization).send({
    name: 'Financeiro Teste', email: 'financeiro@test.local', password: 'Financeiro@Test123', role: 'financeiro',
  }).expect(201);
  const financialLogin = await request(app).post('/auth/login').send({ email: 'financeiro@test.local', password: 'Financeiro@Test123' }).expect(200);
  const financialAuthorization = `Bearer ${financialLogin.body.token}`;
  await request(app).get('/billing/summary').set('Authorization', financialAuthorization).expect(200);
  await request(app).post('/manager/messages').set('Authorization', financialAuthorization).send({ title: 'Bloqueado', body: 'Não deve enviar', severity: 'info' }).expect(403);

  const twoFactorSetup = await request(app).post('/auth/2fa/setup').set('Authorization', authorization).expect(200);
  const twoFactorCode = twoFactorService.totp(twoFactorSetup.body.secret);
  await request(app).post('/auth/2fa/enable').set('Authorization', authorization).send({ code: twoFactorCode }).expect(200);
  await request(app).post('/auth/login').send({ email: 'owner@test.local', password: 'Subscription@Test123' }).expect(428);
  await request(app).post('/auth/login').send({ email: 'owner@test.local', password: 'Subscription@Test123', twoFactorCode }).expect(200);

  await new Promise((resolve) => setTimeout(resolve, 50));
  const audit = await request(app).get('/audit?take=100').set('Authorization', authorization).expect(200);
  if (!audit.body.logs.some((log) => log.action === 'post_success')) throw new Error('A auditoria automática não registrou as alterações.');

  console.log('[TEST] Gestor financeiro, monitoramento, mensagens, atualizações, suporte, permissões, 2FA e auditoria aprovados.');
}

main()
  .catch((error) => {
    console.error(`[TEST] ${error.stack || error.message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.messageReceipt.deleteMany();
    await prisma.managerMessage.deleteMany();
    await prisma.supportTicketComment.deleteMany();
    await prisma.supportTicket.deleteMany();
    await prisma.billingEvent.deleteMany();
    await prisma.billingCharge.deleteMany();
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
