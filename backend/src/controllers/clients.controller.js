const clientsService = require('../services/clients.service');

const listClients = async (req, res, next) => {
  try {
    const clients = await clientsService.listClients();
    res.json({ clients });
  } catch (error) {
    next(error);
  }
};

const getClientHistory = async (req, res, next) => {
  try {
    const { cpf } = req.validated;
    const history = await clientsService.getClientHistory(cpf);
    res.json({ history });
  } catch (error) {
    next(error);
  }
};

const saveClient = async (req, res, next) => {
  try {
    const client = await clientsService.createOrUpdateClient(req.validated);
    res.status(201).json({ client });
  } catch (error) {
    next(error);
  }
};

const updateBlocked = async (req, res, next) => {
  try {
    const { cpf, blocked } = req.validated;
    const client = await clientsService.setBlocked(cpf, blocked);
    res.json({ client });
  } catch (error) {
    next(error);
  }
};

const birthdays = async (req, res, next) => {
  try {
    const clients = await clientsService.getBirthdays();
    res.json({ clients });
  } catch (error) {
    next(error);
  }
};

module.exports = { birthdays, getClientHistory, listClients, saveClient, updateBlocked };
