const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { Readable, Transform } = require('stream');
const { pipeline } = require('stream/promises');
const prisma = require('../infra/prisma/client');
const licenseService = require('./license.service');

const PUBLISHED_KEY = 'publishedClientUpdate';
const MAX_UPDATE_BYTES = 500 * 1024 * 1024;
const pendingUploads = new Map();
let checkTimer = null;
const resolveCurrentVersion = () => {
  if (process.env.COMANDAFLOW_APP_VERSION) return process.env.COMANDAFLOW_APP_VERSION;
  try { return require('../../../package.json').version; } catch { return '0.0.0'; }
};

let clientState = {
  status: 'idle',
  currentVersion: resolveCurrentVersion(),
  checkedAt: null,
};

const isManagerMode = () => process.env.COMANDAFLOW_MANAGER_MODE === 'true';

const getUserDataDir = () => {
  if (process.env.COMANDAFLOW_USER_DATA) return process.env.COMANDAFLOW_USER_DATA;
  const appData = process.env.APPDATA
    || (process.platform === 'darwin'
      ? path.join(process.env.HOME || '.', 'Library', 'Application Support')
      : path.join(process.env.HOME || '.', '.config'));
  return path.join(appData, isManagerMode() ? 'ComandaFlowGestor' : 'ComandaFlow');
};

const getUpdatesDir = () => {
  const directory = path.join(getUserDataDir(), 'updates');
  fs.mkdirSync(directory, { recursive: true });
  return directory;
};

const normalizeVersion = (version) => String(version || '').trim().replace(/^v/i, '');
const versionParts = (version) => normalizeVersion(version).split('.').map(Number);
const compareVersions = (left, right) => {
  const a = versionParts(left);
  const b = versionParts(right);
  for (let index = 0; index < Math.max(a.length, b.length, 3); index += 1) {
    const difference = (a[index] || 0) - (b[index] || 0);
    if (difference) return difference;
  }
  return 0;
};

const hashFile = async (filePath) => {
  const hash = crypto.createHash('sha256');
  await pipeline(fs.createReadStream(filePath), new Transform({
    transform(chunk, encoding, callback) {
      hash.update(chunk);
      callback(null, chunk);
    },
  }), new Transform({ transform(chunk, encoding, callback) { callback(); } }));
  return hash.digest('hex');
};

const readPublished = async () => {
  const record = await prisma.systemSetting.findUnique({ where: { key: PUBLISHED_KEY } });
  if (!record) return null;
  try { return JSON.parse(record.value); } catch { return null; }
};

const startPublication = ({ version, releaseNotes, mandatory, fileName, size }) => {
  const upload = {
    token: crypto.randomUUID(),
    id: crypto.randomUUID(),
    version: normalizeVersion(version),
    releaseNotes: String(releaseNotes || '').trim(),
    mandatory: Boolean(mandatory),
    fileName: path.basename(String(fileName || 'ComandaFlow-Setup.exe')),
    size: Number(size),
    expiresAt: Date.now() + 30 * 60 * 1000,
  };
  pendingUploads.set(upload.token, upload);
  return { uploadToken: upload.token, expiresAt: new Date(upload.expiresAt).toISOString() };
};

const receivePublication = async (request, token) => {
  const upload = pendingUploads.get(token);
  if (!upload || upload.expiresAt < Date.now()) {
    pendingUploads.delete(token);
    const error = new Error('Envio expirado. Inicie a publicacao novamente.');
    error.status = 410;
    throw error;
  }
  pendingUploads.delete(token);

  const updatesDir = getUpdatesDir();
  const temporaryPath = path.join(updatesDir, `${upload.id}.upload`);
  const storageName = `ComandaFlow-Setup-${upload.version}-${upload.id.slice(0, 8)}.exe`;
  const finalPath = path.join(updatesDir, storageName);
  let received = 0;
  let firstBytes = Buffer.alloc(0);

  const inspector = new Transform({
    transform(chunk, encoding, callback) {
      received += chunk.length;
      if (firstBytes.length < 2) firstBytes = Buffer.concat([firstBytes, chunk]).subarray(0, 2);
      if (received > MAX_UPDATE_BYTES || received > upload.size) {
        callback(new Error('O arquivo enviado ultrapassou o tamanho informado.'));
        return;
      }
      callback(null, chunk);
    },
  });

  try {
    await pipeline(request, inspector, fs.createWriteStream(temporaryPath, { flags: 'wx' }));
    if (received !== upload.size) throw new Error('O envio terminou com tamanho diferente do arquivo selecionado.');
    if (firstBytes.toString('ascii') !== 'MZ') throw new Error('O arquivo enviado nao parece ser um instalador Windows valido.');

    const sha256 = await hashFile(temporaryPath);
    fs.renameSync(temporaryPath, finalPath);
    const publishedAt = new Date().toISOString();
    const manifest = {
      id: upload.id,
      product: 'ComandaFlow',
      version: upload.version,
      fileName: `ComandaFlow-Setup-${upload.version}.exe`,
      size: received,
      sha256,
      releaseNotes: upload.releaseNotes,
      mandatory: upload.mandatory,
      publishedAt,
    };
    const signature = licenseService.signUpdateManifest(manifest);
    const previous = await readPublished();
    const published = { manifest, signature, storageName };
    await prisma.systemSetting.upsert({
      where: { key: PUBLISHED_KEY },
      create: { key: PUBLISHED_KEY, value: JSON.stringify(published) },
      update: { value: JSON.stringify(published) },
    });

    if (previous?.storageName && previous.storageName !== storageName) {
      const previousPath = path.resolve(updatesDir, previous.storageName);
      if (previousPath.startsWith(`${path.resolve(updatesDir)}${path.sep}`)) {
        fs.rmSync(previousPath, { force: true });
      }
    }
    return { manifest, signature };
  } catch (error) {
    fs.rmSync(temporaryPath, { force: true });
    fs.rmSync(finalPath, { force: true });
    error.status = error.status || 400;
    throw error;
  }
};

const getPublished = async () => {
  const published = await readPublished();
  if (!published) return null;
  const filePath = path.resolve(getUpdatesDir(), published.storageName);
  if (!filePath.startsWith(`${path.resolve(getUpdatesDir())}${path.sep}`) || !fs.existsSync(filePath)) {
    return null;
  }
  return { ...published, filePath };
};

const getLatest = async (currentVersion) => {
  const published = await getPublished();
  if (!published) return { available: false };
  return {
    available: compareVersions(published.manifest.version, currentVersion) > 0,
    manifest: published.manifest,
    signature: published.signature,
  };
};

const getPublishedFile = async (id) => {
  const published = await getPublished();
  if (!published || published.manifest.id !== id) return null;
  return published;
};

const publicClientState = () => {
  const { serverUrl, downloadPath, signature, ...safeState } = clientState;
  return safeState;
};

const downloadedStatePath = () => path.join(getUpdatesDir(), 'downloaded-update.json');
const saveDownloadedState = () => {
  if (!clientState.manifest || !clientState.downloadPath || !clientState.signature) return;
  fs.writeFileSync(downloadedStatePath(), JSON.stringify({
    manifest: clientState.manifest,
    signature: clientState.signature,
    downloadPath: clientState.downloadPath,
  }), { mode: 0o600 });
};

const loadDownloadedState = () => {
  try {
    const stored = JSON.parse(fs.readFileSync(downloadedStatePath(), 'utf8'));
    if (
      fs.existsSync(stored.downloadPath)
      && licenseService.verifyUpdateManifest(stored.manifest, stored.signature)
      && compareVersions(stored.manifest.version, clientState.currentVersion) > 0
    ) {
      clientState = { ...clientState, ...stored, status: 'ready', progress: 100 };
      return;
    }
    const updatesDir = path.resolve(getUpdatesDir());
    const storedPath = path.resolve(String(stored.downloadPath || ''));
    if (storedPath.startsWith(`${updatesDir}${path.sep}`)) {
      fs.rmSync(storedPath, { force: true });
    }
    fs.rmSync(downloadedStatePath(), { force: true });
  } catch {
    // Ainda não existe uma atualização baixada válida.
  }
};

const getOnlineLicense = () => {
  const record = licenseService.getActiveLicenseRecord();
  if (!record?.licenseKey) return null;
  const verified = licenseService.verifyLicenseKey(record.licenseKey);
  return verified.serverUrl ? verified : null;
};

const checkNow = async () => {
  if (isManagerMode()) return publicClientState();
  const onlineLicense = getOnlineLicense();
  if (!onlineLicense) {
    clientState = { ...clientState, status: 'unsupported', checkedAt: new Date().toISOString() };
    return publicClientState();
  }

  try {
    const response = await fetch(`${onlineLicense.serverUrl}/updates/latest?currentVersion=${encodeURIComponent(clientState.currentVersion)}`, {
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) throw new Error(`Servidor respondeu ${response.status}.`);
    const result = await response.json();
    if (!result.available) {
      if (clientState.status !== 'ready') {
        clientState = { status: 'upToDate', currentVersion: clientState.currentVersion, checkedAt: new Date().toISOString() };
      }
      return publicClientState();
    }
    if (!result.manifest || !result.signature || !licenseService.verifyUpdateManifest(result.manifest, result.signature)) {
      throw new Error('A assinatura digital da atualizacao e invalida.');
    }
    if (compareVersions(result.manifest.version, clientState.currentVersion) <= 0) {
      throw new Error('O servidor retornou uma versao de atualizacao inconsistente.');
    }
    if (clientState.status === 'ready' && clientState.manifest?.id === result.manifest.id) {
      clientState.checkedAt = new Date().toISOString();
      return publicClientState();
    }
    clientState = {
      status: 'available',
      currentVersion: clientState.currentVersion,
      manifest: result.manifest,
      signature: result.signature,
      serverUrl: onlineLicense.serverUrl,
      progress: 0,
      checkedAt: new Date().toISOString(),
    };
  } catch (error) {
    if (!['ready', 'downloading'].includes(clientState.status)) {
      clientState = { ...clientState, status: 'checkError', error: error.message, checkedAt: new Date().toISOString() };
    }
  }
  return publicClientState();
};

const performDownload = async () => {
  const { manifest, signature, serverUrl } = clientState;
  const partialPath = path.join(getUpdatesDir(), `${manifest.id}.part`);
  const finalPath = path.join(getUpdatesDir(), manifest.fileName);
  try {
    const response = await fetch(`${serverUrl}/updates/download/${encodeURIComponent(manifest.id)}`, {
      signal: AbortSignal.timeout(30 * 60 * 1000),
    });
    if (!response.ok || !response.body) throw new Error(`Servidor respondeu ${response.status}.`);
    let received = 0;
    const progress = new Transform({
      transform(chunk, encoding, callback) {
        received += chunk.length;
        clientState.progress = Math.min(99, Math.round((received / manifest.size) * 100));
        callback(null, chunk);
      },
    });
    await pipeline(Readable.fromWeb(response.body), progress, fs.createWriteStream(partialPath));
    if (received !== manifest.size) throw new Error('O arquivo baixado esta incompleto.');
    const sha256 = await hashFile(partialPath);
    if (sha256 !== manifest.sha256) throw new Error('O arquivo baixado foi alterado ou esta corrompido.');
    fs.rmSync(finalPath, { force: true });
    fs.renameSync(partialPath, finalPath);
    clientState = {
      ...clientState,
      status: 'ready',
      progress: 100,
      signature,
      downloadPath: finalPath,
      downloadedAt: new Date().toISOString(),
    };
    saveDownloadedState();
  } catch (error) {
    fs.rmSync(partialPath, { force: true });
    clientState = { ...clientState, status: 'downloadError', error: error.message, progress: 0 };
  }
};

const beginDownload = async () => {
  if (clientState.status === 'downloading') return publicClientState();
  if (!clientState.manifest || !clientState.serverUrl) {
    const error = new Error('Nenhuma atualizacao disponivel para baixar.');
    error.status = 400;
    throw error;
  }
  clientState = { ...clientState, status: 'downloading', error: null, progress: 0 };
  performDownload();
  return publicClientState();
};

const installDownloaded = async () => {
  if (clientState.status !== 'ready' || !clientState.downloadPath || !fs.existsSync(clientState.downloadPath)) {
    const error = new Error('A atualizacao ainda nao terminou de baixar.');
    error.status = 400;
    throw error;
  }
  if (!licenseService.verifyUpdateManifest(clientState.manifest, clientState.signature)) {
    const error = new Error('A assinatura digital da atualizacao e invalida.');
    error.status = 400;
    throw error;
  }
  const sha256 = await hashFile(clientState.downloadPath);
  if (sha256 !== clientState.manifest.sha256) {
    const error = new Error('O instalador baixado foi alterado ou esta corrompido.');
    error.status = 400;
    throw error;
  }

  const child = spawn(clientState.downloadPath, [], {
    detached: true,
    stdio: 'ignore',
    windowsHide: false,
  });
  await new Promise((resolve, reject) => {
    child.once('spawn', resolve);
    child.once('error', reject);
  });
  child.unref();
  clientState.status = 'installing';
  setTimeout(() => {
    try {
      const electron = require('electron');
      if (electron?.app?.quit) electron.app.quit();
      else process.exit(0);
    } catch {
      process.exit(0);
    }
  }, 1200);
  return publicClientState();
};

const scheduleCheck = () => {
  clearTimeout(checkTimer);
  checkTimer = setTimeout(async () => {
    await checkNow();
    scheduleCheck();
  }, 10 * 60 * 1000);
  checkTimer.unref?.();
};

const start = () => {
  if (isManagerMode()) return;
  loadDownloadedState();
  clearTimeout(checkTimer);
  checkTimer = setTimeout(async () => {
    await checkNow();
    scheduleCheck();
  }, 5000);
  checkTimer.unref?.();
};

module.exports = {
  beginDownload,
  checkNow,
  compareVersions,
  getClientState: publicClientState,
  getLatest,
  getPublished,
  getPublishedFile,
  installDownloaded,
  receivePublication,
  start,
  startPublication,
};
