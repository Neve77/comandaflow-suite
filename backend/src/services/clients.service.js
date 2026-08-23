const prisma = require('../infra/prisma/client');
const loyaltyService = require('./loyalty.service');

const normalizeCpf = (value) => String(value || '').replace(/\D/g, '');

const upsertClientFromComanda = async (tx, data) => {
  const cpf = normalizeCpf(data.clienteCpf);
  if (!cpf) return null;

  const payload = {
    name: data.clienteNome,
    cpf,
    phone: data.clienteTelefone,
    email: data.clienteEmail || null,
    birthDate: data.clienteNascimento ? new Date(data.clienteNascimento) : null
  };

  const client = await tx.client.upsert({
    where: { cpf },
    update: {
      name: payload.name,
      phone: payload.phone,
      email: payload.email,
      birthDate: payload.birthDate
    },
    create: payload
  });

  if (client.blocked) {
    const error = new Error('Cliente bloqueado para novas comandas');
    error.status = 403;
    throw error;
  }

  return client;
};

const formatClient = async (client) => {
  const summary = await loyaltyService.summarizeClient(client);
  const openComandas = await prisma.comanda.count({
    where: {
      OR: [{ clientId: client.id }, { clienteCpf: client.cpf }],
      status: 'aberta'
    }
  });

  return {
    id: client.id,
    clienteNome: client.name,
    clienteCpf: client.cpf,
    clienteTelefone: client.phone,
    clienteEmail: client.email || '',
    clienteNascimento: client.birthDate,
    blocked: client.blocked,
    notes: client.notes || '',
    loyaltyPoints: client.loyaltyPoints,
    cashbackBalance: Number(client.cashbackBalance || 0),
    tier: summary.tier,
    totalSpent: summary.totalSpent,
    visits: summary.visits,
    averageTicket: summary.averageTicket,
    openComandas,
    lastVisit: summary.lastVisit
  };
};

const importLegacyClients = async () => {
  const legacy = await prisma.comanda.findMany({
    where: {
      clienteCpf: { not: '' },
      clientId: null
    },
    select: {
      id: true,
      clienteNome: true,
      clienteCpf: true,
      clienteTelefone: true,
      clienteEmail: true,
      clienteNascimento: true
    }
  });

  for (const comanda of legacy) {
    await prisma.$transaction(async (tx) => {
      const client = await upsertClientFromComanda(tx, comanda);
      if (client) {
        await tx.comanda.update({
          where: { id: comanda.id },
          data: { clientId: client.id }
        });
      }
    });
  }
};

const listClients = async () => {
  await importLegacyClients();
  const clients = await prisma.client.findMany({ orderBy: { updatedAt: 'desc' } });
  const formatted = await Promise.all(clients.map(formatClient));
  return formatted.sort((a, b) => new Date(b.lastVisit || b.updatedAt || 0) - new Date(a.lastVisit || a.updatedAt || 0));
};

const createOrUpdateClient = async (data) => {
  const cpf = normalizeCpf(data.cpf || data.clienteCpf);
  const client = await prisma.client.upsert({
    where: { cpf },
    update: {
      name: data.name || data.clienteNome,
      phone: data.phone || data.clienteTelefone,
      email: data.email || data.clienteEmail || null,
      birthDate: data.birthDate || data.clienteNascimento ? new Date(data.birthDate || data.clienteNascimento) : null,
      notes: data.notes || null,
      blocked: Boolean(data.blocked)
    },
    create: {
      name: data.name || data.clienteNome,
      cpf,
      phone: data.phone || data.clienteTelefone,
      email: data.email || data.clienteEmail || null,
      birthDate: data.birthDate || data.clienteNascimento ? new Date(data.birthDate || data.clienteNascimento) : null,
      notes: data.notes || null,
      blocked: Boolean(data.blocked)
    }
  });

  return formatClient(client);
};

const setBlocked = async (cpf, blocked) => {
  const client = await prisma.client.update({
    where: { cpf: normalizeCpf(cpf) },
    data: { blocked }
  });
  return formatClient(client);
};

const getClientHistory = async (clienteCpf) => {
  await importLegacyClients();
  const cpf = normalizeCpf(clienteCpf);
  const client = await prisma.client.findUnique({ where: { cpf } });

  const comandas = await prisma.comanda.findMany({
    where: {
      OR: [
        { clienteCpf: cpf },
        client ? { clientId: client.id } : { id: '__none__' }
      ]
    },
    orderBy: { openedAt: 'desc' },
    include: {
      bracelet: { select: { number: true } },
      event: { select: { id: true, name: true } },
      pedidos: {
        where: { cancelado: false },
        select: {
          nome: true,
          quantidade: true,
          valorUnitario: true,
          subtotal: true
        }
      }
    }
  });

  if (!comandas.length && !client) {
    const error = new Error('Cliente nao encontrado ou sem historico de consumo');
    error.status = 404;
    throw error;
  }

  const baseClient = client || {
    name: comandas[0].clienteNome,
    cpf,
    phone: comandas[0].clienteTelefone,
    email: comandas[0].clienteEmail,
    birthDate: comandas[0].clienteNascimento,
    loyaltyPoints: 0,
    cashbackBalance: 0,
    blocked: false,
    notes: ''
  };

  const totalSpent = comandas.reduce((sum, comanda) => sum + Number(comanda.total || 0), 0);
  const visits = comandas.length;

  return {
    clienteNome: baseClient.name,
    clienteCpf: cpf,
    clienteTelefone: baseClient.phone,
    clienteEmail: baseClient.email || '',
    clienteNascimento: baseClient.birthDate,
    blocked: baseClient.blocked,
    notes: baseClient.notes || '',
    loyaltyPoints: baseClient.loyaltyPoints || 0,
    cashbackBalance: Number(baseClient.cashbackBalance || 0),
    tier: loyaltyService.getTier(totalSpent, visits),
    totalSpent,
    visits,
    averageTicket: visits ? Number((totalSpent / visits).toFixed(2)) : 0,
    comandas: comandas.map((comanda) => ({
      id: comanda.id,
      status: comanda.status,
      openedAt: comanda.openedAt,
      closedAt: comanda.closedAt,
      total: Number(comanda.total || 0),
      braceletNumber: comanda.bracelet?.number || '',
      eventName: comanda.event?.name || '',
      pedidos: comanda.pedidos.map((pedido) => ({
        nome: pedido.nome,
        quantidade: pedido.quantidade,
        valorUnitario: Number(pedido.valorUnitario || 0),
        subtotal: Number(pedido.subtotal)
      }))
    }))
  };
};

const getBirthdays = async () => {
  const month = new Date().getMonth();
  const clients = await prisma.client.findMany({
    where: { birthDate: { not: null } },
    orderBy: { name: 'asc' }
  });

  return clients
    .filter((client) => new Date(client.birthDate).getMonth() === month)
    .map((client) => ({
      id: client.id,
      name: client.name,
      cpf: client.cpf,
      phone: client.phone,
      email: client.email,
      birthDate: client.birthDate,
      tier: client.tier
    }));
};

module.exports = {
  createOrUpdateClient,
  getBirthdays,
  getClientHistory,
  listClients,
  setBlocked,
  upsertClientFromComanda
};
