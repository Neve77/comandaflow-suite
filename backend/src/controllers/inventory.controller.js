const inventoryService = require('../services/inventory.service');

const summary = async (req, res, next) => {
  try {
    const data = await inventoryService.getStockSummary();
    res.json(data);
  } catch (error) {
    next(error);
  }
};

const movements = async (req, res, next) => {
  try {
    const data = await inventoryService.listMovements();
    res.json({ movements: data });
  } catch (error) {
    next(error);
  }
};

const adjust = async (req, res, next) => {
  try {
    const data = await inventoryService.adjustStock(req.validated);
    res.status(201).json(data);
  } catch (error) {
    next(error);
  }
};

module.exports = { adjust, movements, summary };
