const errorMiddleware = (err, req, res, next) => {
  const status = Number.isInteger(err.status) ? err.status : 500;
  if (status >= 500) console.error({ err, path: req.originalUrl, method: req.method });
  const message = status >= 500 ? 'Erro interno no servidor' : (err.message || 'Erro na requisicao');
  return res.status(status).json({ message, ...(err.code ? { code: err.code } : {}) });
};

module.exports = errorMiddleware;
