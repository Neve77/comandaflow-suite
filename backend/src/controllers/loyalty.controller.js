const loyaltyService = require('../services/loyalty.service');

const summary = async (req, res, next) => {
  try {
    const data = await loyaltyService.getProgramSummary();
    res.json(data);
  } catch (error) {
    next(error);
  }
};

const redeem = async (req, res, next) => {
  try {
    const client = await loyaltyService.redeemCashback(req.validated);
    res.json({ client });
  } catch (error) {
    next(error);
  }
};

module.exports = { redeem, summary };
