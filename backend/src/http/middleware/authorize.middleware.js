const authorize = (...roles) => (req, res, next) => {
  if (!req.user?.role || !roles.includes(req.user.role)) {
    return res.status(403).json({ message: 'Voce nao tem permissao para esta operacao' });
  }
  next();
};

module.exports = authorize;
