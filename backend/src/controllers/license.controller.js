const licenseService = require('../services/license.service');
const licenseServerService = require('../services/license-server.service');
const licenseSyncService = require('../services/license-sync.service');

const getStatus = async (req, res, next) => {
  try {
    // Atualiza em segundo plano; a próxima consulta da interface já recebe a decisão do Gestor.
    licenseSyncService.trigger();
    const status = licenseService.getLicenseStatus();
    return res.json(status);
  } catch (error) {
    next(error);
  }
};

const activate = async (req, res, next) => {
  try {
    const { licenseKey } = req.body;
    if (!licenseKey) {
      return res.status(400).json({ message: 'Informe a chave de ativação.' });
    }
    const result = licenseService.activateLicense(licenseKey);
    try {
      await licenseSyncService.syncNow();
    } catch (syncError) {
      result.syncPending = true;
      result.syncMessage = syncError.message;
    }
    return res.json(result);
  } catch (error) {
    return res.status(400).json({ message: error.message || 'Chave de ativação inválida.' });
  }
};

const sync = async (req, res, next) => {
  try {
    const result = await licenseServerService.sync(req.validated);
    return res.json(result);
  } catch (error) {
    return res.status(400).json({ message: error.message || 'Nao foi possivel validar a assinatura.' });
  }
};

module.exports = {
  getStatus,
  activate,
  sync
};
