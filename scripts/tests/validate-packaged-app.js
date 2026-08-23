const { spawn, spawnSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');

const mode = process.argv[2] === 'manager' ? 'manager' : 'client';
const rootDir = path.resolve(__dirname, '..', '..');
const executable = mode === 'manager'
  ? path.join(rootDir, 'dist', 'manager', 'win-unpacked', 'ComandaFlow Gestor.exe')
  : path.join(rootDir, 'dist', 'client', 'win-unpacked', 'ComandaFlow.exe');
const port = mode === 'manager' ? 3023 : 3022;
const appData = fs.mkdtempSync(path.join(os.tmpdir(), `comandaflow-${mode}-validation-`));

const delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

async function stopProcessTree(child) {
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
}

const postJson = (url, body, token) => fetch(url, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  },
  body: JSON.stringify(body),
});
const putJson = (url, body, token) => fetch(url, {
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  },
  body: JSON.stringify(body),
});
const putBinary = (url, body, token) => fetch(url, {
  method: 'PUT',
  headers: {
    'Content-Type': 'application/octet-stream',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  },
  body,
});

async function waitForHealth(child) {
  let lastError;
  for (let attempt = 0; attempt < 40; attempt += 1) {
    if (child.exitCode !== null) throw new Error(`Aplicativo encerrou antes do health check (codigo ${child.exitCode}).`);
    try {
      const response = await fetch(`http://127.0.0.1:${port}/health`);
      if (response.ok) return response.json();
    } catch (error) {
      lastError = error;
    }
    await delay(500);
  }
  throw new Error(`Backend empacotado nao respondeu: ${lastError?.message || 'timeout'}`);
}

async function main() {
  if (!fs.existsSync(executable)) throw new Error(`Executavel nao encontrado: ${executable}`);
  const childEnvironment = { ...process.env };
  delete childEnvironment.ELECTRON_RUN_AS_NODE;
  const child = spawn(executable, [], {
    env: {
      ...childEnvironment,
      PORT: String(port),
      APPDATA: appData,
      COMANDAFLOW_DATA_ROOT: appData,
      COMANDAFLOW_ALLOW_MULTIPLE_INSTANCES: 'true',
    },
    windowsHide: true,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let output = '';
  const collect = (chunk) => { output = `${output}${chunk}`.slice(-20000); };
  child.stdout.on('data', collect);
  child.stderr.on('data', collect);

  try {
    const health = await waitForHealth(child);
    const capabilities = await fetch(`http://127.0.0.1:${port}/system/capabilities`).then((response) => response.json());
    const license = await fetch(`http://127.0.0.1:${port}/license/status`).then((response) => response.json());
    const expectedManager = mode === 'manager';
    if (capabilities.subscriptionManager !== expectedManager || health.status !== 'ok' || !license.valid) {
      throw new Error(`Validacao inesperada: ${JSON.stringify({ health, capabilities, license })}`);
    }

    if (expectedManager) {
      await postJson(`http://127.0.0.1:${port}/auth/setup`, {
        name: 'Proprietario de Validacao',
        email: 'owner@package.test',
        password: 'Package@Test123',
      }).then((response) => {
        if (!response.ok) throw new Error(`Setup empacotado falhou (${response.status}).`);
      });
      const login = await postJson(`http://127.0.0.1:${port}/auth/login`, {
        email: 'owner@package.test',
        password: 'Package@Test123',
      }).then((response) => response.json());
      const savedSettings = await putJson(`http://127.0.0.1:${port}/subscriptions/settings`, {
        publicServerUrl: 'https://assinaturas.package.test',
        offlineGraceHours: 24,
        syncIntervalMinutes: 1,
        defaultSuspensionMessage: 'Pagamento pendente. Entre em contato com o atendimento.',
      }, login.token);
      if (!savedSettings.ok) throw new Error(`Configuracao do servidor falhou (${savedSettings.status}).`);
      const subscriber = await postJson(`http://127.0.0.1:${port}/subscriptions/subscribers`, {
        businessName: 'Cliente Empacotado',
        email: 'subscriber@package.test',
      }, login.token).then((response) => response.json());
      const issued = await postJson(
        `http://127.0.0.1:${port}/subscriptions/subscribers/${subscriber.subscriber.id}/issue`,
        { plan: 'Mensal', days: 30, maxDevices: 1 },
        login.token
      ).then((response) => response.json());
      if (!issued.subscription?.licenseKey?.startsWith('CF3-')) {
        throw new Error('O Gestor empacotado nao emitiu uma chave valida.');
      }
      const syncPayload = {
        licenseKey: issued.subscription.licenseKey,
        installationId: 'package-installation-001',
        deviceName: 'Computador de Validacao',
      };
      const activeSync = await postJson(`http://127.0.0.1:${port}/license/sync`, syncPayload).then((response) => response.json());
      if (!activeSync.allowed) throw new Error('O servidor empacotado negou uma assinatura ativa.');
      const suspensionMessage = 'Pagamento pendente no teste empacotado.';
      const suspension = await postJson(
        `http://127.0.0.1:${port}/subscriptions/subscribers/${subscriber.subscriber.id}/suspend`,
        { mode: 'imediato', accessUntil: null, message: suspensionMessage },
        login.token
      );
      if (!suspension.ok) throw new Error(`Suspensao empacotada falhou (${suspension.status}).`);
      const blockedSync = await postJson(`http://127.0.0.1:${port}/license/sync`, syncPayload).then((response) => response.json());
      if (blockedSync.allowed || blockedSync.message !== suspensionMessage) {
        throw new Error('O bloqueio online nao foi aplicado pelo Gestor empacotado.');
      }
      const fakeInstaller = Buffer.from('MZPackaged update verification');
      const publication = await postJson(`http://127.0.0.1:${port}/updates/publish/start`, {
        version: '9.9.9',
        releaseNotes: 'Teste do distribuidor de atualizacoes empacotado.',
        mandatory: false,
        fileName: 'ComandaFlow-Setup-9.9.9.exe',
        size: fakeInstaller.length,
      }, login.token).then((response) => response.json());
      const upload = await putBinary(
        `http://127.0.0.1:${port}/updates/publish/${publication.uploadToken}`,
        fakeInstaller,
        login.token
      );
      if (!upload.ok) throw new Error(`Publicacao de atualizacao empacotada falhou (${upload.status}).`);
      const latestUpdate = await fetch(`http://127.0.0.1:${port}/updates/latest?currentVersion=2.3.0`).then((response) => response.json());
      if (!latestUpdate.available || latestUpdate.manifest?.version !== '9.9.9') {
        throw new Error('O Gestor empacotado nao anunciou a atualizacao publicada.');
      }
    } else {
      process.env.COMANDAFLOW_MANAGER_MODE = 'true';
      process.env.CF_LICENSE_PRIVATE_KEY_PATH = path.join(rootDir, '.secrets', 'license-private.pem');
      const licenseService = require(path.join(rootDir, 'backend', 'src', 'services', 'license.service'));
      const generated = licenseService.generateLicenseKey({
        licenseId: crypto.randomUUID(),
        subscriberId: crypto.randomUUID(),
        clientName: 'Cliente de Validacao',
        plan: 'Mensal',
        days: 30,
      });
      const activation = await postJson(`http://127.0.0.1:${port}/license/activate`, {
        licenseKey: generated.licenseKey,
      });
      if (!activation.ok) throw new Error(`Ativacao no cliente empacotado falhou (${activation.status}).`);
      const activeStatus = await fetch(`http://127.0.0.1:${port}/license/status`).then((response) => response.json());
      if (activeStatus.status !== 'ativo' || activeStatus.clientName !== 'Cliente de Validacao') {
        throw new Error('O cliente empacotado nao persistiu a assinatura ativada.');
      }
    }

    console.log(`[PACKAGE] ${mode} aprovado: health=ok, manager=${expectedManager}, fluxo de assinatura=ok`);
  } catch (error) {
    const folder = mode === 'manager' ? 'ComandaFlowGestor' : 'ComandaFlow';
    const logPath = path.join(appData, folder, 'comandaflow.log');
    const fileLog = fs.existsSync(logPath) ? fs.readFileSync(logPath, 'utf8').slice(-20000) : '';
    error.message = `${error.message}\nProcess output:\n${output}\nApplication log:\n${fileLog}`;
    throw error;
  } finally {
    await stopProcessTree(child);
    fs.rmSync(appData, { recursive: true, force: true, maxRetries: 10, retryDelay: 250 });
  }
}

main().catch((error) => {
  console.error(`[PACKAGE] ${error.stack || error.message}`);
  process.exit(1);
});
