const mesasService = require('../services/mesas.service');

const listMesas = async (req, res, next) => {
  try {
    const mesas = await mesasService.listMesas();
    return res.json({ mesas });
  } catch (error) {
    next(error);
  }
};

const getMesaById = async (req, res, next) => {
  try {
    const mesa = await mesasService.getMesaById(req.params.id);
    return res.json({ mesa });
  } catch (error) {
    next(error);
  }
};

const getMesaHistory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { date, startDate, endDate } = req.query;
    const history = await mesasService.getMesaHistory(id, { date, startDate, endDate });
    return res.json(history);
  } catch (error) {
    next(error);
  }
};

const createMesa = async (req, res, next) => {
  try {
    const mesa = await mesasService.createMesa(req.body);
    return res.status(201).json({ mesa, message: 'Mesa criada com sucesso' });
  } catch (error) {
    next(error);
  }
};

const updateMesa = async (req, res, next) => {
  try {
    const mesa = await mesasService.updateMesa(req.params.id, req.body);
    return res.json({ mesa, message: 'Mesa atualizada com sucesso' });
  } catch (error) {
    next(error);
  }
};

const deleteMesa = async (req, res, next) => {
  try {
    await mesasService.deleteMesa(req.params.id);
    return res.json({ message: 'Mesa excluída com sucesso' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  listMesas,
  getMesaById,
  getMesaHistory,
  createMesa,
  updateMesa,
  deleteMesa
};
