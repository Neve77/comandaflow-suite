const { Prisma } = require('@prisma/client');
const prisma = require('../infra/prisma/client');

const buildDateFilter = (start, end) => {
  const filter = {};
  if (start) filter.gte = new Date(start);
  if (end) filter.lt = new Date(end);
  return Object.keys(filter).length ? filter : undefined;
};

const createMovement = async ({ type, amount, description, formaPagamento = 'dinheiro' }) => {
  return prisma.cashMovement.create({
    data: {
      type,
      formaPagamento: String(formaPagamento).toLowerCase(),
      amount: new Prisma.Decimal(amount),
      description
    }
  });
};

const listMovements = async ({ start, end } = {}) => {
  const dateFilter = buildDateFilter(start, end);
  return prisma.cashMovement.findMany({
    where: dateFilter ? { createdAt: dateFilter } : {},
    orderBy: { createdAt: 'desc' },
    take: 200
  });
};

const getSummary = async ({ start, end } = {}) => {
  const dateFilter = buildDateFilter(start, end);
  const closedWhere = dateFilter ? { closedAt: dateFilter, status: 'fechada' } : { status: 'fechada' };
  const movementsWhere = dateFilter ? { createdAt: dateFilter } : {};
  const cancelledWhere = dateFilter ? { canceladaEm: dateFilter, status: 'cancelada' } : { status: 'cancelada' };

  const [sales, closedCount, closedComandas, movements, cancelledCount] = await Promise.all([
    prisma.comanda.aggregate({ where: closedWhere, _sum: { total: true, desconto: true } }),
    prisma.comanda.count({ where: closedWhere }),
    prisma.comanda.findMany({
      where: closedWhere,
      select: { total: true, formaPagamento: true, desconto: true }
    }),
    prisma.cashMovement.findMany({ where: movementsWhere, orderBy: { createdAt: 'desc' }, take: 100 }),
    prisma.comanda.count({ where: cancelledWhere })
  ]);

  const salesTotal = Number(sales._sum.total || 0);
  const totalDescontos = Number(sales._sum.desconto || 0);

  // O fechamento precisa conservar a composição por meio de pagamento para auditoria.
  let pixTotal = 0;
  let dinheiroTotal = 0;
  let debitoTotal = 0;
  let creditoTotal = 0;
  let outrosTotal = 0;

  closedComandas.forEach((c) => {
    const val = Number(c.total || 0);
    const method = String(c.formaPagamento || 'dinheiro').toLowerCase();
    if (method.includes('pix')) pixTotal += val;
    else if (method.includes('dinheiro')) dinheiroTotal += val;
    else if (method.includes('debito')) debitoTotal += val;
    else if (method.includes('credito')) creditoTotal += val;
    else outrosTotal += val;
  });

  const manualEntries = movements
    .filter((item) => ['entrada', 'abertura'].includes(item.type))
    .reduce((sum, item) => sum + Number(item.amount || 0), 0);

  const exits = movements
    .filter((item) => ['saida', 'sangria', 'fechamento'].includes(item.type))
    .reduce((sum, item) => sum + Number(item.amount || 0), 0);

  return {
    salesTotal: Number(salesTotal.toFixed(2)),
    closedCount,
    cancelledCount,
    totalDescontos: Number(totalDescontos.toFixed(2)),
    pixTotal: Number(pixTotal.toFixed(2)),
    dinheiroTotal: Number(dinheiroTotal.toFixed(2)),
    debitoTotal: Number(debitoTotal.toFixed(2)),
    creditoTotal: Number(creditoTotal.toFixed(2)),
    outrosTotal: Number(outrosTotal.toFixed(2)),
    manualEntries: Number(manualEntries.toFixed(2)),
    exits: Number(exits.toFixed(2)),
    netCash: Number((dinheiroTotal + manualEntries - exits).toFixed(2)), // Saldo em espécie na gaveta
    totalGeral: Number((salesTotal + manualEntries - exits).toFixed(2)),
    averageTicket: closedCount ? Number((salesTotal / closedCount).toFixed(2)) : 0,
    movements: movements.map((item) => ({
      ...item,
      amount: Number(item.amount || 0)
    }))
  };
};

module.exports = { createMovement, getSummary, listMovements };
