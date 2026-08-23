const clientOnly = (req, res, next) => {
  if (process.env.COMANDAFLOW_MANAGER_MODE === 'true') {
    return res.status(404).json({ message: 'Recurso disponivel somente no aplicativo do restaurante.' });
  }
  return next();
};

module.exports = clientOnly;
