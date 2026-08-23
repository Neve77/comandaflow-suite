const licenseService = require('../../services/license.service');

const licenseGuard = (req, res, next) => {
  if (process.env.NODE_ENV === 'test' || licenseService.isManagerMode()) return next();

  // Ativação, consulta da licença e login continuam acessíveis durante um bloqueio.
  if (
    req.path.startsWith('/license') ||
    req.path.startsWith('/auth') ||
    req.path.startsWith('/health')
  ) {
    return next();
  }

  const status = licenseService.getLicenseStatus();
  if (!status.valid || status.isExpired) {
    return res.status(403).json({
      code: 'LICENSE_EXPIRED',
      message: 'Licença do ComandaFlow expirada ou inativa. Insira uma nova chave de ativação para continuar utilizando o sistema.',
      daysRemaining: 0
    });
  }

  next();
};

module.exports = licenseGuard;
