const comandasService = require('../services/comandas.service');

const listOpen = async (req, res, next) => {
  try {
    const comandas = await comandasService.listOpenComandas();
    res.json({ comandas });
  } catch (error) {
    next(error);
  }
};

const get = async (req, res, next) => {
  try {
    const { id } = req.validated;
    const comanda = await comandasService.getComanda(id);
    res.json({ comanda });
  } catch (error) {
    next(error);
  }
};

const open = async (req, res, next) => {
  try {
    const comanda = await comandasService.openComanda({
      ...req.validated,
      userId: req.user?.userId
    });
    const io = req.app.get('io');
    if (io) {
      io.emit('comanda-opened', { comanda });
      io.emit('mesa-update', { mesaId: comanda.mesaId });
      io.emit('dashboard:update', { source: 'comanda:open' });
    }
    res.status(201).json({ comanda, message: 'Comanda aberta com sucesso' });
  } catch (error) {
    next(error);
  }
};

const transfer = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { newMesaId } = req.body;
    const comanda = await comandasService.transferMesa(id, newMesaId, req.user?.userId);
    const io = req.app.get('io');
    if (io) {
      io.emit('mesa-update', {});
      io.emit('dashboard:update', { source: 'comanda:transfer' });
    }
    res.json({ comanda, message: 'Comanda transferida de mesa com sucesso' });
  } catch (error) {
    next(error);
  }
};

const cancel = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { motivo } = req.body;
    const comanda = await comandasService.cancelComanda(id, motivo, req.user?.userId);
    const io = req.app.get('io');
    if (io) {
      io.emit('comanda-closed', { comandaId: id, comanda });
      io.emit('mesa-update', {});
      io.emit('dashboard:update', { source: 'comanda:cancel' });
    }
    res.json({ comanda, message: 'Comanda cancelada com sucesso' });
  } catch (error) {
    next(error);
  }
};

const historyByBraceletNumber = async (req, res, next) => {
  try {
    const { number } = req.params;
    const bracelet = await comandasService.getHistoryByBraceletNumber(number);
    res.json({ bracelet });
  } catch (error) {
    next(error);
  }
};

const close = async (req, res, next) => {
  try {
    const { id, formaPagamento, desconto } = req.validated;
    const comanda = await comandasService.closeComanda(
      id,
      { formaPagamento, desconto },
      req.user?.userId
    );
    const io = req.app.get('io');
    if (io) {
      io.emit('comanda-closed', { comandaId: id, comanda });
      io.emit('mesa-update', { mesaId: comanda.mesaId });
      io.emit('cashier:update', { comandaId: id });
      io.emit('dashboard:update', { source: 'comanda:close' });
    }
    res.json({ comanda, message: 'Comanda finalizada com sucesso' });
  } catch (error) {
    next(error);
  }
};

module.exports = { listOpen, get, open, transfer, cancel, historyByBraceletNumber, close };
