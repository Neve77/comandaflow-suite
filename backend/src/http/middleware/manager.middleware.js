const managerOnly = (req, res, next) => {
  if (process.env.COMANDAFLOW_MANAGER_MODE !== 'true') {
    return res.status(404).json({ message: 'Recurso nao disponivel neste aplicativo.' });
  }
  return next();
};

module.exports = managerOnly;
