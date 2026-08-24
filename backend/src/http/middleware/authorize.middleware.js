const rolePermissions = {
  proprietario: ['*'],
  administrador: ['*'],
  financeiro: ['subscriptions:read', 'billing:read', 'billing:write', 'updates:read'],
  suporte: ['subscriptions:read', 'monitoring:read', 'messages:read', 'messages:write', 'support:read', 'support:write', 'updates:read'],
  operador: ['subscriptions:read', 'monitoring:read', 'messages:read', 'support:read', 'support:write', 'updates:read'],
  auditor: ['subscriptions:read', 'monitoring:read', 'billing:read', 'support:read', 'updates:read', 'audit:read'],
};

const hasPermission = (role, permission) => {
  const permissions = rolePermissions[role] || [];
  return permissions.includes('*') || permissions.includes(permission);
};

const authorize = (...roles) => (req, res, next) => {
  if (!req.user?.role || !roles.includes(req.user.role)) {
    return res.status(403).json({ message: 'Você não tem permissão para esta operação' });
  }
  return next();
};

authorize.permission = (...permissions) => (req, res, next) => {
  if (!req.user?.role || !permissions.some((permission) => hasPermission(req.user.role, permission))) {
    return res.status(403).json({ message: 'Seu perfil não permite esta operação.' });
  }
  return next();
};

authorize.permissionsFor = (role) => rolePermissions[role] || [];

module.exports = authorize;
