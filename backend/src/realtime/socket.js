const jwt = require('jsonwebtoken');
const mobileService = require('../services/mobile.service');

const ROOMS = new Set(['admin', 'caixa', 'bar', 'cozinha', 'mobile']);
const roomAllowed = (room, user) => {
  if (!room || !user?.role) return false;
  if (room === 'mobile') return user.role === mobileService.WAITER_ROLE;
  if (room === 'admin') return ['administrador', 'gerente'].includes(user.role);
  return user.role === room || ['administrador', 'gerente'].includes(user.role);
};

const verifyToken = (token) => {
  if (!token) return null;
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    return null;
  }
};

const emitAck = async (socket, eventName, handler, ack) => {
  try {
    const data = await handler();
    if (typeof ack === 'function') ack({ ok: true, data: mobileService.toPlain(data) });
    return data;
  } catch (error) {
    const payload = { ok: false, message: error.message || 'Erro interno' };
    if (typeof ack === 'function') ack(payload);
    socket.emit('pedido:erro', { event: eventName, ...payload });
    return null;
  }
};

const socketIp = (socket) => socket.handshake.headers['x-forwarded-for'] || socket.handshake.address;
const socketDevice = (socket) => socket.handshake.headers['user-agent'] || 'socket-mobile';

const setupSocket = ({ io, app }) => {
  let connectedSockets = 0;
  let mobileSockets = 0;

  io.use((socket, next) => {
    const auth = socket.handshake.auth || {};
    const bearer = socket.handshake.headers.authorization;
    const token = auth.token || (bearer?.startsWith('Bearer ') ? bearer.replace('Bearer ', '') : null);
    socket.user = verifyToken(token);
    socket.requestedRoom = auth.room;
    if (!socket.user) return next(new Error('Autenticacao obrigatoria'));
    next();
  });

  io.on('connection', (socket) => {
    connectedSockets += 1;
    app.set('connectedSockets', connectedSockets);

    const requestedRoom = ROOMS.has(socket.requestedRoom) && roomAllowed(socket.requestedRoom, socket.user)
      ? socket.requestedRoom
      : null;
    if (requestedRoom) socket.join(requestedRoom);

    if (socket.user?.role === mobileService.WAITER_ROLE) {
      mobileSockets += 1;
      socket.join('mobile');
      app.set('mobileClients', mobileSockets);
    }

    io.to('admin').emit('mobile:connect', { socketId: socket.id, connectedSockets, mobileSockets });

    socket.on('mobile:join', (payload = {}, ack) => {
      const room = ROOMS.has(payload.room) && roomAllowed(payload.room, socket.user) ? payload.room : null;
      if (!room) {
        if (typeof ack === 'function') ack({ ok: false, message: 'Sala nao permitida' });
        return;
      }
      socket.join(room);
      if (room === 'mobile' && socket.user?.role === mobileService.WAITER_ROLE) {
        app.set('mobileClients', mobileSockets);
      }
      if (typeof ack === 'function') ack({ ok: true, room });
      io.to('admin').emit('mobile:join', { socketId: socket.id, room });
    });

    socket.on('mobile:leave', (payload = {}, ack) => {
      const room = ROOMS.has(payload.room) ? payload.room : 'mobile';
      socket.leave(room);
      if (typeof ack === 'function') ack({ ok: true, room });
      io.to('admin').emit('mobile:leave', { socketId: socket.id, room });
    });

    socket.on('mobile:ping', (payload = {}, ack) => {
      const pong = { at: new Date().toISOString(), socketId: socket.id, payload };
      socket.emit('mobile:pong', pong);
      if (typeof ack === 'function') ack({ ok: true, data: pong });
    });

    socket.on('cliente:listar', (payload = {}, ack) => emitAck(socket, 'cliente:listar', () => mobileService.listClients(payload), ack));
    socket.on('cliente:buscar', (payload = {}, ack) => emitAck(socket, 'cliente:buscar', () => mobileService.universalSearch({ q: payload.q || payload.query || '' }), ack));
    socket.on('cliente:criar', (payload = {}, ack) => emitAck(socket, 'cliente:criar', () => mobileService.createClient({ data: payload, user: socket.user, ip: socketIp(socket), device: socketDevice(socket) }), ack));
    socket.on('cliente:editar', (payload = {}, ack) => emitAck(socket, 'cliente:editar', () => mobileService.createClient({ data: payload, user: socket.user, ip: socketIp(socket), device: socketDevice(socket) }), ack));

    socket.on('pulseira:listar', (payload = {}, ack) => emitAck(socket, 'pulseira:listar', () => mobileService.listBracelets(payload), ack));
    socket.on('pulseira:buscar', (payload = {}, ack) => emitAck(socket, 'pulseira:buscar', () => mobileService.listBracelets({ q: payload.q || payload.number || '' }), ack));
    socket.on('pulseira:vincular', (payload = {}, ack) => emitAck(socket, 'pulseira:vincular', () => mobileService.bindBracelet({ ...payload, user: socket.user, ip: socketIp(socket), device: socketDevice(socket) }), ack));
    socket.on('pulseira:liberar', (payload = {}, ack) => emitAck(socket, 'pulseira:liberar', () => mobileService.releaseBracelet({ ...payload, user: socket.user, ip: socketIp(socket), device: socketDevice(socket) }), ack));
    socket.on('pulseira:ativar', (payload = {}, ack) => emitAck(socket, 'pulseira:ativar', () => mobileService.updateBraceletStatus({ ...payload, status: 'livre', user: socket.user, ip: socketIp(socket), device: socketDevice(socket) }), ack));
    socket.on('pulseira:desativar', (payload = {}, ack) => emitAck(socket, 'pulseira:desativar', () => mobileService.updateBraceletStatus({ ...payload, status: 'bloqueada', user: socket.user, ip: socketIp(socket), device: socketDevice(socket) }), ack));

    socket.on('comanda:criar', (payload = {}, ack) => emitAck(socket, 'comanda:criar', () => mobileService.openComanda({ data: payload, user: socket.user, ip: socketIp(socket), device: socketDevice(socket) }), ack));
    socket.on('comanda:abrir', (payload = {}, ack) => emitAck(socket, 'comanda:abrir', async () => {
      const comanda = await mobileService.openComanda({ data: payload, user: socket.user, ip: socketIp(socket), device: socketDevice(socket) });
      io.to(['admin', 'caixa', 'mobile']).emit('comanda:atualizada', { comanda: mobileService.toPlain(comanda) });
      return comanda;
    }, ack));
    socket.on('comanda:buscar', (payload = {}, ack) => emitAck(socket, 'comanda:buscar', () => mobileService.searchComandas({ q: payload.q || payload.id || '' }), ack));

    socket.on('pedido:criar', (payload = {}, ack) => emitAck(socket, 'pedido:criar', async () => {
      const pedido = await mobileService.createPedido({ data: payload, user: socket.user, ip: socketIp(socket), device: socketDevice(socket) });
      const comanda = await mobileService.getComanda({ id: payload.comandaId });
      const plainPedido = mobileService.toPlain(pedido);
      const plainComanda = mobileService.toPlain(comanda);
      io.to(['admin', 'caixa', 'bar', 'cozinha', 'mobile']).emit('pedido:confirmado', { pedido: plainPedido, comanda: plainComanda });
      io.to(['admin', 'caixa', 'mobile']).emit('comanda:atualizada', { comanda: plainComanda });
      io.to(['admin', 'bar']).emit('estoque:atualizado', { produtoId: pedido.produtoId });
      io.to('admin').emit('dashboard:update', { source: 'socket:pedido:criar' });
      return { pedido, comanda };
    }, ack));

    socket.on('estoque:consultar', (payload = {}, ack) => emitAck(socket, 'estoque:consultar', () => mobileService.listProducts(payload), ack));

    socket.on('disconnect', () => {
      connectedSockets = Math.max(connectedSockets - 1, 0);
      if (socket.user?.role === mobileService.WAITER_ROLE) {
        mobileSockets = Math.max(mobileSockets - 1, 0);
      }
      app.set('connectedSockets', connectedSockets);
      app.set('mobileClients', mobileSockets);
      io.to('admin').emit('mobile:disconnect', { socketId: socket.id, connectedSockets, mobileSockets });
    });
  });
};

module.exports = setupSocket;
