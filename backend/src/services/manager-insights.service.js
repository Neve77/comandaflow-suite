const prisma = require('../infra/prisma/client');
const managerSettings = require('./manager-settings.service');

const DAY_MS = 24 * 60 * 60 * 1000;
const OPEN_TICKET_STATUSES = ['aberto', 'em_atendimento'];
const ONBOARDING_STEPS = [
  { key: 'registered', label: 'Restaurante cadastrado', description: 'Cadastro comercial criado no Gestor.', automatic: true },
  { key: 'licenseIssued', label: 'Assinatura emitida', description: 'Primeira chave de assinatura emitida.', automatic: true },
  { key: 'firstActivation', label: 'Primeira ativação', description: 'Um computador do restaurante sincronizou com o Gestor.', automatic: true },
  { key: 'adminCreated', label: 'Administrador criado', description: 'O restaurante possui um usuário administrador ativo.', automatic: true },
  { key: 'menuConfigured', label: 'Cardápio configurado', description: 'Ao menos um produto ativo foi cadastrado.', automatic: true },
  { key: 'printerTested', label: 'Impressão testada', description: 'A impressão operacional foi validada.', automatic: false },
  { key: 'firstOrder', label: 'Primeiro pedido', description: 'O restaurante registrou o primeiro pedido.', automatic: true },
  { key: 'backupCreated', label: 'Primeiro backup', description: 'Ao menos um backup foi criado.', automatic: true },
  { key: 'trainingCompleted', label: 'Treinamento concluído', description: 'A equipe concluiu a implantação assistida.', automatic: false },
];
const ONBOARDING_KEYS = new Set(ONBOARDING_STEPS.map((step) => step.key));

const httpError = (message, status = 400) => Object.assign(new Error(message), { status });
const iso = (value) => value ? new Date(value).toISOString() : null;
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const compareVersions = (left, right) => {
  const parse = (value) => String(value || '0.0.0').replace(/^v/i, '').split('.').map(Number);
  const a = parse(left);
  const b = parse(right);
  for (let index = 0; index < Math.max(a.length, b.length, 3); index += 1) {
    const difference = (a[index] || 0) - (b[index] || 0);
    if (difference) return difference;
  }
  return 0;
};

const readPublishedClientVersion = async () => {
  const setting = await prisma.systemSetting.findUnique({ where: { key: 'publishedClientUpdate' } });
  if (!setting) return null;
  try { return JSON.parse(setting.value)?.manifest?.version || null; } catch { return null; }
};

const subscriberGraph = {
  subscriptions: {
    orderBy: { createdAt: 'desc' },
    include: { installations: { orderBy: { lastSeenAt: 'desc' } } },
  },
  billingCharges: {
    orderBy: { dueDate: 'desc' },
    include: { events: { orderBy: { createdAt: 'desc' } } },
  },
  supportTickets: {
    orderBy: { updatedAt: 'desc' },
    include: { comments: { orderBy: { createdAt: 'asc' } } },
  },
  messages: {
    orderBy: { createdAt: 'desc' },
    include: { receipts: { orderBy: { seenAt: 'desc' } } },
  },
  onboardingSteps: true,
};

const loadContext = async () => {
  const [subscribers, settings, currentClientVersion] = await Promise.all([
    prisma.subscriber.findMany({ include: subscriberGraph, orderBy: { businessName: 'asc' } }),
    managerSettings.get(),
    readPublishedClientVersion(),
  ]);
  const configuredSeconds = Math.max(60, Math.min(3600, Number(settings.syncIntervalMinutes || 1) * 60));
  return {
    subscribers,
    currentClientVersion,
    onlineAfter: Date.now() - Math.max(180, Math.ceil(configuredSeconds * 2.5)) * 1000,
  };
};

const buildOnboarding = (subscriber) => {
  const stored = new Map((subscriber.onboardingSteps || []).map((step) => [step.key, step]));
  const subscriptions = subscriber.subscriptions || [];
  const installations = subscriptions.flatMap((subscription) => subscription.installations || []);
  const inferred = {
    registered: { completed: true, completedAt: subscriber.createdAt, source: 'automatico' },
    licenseIssued: subscriptions.length
      ? { completed: true, completedAt: subscriptions[subscriptions.length - 1]?.createdAt, source: 'automatico' }
      : null,
    firstActivation: installations.length
      ? { completed: true, completedAt: [...installations].sort((a, b) => new Date(a.firstSeenAt) - new Date(b.firstSeenAt))[0]?.firstSeenAt, source: 'automatico' }
      : null,
  };

  const steps = ONBOARDING_STEPS.map((definition) => {
    const persisted = stored.get(definition.key);
    const automatic = inferred[definition.key];
    const completed = automatic?.completed || persisted?.completed || false;
    return {
      ...definition,
      completed,
      source: automatic?.source || persisted?.source || (definition.automatic ? 'automatico' : 'manual'),
      completedAt: iso(automatic?.completedAt || persisted?.completedAt),
      completedBy: persisted?.completedBy || null,
      note: persisted?.note || null,
    };
  });
  const completed = steps.filter((step) => step.completed).length;
  return {
    steps,
    completed,
    total: steps.length,
    percentage: Math.round((completed / steps.length) * 100),
    complete: completed === steps.length,
  };
};

const healthFor = (subscriber, context) => {
  const now = Date.now();
  const activeSubscription = subscriber.subscriptions.find((subscription) => subscription.status === 'ativo') || null;
  const currentSubscription = activeSubscription || subscriber.subscriptions[0] || null;
  const activeInstallations = (currentSubscription?.installations || []).filter((installation) => installation.active);
  const lastInstallation = activeInstallations[0] || null;
  const online = Boolean(lastInstallation?.lastSeenAt && new Date(lastInstallation.lastSeenAt).getTime() >= context.onlineAfter);
  const overdueCharges = subscriber.billingCharges.filter((charge) => charge.status === 'vencida'
    || (charge.status === 'pendente' && new Date(charge.dueDate).getTime() < now));
  const openTickets = subscriber.supportTickets.filter((ticket) => OPEN_TICKET_STATUSES.includes(ticket.status));
  const urgentTickets = openTickets.filter((ticket) => ticket.priority === 'urgente');
  const onboarding = buildOnboarding(subscriber);
  const expiringDays = activeSubscription
    ? Math.ceil((new Date(activeSubscription.expiresAt).getTime() - now) / DAY_MS)
    : null;
  const outdated = Boolean(context.currentClientVersion && lastInstallation?.appVersion
    && compareVersions(lastInstallation.appVersion, context.currentClientVersion) < 0);
  let score = 100;
  const factors = [];
  const subtract = (points, code, label, severity = 'warning') => {
    score -= points;
    factors.push({ code, label, points, severity });
  };

  if (subscriber.status === 'cancelado') subtract(70, 'cancelled', 'Conta cancelada', 'critical');
  else if (subscriber.status === 'suspenso') subtract(35, 'suspended', 'Acesso suspenso', 'critical');
  if (!activeSubscription) subtract(30, 'no_active_subscription', 'Sem assinatura ativa', 'critical');
  if (overdueCharges.length) subtract(25, 'overdue', `${overdueCharges.length} cobrança(s) vencida(s)`, 'critical');
  if (subscriber.status === 'ativo' && activeSubscription && !online) {
    subtract(lastInstallation ? 20 : 25, 'offline', lastInstallation ? 'Restaurante offline' : 'Nunca sincronizou', lastInstallation ? 'warning' : 'critical');
  }
  if (urgentTickets.length) subtract(15, 'urgent_support', `${urgentTickets.length} chamado(s) urgente(s)`, 'critical');
  else if (openTickets.length) subtract(7, 'open_support', `${openTickets.length} chamado(s) em aberto`);
  if (outdated) subtract(10, 'outdated', `Versão ${lastInstallation.appVersion} desatualizada`);
  if (expiringDays !== null && expiringDays >= 0 && expiringDays <= 7) subtract(8, 'expiring', `Assinatura vence em ${expiringDays} dia(s)`);
  if (onboarding.percentage < 60) subtract(10, 'onboarding', `Onboarding em ${onboarding.percentage}%`);
  else if (!onboarding.complete) subtract(5, 'onboarding', `Onboarding em ${onboarding.percentage}%`, 'info');

  score = clamp(score, 0, 100);
  const level = score < 40 ? 'critical' : score < 70 ? 'attention' : score < 90 ? 'good' : 'excellent';
  return {
    subscriberId: subscriber.id,
    businessName: subscriber.businessName,
    accountStatus: subscriber.status,
    score,
    level,
    factors,
    online,
    lastSyncAt: iso(lastInstallation?.lastSeenAt),
    appVersion: lastInstallation?.appVersion || null,
    currentClientVersion: context.currentClientVersion,
    activeDevices: activeInstallations.length,
    overdueCharges: overdueCharges.length,
    openTickets: openTickets.length,
    onboarding,
  };
};

const pulseSnapshot = async () => {
  const context = await loadContext();
  const clients = context.subscribers.map((subscriber) => healthFor(subscriber, context))
    .sort((left, right) => left.score - right.score || left.businessName.localeCompare(right.businessName));
  const average = clients.length ? Math.round(clients.reduce((total, client) => total + client.score, 0) / clients.length) : 100;
  return {
    generatedAt: new Date().toISOString(),
    currentClientVersion: context.currentClientVersion,
    summary: {
      average,
      excellent: clients.filter((client) => client.level === 'excellent').length,
      good: clients.filter((client) => client.level === 'good').length,
      attention: clients.filter((client) => client.level === 'attention').length,
      critical: clients.filter((client) => client.level === 'critical').length,
    },
    clients,
  };
};

const pendingFor = (subscriber, health) => {
  const items = [];
  const add = (type, severity, title, description, dueAt = null) => items.push({
    id: `${type}-${subscriber.id}`,
    subscriberId: subscriber.id,
    businessName: subscriber.businessName,
    type,
    severity,
    title,
    description,
    dueAt: iso(dueAt),
    actionPath: `/subscriptions/clients?subscriber=${subscriber.id}`,
  });
  const now = Date.now();
  const overdue = subscriber.billingCharges.filter((charge) => charge.status === 'vencida'
    || (charge.status === 'pendente' && new Date(charge.dueDate).getTime() < now));
  if (overdue.length) {
    const oldest = [...overdue].sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))[0];
    add('billing', 'critical', 'Cobrança vencida', `${overdue.length} cobrança(s) aguardando regularização.`, oldest.dueDate);
  }
  if (subscriber.status === 'ativo' && !health.online) {
    add('offline', health.lastSyncAt ? 'warning' : 'critical', health.lastSyncAt ? 'Restaurante offline' : 'Ativação não concluída', health.lastSyncAt ? `Último contato em ${new Date(health.lastSyncAt).toLocaleString('pt-BR')}.` : 'Nenhum computador sincronizou com o Gestor.');
  }
  const current = subscriber.subscriptions.find((subscription) => subscription.status === 'ativo');
  if (current) {
    const days = Math.ceil((new Date(current.expiresAt).getTime() - now) / DAY_MS);
    if (days >= 0 && days <= 7) add('expiration', days <= 2 ? 'critical' : 'warning', 'Assinatura próxima do vencimento', `Vence em ${days} dia(s).`, current.expiresAt);
  }
  const urgent = subscriber.supportTickets.filter((ticket) => OPEN_TICKET_STATUSES.includes(ticket.status) && ticket.priority === 'urgente');
  if (urgent.length) add('support', 'critical', 'Chamado urgente', `${urgent.length} chamado(s) urgente(s) aguardando atendimento.`, urgent[0].updatedAt);
  if (health.currentClientVersion && health.appVersion && compareVersions(health.appVersion, health.currentClientVersion) < 0) {
    add('update', 'warning', 'Versão desatualizada', `Instalada ${health.appVersion}; disponível ${health.currentClientVersion}.`);
  }
  if (!health.onboarding.complete && now - new Date(subscriber.createdAt).getTime() > 2 * DAY_MS) {
    add('onboarding', health.onboarding.percentage < 50 ? 'warning' : 'info', 'Onboarding incompleto', `${health.onboarding.completed} de ${health.onboarding.total} etapas concluídas.`);
  }
  return items;
};

const pendingSnapshot = async () => {
  const context = await loadContext();
  const weight = { critical: 3, warning: 2, info: 1 };
  const items = context.subscribers.flatMap((subscriber) => pendingFor(subscriber, healthFor(subscriber, context)))
    .sort((left, right) => weight[right.severity] - weight[left.severity] || String(left.dueAt || '').localeCompare(String(right.dueAt || '')));
  return {
    generatedAt: new Date().toISOString(),
    summary: {
      total: items.length,
      critical: items.filter((item) => item.severity === 'critical').length,
      warning: items.filter((item) => item.severity === 'warning').length,
      info: items.filter((item) => item.severity === 'info').length,
    },
    items,
  };
};

const timelineFor = (subscriber) => {
  const events = [{ id: `subscriber-${subscriber.id}`, type: 'subscriber', title: 'Assinante cadastrado', detail: subscriber.businessName, at: subscriber.createdAt }];
  for (const subscription of subscriber.subscriptions) {
    events.push({ id: `subscription-${subscription.id}`, type: 'subscription', title: 'Assinatura emitida', detail: `${subscription.plan} · ${subscription.status}`, at: subscription.createdAt });
    for (const installation of subscription.installations) {
      events.push({ id: `installation-${installation.id}`, type: 'installation', title: 'Computador ativado', detail: `${installation.deviceName || 'Dispositivo'} · ${installation.appVersion || 'versão não informada'}`, at: installation.firstSeenAt });
    }
  }
  for (const charge of subscriber.billingCharges) {
    events.push({ id: `charge-${charge.id}`, type: 'billing', title: `Cobrança ${charge.status}`, detail: charge.description || 'Mensalidade', at: charge.paidAt || charge.updatedAt || charge.createdAt });
  }
  for (const ticket of subscriber.supportTickets) {
    events.push({ id: `ticket-${ticket.id}`, type: 'support', title: `Chamado ${ticket.status}`, detail: ticket.subject, at: ticket.updatedAt });
  }
  for (const step of subscriber.onboardingSteps.filter((item) => item.completed)) {
    events.push({ id: `onboarding-${step.id}`, type: 'onboarding', title: 'Etapa de onboarding concluída', detail: ONBOARDING_STEPS.find((item) => item.key === step.key)?.label || step.key, at: step.completedAt || step.updatedAt });
  }
  return events.sort((left, right) => new Date(right.at) - new Date(left.at)).slice(0, 100).map((event) => ({ ...event, at: iso(event.at) }));
};

const subscriberProfile = async (id) => {
  const [subscriber, settings, currentClientVersion] = await Promise.all([
    prisma.subscriber.findUnique({ where: { id }, include: subscriberGraph }),
    managerSettings.get(),
    readPublishedClientVersion(),
  ]);
  if (!subscriber) throw httpError('Assinante não encontrado.', 404);
  const configuredSeconds = Math.max(60, Math.min(3600, Number(settings.syncIntervalMinutes || 1) * 60));
  const context = { currentClientVersion, onlineAfter: Date.now() - Math.max(180, Math.ceil(configuredSeconds * 2.5)) * 1000 };
  const health = healthFor(subscriber, context);
  return {
    subscriber: {
      id: subscriber.id,
      businessName: subscriber.businessName,
      contactName: subscriber.contactName,
      email: subscriber.email,
      phone: subscriber.phone,
      document: subscriber.document,
      status: subscriber.status,
      notes: subscriber.notes,
      createdAt: iso(subscriber.createdAt),
      recurringBillingEnabled: subscriber.recurringBillingEnabled,
      recurringAmount: subscriber.recurringAmount,
      nextBillingDate: iso(subscriber.nextBillingDate),
    },
    health,
    onboarding: health.onboarding,
    subscriptions: subscriber.subscriptions.map(({ licenseKey, ...subscription }) => ({ ...subscription, licenseAvailable: Boolean(licenseKey) })),
    charges: subscriber.billingCharges,
    tickets: subscriber.supportTickets,
    messages: subscriber.messages,
    timeline: timelineFor(subscriber),
  };
};

const recordOnboardingSignals = async (subscriberId, signals = {}, actor = 'Restaurante') => {
  const entries = Object.entries(signals).filter(([key, value]) => ONBOARDING_KEYS.has(key) && value === true);
  if (!entries.length) return;
  const now = new Date();
  await Promise.all(entries.map(async ([key]) => {
    const existing = await prisma.subscriberOnboardingStep.findUnique({
      where: { subscriberId_key: { subscriberId, key } },
      select: { completed: true },
    });
    if (existing?.completed) return;
    await prisma.subscriberOnboardingStep.upsert({
      where: { subscriberId_key: { subscriberId, key } },
      create: { subscriberId, key, completed: true, source: 'automatico', completedAt: now, completedBy: actor },
      update: { completed: true, source: 'automatico', completedAt: now, completedBy: actor },
    });
  }));
};

const setOnboardingStep = async (subscriberId, key, data, actor) => {
  if (!ONBOARDING_KEYS.has(key)) throw httpError('Etapa de onboarding inválida.');
  const subscriber = await prisma.subscriber.findUnique({ where: { id: subscriberId }, select: { id: true } });
  if (!subscriber) throw httpError('Assinante não encontrado.', 404);
  const completed = Boolean(data.completed);
  return prisma.subscriberOnboardingStep.upsert({
    where: { subscriberId_key: { subscriberId, key } },
    create: {
      subscriberId,
      key,
      completed,
      source: 'manual',
      note: data.note?.trim() || null,
      completedAt: completed ? new Date() : null,
      completedBy: completed ? actor?.name || actor?.email || 'Gestor' : null,
    },
    update: {
      completed,
      source: 'manual',
      note: data.note?.trim() || null,
      completedAt: completed ? new Date() : null,
      completedBy: completed ? actor?.name || actor?.email || 'Gestor' : null,
    },
  });
};

module.exports = {
  ONBOARDING_STEPS,
  pendingSnapshot,
  pulseSnapshot,
  recordOnboardingSignals,
  setOnboardingStep,
  subscriberProfile,
};
