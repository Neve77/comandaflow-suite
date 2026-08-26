const os = require('os');
const licenseService = require('./license.service');
const prisma = require('../infra/prisma/client');

const DEFAULT_INTERVAL_MS = 60 * 1000;
const MIN_INTERVAL_MS = 15 * 1000;
const MAX_INTERVAL_MS = 60 * 60 * 1000;
const REQUEST_TIMEOUT_MS = 10 * 1000;
const RETRY_DELAYS_MS = [5, 15, 30, 60, 120, 300].map((seconds) => seconds * 1000);

let timer = null;
let inFlight = null;
let health = {
  status: licenseService.isManagerMode() ? 'disabled' : 'idle',
  lastAttemptAt: null,
  lastSuccessAt: null,
  nextAttemptAt: null,
  consecutiveFailures: 0,
  lastError: null,
  durationMs: null,
};

const toIso = (value = Date.now()) => new Date(value).toISOString();

const intervalFrom = (verified, remoteState) => {
  const serverSeconds = Number(remoteState?.syncIntervalSeconds);
  const signedMinutes = Number(verified?.syncIntervalMinutes);
  const requestedMs = Number.isFinite(serverSeconds) && serverSeconds > 0
    ? serverSeconds * 1000
    : Number.isFinite(signedMinutes) && signedMinutes > 0
      ? signedMinutes * 60 * 1000
      : DEFAULT_INTERVAL_MS;
  return Math.min(MAX_INTERVAL_MS, Math.max(MIN_INTERVAL_MS, requestedMs));
};

const clearSchedule = () => {
  clearTimeout(timer);
  timer = null;
};

const schedule = (delayMs) => {
  clearSchedule();
  const safeDelay = Math.max(1000, Number(delayMs) || DEFAULT_INTERVAL_MS);
  health.nextAttemptAt = toIso(Date.now() + safeDelay);
  timer = setTimeout(run, safeDelay);
  timer.unref?.();
};

const retryDelay = () => {
  const index = Math.min(Math.max(health.consecutiveFailures - 1, 0), RETRY_DELAYS_MS.length - 1);
  const base = RETRY_DELAYS_MS[index];
  return base + Math.round(base * 0.1 * Math.random());
};

const onboardingSnapshot = async () => {
  try {
    const [users, products, orders, backups] = await Promise.all([
      prisma.user.count({ where: { active: true } }),
      prisma.produto.count({ where: { ativo: true } }),
      prisma.pedido.count(),
      prisma.backupRecord.count(),
    ]);
    return {
      adminCreated: users > 0,
      menuConfigured: products > 0,
      firstOrder: orders > 0,
      backupCreated: backups > 0,
    };
  } catch {
    return undefined;
  }
};

const syncRequest = async () => {
  if (licenseService.isManagerMode()) return null;
  const record = licenseService.getActiveLicenseRecord();
  if (!record?.licenseKey) return null;
  const verified = licenseService.verifyLicenseKey(record.licenseKey);
  if (!verified.serverUrl) return null;

  const installationId = process.env.COMANDAFLOW_INSTALLATION_ID;
  if (!installationId) throw new Error('Identificador desta instalacao nao encontrado.');

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const onboarding = await onboardingSnapshot();
    const response = await fetch(`${verified.serverUrl}/license/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        licenseKey: record.licenseKey,
        installationId,
        deviceName: os.hostname(),
        appVersion: process.env.COMANDAFLOW_APP_VERSION || '0.0.0',
        platform: `${process.platform}-${process.arch}`,
        onboarding,
      }),
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`Servidor respondeu ${response.status}.`);
    const state = await response.json();
    if (state.licenseId !== verified.licenseId || typeof state.allowed !== 'boolean') {
      throw new Error('Resposta do servidor de assinaturas invalida.');
    }

    const receivedAt = toIso();
    licenseService.saveRemoteLicenseState({
      ...state,
      serverCheckedAt: state.checkedAt || state.serverTime || null,
      checkedAt: receivedAt,
      receivedAt,
    });
    return { state, verified };
  } catch (error) {
    if (error.name === 'AbortError' || error.name === 'TimeoutError') {
      throw new Error('O Gestor nao respondeu dentro de 10 segundos.');
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
};

const executeSync = async () => {
  const startedAt = Date.now();
  health = {
    ...health,
    status: 'syncing',
    lastAttemptAt: toIso(startedAt),
    nextAttemptAt: null,
  };

  try {
    const result = await syncRequest();
    if (!result) {
      health = {
        ...health,
        status: 'idle',
        lastError: null,
        durationMs: Date.now() - startedAt,
      };
      return null;
    }

    health = {
      ...health,
      status: 'online',
      lastSuccessAt: toIso(),
      consecutiveFailures: 0,
      lastError: null,
      durationMs: Date.now() - startedAt,
    };
    schedule(intervalFrom(result.verified, result.state));
    return result.state;
  } catch (error) {
    health = {
      ...health,
      status: 'retrying',
      consecutiveFailures: health.consecutiveFailures + 1,
      lastError: error.message,
      durationMs: Date.now() - startedAt,
    };
    schedule(retryDelay());
    throw error;
  }
};

const syncNow = async () => {
  if (licenseService.isManagerMode()) return null;
  if (inFlight) return inFlight;

  clearSchedule();
  inFlight = executeSync();
  try {
    return await inFlight;
  } finally {
    inFlight = null;
  }
};

const acknowledgeMessage = async (messageId) => {
  const record = licenseService.getActiveLicenseRecord();
  if (!record?.licenseKey) return;
  const verified = licenseService.verifyLicenseKey(record.licenseKey);
  const installationId = process.env.COMANDAFLOW_INSTALLATION_ID;
  if (!verified.serverUrl || !installationId) return;
  const response = await fetch(`${verified.serverUrl}/license/messages/${encodeURIComponent(messageId)}/read`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ licenseKey: record.licenseKey, installationId }),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`Servidor respondeu ${response.status}.`);
  const remote = licenseService.getRemoteLicenseState();
  if (remote?.messages) {
    licenseService.saveRemoteLicenseState({
      ...remote,
      messages: remote.messages.filter((message) => message.id !== messageId),
    });
  }
};

const supportCredentials = () => {
  const record = licenseService.getActiveLicenseRecord();
  if (!record?.licenseKey) {
    throw Object.assign(new Error('Ative uma assinatura online para usar o suporte.'), { status: 409 });
  }
  const verified = licenseService.verifyLicenseKey(record.licenseKey);
  const installationId = process.env.COMANDAFLOW_INSTALLATION_ID;
  if (!verified.serverUrl) {
    throw Object.assign(new Error('Esta assinatura não possui um Gestor online configurado.'), { status: 409 });
  }
  if (!installationId) {
    throw Object.assign(new Error('Identificador desta instalação não encontrado.'), { status: 409 });
  }
  return { licenseKey: record.licenseKey, installationId, serverUrl: verified.serverUrl };
};

const supportRequest = async (path, payload = {}) => {
  const { licenseKey, installationId, serverUrl } = supportCredentials();
  try {
    const response = await fetch(`${serverUrl}/license/support/remote${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...payload, licenseKey, installationId }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw Object.assign(new Error(data.message || `Servidor respondeu ${response.status}.`), { status: response.status });
    }
    return data;
  } catch (error) {
    if (error.name === 'AbortError' || error.name === 'TimeoutError') {
      throw Object.assign(new Error('O Gestor não respondeu dentro de 10 segundos.'), { status: 504 });
    }
    if (error.status) throw error;
    throw Object.assign(new Error('Não foi possível conectar ao suporte do Gestor.'), { status: 503 });
  }
};

const listSupportTickets = () => supportRequest('/tickets/list');
const createSupportTicket = (data, actorName) => supportRequest('/tickets', { ...data, actorName });
const commentSupportTicket = (ticketId, body, actorName) => supportRequest(
  `/tickets/${encodeURIComponent(ticketId)}/comments`,
  { body, actorName }
);

async function run() {
  try {
    await syncNow();
  } catch (error) {
    console.warn(`[LICENSE] Sincronizacao com o Gestor pendente: ${error.message}`);
  }
}

const start = () => {
  if (licenseService.isManagerMode()) return;
  clearSchedule();
  health = { ...health, status: 'idle', nextAttemptAt: toIso(Date.now() + 2000) };
  timer = setTimeout(run, 2000);
  timer.unref?.();
};

const triggerIfStale = () => {
  if (licenseService.isManagerMode() || inFlight) return inFlight;
  if (health.status === 'retrying' && health.nextAttemptAt && Date.now() < new Date(health.nextAttemptAt).getTime()) {
    return null;
  }

  let interval = DEFAULT_INTERVAL_MS;
  try {
    const record = licenseService.getActiveLicenseRecord();
    if (!record?.licenseKey) return null;
    const verified = licenseService.verifyLicenseKey(record.licenseKey);
    const remote = licenseService.getRemoteLicenseState();
    interval = intervalFrom(verified, remote);
  } catch {
    return null;
  }

  const lastSuccess = health.lastSuccessAt || licenseService.getRemoteLicenseState()?.checkedAt;
  if (lastSuccess && Date.now() - new Date(lastSuccess).getTime() < interval) return null;
  return run();
};

const getSyncHealth = () => {
  const lastSuccessAt = health.lastSuccessAt || licenseService.getRemoteLicenseState()?.checkedAt || null;
  return {
    ...health,
    lastSuccessAt,
    connected: health.status === 'online' && Boolean(lastSuccessAt),
  };
};

module.exports = {
  acknowledgeMessage,
  commentSupportTicket,
  createSupportTicket,
  getSyncHealth,
  listSupportTickets,
  start,
  syncNow,
  triggerIfStale,
};
