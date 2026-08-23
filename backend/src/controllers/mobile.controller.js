const mobileService = require('../services/mobile.service');

const requestDevice = (req) => req.headers['user-agent'] || req.headers['x-device-name'] || 'mobile-web';

const login = async (req, res, next) => {
  try {
    const result = await mobileService.login({
      ...req.validated,
      ip: req.ip,
      device: requestDevice(req)
    });
    res.json(result);
  } catch (error) {
    next(error);
  }
};

const dashboard = async (req, res, next) => {
  try {
    res.json({ dashboard: await mobileService.dashboard() });
  } catch (error) {
    next(error);
  }
};

const search = async (req, res, next) => {
  try {
    res.json(await mobileService.universalSearch({ q: req.validated.q }));
  } catch (error) {
    next(error);
  }
};

const clients = async (req, res, next) => {
  try {
    res.json({ clients: await mobileService.listClients(req.validated) });
  } catch (error) {
    next(error);
  }
};

const saveClient = async (req, res, next) => {
  try {
    const client = await mobileService.createClient({
      data: req.validated,
      user: req.user,
      ip: req.ip,
      device: requestDevice(req)
    });
    res.status(201).json({ client });
  } catch (error) {
    next(error);
  }
};

const bracelets = async (req, res, next) => {
  try {
    res.json({ bracelets: await mobileService.listBracelets(req.validated) });
  } catch (error) {
    next(error);
  }
};

const comandas = async (req, res, next) => {
  try {
    res.json({ comandas: await mobileService.searchComandas(req.validated) });
  } catch (error) {
    next(error);
  }
};

const getComanda = async (req, res, next) => {
  try {
    res.json({ comanda: await mobileService.getComanda(req.validated) });
  } catch (error) {
    next(error);
  }
};

const openComanda = async (req, res, next) => {
  try {
    const comanda = await mobileService.openComanda({
      data: req.validated,
      user: req.user,
      ip: req.ip,
      device: requestDevice(req)
    });
    const io = req.app.get('io');
    if (io) {
      io.to(['admin', 'caixa', 'mobile']).emit('comanda:atualizada', { comanda });
      io.to('admin').emit('dashboard:update', { source: 'mobile:comanda:abrir' });
    }
    res.status(201).json({ comanda });
  } catch (error) {
    next(error);
  }
};

const products = async (req, res, next) => {
  try {
    res.json({ products: await mobileService.listProducts(req.validated) });
  } catch (error) {
    next(error);
  }
};

const createPedido = async (req, res, next) => {
  try {
    const pedido = await mobileService.createPedido({
      data: req.validated,
      user: req.user,
      ip: req.ip,
      device: requestDevice(req)
    });
    const comanda = await mobileService.getComanda({ id: req.validated.comandaId });
    const io = req.app.get('io');
    if (io) {
      io.to(['admin', 'caixa', 'bar', 'cozinha', 'mobile']).emit('pedido:confirmado', { pedido, comanda });
      io.to(['admin', 'caixa', 'mobile']).emit('comanda:atualizada', { comanda });
      io.to(['admin', 'bar']).emit('estoque:atualizado', { produtoId: pedido.produtoId });
      io.to('admin').emit('dashboard:update', { source: 'mobile:pedido:criar' });
    }
    res.status(201).json({ pedido, comanda });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  bracelets,
  clients,
  comandas,
  createPedido,
  dashboard,
  getComanda,
  login,
  openComanda,
  products,
  saveClient,
  search
};
