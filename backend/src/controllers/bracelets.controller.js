const braceletsService = require('../services/bracelets.service');

const getAll = async (req, res, next) => {
  try {
    const bracelets = await braceletsService.listAll();
    res.json({ bracelets });
  } catch (error) {
    next(error);
  }
};

const create = async (req, res, next) => {
  try {
    const bracelet = await braceletsService.createBracelet(req.validated);
    res.status(201).json({ bracelet });
  } catch (error) {
    next(error);
  }
};

const updateStatus = async (req, res, next) => {
  try {
    const { id, status, blockedReason } = req.validated;
    const bracelet = await braceletsService.updateStatus(id, status, blockedReason);
    res.json({ bracelet });
  } catch (error) {
    next(error);
  }
};

module.exports = { getAll, create, updateStatus };
