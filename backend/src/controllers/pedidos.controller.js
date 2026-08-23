const pedidosService = require('../services/pedidos.service');

const listActive = async (req, res, next) => {
  try {
    const pedidos = await pedidosService.listActivePedidos();
    res.json({ pedidos });
  } catch (error) {
    next(error);
  }
};

const create = async (req, res, next) => {
  try {
    const data = req.validated;
    const pedido = await pedidosService.createPedido(data);
    const io = req.app.get('io');
    if (io) {
      io.emit('pedido-added', { comandaId: data.comandaId, pedido });
      io.emit('order:create', { comandaId: data.comandaId, pedido });
      io.emit('stock:update', { produtoId: pedido.produtoId });
      io.emit('dashboard:update', { source: 'order:create' });
    }
    res.status(201).json({ pedido, message: 'Pedido adicionado com sucesso' });
  } catch (error) {
    next(error);
  }
};

const updateStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const pedido = await pedidosService.updateStatus(id, status);
    const io = req.app.get('io');
    if (io) {
      io.emit('pedido-status-updated', { pedidoId: id, status, pedido });
      io.emit('dashboard:update', { source: 'order:status' });
    }
    res.json({ pedido, message: 'Status do pedido atualizado' });
  } catch (error) {
    next(error);
  }
};

const cancel = async (req, res, next) => {
  try {
    const { id } = req.validated;
    const pedido = await pedidosService.cancelPedido(id);
    const io = req.app.get('io');
    if (io) {
      io.emit('pedido-cancelled', { pedidoId: id });
      io.emit('order:cancel', { pedidoId: id });
      io.emit('stock:update', { produtoId: pedido.produtoId });
      io.emit('dashboard:update', { source: 'order:cancel' });
    }
    res.json({ pedido, message: 'Pedido cancelado com sucesso' });
  } catch (error) {
    next(error);
  }
};

module.exports = { listActive, create, updateStatus, cancel };
