const crypto = require('crypto');
const prisma = require('../infra/prisma/client');
const licenseService = require('./license.service');
const managerSettings = require('./manager-settings.service');
const billingService = require('./billing.service');

const subscriberInclude = {
  subscriptions: {
    orderBy: { createdAt: 'desc' },
    include: { installations: { orderBy: { lastSeenAt: 'desc' } } },
  },
};

const normalizeEmail = (email) => String(email || '').trim().toLowerCase();

const refreshExpired = () => prisma.subscription.updateMany({
  where: { status: 'ativo', expiresAt: { lt: new Date() } },
  data: { status: 'expirado' },
});

const summary = async () => {
  await refreshExpired();
  const [total, active, suspended, expiringSoon] = await Promise.all([
    prisma.subscriber.count(),
    prisma.subscriber.count({ where: { status: 'ativo' } }),
    prisma.subscriber.count({ where: { status: 'suspenso' } }),
    prisma.subscription.count({
      where: {
        status: 'ativo',
        expiresAt: { gte: new Date(), lte: new Date(Date.now() + 7 * 86400000) },
      },
    }),
  ]);
  return { total, active, suspended, expiringSoon };
};

const list = async ({ search, status } = {}) => {
  await refreshExpired();
  const where = {};
  if (status && status !== 'todos') where.status = status;
  if (search) {
    where.OR = [
      { businessName: { contains: search } },
      { contactName: { contains: search } },
      { email: { contains: search } },
      { document: { contains: search } },
    ];
  }
  return prisma.subscriber.findMany({
    where,
    include: subscriberInclude,
    orderBy: { createdAt: 'desc' },
  });
};

const create = async (data) => {
  const email = normalizeEmail(data.email);
  const existing = await prisma.subscriber.findUnique({ where: { email } });
  if (existing) {
    const error = new Error('Ja existe um assinante com este e-mail.');
    error.status = 409;
    throw error;
  }
  return prisma.subscriber.create({
    data: {
      businessName: data.businessName.trim(),
      contactName: data.contactName?.trim() || null,
      email,
      phone: data.phone?.trim() || null,
      document: data.document?.trim() || null,
      notes: data.notes?.trim() || null,
    },
    include: subscriberInclude,
  });
};

const update = async (id, data) => {
  const current = await prisma.subscriber.findUnique({ where: { id } });
  if (!current) {
    const error = new Error('Assinante nao encontrado.');
    error.status = 404;
    throw error;
  }
  const values = {};
  for (const field of ['businessName', 'contactName', 'phone', 'document', 'notes']) {
    if (data[field] !== undefined) values[field] = data[field]?.trim() || null;
  }
  if (data.email !== undefined) values.email = normalizeEmail(data.email);

  return prisma.subscriber.update({
    where: { id },
    data: values,
    include: subscriberInclude,
  });
};

const issue = async (subscriberId, { plan, days, maxDevices }) => {
  const subscriber = await prisma.subscriber.findUnique({ where: { id: subscriberId } });
  if (!subscriber) {
    const error = new Error('Assinante nao encontrado.');
    error.status = 404;
    throw error;
  }
  if (subscriber.status !== 'ativo') {
    const error = new Error('Ative o assinante antes de emitir uma assinatura.');
    error.status = 400;
    throw error;
  }

  const settings = await managerSettings.get();
  if (!settings.publicServerUrl) {
    const error = new Error('Configure o endereco HTTPS do seu servidor antes de emitir uma assinatura online.');
    error.status = 400;
    throw error;
  }
  try {
    const serverUrl = new URL(settings.publicServerUrl);
    const localHosts = new Set(['localhost', '127.0.0.1', '0.0.0.0', '::1']);
    const localAllowed = process.env.NODE_ENV === 'test' || process.env.COMANDAFLOW_ALLOW_LOCAL_SERVER === 'true';
    if (!localAllowed && (serverUrl.protocol !== 'https:' || localHosts.has(serverUrl.hostname))) {
      throw new Error('invalid');
    }
  } catch {
    const error = new Error('Configure um endereco HTTPS publico do tunel antes de emitir a chave. 127.0.0.1 funciona somente neste computador.');
    error.status = 400;
    throw error;
  }

  const subscriptionId = crypto.randomUUID();
  const startsAt = new Date();
  const expiresAt = new Date(startsAt.getTime() + Number(days) * 86400000);
  const generated = licenseService.generateLicenseKey({
    licenseId: subscriptionId,
    subscriberId,
    clientName: subscriber.businessName,
    plan,
    startsAt,
    expiresAt,
    maxDevices,
    serverUrl: settings.publicServerUrl,
    offlineGraceHours: settings.offlineGraceHours,
    syncIntervalMinutes: settings.syncIntervalMinutes,
  });

  return prisma.$transaction(async (transaction) => {
    await transaction.subscription.updateMany({
      where: { subscriberId, status: 'ativo' },
      data: { status: 'substituido' },
    });
    return transaction.subscription.create({
      data: {
        id: subscriptionId,
        subscriberId,
        plan,
        startsAt,
        expiresAt,
        maxDevices,
        licenseKey: generated.licenseKey,
      },
    });
  });
};

const suspend = async (id, { mode, accessUntil, message }) => {
  const subscriber = await prisma.subscriber.findUnique({ where: { id } });
  if (!subscriber) {
    const error = new Error('Assinante nao encontrado.');
    error.status = 404;
    throw error;
  }

  let deadline = new Date();
  if (mode === 'prazo') {
    deadline = new Date(accessUntil);
    if (Number.isNaN(deadline.getTime()) || deadline <= new Date()) {
      const error = new Error('Escolha uma data futura para o prazo de pagamento.');
      error.status = 400;
      throw error;
    }
  }

  return prisma.subscriber.update({
    where: { id },
    data: {
      status: 'suspenso',
      suspensionMode: mode,
      suspensionSource: 'manual',
      accessUntil: deadline,
      customerMessage: message.trim(),
      suspendedAt: new Date(),
    },
    include: subscriberInclude,
  });
};

const reactivate = async (id) => {
  if (await billingService.hasBlockingOverdue(id)) {
    const error = new Error('Regularize ou cancele as cobranças vencidas antes de reativar o acesso.');
    error.status = 409;
    throw error;
  }
  return prisma.subscriber.update({
    where: { id },
    data: { status: 'ativo', suspensionMode: null, suspensionSource: null, accessUntil: null, customerMessage: null, suspendedAt: null },
    include: subscriberInclude,
  });
};

const cancelSubscriber = async (id, { message }) => prisma.subscriber.update({
  where: { id },
  data: {
    status: 'cancelado',
    suspensionMode: 'imediato',
    suspensionSource: 'manual',
    accessUntil: new Date(),
    customerMessage: message.trim(),
    suspendedAt: new Date(),
    recurringBillingEnabled: false,
    recurringAmount: null,
    billingCycleDays: null,
    nextBillingDate: null,
  },
  include: subscriberInclude,
});

const cancelSubscription = async (id) => prisma.subscription.update({
  where: { id },
  data: { status: 'cancelado' },
});

module.exports = {
  cancelSubscriber,
  cancelSubscription,
  create,
  getSettings: managerSettings.get,
  issue,
  list,
  reactivate,
  saveSettings: managerSettings.save,
  summary,
  suspend,
  update,
};
