const prisma = require('../infra/prisma/client');

const httpError = (message, status = 400) => Object.assign(new Error(message), { status });

const notifications = async () => {
  const now = new Date();
  const inSevenDays = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const [overdueCharges, openTickets, expiringSubscriptions, monitoredClients, clientUpdate] = await Promise.all([
    prisma.billingCharge.count({ where: { status: 'vencida' } }),
    prisma.supportTicket.count({ where: { status: { in: ['aberto', 'em_atendimento'] } } }),
    prisma.subscription.count({
      where: { status: 'ativo', expiresAt: { gte: now, lte: inSevenDays } },
    }),
    monitoring(),
    prisma.systemSetting.findUnique({ where: { key: 'publishedClientUpdate' } }),
  ]);
  const offlineClients = monitoredClients.filter((client) => client.accountStatus === 'ativo' && !client.online).length;
  const items = [];

  if (overdueCharges) {
    items.push({
      id: `billing-overdue-${overdueCharges}`,
      title: 'Cobranças vencidas',
      body: `${overdueCharges} cobrança(s) aguardando regularização.`,
      severity: 'urgente',
      category: 'billing',
    });
  }
  if (offlineClients) {
    items.push({
      id: `clients-offline-${offlineClients}`,
      title: 'Clientes sem conexão',
      body: `${offlineClients} cliente(s) ativo(s) estão offline ou ainda não sincronizaram.`,
      severity: 'aviso',
      category: 'monitoring',
    });
  }
  if (openTickets) {
    items.push({
      id: `support-open-${openTickets}`,
      title: 'Chamados em andamento',
      body: `${openTickets} chamado(s) precisam de acompanhamento.`,
      severity: 'info',
      category: 'support',
    });
  }
  if (expiringSubscriptions) {
    items.push({
      id: `subscriptions-expiring-${expiringSubscriptions}`,
      title: 'Assinaturas próximas do vencimento',
      body: `${expiringSubscriptions} assinatura(s) vencem nos próximos 7 dias.`,
      severity: 'aviso',
      category: 'subscriptions',
    });
  }
  if (clientUpdate) {
    try {
      const published = JSON.parse(clientUpdate.value);
      if (['paused', 'withdrawn'].includes(published?.control?.state)) {
        const state = published.control.state === 'paused' ? 'pausada' : 'retirada';
        items.push({
          id: `update-${published.manifest?.id}-${published.control.state}`,
          title: `Atualização ${state}`,
          body: `A versão ${published.manifest?.version || ''} dos restaurantes está ${state}.`,
          severity: published.control.state === 'withdrawn' ? 'urgente' : 'aviso',
          category: 'updates',
        });
      }
    } catch {
      // Uma configuração antiga inválida não deve impedir as demais notificações.
    }
  }

  return items;
};

const monitoring = async () => {
  const subscribers = await prisma.subscriber.findMany({
    include: {
      subscriptions: {
        where: { status: 'ativo' },
        orderBy: { createdAt: 'desc' },
        include: { installations: { where: { active: true }, orderBy: { lastSeenAt: 'desc' } } },
      },
    },
    orderBy: { businessName: 'asc' },
  });
  const onlineAfter = Date.now() - 3 * 60 * 1000;
  return subscribers.map((subscriber) => {
    const subscription = subscriber.subscriptions[0] || null;
    const installations = subscription?.installations || [];
    const lastSyncAt = installations[0]?.lastSeenAt || null;
    return {
      subscriberId: subscriber.id,
      businessName: subscriber.businessName,
      accountStatus: subscriber.status,
      online: Boolean(lastSyncAt && new Date(lastSyncAt).getTime() >= onlineAfter),
      lastSyncAt,
      appVersion: installations[0]?.appVersion || null,
      activeDevices: installations.length,
      maxDevices: subscription?.maxDevices || 0,
      devices: installations.map((installation) => ({
        id: installation.id,
        installationId: installation.installationId,
        deviceName: installation.deviceName,
        appVersion: installation.appVersion,
        platform: installation.platform,
        ip: installation.ip,
        lastSeenAt: installation.lastSeenAt,
      })),
    };
  });
};

const listMessages = () => prisma.managerMessage.findMany({
  include: {
    subscriber: { select: { id: true, businessName: true } },
    _count: { select: { receipts: true } },
  },
  orderBy: { createdAt: 'desc' },
  take: 200,
});

const sendMessage = async (data, actor) => {
  const subscriberIds = [...new Set(data.subscriberIds || [])];
  const targets = subscriberIds.length ? subscriberIds : [null];
  return prisma.$transaction(targets.map((subscriberId) => prisma.managerMessage.create({
    data: {
      subscriberId,
      title: data.title.trim(),
      body: data.body.trim(),
      severity: data.severity,
      expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
      createdBy: actor?.email || actor?.name || null,
    },
  })));
};

const deactivateMessage = async (id) => {
  const result = await prisma.managerMessage.updateMany({ where: { id }, data: { active: false } });
  if (!result.count) throw httpError('Mensagem não encontrada.', 404);
};

const pendingMessages = (subscriberId, installationId) => prisma.managerMessage.findMany({
  where: {
    active: true,
    AND: [
      { OR: [{ subscriberId: null }, { subscriberId }] },
      { OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] },
      { receipts: { none: { installationId } } },
    ],
  },
  select: { id: true, title: true, body: true, severity: true, createdAt: true, expiresAt: true },
  orderBy: { createdAt: 'asc' },
  take: 20,
});

const acknowledgeMessage = async (messageId, subscriberId, installationId) => {
  const message = await prisma.managerMessage.findFirst({
    where: { id: messageId, OR: [{ subscriberId: null }, { subscriberId }] },
    select: { id: true },
  });
  if (!message) throw httpError('Mensagem não encontrada.', 404);
  return prisma.messageReceipt.upsert({
    where: { messageId_installationId: { messageId, installationId } },
    create: { messageId, installationId },
    update: { seenAt: new Date() },
  });
};

const listTickets = () => prisma.supportTicket.findMany({
  include: {
    subscriber: { select: { id: true, businessName: true, email: true, phone: true } },
    comments: { orderBy: { createdAt: 'asc' } },
  },
  orderBy: [{ status: 'asc' }, { updatedAt: 'desc' }],
  take: 250,
});

const createTicket = async (data, actor) => {
  const subscriber = await prisma.subscriber.findUnique({ where: { id: data.subscriberId }, select: { id: true } });
  if (!subscriber) throw httpError('Assinante não encontrado.', 404);
  return prisma.supportTicket.create({
    data: {
      subscriberId: data.subscriberId,
      subject: data.subject.trim(),
      description: data.description.trim(),
      priority: data.priority,
      comments: data.comment ? { create: { body: data.comment.trim(), authorName: actor?.name || actor?.email } } : undefined,
    },
  });
};

const updateTicket = async (id, data) => {
  const existing = await prisma.supportTicket.findUnique({ where: { id }, select: { id: true } });
  if (!existing) throw httpError('Chamado não encontrado.', 404);
  return prisma.supportTicket.update({
    where: { id },
    data: {
      status: data.status,
      priority: data.priority,
      resolvedAt: ['resolvido', 'fechado'].includes(data.status) ? new Date() : null,
    },
  });
};

const commentTicket = async (ticketId, body, actor) => {
  const existing = await prisma.supportTicket.findUnique({ where: { id: ticketId }, select: { id: true } });
  if (!existing) throw httpError('Chamado não encontrado.', 404);
  return prisma.supportTicketComment.create({
    data: { ticketId, body: body.trim(), authorName: actor?.name || actor?.email || 'Gestor' },
  });
};

module.exports = {
  acknowledgeMessage,
  commentTicket,
  createTicket,
  deactivateMessage,
  listMessages,
  listTickets,
  monitoring,
  notifications,
  pendingMessages,
  sendMessage,
  updateTicket,
};
