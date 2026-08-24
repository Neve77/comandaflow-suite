const licenseService = require('../services/license.service');
const licenseServerService = require('../services/license-server.service');
const licenseSyncService = require('../services/license-sync.service');

const getStatus = async (req, res, next) => {
  try {
    // A consulta local permanece rapida e solicita atualizacao somente quando os dados envelheceram.
    licenseSyncService.triggerIfStale();
    const status = licenseService.getLicenseStatus();
    const syncHealth = licenseSyncService.getSyncHealth();
    return res.json({
      ...status,
      ...(status.onlineManaged ? { connected: syncHealth.connected } : {}),
      sync: syncHealth,
    });
  } catch (error) {
    next(error);
  }
};

const refreshStatus = async (req, res, next) => {
  let syncError = null;
  try {
    await licenseSyncService.syncNow();
  } catch (error) {
    syncError = error;
  }

  try {
    const status = licenseService.getLicenseStatus();
    const syncHealth = licenseSyncService.getSyncHealth();
    return res.json({
      synchronized: !syncError && syncHealth.status === 'online',
      message: syncError?.message || null,
      license: {
        ...status,
        ...(status.onlineManaged ? { connected: syncHealth.connected } : {}),
        sync: syncHealth,
      },
    });
  } catch (error) {
    return next(error);
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
    const result = await licenseServerService.sync({ ...req.validated, ip: req.ip });
    return res.json(result);
  } catch (error) {
    return res.status(400).json({ message: error.message || 'Nao foi possivel validar a assinatura.' });
  }
};

const acknowledgeMessage = async (req, res, next) => {
  try {
    await licenseServerService.acknowledgeMessage(req.validated);
    return res.json({ message: 'Mensagem confirmada.' });
  } catch (error) {
    return res.status(error.status || 400).json({ message: error.message || 'Não foi possível confirmar a mensagem.' });
  }
};

const acknowledgeLocalMessage = async (req, res, next) => {
  try {
    await licenseSyncService.acknowledgeMessage(req.params.messageId);
    return res.json({ message: 'Mensagem confirmada.' });
  } catch (error) {
    return next(error);
  }
};

const listLocalSupportTickets = async (req, res, next) => {
  try {
    return res.json(await licenseSyncService.listSupportTickets());
  } catch (error) {
    return next(error);
  }
};

const createLocalSupportTicket = async (req, res, next) => {
  try {
    const result = await licenseSyncService.createSupportTicket(req.validated, req.user?.email);
    return res.status(201).json(result);
  } catch (error) {
    return next(error);
  }
};

const commentLocalSupportTicket = async (req, res, next) => {
  try {
    const result = await licenseSyncService.commentSupportTicket(req.params.ticketId, req.validated.body, req.user?.email);
    return res.status(201).json(result);
  } catch (error) {
    return next(error);
  }
};

const listRemoteSupportTickets = async (req, res) => {
  try {
    return res.json({ tickets: await licenseServerService.listSupportTickets(req.validated) });
  } catch (error) {
    return res.status(error.status || 400).json({ message: error.message || 'Não foi possível consultar os chamados.' });
  }
};

const createRemoteSupportTicket = async (req, res) => {
  try {
    return res.status(201).json({
      ticket: await licenseServerService.createSupportTicket(req.validated),
      message: 'Chamado enviado ao Gestor.',
    });
  } catch (error) {
    return res.status(error.status || 400).json({ message: error.message || 'Não foi possível abrir o chamado.' });
  }
};

const commentRemoteSupportTicket = async (req, res) => {
  try {
    return res.status(201).json({
      comment: await licenseServerService.commentSupportTicket(req.params.ticketId, req.validated),
      message: 'Resposta enviada ao Gestor.',
    });
  } catch (error) {
    return res.status(error.status || 400).json({ message: error.message || 'Não foi possível enviar a resposta.' });
  }
};

module.exports = {
  activate,
  acknowledgeMessage,
  acknowledgeLocalMessage,
  commentLocalSupportTicket,
  commentRemoteSupportTicket,
  createLocalSupportTicket,
  createRemoteSupportTicket,
  getStatus,
  listLocalSupportTickets,
  listRemoteSupportTickets,
  refreshStatus,
  sync
};
