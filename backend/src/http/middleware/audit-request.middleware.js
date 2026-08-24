const auditService = require('../../services/audit.service');

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const SENSITIVE_FIELDS = new Set(['password', 'currentPassword', 'newPassword', 'token', 'licenseKey', 'twoFactorSecret', 'recoveryCode', 'code']);

const redact = (value) => {
  if (!value || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.slice(0, 50).map(redact);
  return Object.fromEntries(Object.entries(value).map(([key, item]) => [
    key,
    SENSITIVE_FIELDS.has(key) ? '[PROTEGIDO]' : redact(item),
  ]));
};

const auditRequest = (req, res, next) => {
  if (!MUTATING_METHODS.has(req.method)) return next();
  res.once('finish', () => {
    if (!req.user?.userId && !req.user?.id) return;
    const pathEntityId = req.originalUrl.match(/[0-9a-f]{8}-[0-9a-f-]{27,}/i)?.[0];
    auditService.writeAudit({
      userId: req.user.userId || req.user.id,
      action: `${req.method.toLowerCase()}_${res.statusCode < 400 ? 'success' : 'failed'}`,
      entity: req.path.split('/').filter(Boolean)[0] || 'System',
      entityId: req.params?.id || req.params?.subscriberId || pathEntityId || null,
      metadata: { path: req.originalUrl, statusCode: res.statusCode, payload: redact(req.body) },
      ip: req.ip,
      device: req.get('user-agent'),
    });
  });
  return next();
};

module.exports = auditRequest;
