const authService = require('../services/auth.service');

const login = async (req, res, next) => {
  try {
    const { email, password, twoFactorCode } = req.validated;
    const result = await authService.login(email, password, twoFactorCode);
    return res.json(result);
  } catch (error) {
    next(error);
  }
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
  } catch (error) {
    next(error);
  }
};

const setup = async (req, res, next) => {
  try {
    const user = await authService.setup(req.validated);
    return res.status(201).json({ user, message: 'Conta inicial criada com sucesso.' });
  } catch (error) {
    next(error);
  }
};

module.exports = { disableTwoFactor, enableTwoFactor, login, setupStatus, setup, setupTwoFactor, twoFactorStatus };
