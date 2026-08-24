const authService = require('../services/auth.service');
const authSessionsService = require('../services/auth-sessions.service');

const requestContext = (req) => ({
  ip: req.ip,
  device: req.get('user-agent'),
});

const disconnectSession = (req, sessionId) => {
  const sockets = req.app.get('io')?.sockets?.sockets;
  if (!sockets) return;
  for (const socket of sockets.values()) {
    if (socket.user?.sessionId === sessionId) socket.disconnect(true);
  }
};

const login = async (req, res, next) => {
  try {
    const { email, password, twoFactorCode } = req.validated;
    const result = await authService.login(email, password, twoFactorCode, requestContext(req));
    return res.json(result);
  } catch (error) { return next(error); }
};

const listSessions = async (req, res, next) => {
  try {
    const sessions = await authSessionsService.listSessions({ currentSessionId: req.user.sessionId });
    return res.json({ sessions });
  } catch (error) { return next(error); }
};

const revokeSession = async (req, res, next) => {
  try {
    await authSessionsService.revokeSession(req.validated.sessionId, {
      actorUserId: req.user.userId,
      reason: req.validated.reason,
      ...requestContext(req),
    });
    disconnectSession(req, req.validated.sessionId);
    return res.json({ message: 'Acesso encerrado. O usuário precisará entrar novamente.' });
  } catch (error) { return next(error); }
};

const logout = async (req, res, next) => {
  try {
    await authSessionsService.revokeSession(req.user.sessionId, {
      actorUserId: req.user.userId,
      reason: 'Logout realizado pelo usuário',
      ...requestContext(req),
    });
    return res.json({ message: 'Sessão encerrada.' });
  } catch (error) { return next(error); }
};

const twoFactorStatus = async (req, res, next) => {
  try {
    const prisma = require('../infra/prisma/client');
    const user = await prisma.user.findUnique({ where: { id: req.user.userId }, select: { twoFactorEnabled: true } });
    return res.json({ enabled: Boolean(user?.twoFactorEnabled) });
  } catch (error) { return next(error); }
};

const setupTwoFactor = async (req, res, next) => {
  try {
    const twoFactorService = require('../services/two-factor.service');
    return res.json(await twoFactorService.setup(req.user.userId));
  } catch (error) { return next(error); }
};

const enableTwoFactor = async (req, res, next) => {
  try {
    const twoFactorService = require('../services/two-factor.service');
    await twoFactorService.enable(req.user.userId, req.validated.code);
    return res.json({ message: 'Autenticação em dois fatores ativada.' });
  } catch (error) { return next(error); }
};

const disableTwoFactor = async (req, res, next) => {
  try {
    const twoFactorService = require('../services/two-factor.service');
    await twoFactorService.disable(req.user.userId, req.validated.code);
    return res.json({ message: 'Autenticação em dois fatores desativada.' });
  } catch (error) { return next(error); }
};

const setupStatus = async (req, res, next) => {
  try {
    const setupRequired = await authService.isSetupRequired();
    return res.json({ setupRequired });
  } catch (error) { return next(error); }
};

const setup = async (req, res, next) => {
  try {
    const user = await authService.setup(req.validated);
    return res.status(201).json({ user, message: 'Conta inicial criada com sucesso.' });
  } catch (error) { return next(error); }
};

module.exports = {
  disableTwoFactor,
  enableTwoFactor,
  listSessions,
  login,
  logout,
  revokeSession,
  setup,
  setupStatus,
  setupTwoFactor,
  twoFactorStatus,
};
