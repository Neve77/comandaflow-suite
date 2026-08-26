const fs = require('fs');
const nodeHttp = require('http');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { app, BrowserWindow, shell } = require('electron');

const managerMode = process.env.COMANDAFLOW_MANAGER_MODE === 'true';
const productName = managerMode ? 'ComandaFlow Gestor' : 'ComandaFlow';
const dataFolderName = managerMode ? 'ComandaFlowGestor' : 'ComandaFlow';

// O nome interno tambem identifica o bloqueio de instancia unica no Windows.
// Sem esta separacao, abrir o Gestor fazia o Restaurante encerrar imediatamente.
app.setName(productName);

// Mantém logs, banco e armazenamento do Chromium em uma pasta gravável do usuário.
const applicationDataRoot = process.env.COMANDAFLOW_DATA_ROOT || app.getPath('appData');
const userDataPath = path.join(applicationDataRoot, dataFolderName);
const cachePath = path.join(userDataPath, 'Cache');

// Os parâmetros precisam ser definidos antes de o Electron inicializar o Chromium.
process.env.ELECTRON_DISABLE_GPU = '1';
process.env.ELECTRON_OZONE_PLATFORM_HINT = 'auto';

try {
  fs.mkdirSync(userDataPath, { recursive: true });
} catch (err) {
  console.error(`[STARTUP] ERROR creating userData dir: ${err.message}`);
}

try {
  fs.mkdirSync(cachePath, { recursive: true });
} catch (err) {
  console.error(`[STARTUP] ERROR creating cache dir: ${err.message}`);
}

app.setPath('userData', userDataPath);
process.env.COMANDAFLOW_USER_DATA = userDataPath;
process.env.COMANDAFLOW_APP_VERSION = app.getVersion();
app.commandLine.appendSwitch('cache-dir', cachePath);
app.commandLine.appendSwitch('disable-gpu');
app.commandLine.appendSwitch('disable-gpu-compositing');

app.setAppUserModelId(managerMode ? 'com.orqium.comandaflow.manager' : 'com.orqium.comandaflow');

app.disableHardwareAcceleration();

// O arquivo persistente registra falhas mesmo quando o aplicativo é aberto pelo atalho.
const logFilePath = path.join(userDataPath, 'comandaflow.log');
let logStream = null;
try {
  logStream = fs.createWriteStream(logFilePath, { flags: 'a' });
} catch (e) {
  console.error(`[STARTUP] ERROR creating log stream: ${e.message}`);
  logStream = null;
}

function writeLog(prefix, msg) {
  const safeMessage = String(msg || '')
    .replace(/Bearer\s+[A-Za-z0-9._-]+/gi, 'Bearer [PROTEGIDO]')
    .replace(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, '[TOKEN_PROTEGIDO]')
    .replace(/("?(?:password|senha|token|secret)"?\s*[:=]\s*)[^,\s}]+/gi, '$1[PROTEGIDO]');
  const line = `[${new Date().toISOString()}] ${prefix} ${safeMessage}\n`;
  try { if (logStream) logStream.write(line); } catch (e) {}
  try { process.stdout.write(line); } catch (e) {}
}

function resolveDesktopTemplatePath() {
  const candidates = [
    path.join(__dirname, 'backend', 'prisma', 'desktop-template.db'),
    path.join(app.getAppPath(), 'backend', 'prisma', 'desktop-template.db'),
  ];

  return candidates.find((candidate) => fs.existsSync(candidate)) || null;
}

function readOrCreateRuntimeConfig(configPath) {
  try {
    if (fs.existsSync(configPath)) {
      const parsed = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      if (typeof parsed.jwtSecret === 'string' && parsed.jwtSecret.length >= 32) {
        if (!parsed.installationId) {
          parsed.schemaVersion = 2;
          parsed.installationId = crypto.randomUUID();
          fs.writeFileSync(configPath, `${JSON.stringify(parsed, null, 2)}\n`, { mode: 0o600 });
        }
        return parsed;
      }
    }
  } catch (error) {
    writeLog('[runtime][warn]', `Não foi possível ler a configuração local: ${error.message}`);
  }

  const config = {
    schemaVersion: 2,
    jwtSecret: crypto.randomBytes(48).toString('base64url'),
    installationId: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  };
  fs.writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`, { mode: 0o600 });
  return config;
}

function initializeDesktopRuntime() {
  const dataPath = path.join(userDataPath, 'data');
  const databasePath = path.join(dataPath, 'comandaflow.db');
  const configPath = path.join(dataPath, 'runtime-config.json');
  fs.mkdirSync(dataPath, { recursive: true });

  if (!fs.existsSync(databasePath)) {
    const templatePath = resolveDesktopTemplatePath();
    if (!templatePath) {
      throw new Error('Banco inicial do aplicativo não encontrado no pacote.');
    }
    fs.copyFileSync(templatePath, databasePath, fs.constants.COPYFILE_EXCL);
  }

  const config = readOrCreateRuntimeConfig(configPath);
  process.env.DATABASE_URL = `file:${databasePath.replace(/\\/g, '/')}`;
  process.env.JWT_SECRET = config.jwtSecret;
  process.env.COMANDAFLOW_INSTALLATION_ID = config.installationId;
  process.env.NODE_ENV = 'production';
  process.env.FRONTEND_URL = 'file://';
  process.env.COMANDAFLOW_DESKTOP = 'true';
}

function cleanupLegacyCacheDirectories() {
  const cleanupFolders = ['GPUCache', 'Code Cache', 'Service Worker', 'Cache'];
  const basePath = app.getPath('userData');
  for (const folder of cleanupFolders) {
    const candidate = path.join(basePath, folder);
    try {
      if (fs.existsSync(candidate)) {
        fs.rmSync(candidate, { recursive: true, force: true });
      }
    } catch (err) {
      writeLog('[cleanup][err]', `Falha ao remover cache antigo: ${err.message}`);
    }
  }
}

function loadErrorPage(message) {
  if (!mainWindow) return;
  const safeHtml = `data:text/html;charset=utf-8,${encodeURIComponent(`
    <html><head><meta charset="UTF-8"><title>Erro ComandaFlow</title></head>
    <body style="background:#111;color:#fff;font-family:system-ui,sans-serif;display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;margin:0;">
      <h1 style="margin:0 0 16px;font-size:28px;">Erro ao carregar o aplicativo</h1>
      <p style="max-width:500px;line-height:1.6;font-size:16px;">${message}</p>
      <p style="margin-top:24px;color:#999;font-size:14px;">Verifique se o backend e o frontend estão corretos e reinicie o aplicativo.</p>
    </body></html>
  `)}`;
  mainWindow.loadURL(safeHtml).catch(() => {});
}

function resolveIndexPath() {
  const appPath = app.isPackaged ? app.getAppPath() : __dirname;
  const candidatePaths = [
    path.join(__dirname, 'frontend', 'dist', 'index.html'),
    path.join(__dirname, 'dist', 'index.html'),
    path.join(appPath, 'frontend', 'dist', 'index.html'),
  ];

  for (const p of candidatePaths) {
    try {
      if (fs.existsSync(p)) {
        return p;
      }
    } catch {
    }
  }

  return null;
}

const backendPort = process.env.PORT || (managerMode ? '3012' : '3002');
const startUrl = process.env.ELECTRON_START_URL;
const isDev = Boolean(startUrl);

const iconPath = path.join(__dirname, 'build', 'icon.png');

let mainWindow = null;

function getBackendCapabilities(port) {
  return new Promise((resolve) => {
    const request = nodeHttp.get(
      {
        hostname: '127.0.0.1',
        port,
        path: '/system/capabilities',
        timeout: 1200,
      },
      (response) => {
        let body = '';
        response.setEncoding('utf8');
        response.on('data', (chunk) => { body += chunk; });
        response.on('end', () => {
          if (response.statusCode < 200 || response.statusCode >= 300) return resolve(null);
          try { return resolve(JSON.parse(body)); } catch { return resolve(null); }
        });
      }
    );

    request.on('timeout', () => {
      request.destroy();
      resolve(null);
    });
    request.on('error', () => resolve(null));
  });
}

// O Gestor e o Restaurante usam o mesmo pacote-base do Electron. No Windows,
// isso faz o bloqueio nativo tratar os dois produtos como a mesma instancia.
// O Restaurante reutiliza com seguranca o backend da porta 3002 quando aberto
// novamente; por isso ele nao participa do bloqueio mantido pelo Gestor.
const allowMultipleInstances = !managerMode || process.env.COMANDAFLOW_ALLOW_MULTIPLE_INSTANCES === 'true';
const gotLock = allowMultipleInstances || (app.requestSingleInstanceLock && app.requestSingleInstanceLock());
if (!gotLock) {
  try { writeLog('[app]', 'Outra instância detectada — saindo.'); } catch (e) {}
  app.quit();
}

if (gotLock) {
  app.on('second-instance', (event, argv, workingDirectory) => {
    try { writeLog('[app]', 'Segunda instância solicitada — focando janela existente.'); } catch (e) {}
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}

function createWindow() {
  const browserOptions = {
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 680,
    show: false,
    title: `${productName} — by Orqium`,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  };

  if (fs.existsSync(iconPath)) {
    browserOptions.icon = iconPath;
  }

  mainWindow = new BrowserWindow(browserOptions);

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    try {
      const target = new URL(url);
      if (target.protocol === 'https:' && target.hostname === 'wa.me') {
        shell.openExternal(target.toString()).catch((error) => {
          writeLog('[navigation][warn]', `Não foi possível abrir o WhatsApp: ${error.message}`);
        });
      }
    } catch (error) {
      writeLog('[navigation][warn]', `URL externa inválida bloqueada: ${error.message}`);
    }
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.maximize();
    mainWindow.show();
    mainWindow.focus();
  });

  mainWindow.webContents.on('crashed', () => {
    writeLog('[renderer][err]', 'O processo da interface foi encerrado inesperadamente.');
  });

  mainWindow.webContents.on('unresponsive', () => {
    writeLog('[renderer][warn]', 'A interface deixou de responder.');
  });

  mainWindow.webContents.on('console-message', (event, detailsOrLevel, legacyMessage, line, sourceId) => {
    const details = detailsOrLevel && typeof detailsOrLevel === 'object'
      ? detailsOrLevel
      : { level: detailsOrLevel, message: legacyMessage, lineNumber: line, sourceId };
    const isError = details.level === 'error' || Number(details.level) >= 2;
    if (isError) {
      writeLog('[renderer][console]', `${details.message || 'Erro sem mensagem'} (${details.sourceId || 'interface'}:${details.lineNumber || 0})`);
    }
  });

  mainWindow.webContents.on('render-process-gone', (event, details) => {
    writeLog('[renderer][gone]', `${details.reason || 'unknown'} · código ${details.exitCode ?? 'desconhecido'}`);
  });

  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
    writeLog('[main][err]', `Falha ao carregar URL: ${validatedURL} ${errorCode} ${errorDescription}`);
    loadErrorPage('O frontend não foi carregado corretamente. Isso pode ocorrer se o backend não estiver disponível ou se o build do frontend estiver ausente.');
  });

  if (isDev) {
    mainWindow.loadURL(startUrl).catch((err) => {
      writeLog('[main][err]', `Erro ao carregar DEV URL: ${err}`);
      loadErrorPage('Não foi possível carregar a URL de desenvolvimento do frontend.');
    });
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    const indexToLoad = resolveIndexPath();
    if (indexToLoad) {
      mainWindow.loadFile(indexToLoad, { query: { apiPort: String(backendPort) } }).catch((err) => {
        writeLog('[main][err]', `Erro ao carregar arquivo index.html: ${err}`);
        loadErrorPage('Não foi possível carregar o build do frontend.');
      });
    } else {
      writeLog('[main][err]', 'index.html não encontrado em nenhum caminho candidato');
      loadErrorPage('O arquivo do frontend não foi encontrado no pacote.');
    }
  }
}

async function startBackend() {
  const existingBackend = await getBackendCapabilities(backendPort);
  if (existingBackend) {
    const expectedVersion = app.getVersion();
    const sameMode = Boolean(existingBackend.subscriptionManager) === managerMode;
    const sameVersion = existingBackend.appVersion === expectedVersion;
    if (!sameMode || !sameVersion) {
      throw new Error(`Existe outra versão do ComandaFlow usando a porta ${backendPort}. Feche todas as janelas do aplicativo e abra novamente.`);
    }
    writeLog('[backend]', `Backend ${expectedVersion} ja esta ativo em http://127.0.0.1:${backendPort}; reutilizando processo existente.`);
    return;
  }

  const appBasePath = __dirname;
  
  // A localização do backend varia entre desenvolvimento e o pacote do electron-builder.
  let serverPath;
  let backendNodeModules;
  
  if (app.isPackaged) {
    serverPath = path.join(app.getAppPath(), 'backend', 'src', 'server.js');
    backendNodeModules = path.join(process.resourcesPath, 'app', 'backend', 'node_modules');
  } else {
    serverPath = path.join(appBasePath, 'backend', 'src', 'server.js');
    backendNodeModules = path.join(appBasePath, 'backend', 'node_modules');
  }

  if (!fs.existsSync(serverPath)) {
    writeLog('[backend][err]', `Arquivo do backend não encontrado: ${serverPath}`);
    if (mainWindow) {
      loadErrorPage('O backend não foi encontrado no pacote. Verifique a instalação ou o build do aplicativo.');
    }
    return;
  }

  try {
    if (fs.existsSync(backendNodeModules)) {
      // Disponibiliza as dependências empacotadas ao resolvedor de módulos do backend.
      const Module = require('module');
      if (!require.main.paths.includes(backendNodeModules)) {
        require.main.paths.unshift(backendNodeModules);
      }
      if (!Module.globalPaths.includes(backendNodeModules)) {
        Module.globalPaths.unshift(backendNodeModules);
      }
      process.env.NODE_PATH = [backendNodeModules, process.env.NODE_PATH]
        .filter(Boolean)
        .join(path.delimiter);
      Module._initPaths();
    } else {
      writeLog('[backend][warn]', 'Dependências do backend não foram encontradas no pacote.');
    }

    process.env.PORT = backendPort;
    require(serverPath);
    writeLog('[backend]', 'Backend iniciado no mesmo processo Electron.');
  } catch (error) {
    writeLog('[backend][err]', `Erro ao iniciar backend: ${error.stack || error.message}`);
    if (mainWindow) {
      loadErrorPage('Falha ao iniciar o backend.');
    }
  }
}

if (gotLock) {
app.whenReady().then(() => {
  cleanupLegacyCacheDirectories();

  if (app.isPackaged) {
    initializeDesktopRuntime();
  }

  let splashWindow = new BrowserWindow({
    width: 420,
    height: 260,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: false,
    center: true,
    show: false,
    skipTaskbar: true,
    icon: fs.existsSync(iconPath) ? iconPath : undefined,
  });

  const splashHtml = `data:text/html;charset=utf-8,${encodeURIComponent(`
    <!DOCTYPE html>
    <html>
    <head><meta charset="UTF-8"><style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body {
        width: 420px; height: 260px;
        background: linear-gradient(135deg, #0c1222 0%, #0f172a 100%);
        display: flex; flex-direction: column;
        align-items: center; justify-content: center; gap: 18px;
        font-family: -apple-system, 'Segoe UI', system-ui, sans-serif;
        border-radius: 16px; overflow: hidden;
        border: 1px solid rgba(255,255,255,0.08);
        box-shadow: 0 40px 120px rgba(0,0,0,0.8);
      }
      .logo-ring {
        position: relative;
        width: 72px; height: 72px;
        display: flex; align-items: center; justify-content: center;
      }
      .logo-ring::before {
        content: '';
        position: absolute; inset: 0;
        border-radius: 50%;
        border: 3px solid rgba(16,185,129,0.15);
        border-top-color: #10b981;
        animation: spin 1s linear infinite;
      }
      .logo-box {
        width: 52px; height: 52px; border-radius: 13px;
        background: linear-gradient(135deg, #10b981, #059669);
        display: flex; align-items: center; justify-content: center;
        font-size: 18px; font-weight: 900; color: white;
        box-shadow: 0 4px 20px rgba(16,185,129,0.35);
      }
      .texts { text-align: center; }
      .app-name {
        font-size: 18px; font-weight: 800; color: #fff;
        letter-spacing: -0.4px;
      }
      .by-line {
        font-size: 11px; color: rgba(100,116,139,0.8);
        font-weight: 500; margin-top: 3px;
      }
      .loading-bar {
        width: 160px; height: 3px;
        background: rgba(255,255,255,0.08);
        border-radius: 99px; overflow: hidden; margin-top: 8px;
      }
      .loading-bar-fill {
        height: 100%;
        background: linear-gradient(90deg, #10b981, #34d399);
        border-radius: 99px;
        animation: loading 2.5s ease-in-out forwards;
      }
      @keyframes spin {
        to { transform: rotate(360deg); }
      }
      @keyframes loading {
        0%   { width: 0%; }
        40%  { width: 55%; }
        80%  { width: 82%; }
        100% { width: 95%; }
      }
    </style></head>
    <body>
      <div class="logo-ring">
        <div class="logo-box">CF</div>
      </div>
      <div class="texts">
        <div class="app-name">${productName}</div>
        <div class="by-line">by Orqium &mdash; Iniciando...</div>
        <div class="loading-bar"><div class="loading-bar-fill"></div></div>
      </div>
    </body></html>
  `)}`;

  splashWindow.loadURL(splashHtml).catch(() => {});
  splashWindow.once('ready-to-show', () => splashWindow.show());

  return startBackend().then(() => {
    createWindow();
    mainWindow.once('ready-to-show', () => {
      setTimeout(() => {
        if (splashWindow && !splashWindow.isDestroyed()) splashWindow.close();
      }, 400);
    });
  });
}).catch((error) => {
  writeLog('[startup][err]', `Falha ao inicializar: ${error.message}`);
  createWindow();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
}
