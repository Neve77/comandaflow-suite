const devicesService = require('../services/devices.service');

const status = async (req, res, next) => {
  try {
    const connectedSockets = req.app.get('connectedSockets') || 0;
    const mobileClients = req.app.get('mobileClients') || 0;
    const data = await devicesService.getStatus({
      port: process.env.PORT || 3002,
      connectedSockets,
      mobileClients
    });
    res.json(data);
  } catch (error) {
    next(error);
  }
};

const createPairing = async (req, res, next) => {
  try {
    const data = await devicesService.createPairingCode(req.validated || {});
    res.status(201).json(data);
  } catch (error) {
    next(error);
  }
};

const confirmPairing = async (req, res, next) => {
  try {
    const data = await devicesService.confirmPairing({
      ...req.validated,
      ip: req.ip
    });
    res.json({ session: data });
  } catch (error) {
    next(error);
  }
};

module.exports = { confirmPairing, createPairing, status };
