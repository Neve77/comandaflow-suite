const { Prisma } = require('@prisma/client');
const prisma = require('../infra/prisma/client');

const CASHBACK_RATE = 0.03;

const getTier = (totalSpent, visits) => {
  if (totalSpent >= 2000 || visits >= 20) return 'Diamante';
  if (totalSpent >= 1000 || visits >= 12) return 'Ouro';
  if (totalSpent >= 500 || visits >= 6) return 'Prata';
  return 'Bronze';
};

const calculateReward = (total) => {
  const amount = Number(total || 0);
  return {
    points: Math.floor(amount),
    cashback: Number((amount * CASHBACK_RATE).toFixed(2))
  };
};

const summarizeClient = async (client) => {
  const comandas = await prisma.comanda.findMany({
    where: {
      OR: [
        { clientId: client.id },
        { clienteCpf: client.cpf }
      ],
      status: 'fechada'
    },
    select: { total: true, openedAt: true, closedAt: true }
  });

  const visits = comandas.length;
  const totalSpent = comandas.reduce((sum, comanda) => sum + Number(comanda.total || 0), 0);
  const lastVisit = comandas
    .map((comanda) => comanda.closedAt || comanda.openedAt)
    .sort((a, b) => new Date(b) - new Date(a))[0] || null;

  return {
    visits,
    totalSpent,
    averageTicket: visits ? Number((totalSpent / visits).toFixed(2)) : 0,
    lastVisit,
    tier: getTier(totalSpent, visits)
  };
};

const applyRewardsForClosedComanda = async (tx, comanda, total) => {
  if (!comanda.clientId) return null;
  const reward = calculateReward(total);
  const client = await tx.client.findUnique({ where: { id: comanda.clientId } });
  if (!client) return null;

  const visits = await tx.comanda.count({
    where: {
      clientId: comanda.clientId,
      status: 'fechada'
    }
  });

  const spent = await tx.comanda.aggregate({
    where: {
      clientId: comanda.clientId,
      status: 'fechada'
    },
    _sum: { total: true }
  });

  const totalSpent = Number(spent._sum.total || 0) + Number(total || 0);
  const tier = getTier(totalSpent, visits + 1);

  return tx.client.update({
    where: { id: comanda.clientId },
    data: {
      loyaltyPoints: { increment: reward.points },
      cashbackBalance: { increment: new Prisma.Decimal(reward.cashback) },
      tier
    }
  });
};

const getProgramSummary = async () => {
  const clients = await prisma.client.findMany({ orderBy: { loyaltyPoints: 'desc' } });
  const enriched = await Promise.all(clients.map(async (client) => ({
    ...client,
    ...(await summarizeClient(client)),
    cashbackBalance: Number(client.cashbackBalance || 0)
  })));

  const totalPoints = enriched.reduce((sum, client) => sum + Number(client.loyaltyPoints || 0), 0);
  const totalCashback = enriched.reduce((sum, client) => sum + Number(client.cashbackBalance || 0), 0);
  const vipClients = enriched.filter((client) => ['Ouro', 'Diamante'].includes(client.tier));

  return {
    totalClients: enriched.length,
    totalPoints,
    totalCashback: Number(totalCashback.toFixed(2)),
    vipClients: vipClients.length,
    ranking: enriched.slice(0, 20)
  };
};

const redeemCashback = async ({ cpf, amount }) => {
  const client = await prisma.client.findUnique({ where: { cpf } });
  if (!client) {
    const error = new Error('Cliente nao encontrado');
    error.status = 404;
    throw error;
  }

  const balance = Number(client.cashbackBalance || 0);
  const requested = Number(amount || 0);
  if (requested <= 0 || requested > balance) {
    const error = new Error('Valor de cashback invalido');
    error.status = 400;
    throw error;
  }

  return prisma.client.update({
    where: { cpf },
    data: {
      cashbackBalance: { decrement: new Prisma.Decimal(requested) }
    }
  });
};

module.exports = {
  applyRewardsForClosedComanda,
  calculateReward,
  getProgramSummary,
  getTier,
  redeemCashback,
  summarizeClient
};
