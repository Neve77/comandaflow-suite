const authService = require('../services/auth.service');

const login = async (req, res, next) => {
  try {
    const { email, password } = req.validated;
    const result = await authService.login(email, password);
    return res.json(result);
  } catch (error) {
    next(error);
  }
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

module.exports = { login, setupStatus, setup };
