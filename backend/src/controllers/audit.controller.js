const auditService = require('../services/audit.service');

const list = async (req, res, next) => {
  try {
    const logs = await auditService.listAudit({ take: req.validated?.take || 100 });
    res.json({ logs });
  } catch (error) {
    next(error);
  }
};

module.exports = { list };
