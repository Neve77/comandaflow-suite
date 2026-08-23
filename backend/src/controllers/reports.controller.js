const reportsService = require('../services/reports.service');

const dashboard = async (req, res, next) => {
  try {
    const data = await reportsService.getDashboard();
    res.json(data);
  } catch (error) {
    next(error);
  }
};

const sales = async (req, res, next) => {
  try {
    const { start, end, eventId } = req.validated;
    const data = await reportsService.getSales({ start, end, eventId });
    res.json(data);
  } catch (error) {
    next(error);
  }
};

const topProducts = async (req, res, next) => {
  try {
    const { start, end, category, eventId } = req.validated;
    const data = await reportsService.getTopProducts({ start, end, category, eventId });
    res.json(data);
  } catch (error) {
    next(error);
  }
};

const complete = async (req, res, next) => {
  try {
    const data = await reportsService.getCompleteReport(req.validated || {});
    res.json(data);
  } catch (error) {
    next(error);
  }
};

module.exports = { complete, dashboard, sales, topProducts };
