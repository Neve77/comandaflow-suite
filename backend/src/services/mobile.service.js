const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
const { Prisma } = require('@prisma/client');
const prisma = require('../infra/prisma/client');
const clientsService = require('./clients.service');
const comandasService = require('./comandas.service');
const pedidosService = require('./pedidos.service');
const braceletsService = require('./bracelets.service');
const productsService = require('./products.service');
const auditService = require('./audit.service');

dotenv.config();

const WAITER_ROLE = 'garcom';
const DEFAULT_PIN = process.env.MOBILE_WAITER_PIN || '1234';
const TOKEN_TTL = process.env.MOBILE_TOKEN_TTL || '8h';

const normalizeDigits = (value) => String(value || '').replace(/\D/g, '');

const publicUser = (user) => ({
  id: user?.id || null,
  name: user?.name || 'Garcom',
  email: user?.email || null,
  role: WAITER_ROLE
});

const signMobileToken = (payload) => jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: TOKEN_TTL });

const loginWithPin = async ({ pin, ip, device }) => {
  if (String(pin || '') !== DEFAULT_PIN) {
    const error = new Error('PIN invalido');
    error.status = 401;
    throw error;
  }

  const token = signMobileToken({ userId: null, role: WAITER_ROLE, scope: 'mobile' });
  await auditService.writeAudit({
    action: 'mobile:login:pin',
    entity: 'User',
    metadata: { method: 'pin' },
    ip,
    device
  });

  return { token, user: publicUser(null), expiresIn: TOKEN_TTL };
};

const loginWithCredentials = async ({ email, password, ip, device }) => {
  const authService = require('./auth.service');
  const result = await authService.login(email, password);
  if (result.user.role !== WAITER_ROLE) {
    const error = new Error('Acesso mobile permitido apenas para garcom');
    error.status = 403;
    throw error;
  }

  await auditService.writeAudit({
    userId: result.user.id,
    action: 'mobile:login:credentials',
    entity: 'User',
    entityId: result.user.id,
    metadata: { email },
    ip,
    device
  });

  return { ...result, expiresIn: TOKEN_TTL };
};

const login = async ({ pin, email, password, ip, device }) => {
  if (pin) return loginWithPin({ pin, ip, device });
  return loginWithCredentials({ email, password, ip, device });
};

const requireWaiter = (user) => {
  if (!user || user.role !== WAITER_ROLE) {
    const error = new Error('Acesso restrito a garcom');
    error.status = 403;
    throw error;
  }
};

const waiterContext = ({ user, ip, device }) => {
  requireWaiter(user);
  return {
    userId: user.userId || null,
    ip,
    device
  };
};

const dashboard = async () => {
  const start = new Date();
  start.setHours(0, 0, 0, 0);

  const [openComandas, pedidosHoje, clientesHoje, pulseirasAtivas] = await Promise.all([
    prisma.comanda.count({ where: { status: 'aberta' } }),
    prisma.pedido.count({ where: { createdAt: { gte: start }, cancelado: false } }),
    prisma.comanda.findMany({
      where: { openedAt: { gte: start } },
      distinct: ['clienteCpf'],
      select: { clienteCpf: true }
    }),
    prisma.bracelet.count({ where: { status: 'em_uso' } })
  ]);

  return {
    openComandas,
    pedidosHoje,
    clientesAtendidosHoje: clientesHoje.filter((item) => item.clienteCpf).length,
    pulseirasAtivas
  };
};

const listClients = async ({ q = '' } = {}) => {
  const query = String(q || '').trim();
  const digits = normalizeDigits(query);
  const where = query
    ? {
        OR: [
          { name: { contains: query } },
          { phone: { contains: digits || query } },
          { cpf: { contains: digits || query } }
        ]
      }
    : {};

  return prisma.client.findMany({
    where,
    orderBy: { updatedAt: 'desc' },
    take: 20
  });
};

const listBracelets = async ({ q = '', status } = {}) => {
  return prisma.bracelet.findMany({
    where: {
      ...(q ? { number: { contains: String(q).trim() } } : {}),
      ...(status ? { status } : {})
    },
    orderBy: { updatedAt: 'desc' },
    take: 30,
    include: {
      comandas: {
        where: { status: 'aberta' },
        take: 1,
        include: { client: true, pedidos: { where: { cancelado: false } } }
      }
    }
  });
};

const listProducts = async ({ q = '', categoria } = {}) => {
  const products = await productsService.listAll();
  const query = String(q || '').trim().toLowerCase();
  return products
    .filter((product) => product.ativo)
    .filter((product) => !categoria || product.categoria === categoria)
    .filter((product) => !query || product.nome.toLowerCase().includes(query))
    .slice(0, 80);
};

const listOpenComandas = () => comandasService.listOpenComandas();

const searchComandas = async ({ q = '' } = {}) => {
  const query = String(q || '').trim();
  const digits = normalizeDigits(query);

  return prisma.comanda.findMany({
    where: query
      ? {
          OR: [
            { id: { contains: query } },
            { clienteNome: { contains: query } },
            { clienteCpf: { contains: digits || query } },
            { clienteTelefone: { contains: digits || query } },
            { bracelet: { number: { contains: query.replace(/^#/, '') } } }
          ]
        }
      : { status: 'aberta' },
    orderBy: { openedAt: 'desc' },
    take: 20,
    include: {
      bracelet: true,
      client: true,
      pedidos: { where: { cancelado: false }, orderBy: { createdAt: 'desc' } }
    }
  });
};

const universalSearch = async ({ q }) => {
  const [clients, bracelets, comandas] = await Promise.all([
    listClients({ q }),
    listBracelets({ q }),
    searchComandas({ q })
  ]);

  return {
    clients: clients.slice(0, 8),
    bracelets: bracelets.slice(0, 8),
    comandas: comandas.slice(0, 8)
  };
};

const createClient = async ({ data, user, ip, device }) => {
  const ctx = waiterContext({ user, ip, device });
  const client = await clientsService.createOrUpdateClient(data);
  await auditService.writeAudit({
    ...ctx,
    action: 'mobile:cliente:criar',
    entity: 'Client',
    entityId: client.id,
    metadata: { cpf: client.clienteCpf }
  });
  return client;
};

const openComanda = async ({ data, user, ip, device }) => {
  const ctx = waiterContext({ user, ip, device });
  const comanda = await comandasService.openComanda({ ...data, userId: ctx.userId });
  await auditService.writeAudit({
    ...ctx,
    action: 'mobile:comanda:abrir',
    entity: 'Comanda',
    entityId: comanda.id,
    metadata: { bracelet: data.number, clienteCpf: data.clienteCpf }
  });
  return comandasService.getComanda(comanda.id);
};

const createPedido = async ({ data, user, ip, device }) => {
  const ctx = waiterContext({ user, ip, device });
  const pedido = await pedidosService.createPedido(data);
  await auditService.writeAudit({
    ...ctx,
    action: 'mobile:pedido:criar',
    entity: 'Pedido',
    entityId: pedido.id,
    metadata: { comandaId: data.comandaId, produtoId: data.produtoId, quantidade: data.quantidade }
  });
  return pedido;
};

const getComanda = ({ id }) => comandasService.getComanda(id);

const bindBracelet = async ({ comandaId, braceletNumber, user, ip, device }) => {
  const ctx = waiterContext({ user, ip, device });
  const bracelet = await prisma.bracelet.findUnique({ where: { number: braceletNumber } });
  if (!bracelet) {
    const error = new Error('Pulseira nao encontrada');
    error.status = 404;
    throw error;
  }
  if (bracelet.status !== 'livre') {
    const error = new Error('Pulseira nao esta livre');
    error.status = 400;
    throw error;
  }

  const comanda = await prisma.comanda.findUnique({ where: { id: comandaId } });
  if (!comanda || comanda.status !== 'aberta') {
    const error = new Error('Comanda aberta nao encontrada');
    error.status = 404;
    throw error;
  }

  const updated = await prisma.$transaction(async (tx) => {
    await tx.bracelet.update({ where: { id: comanda.braceletId }, data: { status: 'livre' } });
    await tx.bracelet.update({ where: { id: bracelet.id }, data: { status: 'em_uso' } });
    return tx.comanda.update({
      where: { id: comandaId },
      data: { braceletId: bracelet.id },
      include: { bracelet: true, client: true, pedidos: { where: { cancelado: false } } }
    });
  });

  await auditService.writeAudit({
    ...ctx,
    action: 'mobile:pulseira:vincular',
    entity: 'Comanda',
    entityId: comandaId,
    metadata: { braceletNumber }
  });

  return updated;
};

const releaseBracelet = async ({ id, user, ip, device }) => {
  const ctx = waiterContext({ user, ip, device });
  const bracelet = await braceletsService.updateStatus(id, 'livre');
  await auditService.writeAudit({
    ...ctx,
    action: 'mobile:pulseira:liberar',
    entity: 'Bracelet',
    entityId: id
  });
  return bracelet;
};

const updateBraceletStatus = async ({ id, status, user, ip, device }) => {
  const ctx = waiterContext({ user, ip, device });
  const bracelet = await braceletsService.updateStatus(id, status);
  await auditService.writeAudit({
    ...ctx,
    action: `mobile:pulseira:${status}`,
    entity: 'Bracelet',
    entityId: id
  });
  return bracelet;
};

const toPlain = (value) => JSON.parse(JSON.stringify(value, (_, item) => (
  item instanceof Prisma.Decimal ? Number(item) : item
)));

module.exports = {
  bindBracelet,
  createClient,
  createPedido,
  dashboard,
  getComanda,
  listBracelets,
  listClients,
  listOpenComandas,
  listProducts,
  login,
  openComanda,
  releaseBracelet,
  requireWaiter,
  searchComandas,
  toPlain,
  updateBraceletStatus,
  universalSearch,
  WAITER_ROLE
};
