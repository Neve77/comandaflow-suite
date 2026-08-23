const aiService = require('../services/ai.service');

const insights = async (req, res, next) => {
  try {
    const data = await aiService.analyze(req.validated || {});
    res.json(data);
  } catch (error) {
    next(error);
  }
};

module.exports = { insights };
