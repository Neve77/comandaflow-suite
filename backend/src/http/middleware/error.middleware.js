const errorMiddleware = (err, req, res, next) => {
  console.error({ err, path: req.originalUrl, method: req.method });
  const status = Number.isInteger(err.status) ? err.status : 500;
  const message = status >= 500 ? 'Erro interno no servidor' : (err.message || 'Erro na requisicao');
  return res.status(status).json({ message });
};

module.exports = errorMiddleware;
