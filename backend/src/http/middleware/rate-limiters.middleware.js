const rateLimit = require('express-rate-limit');

const WINDOW_MS = 15 * 60 * 1000;
const RECOVERY_ROUTES = new Set([
  'GET /license/status',
  'POST /license/activate',
]);

const isLicenseRecoveryRequest = (req) => RECOVERY_ROUTES.has(`${req.method} ${req.path}`);

const createGlobalLimiter = ({ limit = 2000, windowMs = WINDOW_MS } = {}) => rateLimit({
  windowMs,
  limit,
  skip: isLicenseRecoveryRequest,
  message: { message: 'Muitas requisições. Aguarde um momento e tente novamente.' },
});

const createLicenseStatusLimiter = ({ limit = 300, windowMs = WINDOW_MS } = {}) => rateLimit({
  windowMs,
  limit,
  message: { message: 'Muitas consultas de assinatura. Aguarde um momento e tente novamente.' },
});

const createLicenseActivationLimiter = ({ limit = 30, windowMs = WINDOW_MS } = {}) => rateLimit({
  windowMs,
  limit,
  message: { message: 'Muitas tentativas de ativação. Aguarde alguns minutos e tente novamente.' },
});

module.exports = {
  createGlobalLimiter,
  createLicenseActivationLimiter,
  createLicenseStatusLimiter,
  isLicenseRecoveryRequest,
};
