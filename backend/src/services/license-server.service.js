const prisma = require('../infra/prisma/client');
const licenseService = require('./license.service');

const denied = (verified, status, message, extra = {}) => ({
  allowed: false,
  warning: false,
  status,
  message,
  licenseId: verified.licenseId,
  checkedAt: new Date().toISOString(),
  ...extra,
});

const sync = async ({ licenseKey, installationId, deviceName }) => {
  const verified = licenseService.verifyLicenseKey(licenseKey);
  const subscription = await prisma.subscription.findUnique({
    where: { id: verified.licenseId },
    include: { subscriber: true, installations: true },
  });

  if (!subscription || subscription.licenseKey !== licenseKey) {
    return denied(verified, 'cancelado', 'Esta assinatura nao existe mais no servidor do gestor.');
  }

  const existingInstallation = subscription.installations.find(
    (item) => item.installationId === installationId
  );
  const activeInstallations = subscription.installations.filter((item) => item.active);
  if (!existingInstallation && activeInstallations.length >= subscription.maxDevices) {
    return denied(
      verified,
      'limite_dispositivos',
      'O limite de computadores desta assinatura foi atingido.'
    );
  }

  await prisma.licenseInstallation.upsert({
    where: {
      subscriptionId_installationId: { subscriptionId: subscription.id, installationId },
    },
    create: { subscriptionId: subscription.id, installationId, deviceName: deviceName || null },
    update: { deviceName: deviceName || null, active: true },
  });

  const now = new Date();
  if (subscription.expiresAt < now || subscription.status === 'expirado') {
    return denied(verified, 'expirado', 'A assinatura venceu. Entre em contato para renovar.');
  }
  if (['cancelado', 'substituido'].includes(subscription.status)) {
    return denied(verified, subscription.status, 'Esta chave foi cancelada ou substituida por uma renovacao.');
  }

  const subscriber = subscription.subscriber;
  if (subscriber.status === 'cancelado') {
    return denied(
      verified,
      'cancelado',
      subscriber.customerMessage || 'A conta foi cancelada pelo gestor.'
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
        { accessUntil: accessUntil?.toISOString() || null }
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
  };
};

module.exports = { sync };
