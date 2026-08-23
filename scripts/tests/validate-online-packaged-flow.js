const { spawn, spawnSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const rootDir = path.resolve(__dirname, '..', '..');
const managerExecutable = path.join(rootDir, 'dist', 'manager', 'win-unpacked', 'ComandaFlow Gestor.exe');
const clientExecutable = path.join(rootDir, 'dist', 'client', 'win-unpacked', 'ComandaFlow.exe');
const managerPort = 3043;
const clientPort = 3042;
const testRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'comandaflow-online-package-'));
const processes = [];
let output = '';

const delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
const collect = (chunk) => { output = `${output}${chunk}`.slice(-30000); };

const stopProcessTree = async (child) => {
  if (child.exitCode !== null) return;

  const exited = new Promise((resolve) => child.once('exit', resolve));
  if (process.platform === 'win32') {
    spawnSync('taskkill', ['/PID', String(child.pid), '/T', '/F'], {
      windowsHide: true,
      stdio: 'ignore',
    });
  } else {
    child.kill('SIGTERM');
  }

  await Promise.race([exited, delay(5000)]);
};

const startApp = (executable, name, port) => {
  const dataRoot = path.join(testRoot, name);
  fs.mkdirSync(dataRoot, { recursive: true });
  const environment = { ...process.env };
  delete environment.ELECTRON_RUN_AS_NODE;
  const child = spawn(executable, [], {
    env: {
      ...environment,
      PORT: String(port),
      APPDATA: dataRoot,
      COMANDAFLOW_DATA_ROOT: dataRoot,
      COMANDAFLOW_ALLOW_MULTIPLE_INSTANCES: 'true',
      COMANDAFLOW_ALLOW_LOCAL_SERVER: 'true',
    },
    windowsHide: true,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  child.stdout.on('data', collect);
  child.stderr.on('data', collect);
  processes.push(child);
  return child;
};

const waitForHealth = async (port, child) => {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    if (child.exitCode !== null) throw new Error(`Aplicativo da porta ${port} encerrou com codigo ${child.exitCode}.`);
    try {
      const response = await fetch(`http://127.0.0.1:${port}/health`);
      if (response.ok) return;
    } catch {}
    await delay(400);
  }
  throw new Error(`Timeout aguardando o aplicativo da porta ${port}.`);
};

const requestJson = async (url, { method = 'GET', body, token, binary = false } = {}) => {
  const response = await fetch(url, {
    method,
    headers: {
      ...(body !== undefined ? { 'Content-Type': binary ? 'application/octet-stream' : 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body === undefined ? undefined : binary ? body : JSON.stringify(body),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`${method} ${url} falhou (${response.status}): ${result.message || 'sem mensagem'}`);
  return result;
};

async function main() {
  if (!fs.existsSync(managerExecutable) || !fs.existsSync(clientExecutable)) {
    throw new Error('Execute npm run release:windows antes do teste online empacotado.');
  }

  const manager = startApp(managerExecutable, 'manager', managerPort);
  await waitForHealth(managerPort, manager);
  await requestJson(`http://127.0.0.1:${managerPort}/auth/setup`, {
    method: 'POST',
    body: { name: 'Gestor Online', email: 'gestor@online.test', password: 'Online@Test123' },
  });
  const managerLogin = await requestJson(`http://127.0.0.1:${managerPort}/auth/login`, {
    method: 'POST',
    body: { email: 'gestor@online.test', password: 'Online@Test123' },
  });
  await requestJson(`http://127.0.0.1:${managerPort}/subscriptions/settings`, {
    method: 'PUT', token: managerLogin.token,
    body: {
      publicServerUrl: `http://127.0.0.1:${managerPort}`,
      offlineGraceHours: 24,
      syncIntervalMinutes: 1,
      defaultSuspensionMessage: 'Entre em contato com o gestor.',
    },
  });
  const subscriber = await requestJson(`http://127.0.0.1:${managerPort}/subscriptions/subscribers`, {
    method: 'POST', token: managerLogin.token,
    body: { businessName: 'Restaurante Atualizavel', email: 'restaurante@online.test' },
  });
  const issued = await requestJson(`http://127.0.0.1:${managerPort}/subscriptions/subscribers/${subscriber.subscriber.id}/issue`, {
    method: 'POST', token: managerLogin.token,
    body: { plan: 'Mensal', days: 30, maxDevices: 1 },
  });

  const installerPayload = fs.readFileSync(path.join(rootDir, 'dist', 'client', 'ComandaFlow-Setup-2.3.1.exe'));
  const publication = await requestJson(`http://127.0.0.1:${managerPort}/updates/publish/start`, {
    method: 'POST', token: managerLogin.token,
    body: {
      version: '9.9.9',
      releaseNotes: 'Validacao ponta a ponta do atualizador.',
      mandatory: true,
      fileName: 'ComandaFlow-Setup-9.9.9.exe',
      size: installerPayload.length,
    },
  });
  await requestJson(`http://127.0.0.1:${managerPort}/updates/publish/${publication.uploadToken}`, {
    method: 'PUT', token: managerLogin.token, body: installerPayload, binary: true,
  });

  const client = startApp(clientExecutable, 'client', clientPort);
  await waitForHealth(clientPort, client);
  await requestJson(`http://127.0.0.1:${clientPort}/auth/setup`, {
    method: 'POST',
    body: { name: 'Administrador Cliente', email: 'admin@client.test', password: 'Client@Test123' },
  });
  const clientLogin = await requestJson(`http://127.0.0.1:${clientPort}/auth/login`, {
    method: 'POST', body: { email: 'admin@client.test', password: 'Client@Test123' },
  });
  await requestJson(`http://127.0.0.1:${clientPort}/license/activate`, {
    method: 'POST', body: { licenseKey: issued.subscription.licenseKey },
  });
  const available = await requestJson(`http://127.0.0.1:${clientPort}/updates/check`, {
    method: 'POST', token: clientLogin.token,
  });
  if (available.status !== 'available' || available.manifest?.version !== '9.9.9') {
    throw new Error(`Cliente nao encontrou a atualizacao: ${JSON.stringify(available)}`);
  }
  await requestJson(`http://127.0.0.1:${clientPort}/updates/download`, {
    method: 'POST', token: clientLogin.token,
  });
  let downloadStatus;
  for (let attempt = 0; attempt < 100; attempt += 1) {
    downloadStatus = await requestJson(`http://127.0.0.1:${clientPort}/updates/status`, { token: clientLogin.token });
    if (downloadStatus.status !== 'downloading') break;
    await delay(100);
  }
  if (downloadStatus?.status !== 'ready' || downloadStatus.progress !== 100) {
    throw new Error(`Download ponta a ponta nao foi validado: ${JSON.stringify(downloadStatus)}`);
  }

  console.log('[PACKAGE ONLINE] Gestor publicou e cliente baixou uma atualizacao assinada com sucesso.');
}

main().catch((error) => {
  console.error(`[PACKAGE ONLINE] ${error.stack || error.message}\n${output}`);
  process.exitCode = 1;
}).finally(async () => {
  await Promise.all(processes.map(stopProcessTree));
  fs.rmSync(testRoot, { recursive: true, force: true, maxRetries: 10, retryDelay: 250 });
});
