const prisma = require('../infra/prisma/client');

const listEvents = async () => {
  const events = await prisma.event.findMany({ orderBy: { startAt: 'desc' } });
  return Promise.all(events.map(getEventSummary));
};

const getEventSummary = async (event) => {
  const [sales, openComandas, closedComandas, clients] = await Promise.all([
    prisma.comanda.aggregate({
      where: { eventId: event.id, status: 'fechada' },
      _sum: { total: true }
    }),
    prisma.comanda.count({ where: { eventId: event.id, status: 'aberta' } }),
    prisma.comanda.count({ where: { eventId: event.id, status: 'fechada' } }),
    prisma.comanda.groupBy({
      by: ['clienteCpf'],
      where: { eventId: event.id, clienteCpf: { not: '' } }
    })
  ]);

  return {
    ...event,
    revenue: Number(sales._sum.total || 0),
    openComandas,
    closedComandas,
    clients: clients.length,
    occupancyRate: event.capacity ? Number(((openComandas / event.capacity) * 100).toFixed(1)) : 0
  };
};

const createEvent = async (data) => {
  return prisma.event.create({
    data: {
      name: data.name,
      description: data.description || null,
      location: data.location || null,
      capacity: data.capacity || 0,
      status: data.status || 'planejado',
      startAt: data.startAt ? new Date(data.startAt) : null,
      endAt: data.endAt ? new Date(data.endAt) : null
    }
  });
};

const updateEvent = async (id, data) => {
  await getEvent(id);
  return prisma.event.update({
    where: { id },
    data: {
      name: data.name,
      description: data.description || null,
      location: data.location || null,
      capacity: data.capacity || 0,
      status: data.status,
      startAt: data.startAt ? new Date(data.startAt) : null,
      endAt: data.endAt ? new Date(data.endAt) : null
    }
  });
};

const getEvent = async (id) => {
  const event = await prisma.event.findUnique({ where: { id } });
  if (!event) {
    const error = new Error('Evento nao encontrado');
    error.status = 404;
    throw error;
  }
  return event;
};

const getEventDashboard = async (id) => {
  const event = await getEvent(id);
  const summary = await getEventSummary(event);
  const topProducts = await prisma.pedido.findMany({
    where: {
      cancelado: false,
      comanda: { eventId: id }
    },
    include: { produto: true }
  });

  const productMap = new Map();
  topProducts.forEach((pedido) => {
    const key = pedido.produtoId || pedido.nome;
    const item = productMap.get(key) || {
      produtoId: pedido.produtoId,
      nome: pedido.nome,
      categoria: pedido.produto?.categoria || 'Avulso',
      quantidade: 0,
      faturamento: 0
    };
    item.quantidade += pedido.quantidade;
    item.faturamento += Number(pedido.subtotal || 0);
    productMap.set(key, item);
  });

  return {
    event: summary,
    topProducts: Array.from(productMap.values())
      .sort((a, b) => b.quantidade - a.quantidade)
      .slice(0, 10)
  };
};

const removeEvent = async (id) => {
  await getEvent(id);
  const comandas = await prisma.comanda.count({ where: { eventId: id } });
  if (comandas > 0) {
    const error = new Error('Nao e possivel excluir evento com comandas vinculadas');
    error.status = 400;
    throw error;
  }
  return prisma.event.delete({ where: { id } });
};

module.exports = {
  createEvent,
  getEvent,
  getEventDashboard,
  listEvents,
  removeEvent,
  updateEvent
};
