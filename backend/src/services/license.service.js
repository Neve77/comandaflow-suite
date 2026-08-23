const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const DAY_MS = 24 * 60 * 60 * 1000;
const TRIAL_DAYS = 14;

const isManagerMode = () => process.env.COMANDAFLOW_MANAGER_MODE === 'true';

const getStorageDir = () => {
  const appData = process.env.APPDATA
    || (process.platform === 'darwin'
      ? path.join(process.env.HOME || '.', 'Library', 'Application Support')
      : path.join(process.env.HOME || '.', '.config'));
  const folder = isManagerMode() ? 'ComandaFlowGestor' : 'ComandaFlow';
  const baseDir = path.join(appData, folder);
  fs.mkdirSync(baseDir, { recursive: true });
  return baseDir;
};

const resolveKey = ({ environmentValue, candidates, label }) => {
  if (environmentValue) {
    if (environmentValue.includes('BEGIN')) return environmentValue;
    if (fs.existsSync(environmentValue)) return fs.readFileSync(environmentValue, 'utf8');
  }

  const found = candidates.find((candidate) => fs.existsSync(candidate));
  if (!found) throw new Error(`${label} nao encontrada. Execute npm run prepare:licenses.`);
  return fs.readFileSync(found, 'utf8');
};

const getPublicKey = () => {
  const rootDir = path.resolve(__dirname, '..', '..', '..');
  return resolveKey({
    environmentValue: process.env.CF_LICENSE_PUBLIC_KEY,
    candidates: [
      path.join(rootDir, 'build', 'license-public.pem'),
      path.join(process.resourcesPath || rootDir, 'app', 'build', 'license-public.pem'),
    ],
    label: 'Chave publica de licenciamento',
  });
};

const getPrivateKey = () => {
  if (!isManagerMode()) {
    throw new Error('A emissao de licencas so esta disponivel no ComandaFlow Gestor.');
  }

  const rootDir = path.resolve(__dirname, '..', '..', '..');
  return resolveKey({
    environmentValue: process.env.CF_LICENSE_PRIVATE_KEY_PATH || process.env.CF_LICENSE_PRIVATE_KEY,
    candidates: [path.join(rootDir, '.secrets', 'license-private.pem')],
    label: 'Chave privada do gestor',
  });
};

const encode = (value) => Buffer.from(value).toString('base64url');
const decode = (value) => Buffer.from(value, 'base64url');
const canonicalManifest = (manifest) => JSON.stringify(
  Object.keys(manifest).sort().reduce((result, key) => {
    result[key] = manifest[key];
    return result;
  }, {})
);

const signUpdateManifest = (manifest) => crypto
  .sign(null, Buffer.from(canonicalManifest(manifest)), getPrivateKey())
  .toString('base64url');

const verifyUpdateManifest = (manifest, signature) => crypto.verify(
  null,
  Buffer.from(canonicalManifest(manifest)),
  getPublicKey(),
  decode(signature)
);

const generateLicenseKey = ({
  licenseId,
  subscriberId,
  clientName,
  days = 30,
  plan = 'Mensal',
  startsAt = new Date(),
  expiresAt,
  maxDevices = 1,
  serverUrl,
  offlineGraceHours = 24,
  syncIntervalMinutes = 1,
}) => {
  const start = new Date(startsAt);
  const end = expiresAt ? new Date(expiresAt) : new Date(start.getTime() + Number(days) * DAY_MS);
  const payload = {
    version: serverUrl ? 3 : 2,
    licenseId,
    subscriberId,
    clientName: String(clientName || 'Cliente ComandaFlow').trim(),
    plan: String(plan || 'Mensal'),
    issuedAt: Date.now(),
    startsAt: start.getTime(),
    expiresAt: end.getTime(),
    maxDevices: Math.max(1, Number(maxDevices) || 1),
    serverUrl: serverUrl ? String(serverUrl).replace(/\/$/, '') : null,
    offlineGraceHours: Math.max(1, Number(offlineGraceHours) || 24),
    syncIntervalMinutes: Math.max(1, Number(syncIntervalMinutes) || 1),
  };

  const payloadB64 = encode(JSON.stringify(payload));
  const signature = crypto.sign(null, Buffer.from(payloadB64), getPrivateKey()).toString('base64url');
  const licenseKey = `CF${payload.version}-${payloadB64}.${signature}`;

  return {
    licenseKey,
    clientName: payload.clientName,
    plan: payload.plan,
    issuedAt: new Date(payload.issuedAt).toISOString(),
    validUntil: end.toISOString(),
    days: Math.max(1, Math.ceil((end.getTime() - start.getTime()) / DAY_MS)),
    maxDevices: payload.maxDevices,
    serverUrl: payload.serverUrl,
  };
};

const verifyLicenseKey = (licenseKey) => {
  const raw = String(licenseKey || '').trim();
  const prefix = raw.match(/^CF([23])-/);
  if (!prefix) throw new Error('Formato de chave de licenca invalido.');

  const parts = raw.slice(prefix[0].length).split('.');
  if (parts.length !== 2) throw new Error('Chave de licenca corrompida.');

  const [payloadB64, signatureB64] = parts;
  const authentic = crypto.verify(
    null,
    Buffer.from(payloadB64),
    getPublicKey(),
    decode(signatureB64)
  );
  if (!authentic) throw new Error('Chave de licenca invalida ou adulterada.');

  let payload;
  try {
    payload = JSON.parse(decode(payloadB64).toString('utf8'));
  } catch {
    throw new Error('Dados da licenca invalidos.');
  }

  if (![2, 3].includes(payload.version) || !payload.licenseId || !payload.expiresAt) {
    throw new Error('Versao ou dados da licenca invalidos.');
  }

  const now = Date.now();
  const startsAt = Number(payload.startsAt || payload.issuedAt);
  const expiresAt = Number(payload.expiresAt);
  const notStarted = now < startsAt;
  const isExpired = now > expiresAt;

  return {
    valid: !notStarted && !isExpired,
    isExpired,
    notStarted,
    licenseId: payload.licenseId,
    subscriberId: payload.subscriberId,
    clientName: payload.clientName,
    plan: payload.plan,
    issuedAt: new Date(payload.issuedAt).toISOString(),
    startsAt: new Date(startsAt).toISOString(),
    validUntil: new Date(expiresAt).toISOString(),
    daysRemaining: Math.max(0, Math.ceil((expiresAt - now) / DAY_MS)),
    maxDevices: payload.maxDevices,
    serverUrl: payload.serverUrl || null,
    offlineGraceHours: Math.max(1, Number(payload.offlineGraceHours) || 24),
    syncIntervalMinutes: Math.max(1, Number(payload.syncIntervalMinutes) || 1),
  };
};

const getEncryptionKey = () => {
  const runtimeSecret = process.env.JWT_SECRET;
  if (!runtimeSecret || runtimeSecret.length < 32) throw new Error('Segredo local do aplicativo indisponivel.');
  return crypto.createHash('sha256').update(`comandaflow-license-v2|${runtimeSecret}`).digest();
};

const encryptRecord = (data) => {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', getEncryptionKey(), iv);
  const encrypted = Buffer.concat([
    cipher.update(JSON.stringify(data), 'utf8'),
    cipher.final(),
  ]);
  return {
    version: 2,
    iv: iv.toString('base64url'),
    tag: cipher.getAuthTag().toString('base64url'),
    data: encrypted.toString('base64url'),
  };
};

const decryptRecord = (stored) => {
  const decipher = crypto.createDecipheriv('aes-256-gcm', getEncryptionKey(), decode(stored.iv));
  decipher.setAuthTag(decode(stored.tag));
  return JSON.parse(Buffer.concat([
    decipher.update(decode(stored.data)),
    decipher.final(),
  ]).toString('utf8'));
};

const saveActiveLicense = (licenseKey) => {
  const verified = verifyLicenseKey(licenseKey);
  if (!verified.valid) {
    throw new Error(verified.notStarted ? 'A assinatura ainda nao iniciou.' : 'A assinatura esta expirada.');
  }

  const stored = encryptRecord({ licenseKey, activatedAt: new Date().toISOString() });
  fs.writeFileSync(path.join(getStorageDir(), 'license-v2.json'), JSON.stringify(stored), { mode: 0o600 });
  fs.rmSync(path.join(getStorageDir(), 'remote-license-state.json'), { force: true });
  return verified;
};

const getActiveLicenseRecord = () => {
  const filePath = path.join(getStorageDir(), 'license-v2.json');
  if (!fs.existsSync(filePath)) return null;

  const stored = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  return decryptRecord(stored);
};

const readActiveLicense = () => getActiveLicenseRecord()?.licenseKey || null;

const saveRemoteLicenseState = (state) => {
  const stored = encryptRecord(state);
  fs.writeFileSync(
    path.join(getStorageDir(), 'remote-license-state.json'),
    JSON.stringify(stored),
    { mode: 0o600 }
  );
};

const getRemoteLicenseState = () => {
  const filePath = path.join(getStorageDir(), 'remote-license-state.json');
  if (!fs.existsSync(filePath)) return null;
  return decryptRecord(JSON.parse(fs.readFileSync(filePath, 'utf8')));
};

const trialSignature = (trial) => crypto
  .createHmac('sha256', getEncryptionKey())
  .update(`${trial.createdAt}|${trial.expiresAt}`)
  .digest('base64url');

const getTrialStatus = () => {
  const trialPath = path.join(getStorageDir(), 'trial.json');
  let trial;
  if (!fs.existsSync(trialPath)) {
    const createdAt = Date.now();
    trial = { createdAt, expiresAt: createdAt + TRIAL_DAYS * DAY_MS };
    trial.signature = trialSignature(trial);
    fs.writeFileSync(trialPath, JSON.stringify(trial), { mode: 0o600 });
  } else {
    trial = JSON.parse(fs.readFileSync(trialPath, 'utf8'));
  }

  if (trial.signature !== trialSignature(trial)) {
    throw new Error('Dados do periodo de avaliacao foram alterados.');
  }

  const now = Date.now();
  const isExpired = now > Number(trial.expiresAt);
  return {
    status: isExpired ? 'expirado' : 'avaliacao',
    valid: !isExpired,
    isExpired,
    clientName: 'Periodo de avaliacao',
    plan: `Avaliacao de ${TRIAL_DAYS} dias`,
    issuedAt: new Date(trial.createdAt).toISOString(),
    validUntil: new Date(trial.expiresAt).toISOString(),
    daysRemaining: Math.max(0, Math.ceil((Number(trial.expiresAt) - now) / DAY_MS)),
    trial: true,
  };
};

const getLicenseStatus = () => {
  if (isManagerMode()) {
    return {
      status: 'gestor',
      valid: true,
      isExpired: false,
      clientName: 'ComandaFlow Gestor',
      plan: 'Painel do proprietario',
      daysRemaining: null,
    };
  }

  try {
    const activeRecord = getActiveLicenseRecord();
    if (!activeRecord?.licenseKey) return getTrialStatus();
    const verified = verifyLicenseKey(activeRecord.licenseKey);
    if (!verified.valid || !verified.serverUrl) {
      return { status: verified.valid ? 'ativo' : 'expirado', ...verified };
    }

    const remote = getRemoteLicenseState();
    const matchingRemote = remote?.licenseId === verified.licenseId ? remote : null;
    if (matchingRemote && matchingRemote.allowed === false) {
      return {
        ...verified,
        valid: false,
        status: matchingRemote.status || 'suspenso',
        message: matchingRemote.message || 'Acesso suspenso pelo gestor da assinatura.',
        accessUntil: matchingRemote.accessUntil || null,
        lastCheckedAt: matchingRemote.checkedAt,
        onlineManaged: true,
      };
    }

    if (
      matchingRemote?.warning
      && matchingRemote.accessUntil
      && Date.now() >= new Date(matchingRemote.accessUntil).getTime()
    ) {
      return {
        ...verified,
        valid: false,
        status: 'suspenso',
        message: matchingRemote.message || 'O prazo de pagamento terminou. Entre em contato com o gestor.',
        accessUntil: matchingRemote.accessUntil,
        lastCheckedAt: matchingRemote.checkedAt,
        onlineManaged: true,
      };
    }

    const lastContact = matchingRemote?.checkedAt || activeRecord.activatedAt;
    const offlineLimit = verified.offlineGraceHours * 60 * 60 * 1000;
    if (Date.now() - new Date(lastContact).getTime() > offlineLimit) {
      return {
        ...verified,
        valid: false,
        status: 'verificacao_necessaria',
        message: 'Conecte este computador a internet para validar a assinatura.',
        lastCheckedAt: matchingRemote?.checkedAt || null,
        onlineManaged: true,
      };
    }

    return {
      status: matchingRemote?.warning ? 'aviso' : 'ativo',
      ...verified,
      message: matchingRemote?.message || null,
      accessUntil: matchingRemote?.accessUntil || null,
      lastCheckedAt: matchingRemote?.checkedAt || null,
      onlineManaged: true,
      connected: Boolean(matchingRemote),
    };
  } catch (error) {
    return {
      status: 'invalido', valid: false, isExpired: true,
      clientName: 'Licenca invalida', plan: 'Nenhum', daysRemaining: 0,
      error: error.message,
    };
  }
};

const activateLicense = (licenseKey) => {
  const verified = saveActiveLicense(String(licenseKey || '').replace(/\s+/g, ''));
  return {
    success: true,
    message: `Assinatura ativada para ${verified.clientName}.`,
    license: verified,
  };
};

module.exports = {
  activateLicense,
  generateLicenseKey,
  getLicenseStatus,
  getActiveLicenseRecord,
  getRemoteLicenseState,
  isManagerMode,
  saveRemoteLicenseState,
  signUpdateManifest,
  verifyLicenseKey,
  verifyUpdateManifest,
};
