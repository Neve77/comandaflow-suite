const os = require('os');
const licenseService = require('./license.service');

let timer = null;
let running = false;

const schedule = (minutes = 1) => {
  clearTimeout(timer);
  timer = setTimeout(run, Math.max(1, minutes) * 60 * 1000);
  timer.unref?.();
};

const syncNow = async () => {
  if (licenseService.isManagerMode()) return null;
  const record = licenseService.getActiveLicenseRecord();
  if (!record?.licenseKey) return null;
  const verified = licenseService.verifyLicenseKey(record.licenseKey);
  if (!verified.serverUrl) return null;

  const installationId = process.env.COMANDAFLOW_INSTALLATION_ID;
  if (!installationId) throw new Error('Identificador desta instalacao nao encontrado.');

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  try {
    const response = await fetch(`${verified.serverUrl}/license/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        licenseKey: record.licenseKey,
        installationId,
        deviceName: os.hostname(),
      }),
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`Servidor respondeu ${response.status}.`);
    const state = await response.json();
    if (state.licenseId !== verified.licenseId || typeof state.allowed !== 'boolean') {
      throw new Error('Resposta do servidor de assinaturas invalida.');
    }
    licenseService.saveRemoteLicenseState({ ...state, checkedAt: new Date().toISOString() });
    return state;
  } finally {
    clearTimeout(timeout);
  }
};

async function run() {
  if (running) return;
  running = true;
  let interval = 1;
  try {
    const record = licenseService.getActiveLicenseRecord();
    if (record?.licenseKey) {
      const verified = licenseService.verifyLicenseKey(record.licenseKey);
      // Suspensões imediatas nunca devem aguardar uma configuração longa.
      interval = Math.min(verified.syncIntervalMinutes, 1);
      await syncNow();
    }
  } catch (error) {
    console.warn(`[LICENSE] Sincronizacao online pendente: ${error.message}`);
  } finally {
    running = false;
    schedule(interval);
  }
}

const start = () => {
  if (licenseService.isManagerMode()) return;
  clearTimeout(timer);
  timer = setTimeout(run, 2000);
  timer.unref?.();
};

const trigger = () => {
  if (licenseService.isManagerMode() || running) return;
  clearTimeout(timer);
  run();
};

module.exports = { start, syncNow, trigger };
