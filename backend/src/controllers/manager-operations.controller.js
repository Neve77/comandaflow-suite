const service = require('../services/manager-operations.service');

const monitoring = async (req, res, next) => {
  try { return res.json(await service.monitoringSnapshot()); } catch (error) { return next(error); }
};
const notifications = async (req, res, next) => {
  try { return res.json({ notifications: await service.notifications() }); } catch (error) { return next(error); }
};
const listMessages = async (req, res, next) => {
  try { return res.json({ messages: await service.listMessages() }); } catch (error) { return next(error); }
};
const sendMessage = async (req, res, next) => {
  try { return res.status(201).json({ messages: await service.sendMessage(req.validated, req.user), message: 'Mensagem enviada.' }); } catch (error) { return next(error); }
};
const deactivateMessage = async (req, res, next) => {
  try { await service.deactivateMessage(req.params.id); return res.json({ message: 'Mensagem retirada.' }); } catch (error) { return next(error); }
};
const listTickets = async (req, res, next) => {
  try { return res.json({ tickets: await service.listTickets() }); } catch (error) { return next(error); }
};
const createTicket = async (req, res, next) => {
  try { return res.status(201).json({ ticket: await service.createTicket(req.validated, req.user), message: 'Chamado criado.' }); } catch (error) { return next(error); }
};
const updateTicket = async (req, res, next) => {
  try { return res.json({ ticket: await service.updateTicket(req.params.id, req.validated), message: 'Chamado atualizado.' }); } catch (error) { return next(error); }
};
const commentTicket = async (req, res, next) => {
  try { return res.status(201).json({ comment: await service.commentTicket(req.params.id, req.validated.body, req.user), message: 'Resposta adicionada.' }); } catch (error) { return next(error); }
};

module.exports = { commentTicket, createTicket, deactivateMessage, listMessages, listTickets, monitoring, notifications, sendMessage, updateTicket };
