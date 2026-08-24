const prisma = require('../infra/prisma/client');
const managerSettings = require('./manager-settings.service');

const DAY_MS = 24 * 60 * 60 * 1000;
let processing = null;
let lastProcessedAt = 0;

const chargeInclude = {
  subscriber: { select: { id: true, businessName: true, status: true, suspensionSource: true } },
  events: { orderBy: { createdAt: 'desc' } },
};

const httpError = (message, status = 400) => Object.assign(new Error(message), { status });
const addDays = (date, days) => new Date(date.getTime() + Number(days) * DAY_MS);
const recurrenceKey = (subscriberId, dueDate) => `${subscriberId}:${dueDate.toISOString().slice(0, 10)}`;

const generateRecurringCharges = async (now = new Date()) => {
  const subscribers = await prisma.subscriber.findMany({
    where: {
      recurringBillingEnabled: true,
      recurringAmount: { not: null },
      nextBillingDate: { lte: now },
      status: { not: 'cancelado' },
    },
    include: { subscriptions: { where: { status: 'ativo' }, orderBy: { createdAt: 'desc' }, take: 1 } },
  });

  let generated = 0;
  for (const subscriber of subscribers) {
    const cycleDays = Math.max(1, Number(subscriber.billingCycleDays || 30));
    let dueDate = new Date(subscriber.nextBillingDate);
    let iterations = 0;
    await prisma.$transaction(async (transaction) => {
      while (dueDate <= now && iterations < 24) {
        const key = recurrenceKey(subscriber.id, dueDate);
        const existing = await transaction.billingCharge.findUnique({
          where: { recurrenceKey: key },
          select: { id: true },
        });
        if (!existing) {
          const status = dueDate < now ? 'vencida' : 'pendente';
          await transaction.billingCharge.create({
            data: {
              subscriberId: subscriber.id,
              subscriptionId: subscriber.subscriptions[0]?.id || null,
              amount: subscriber.recurringAmount,
              dueDate,
              status,
              description: 'Mensalidade recorrente',
              recurrenceKey: key,
              events: {
                create: {
                  type: 'recorrencia',
                  toStatus: status,
                  message: 'Cobrança recorrente gerada automaticamente.',
                },
              },
            },
          });
          generated += 1;
        }
        dueDate = addDays(dueDate, cycleDays);
        iterations += 1;
      }
      await transaction.subscriber.update({
        where: { id: subscriber.id },
        data: { nextBillingDate: dueDate },
      });
    });
  }
  return generated;
};

const processOverdueCharges = async ({ force = false, now = new Date() } = {}) => {
  if (!force && Date.now() - lastProcessedAt < 30000) return null;
  if (processing) return processing;

  processing = (async () => {
    const settings = await managerSettings.get();
    const generated = await generateRecurringCharges(now);
    const expired = await prisma.billingCharge.findMany({
      where: { status: 'pendente', dueDate: { lt: now } },
      select: { id: true },
    });
    for (const charge of expired) {
      await prisma.$transaction(async (transaction) => {
        const changed = await transaction.billingCharge.updateMany({
          where: { id: charge.id, status: 'pendente' },
          data: { status: 'vencida' },
        });
        if (changed.count) {
          await transaction.billingEvent.create({
            data: {
              chargeId: charge.id,
              type: 'vencimento',
              fromStatus: 'pendente',
              toStatus: 'vencida',
              message: 'Cobrança vencida.',
            },
          });
        }
      });
    }

    let suspended = 0;
    if (settings.automaticSuspensionEnabled) {
      const cutoff = new Date(now.getTime() - Number(settings.paymentGraceDays) * DAY_MS);
      const blocking = await prisma.billingCharge.findMany({
        where: { status: 'vencida', dueDate: { lte: cutoff }, subscriber: { status: 'ativo' } },
        orderBy: { dueDate: 'asc' },
      });
      const firstBySubscriber = new Map();
      for (const charge of blocking) {
        if (!firstBySubscriber.has(charge.subscriberId)) firstBySubscriber.set(charge.subscriberId, charge);
      }
      for (const charge of firstBySubscriber.values()) {
        await prisma.$transaction(async (transaction) => {
          const changed = await transaction.subscriber.updateMany({
            where: { id: charge.subscriberId, status: 'ativo' },
            data: {
              status: 'suspenso',
              suspensionMode: 'imediato',
              suspensionSource: 'inadimplencia',
              accessUntil: now,
              suspendedAt: now,
              customerMessage: settings.defaultSuspensionMessage,
            },
          });
          if (changed.count) {
            suspended += 1;
            await transaction.billingEvent.create({
              data: {
                chargeId: charge.id,
                type: 'suspensao_automatica',
                fromStatus: 'vencida',
                toStatus: 'vencida',
                message: `Acesso suspenso após ${settings.paymentGraceDays} dia(s) de tolerância.`,
              },
            });
          }
        });
      }
    }
    lastProcessedAt = Date.now();
    return { generated, overdue: expired.length, suspended };
  })().finally(() => { processing = null; });

  return processing;
};

const hasBlockingOverdue = async (subscriberId, now = new Date()) => {
  const settings = await managerSettings.get();
  if (!settings.automaticSuspensionEnabled) return false;
  const cutoff = new Date(now.getTime() - Number(settings.paymentGraceDays) * DAY_MS);
  return Boolean(await prisma.billingCharge.findFirst({
    where: { subscriberId, status: 'vencida', dueDate: { lte: cutoff } },
    select: { id: true },
  }));
};

const reactivateIfSettled = async (subscriberId) => {
  const subscriber = await prisma.subscriber.findUnique({ where: { id: subscriberId } });
  if (subscriber?.status !== 'suspenso' || subscriber.suspensionSource !== 'inadimplencia') return false;
  if (await hasBlockingOverdue(subscriberId)) return false;
  await prisma.subscriber.update({
    where: { id: subscriberId },
    data: {
      status: 'ativo',
      suspensionMode: null,
      suspensionSource: null,
      accessUntil: null,
      customerMessage: null,
      suspendedAt: null,
    },
  });
  return true;
};

const list = async ({ subscriberId, status, search } = {}) => {
  await processOverdueCharges();
  const where = {};
  if (subscriberId) where.subscriberId = subscriberId;
  if (status && status !== 'todos') where.status = status;
  if (search) where.subscriber = { businessName: { contains: search } };
  return prisma.billingCharge.findMany({
    where,
    include: chargeInclude,
    orderBy: [{ dueDate: 'desc' }, { createdAt: 'desc' }],
    take: 250,
  });
};

const summary = async () => {
  await processOverdueCharges();
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const [pending, overdue, outstanding, received, cancelled, recurring, cancelledSubscribers] = await Promise.all([
    prisma.billingCharge.count({ where: { status: 'pendente' } }),
    prisma.billingCharge.count({ where: { status: 'vencida' } }),
    prisma.billingCharge.aggregate({ where: { status: { in: ['pendente', 'vencida'] } }, _sum: { amount: true } }),
    prisma.billingCharge.aggregate({ where: { status: 'paga', paidAt: { gte: monthStart } }, _sum: { amount: true } }),
    prisma.billingCharge.count({ where: { status: 'cancelada', updatedAt: { gte: monthStart } } }),
    prisma.subscriber.findMany({
      where: { recurringBillingEnabled: true, status: { not: 'cancelado' } },
      select: { recurringAmount: true, billingCycleDays: true },
    }),
    prisma.subscriber.count({ where: { status: 'cancelado' } }),
  ]);
  return {
    pending,
    overdue,
    cancelledThisMonth: cancelled,
    cancelledSubscribers,
    outstandingTotal: Number(outstanding._sum.amount || 0),
    receivedThisMonth: Number(received._sum.amount || 0),
    recurringMonthly: recurring.reduce((total, subscriber) => total + (Number(subscriber.recurringAmount || 0) * 30) / Number(subscriber.billingCycleDays || 30), 0),
  };
};

const configureRecurrence = async (subscriberId, data) => {
  const subscriber = await prisma.subscriber.findUnique({ where: { id: subscriberId }, select: { id: true, status: true } });
  if (!subscriber) throw httpError('Assinante não encontrado.', 404);
  if (data.enabled && subscriber.status === 'cancelado') throw httpError('Não é possível ativar recorrência para uma conta cancelada.');
  return prisma.subscriber.update({
    where: { id: subscriberId },
    data: data.enabled ? {
      recurringBillingEnabled: true,
      recurringAmount: data.amount,
      billingCycleDays: data.billingCycleDays,
      nextBillingDate: new Date(data.nextBillingDate),
    } : {
      recurringBillingEnabled: false,
      recurringAmount: null,
      billingCycleDays: null,
      nextBillingDate: null,
    },
  });
};

const create = async (subscriberId, data) => {
  const subscriber = await prisma.subscriber.findUnique({
    where: { id: subscriberId },
    include: { subscriptions: { where: { status: 'ativo' }, take: 1 } },
  });
  if (!subscriber) throw httpError('Assinante não encontrado.', 404);
  if (subscriber.status === 'cancelado') throw httpError('Não é possível cobrar uma conta cancelada.');
  const dueDate = new Date(data.dueDate);
  const status = dueDate < new Date() ? 'vencida' : 'pendente';
  const charge = await prisma.$transaction(async (transaction) => {
    const created = await transaction.billingCharge.create({
      data: {
        subscriberId,
        subscriptionId: data.subscriptionId || subscriber.subscriptions[0]?.id || null,
        amount: data.amount,
        dueDate,
        status,
        description: data.description?.trim() || null,
        events: { create: { type: 'criacao', toStatus: status, message: 'Cobrança criada no Gestor.' } },
      },
      include: chargeInclude,
    });
    if (data.recurring) {
      const billingCycleDays = Number(data.billingCycleDays || 30);
      await transaction.subscriber.update({
        where: { id: subscriberId },
        data: {
          recurringBillingEnabled: true,
          recurringAmount: data.amount,
          billingCycleDays,
          nextBillingDate: addDays(dueDate, billingCycleDays),
        },
      });
    }
    return created;
  });
  await processOverdueCharges({ force: true });
  return charge;
};

const update = async (id, data) => {
  const current = await prisma.billingCharge.findUnique({ where: { id } });
  if (!current) throw httpError('Cobrança não encontrada.', 404);
  if (['paga', 'cancelada'].includes(current.status)) {
    throw httpError('Uma cobrança paga ou cancelada não pode ser alterada.');
  }
  const dueDate = data.dueDate ? new Date(data.dueDate) : current.dueDate;
  const nextStatus = dueDate < new Date() ? 'vencida' : 'pendente';
  const charge = await prisma.$transaction(async (transaction) => {
    const changed = await transaction.billingCharge.update({
      where: { id },
      data: {
        amount: data.amount ?? current.amount,
        dueDate,
        description: data.description !== undefined ? data.description.trim() || null : current.description,
        status: nextStatus,
      },
    });
    await transaction.billingEvent.create({
      data: {
        chargeId: id,
        type: 'alteracao',
        fromStatus: current.status,
        toStatus: nextStatus,
        message: 'Valor, vencimento ou descrição atualizados.',
      },
    });
    return changed;
  });
  await reactivateIfSettled(current.subscriberId);
  await processOverdueCharges({ force: true });
  return prisma.billingCharge.findUnique({ where: { id: charge.id }, include: chargeInclude });
};

const pay = async (id, data) => {
  const current = await prisma.billingCharge.findUnique({ where: { id } });
  if (!current) throw httpError('Cobrança não encontrada.', 404);
  if (current.status === 'cancelada') throw httpError('Uma cobrança cancelada não pode ser recebida.');
  if (current.status === 'paga') throw httpError('Esta cobrança já foi paga.');
  await prisma.$transaction([
    prisma.billingCharge.update({
      where: { id },
      data: {
        status: 'paga',
        paidAt: data.paidAt ? new Date(data.paidAt) : new Date(),
        paymentMethod: data.paymentMethod,
        notes: data.notes?.trim() || null,
      },
    }),
    prisma.billingEvent.create({
      data: {
        chargeId: id,
        type: 'pagamento',
        fromStatus: current.status,
        toStatus: 'paga',
        message: `Pagamento registrado via ${data.paymentMethod}.`,
      },
    }),
  ]);
  const reactivated = await reactivateIfSettled(current.subscriberId);
  return {
    charge: await prisma.billingCharge.findUnique({ where: { id }, include: chargeInclude }),
    reactivated,
  };
};

const cancel = async (id, { reason } = {}) => {
  const current = await prisma.billingCharge.findUnique({ where: { id } });
  if (!current) throw httpError('Cobrança não encontrada.', 404);
  if (current.status === 'paga') throw httpError('Uma cobrança paga não pode ser cancelada.');
  if (current.status !== 'cancelada') {
    await prisma.$transaction([
      prisma.billingCharge.update({
        where: { id },
        data: { status: 'cancelada', notes: reason?.trim() || current.notes },
      }),
      prisma.billingEvent.create({
        data: {
          chargeId: id,
          type: 'cancelamento',
          fromStatus: current.status,
          toStatus: 'cancelada',
          message: reason?.trim() || 'Cobrança cancelada.',
        },
      }),
    ]);
  }
  const reactivated = await reactivateIfSettled(current.subscriberId);
  return {
    charge: await prisma.billingCharge.findUnique({ where: { id }, include: chargeInclude }),
    reactivated,
  };
};

module.exports = {
  cancel,
  configureRecurrence,
  create,
  generateRecurringCharges,
  hasBlockingOverdue,
  list,
  pay,
  processOverdueCharges,
  reactivateIfSettled,
  summary,
  update,
};
