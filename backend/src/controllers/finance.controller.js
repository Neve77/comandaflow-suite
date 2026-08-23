const financeService = require('../services/finance.service');

const summary = async (req, res, next) => {
  try {
    const data = await financeService.getSummary(req.validated || {});
    res.json(data);
  } catch (error) {
    next(error);
  }
};

const list = async (req, res, next) => {
  try {
    const movements = await financeService.listMovements(req.validated || {});
    res.json({ movements });
  } catch (error) {
    next(error);
  }
};

const create = async (req, res, next) => {
  try {
    const movement = await financeService.createMovement(req.validated);
    res.status(201).json({ movement });
  } catch (error) {
    next(error);
  }
};

module.exports = { create, list, summary };
