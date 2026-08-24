const prisma = require('../infra/prisma/client');
const licenseService = require('./license.service');
const managerOperations = require('./manager-operations.service');
const managerSettings = require('./manager-settings.service');

const syncMetadata = (settings, now = new Date()) => ({
  protocolVersion: 2,
  serverTime: now.toISOString(),
  syncIntervalSeconds: Math.max(60, Math.min(3600, Number(settings.syncIntervalMinutes || 1) * 60)),
  offlineGraceHours: Math.max(1, Math.min(168, Number(settings.offlineGraceHours || 24))),
});

const denied = (verified, status, message, metadata, extra = {}) => ({
  allowed: false,
  warning: false,
  status,
  message,
  licenseId: verified.licenseId,
  checkedAt: metadata.serverTime,
  ...metadata,
  ...extra,
});

const authenticateInstallation = async ({ licenseKey, installationId }) => {
  const verified = licenseService.verifyLicenseKey(licenseKey);
  const subscription = await prisma.subscription.findUnique({
    where: { id: verified.licenseId },
    include: {
      subscriber: { select: { id: true, businessName: true } },
      installations: { where: { installationId, active: true }, select: { id: true } },
    },
  });
  if (!subscription || subscription.licenseKey !== licenseKey) {
    const error = new Error('Assinatura inválida.');
    error.status = 403;
    throw error;
  }
  if (!subscription.installations.length) {
    const error = new Error('Instalação não reconhecida. Sincronize o aplicativo e tente novamente.');
    error.status = 403;
    throw error;
  }
  return { subscription, verified };
};

const sync = async ({ licenseKey, installationId, deviceName, appVersion, platform, ip }) => {
  const verified = licenseService.verifyLicenseKey(licenseKey);
  const settings = await managerSettings.get();
  const now = new Date();
  const metadata = syncMetadata(settings, now);
  const subscription = await prisma.subscription.findUnique({
    where: { id: verified.licenseId },
    include: { subscriber: true, installations: true },
  });

  if (!subscription || subscription.licenseKey !== licenseKey) {
    return denied(verified, 'cancelado', 'Esta assinatura nao existe mais no servidor do gestor.', metadata);
  }

  const existingInstallation = subscription.installations.find(
    (item) => item.installationId === installationId
  );
  const activeInstallations = subscription.installations.filter((item) => item.active);
  if (!existingInstallation?.active && activeInstallations.length >= subscription.maxDevices) {
    return denied(
      verified,
      'limite_dispositivos',
      'O limite de computadores desta assinatura foi atingido.',
      metadata
    );
  }

  await prisma.licenseInstallation.upsert({
    where: {
      subscriptionId_installationId: { subscriptionId: subscription.id, installationId },
    },
    create: { subscriptionId: subscription.id, installationId, deviceName: deviceName || null, appVersion: appVersion || null, platform: platform || null, ip: ip || null },
    update: { deviceName: deviceName || null, appVersion: appVersion || null, platform: platform || null, ip: ip || null, active: true },
  });

  const messages = await managerOperations.pendingMessages(subscription.subscriberId, installationId);

  if (subscription.expiresAt < now || subscription.status === 'expirado') {
    return denied(
      verified,
      'expirado',
      'A assinatura venceu. Entre em contato para renovar.',
      metadata,
      { messages }
    );
  }
  if (['cancelado', 'substituido'].includes(subscription.status)) {
    return denied(
      verified,
      subscription.status,
      'Esta chave foi cancelada ou substituida por uma renovacao.',
      metadata,
      { messages }
    );
  }

  const subscriber = subscription.subscriber;
  if (subscriber.status === 'cancelado') {
    return denied(
      verified,
      'cancelado',
      subscriber.customerMessage || 'A conta foi cancelada pelo gestor.',
      metadata,
      { messages }
    );
  }

  if (subscriber.status === 'suspenso') {
    const accessUntil = subscriber.accessUntil ? new Date(subscriber.accessUntil) : null;
    const stillInGrace = subscriber.suspensionMode === 'prazo' && accessUntil && accessUntil > now;
    if (!stillInGrace) {
      return denied(
        verified,
        'suspenso',
        subscriber.customerMessage || 'O acesso foi suspenso pelo gestor.',
        metadata,
        { accessUntil: accessUntil?.toISOString() || null, messages }
      );
    }
    return {
      allowed: true,
      warning: true,
      status: 'prazo_pagamento',
      message: subscriber.customerMessage,
      accessUntil: accessUntil.toISOString(),
      licenseId: verified.licenseId,
      checkedAt: now.toISOString(),
      messages,
      ...metadata,
    };
  }

  return {
    allowed: true,
    warning: false,
    status: 'ativo',
    message: null,
    accessUntil: null,
    licenseId: verified.licenseId,
    checkedAt: now.toISOString(),
    messages,
    ...metadata,
  };
};

const acknowledgeMessage = async ({ messageId, licenseKey, installationId }) => {
  const { subscription } = await authenticateInstallation({ licenseKey, installationId });
  return managerOperations.acknowledgeMessage(messageId, subscription.subscriberId, installationId);
};

const listSupportTickets = async (credentials) => {
  const { subscription } = await authenticateInstallation(credentials);
  return managerOperations.listSubscriberTickets(subscription.subscriberId);
};

const createSupportTicket = async (data) => {
  const { subscription } = await authenticateInstallation(data);
  return managerOperations.createSubscriberTicket(subscription.subscriberId, data, data.authorName);
};

const commentSupportTicket = async (ticketId, data) => {
  const { subscription } = await authenticateInstallation(data);
  return managerOperations.commentSubscriberTicket(
    ticketId,
    subscription.subscriberId,
    data.body,
    data.authorName
  );
};

module.exports = {
  acknowledgeMessage,
  commentSupportTicket,
  createSupportTicket,
  listSupportTickets,
  sync,
};
