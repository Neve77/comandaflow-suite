const subscriptionsService = require('../services/subscriptions.service');

const summary = async (req, res, next) => {
  try { return res.json(await subscriptionsService.summary()); } catch (error) { return next(error); }
};

const list = async (req, res, next) => {
  try {
    const subscribers = await subscriptionsService.list(req.query);
    return res.json({ subscribers });
  } catch (error) { return next(error); }
};

const create = async (req, res, next) => {
  try {
    const subscriber = await subscriptionsService.create(req.validated);
    return res.status(201).json({ subscriber, message: 'Assinante criado com sucesso.' });
  } catch (error) { return next(error); }
};

const update = async (req, res, next) => {
  try {
    const subscriber = await subscriptionsService.update(req.params.id, req.validated);
    return res.json({ subscriber, message: 'Assinante atualizado com sucesso.' });
  } catch (error) { return next(error); }
};

const issue = async (req, res, next) => {
  try {
    const subscription = await subscriptionsService.issue(req.params.id, req.validated);
    return res.status(201).json({ subscription, message: 'Nova assinatura emitida.' });
  } catch (error) { return next(error); }
};

const getSettings = async (req, res, next) => {
  try { return res.json(await subscriptionsService.getSettings()); } catch (error) { return next(error); }
};

const saveSettings = async (req, res, next) => {
  try {
    const settings = await subscriptionsService.saveSettings(req.validated);
    return res.json({ settings, message: 'Configuracao do servidor salva.' });
  } catch (error) { return next(error); }
};

const suspend = async (req, res, next) => {
  try {
    const subscriber = await subscriptionsService.suspend(req.params.id, req.validated);
    return res.json({ subscriber, message: 'Regra de suspensao aplicada.' });
  } catch (error) { return next(error); }
};

const reactivate = async (req, res, next) => {
  try {
    const subscriber = await subscriptionsService.reactivate(req.params.id);
    return res.json({ subscriber, message: 'Acesso reativado.' });
  } catch (error) { return next(error); }
};

const cancelSubscriber = async (req, res, next) => {
  try {
    const subscriber = await subscriptionsService.cancelSubscriber(req.params.id, req.validated);
    return res.json({ subscriber, message: 'Conta cancelada.' });
  } catch (error) { return next(error); }
};

const cancelSubscription = async (req, res, next) => {
  try {
    const subscription = await subscriptionsService.cancelSubscription(req.params.id);
    return res.json({ subscription, message: 'Assinatura cancelada no painel.' });
  } catch (error) { return next(error); }
};

module.exports = {
  cancelSubscriber,
  cancelSubscription,
  create,
  getSettings,
  issue,
  list,
  reactivate,
  saveSettings,
  summary,
  suspend,
  update,
};
