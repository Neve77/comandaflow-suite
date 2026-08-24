const billingService = require('../services/billing.service');

const list = async (req, res, next) => { try { return res.json({ charges: await billingService.list(req.validated || req.query) }); } catch (error) { return next(error); } };
const summary = async (req, res, next) => { try { return res.json(await billingService.summary()); } catch (error) { return next(error); } };
const create = async (req, res, next) => { try { return res.status(201).json({ charge: await billingService.create(req.params.subscriberId, req.validated), message: 'Cobrança criada.' }); } catch (error) { return next(error); } };
const update = async (req, res, next) => { try { return res.json({ charge: await billingService.update(req.params.id, req.validated), message: 'Cobrança atualizada.' }); } catch (error) { return next(error); } };
const pay = async (req, res, next) => { try { return res.json({ ...(await billingService.pay(req.params.id, req.validated)), message: 'Pagamento registrado.' }); } catch (error) { return next(error); } };
const cancel = async (req, res, next) => { try { return res.json({ ...(await billingService.cancel(req.params.id, req.validated)), message: 'Cobrança cancelada.' }); } catch (error) { return next(error); } };
const process = async (req, res, next) => { try { return res.json({ result: await billingService.processOverdueCharges({ force: true }), message: 'Inadimplência verificada.' }); } catch (error) { return next(error); } };
const configureRecurrence = async (req, res, next) => { try { return res.json({ subscriber: await billingService.configureRecurrence(req.params.subscriberId, req.validated), message: 'Recorrência atualizada.' }); } catch (error) { return next(error); } };

module.exports = { cancel, configureRecurrence, create, list, pay, process, summary, update };
