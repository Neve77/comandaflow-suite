const prisma = require('../infra/prisma/client');

const PROFIT_MARGIN = 0.38;

const buildDateFilter = (start, end) => {
  const filter = {};
  if (start) filter.gte = new Date(start);
  if (end) filter.lt = new Date(end);
  return Object.keys(filter).length ? filter : undefined;
};

const buildClosedWhere = ({ start, end, eventId } = {}) => {
  const dateFilter = buildDateFilter(start, end);
  return {
    status: 'fechada',
    ...(dateFilter ? { closedAt: dateFilter } : {}),
    ...(eventId ? { eventId } : {})
  };
};

const buildPedidoWhere = ({ start, end, category, eventId } = {}) => {
  const dateFilter = buildDateFilter(start, end);
  return {
    cancelado: false,
    comanda: {
      status: 'fechada',
      ...(dateFilter ? { closedAt: dateFilter } : {}),
      ...(eventId ? { eventId } : {})
    },
    ...(category ? { produto: { categoria: category } } : {})
  };
};

const formatMoney = (value) => Number(Number(value || 0).toFixed(2));

const getSales = async ({ start, end, eventId } = {}) => {
  const where = buildClosedWhere({ start, end, eventId });

  const sales = await prisma.comanda.aggregate({
    where,
    _sum: { total: true, desconto: true },
    _count: { _all: true }
  });

  const total = formatMoney(sales._sum.total || 0);
  const totalDesconto = formatMoney(sales._sum.desconto || 0);
  const count = sales._count._all;
  const average = count ? formatMoney(total / count) : 0;

  return { total, totalDesconto, count, average };
};

const getPaymentMethodsBreakdown = async ({ start, end, eventId } = {}) => {
  const comandas = await prisma.comanda.findMany({
    where: buildClosedWhere({ start, end, eventId }),
    select: { total: true, formaPagamento: true }
  });

  const map = new Map();
  comandas.forEach((c) => {
    const rawMethod = (c.formaPagamento || 'dinheiro').toLowerCase();
    let method = 'Dinheiro';
    if (rawMethod.includes('pix')) method = 'PIX';
    else if (rawMethod.includes('debito')) method = 'Cartão de Débito';
    else if (rawMethod.includes('credito')) method = 'Cartão de Crédito';
    else if (rawMethod.includes('outros')) method = 'Outros';

    const current = map.get(method) || { forma: method, quantidade: 0, total: 0 };
    current.quantidade += 1;
    current.total += Number(c.total || 0);
    map.set(method, current);
  });

  return Array.from(map.values()).map(m => ({
    ...m,
    total: formatMoney(m.total)
  })).sort((a, b) => b.total - a.total);
};

const getTopProducts = async ({ start, end, category, eventId, take = 15 } = {}) => {
  const pedidos = await prisma.pedido.findMany({
    where: buildPedidoWhere({ start, end, category, eventId }),
    include: { produto: true }
  });

  const map = new Map();
  pedidos.forEach((pedido) => {
    const key = pedido.produtoId || pedido.nome;
    const item = map.get(key) || {
      produtoId: pedido.produtoId,
      nome: pedido.nome,
      categoria: pedido.produto?.categoria || 'Geral',
      quantidade: 0,
      faturamento: 0
    };
    item.quantidade += pedido.quantidade;
    item.faturamento += Number(pedido.subtotal || 0);
    map.set(key, item);
  });

  return Array.from(map.values())
    .map((item) => ({ ...item, faturamento: formatMoney(item.faturamento) }))
    .sort((a, b) => b.quantidade - a.quantidade)
    .slice(0, take);
};

const getDashboard = async () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);

  const [
    salesToday,
    closedComandasToday,
    openComandas,
    braceletsInUse,
    mesasOcupadas,
    totalMesas,
    pedidosEmAndamento,
    recentPedidos,
    lowStock,
    comandasLongas
  ] = await Promise.all([
    prisma.comanda.aggregate({
      where: { closedAt: { gte: today, lt: tomorrow }, status: 'fechada' },
      _sum: { total: true },
      _count: { _all: true }
    }),
    prisma.comanda.findMany({
      where: { closedAt: { gte: today, lt: tomorrow }, status: 'fechada' },
      select: { total: true, formaPagamento: true }
    }),
    prisma.comanda.count({ where: { status: 'aberta' } }),
    prisma.bracelet.count({ where: { status: 'em_uso' } }),
    prisma.mesa.count({ where: { status: 'ocupada' } }),
    prisma.mesa.count(),
    prisma.pedido.count({
      where: {
        cancelado: false,
        status: { in: ['pendente', 'em_preparo'] },
        comanda: { status: 'aberta' }
      }
    }),
    prisma.pedido.findMany({
      where: { cancelado: false },
      orderBy: { createdAt: 'desc' },
      take: 8,
      include: { comanda: { include: { mesa: true } } }
    }),
    prisma.produto.count({ where: { estoque: { lte: 8 }, ativo: true } }),
    prisma.comanda.findMany({
      where: { status: 'aberta', openedAt: { lte: twoHoursAgo } },
      include: { mesa: true },
      take: 3
    })
  ]);

  const totalSoldToday = formatMoney(salesToday._sum.total || 0);
  const comandasFechadasHoje = salesToday._count._all;

  // O painel diário apresenta a composição por meio de pagamento.
  let pixToday = 0;
  let dinheiroToday = 0;
  let cartaoToday = 0;

  closedComandasToday.forEach(c => {
    const val = Number(c.total || 0);
    const m = (c.formaPagamento || 'dinheiro').toLowerCase();
    if (m.includes('pix')) pixToday += val;
    else if (m.includes('dinheiro')) dinheiroToday += val;
    else cartaoToday += val;
  });

  return {
    totalSoldToday,
    pixToday: formatMoney(pixToday),
    dinheiroToday: formatMoney(dinheiroToday),
    cartaoToday: formatMoney(cartaoToday),
    comandasFechadasHoje,
    ticketMedioHoje: comandasFechadasHoje ? formatMoney(totalSoldToday / comandasFechadasHoje) : 0,
    comandasAberta: openComandas,
    braceletsInUse,
    mesasOcupadas,
    totalMesas: totalMesas || 10,
    pedidosEmAndamento,
    lowStock,
    comandasLongas: comandasLongas.map(c => ({
      id: c.id,
      mesaNumero: c.mesa?.numero || 'Sem mesa',
      openedAt: c.openedAt,
      total: Number(c.total || 0)
    })),
    recentPedidos: recentPedidos.map((pedido) => ({
      id: pedido.id,
      comandaId: pedido.comandaId,
      mesaNumero: pedido.comanda?.mesa?.numero || null,
      nome: pedido.nome,
      quantidade: pedido.quantidade,
      subtotal: Number(pedido.subtotal),
      observacao: pedido.observacao || '',
      status: pedido.status || 'pendente',
      createdAt: pedido.createdAt
    }))
  };
};

const getRevenueByPeriod = async ({ start, end, eventId } = {}) => {
  const comandas = await prisma.comanda.findMany({
    where: buildClosedWhere({ start, end, eventId }),
    orderBy: { closedAt: 'asc' },
    select: { closedAt: true, total: true }
  });

  const map = new Map();
  comandas.forEach((comanda) => {
    const key = new Date(comanda.closedAt).toISOString().slice(0, 10);
    const item = map.get(key) || { period: key, total: 0, count: 0 };
    item.total += Number(comanda.total || 0);
    item.count += 1;
    map.set(key, item);
  });

  return Array.from(map.values()).map((item) => ({
    ...item,
    total: formatMoney(item.total)
  }));
};

const getCategoryConsumption = async ({ start, end, eventId } = {}) => {
  const pedidos = await prisma.pedido.findMany({
    where: buildPedidoWhere({ start, end, eventId }),
    include: { produto: true }
  });

  const map = new Map();
  pedidos.forEach((pedido) => {
    const category = pedido.produto?.categoria || 'Geral';
    const item = map.get(category) || { categoria: category, quantidade: 0, faturamento: 0 };
    item.quantidade += pedido.quantidade;
    item.faturamento += Number(pedido.subtotal || 0);
    map.set(category, item);
  });

  return Array.from(map.values())
    .map((item) => ({ ...item, faturamento: formatMoney(item.faturamento) }))
    .sort((a, b) => b.faturamento - a.faturamento);
};

const getFlowByHour = async ({ start, end, eventId } = {}) => {
  const dateFilter = buildDateFilter(start, end);
  const where = {
    ...(dateFilter ? { openedAt: dateFilter } : {}),
    ...(eventId ? { eventId } : {})
  };
  const comandas = await prisma.comanda.findMany({
    where,
    select: { openedAt: true, closedAt: true }
  });

  const hours = Array.from({ length: 24 }, (_, hour) => ({ hour, entries: 0, exits: 0 }));
  comandas.forEach((comanda) => {
    hours[new Date(comanda.openedAt).getHours()].entries += 1;
    if (comanda.closedAt) {
      hours[new Date(comanda.closedAt).getHours()].exits += 1;
    }
  });

  return hours;
};

const getPreviousPeriodSales = async ({ start, end, eventId } = {}) => {
  if (!start || !end) return { total: 0, count: 0, average: 0 };
  const startDate = new Date(start);
  const endDate = new Date(end);
  const duration = endDate.getTime() - startDate.getTime();
  if (duration <= 0) return { total: 0, count: 0, average: 0 };
  const previousEnd = new Date(startDate);
  const previousStart = new Date(startDate.getTime() - duration);
  return getSales({ start: previousStart.toISOString(), end: previousEnd.toISOString(), eventId });
};

const getPeakHour = (flow) => {
  return flow.reduce((best, item) => {
    const score = item.entries + item.exits;
    return score > best.score ? { hour: item.hour, score } : best;
  }, { hour: null, score: 0 });
};

const getInsights = ({ sales, previousSales, topProducts, paymentMethods, flow }) => {
  const topProduct = topProducts[0] || null;
  const topPayment = paymentMethods[0] || null;
  const peakHour = getPeakHour(flow);
  const growth = previousSales.total
    ? Number((((sales.total - previousSales.total) / previousSales.total) * 100).toFixed(1))
    : null;

  return [
    topProduct ? `Produto mais vendido: ${topProduct.nome}, com ${topProduct.quantidade} unidade(s) vendida(s).` : 'Nenhum produto vendido no período selecionado.',
    topPayment ? `Forma de pagamento predominante: ${topPayment.forma} (R$ ${topPayment.total.toFixed(2)}).` : 'Sem registros de pagamento no período.',
    peakHour.hour !== null ? `Horário de maior movimento operacional: ${String(peakHour.hour).padStart(2, '0')}:00h.` : 'Volume insuficiente para identificar horário de pico.',
    growth === null ? 'Comparativo de crescimento não calculado para período único.' : `Variação em relação ao período anterior: ${growth >= 0 ? '+' : ''}${growth}%.`
  ];
};

const getCompleteReport = async ({ start, end, category, eventId } = {}) => {
  const [sales, previousSales, topProducts, revenueByPeriod, categoryConsumption, paymentMethods, flow] = await Promise.all([
    getSales({ start, end, eventId }),
    getPreviousPeriodSales({ start, end, eventId }),
    getTopProducts({ start, end, category, eventId, take: 20 }),
    getRevenueByPeriod({ start, end, eventId }),
    getCategoryConsumption({ start, end, eventId }),
    getPaymentMethodsBreakdown({ start, end, eventId }),
    getFlowByHour({ start, end, eventId })
  ]);

  const [productsTotal, lowStockCount] = await Promise.all([
    prisma.produto.count({ where: { ativo: true } }),
    prisma.produto.count({ where: { estoque: { lte: 8 }, ativo: true } })
  ]);

  const executive = {
    receitaTotal: sales.total,
    totalDescontos: sales.totalDesconto || 0,
    receitaLiquida: sales.total,
    pedidosTotal: sales.count,
    comandasFechadas: sales.count,
    ticketMedio: sales.average,
    lucroEstimado: formatMoney(sales.total * PROFIT_MARGIN),
    crescimentoPercentual: previousSales.total
      ? Number((((sales.total - previousSales.total) / previousSales.total) * 100).toFixed(1))
      : null
  };

  const insights = getInsights({ sales, previousSales, topProducts, paymentMethods, flow });

  return {
    generatedAt: new Date().toISOString(),
    filters: { start, end, category, eventId },
    executive,
    sales,
    previousSales,
    topProducts,
    paymentMethods,
    revenueByPeriod,
    categoryConsumption,
    flow,
    productsTotal,
    lowStockCount,
    insights
  };
};

module.exports = {
  getCategoryConsumption,
  getCompleteReport,
  getDashboard,
  getFlowByHour,
  getRevenueByPeriod,
  getSales,
  getTopProducts,
  getPaymentMethodsBreakdown
};
