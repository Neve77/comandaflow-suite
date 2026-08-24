const billingService = require('./billing.service');

let timer = null;
let running = false;

const schedule = () => {
  clearTimeout(timer);
  timer = setTimeout(run, 60 * 1000);
  timer.unref?.();
};

async function run() {
  if (running || process.env.COMANDAFLOW_MANAGER_MODE !== 'true') return;
  running = true;
  try {
    await billingService.processOverdueCharges({ force: true });
  } catch (error) {
    console.error(`[COBRANCAS] Falha ao verificar inadimplência: ${error.message}`);
  } finally {
    running = false;
    schedule();
  }
}

const start = () => {
  if (process.env.COMANDAFLOW_MANAGER_MODE !== 'true') return;
  clearTimeout(timer);
  timer = setTimeout(run, 2000);
  timer.unref?.();
};

module.exports = { start };
