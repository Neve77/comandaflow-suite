const prisma = require('../infra/prisma/client');
const auditService = require('./audit.service');

const SESSION_DURATION_MS = 8 * 60 * 60 * 1000;
const ONLINE_WINDOW_MS = 5 * 60 * 1000;
const TOUCH_INTERVAL_MS = 60 * 1000;

const limitText = (value, maxLength) => {
  if (!value) return null;
  return String(value).trim().slice(0, maxLength) || null;
};

const createSession = async (userId, { ip, device } = {}) => {
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);
  const session = await prisma.authSession.create({
    data: {
      userId,
      ip: limitText(ip, 100),
      device: limitText(device, 500),
      expiresAt,
    },
  });
  return session;
};

const validateSession = async (sessionId, userId) => {
  if (!sessionId || !userId) return null;
  const session = await prisma.authSession.findFirst({
    where: { id: sessionId, userId },
    include: {
      user: {
        select: { id: true, name: true, email: true, role: true, active: true },
      },
    },
  });
  if (!session || session.revokedAt || session.expiresAt <= new Date() || !session.user.active) return null;

  if (Date.now() - session.lastSeenAt.getTime() >= TOUCH_INTERVAL_MS) {
    session.lastSeenAt = new Date();
    await prisma.authSession.update({
      where: { id: session.id },
      data: { lastSeenAt: session.lastSeenAt },
    });
  }
  return session;
};

const listSessions = async ({ currentSessionId, take = 200 } = {}) => {
  const now = Date.now();
  const sessions = await prisma.authSession.findMany({
    orderBy: { createdAt: 'desc' },
    take: Math.min(Math.max(Number(take) || 200, 1), 500),
    include: {
      user: {
        select: { id: true, name: true, email: true, role: true, active: true },
      },
    },
  });

  return sessions.map((session) => {
    const active = !session.revokedAt && session.expiresAt.getTime() > now && session.user.active;
    return {
      id: session.id,
      user: session.user,
      ip: session.ip,
      device: session.device,
      createdAt: session.createdAt,
      lastSeenAt: session.lastSeenAt,
      expiresAt: session.expiresAt,
      revokedAt: session.revokedAt,
      revokeReason: session.revokeReason,
      active,
      online: active && now - session.lastSeenAt.getTime() <= ONLINE_WINDOW_MS,
      current: session.id === currentSessionId,
    };
  });
};

const revokeSession = async (sessionId, { actorUserId, reason = 'Encerrada pelo Gestor', ip, device } = {}) => {
  const session = await prisma.authSession.findUnique({
    where: { id: sessionId },
    include: { user: { select: { email: true } } },
  });
  if (!session) {
    const error = new Error('Sessão não encontrada.');
    error.status = 404;
    throw error;
  }

  if (!session.revokedAt) {
    await prisma.authSession.update({
      where: { id: sessionId },
      data: { revokedAt: new Date(), revokeReason: limitText(reason, 200) },
    });
    await auditService.writeAudit({
      userId: actorUserId,
      action: 'session_revoked',
      entity: 'AuthSession',
      entityId: sessionId,
      metadata: { targetUserId: session.userId, targetEmail: session.user.email, reason },
      ip,
      device,
    });
  }
};

const revokeUserSessions = async (userId, reason, exceptSessionId) => {
  const where = {
    userId,
    revokedAt: null,
    expiresAt: { gt: new Date() },
    ...(exceptSessionId ? { id: { not: exceptSessionId } } : {}),
  };
  return prisma.authSession.updateMany({
    where,
    data: { revokedAt: new Date(), revokeReason: limitText(reason, 200) },
  });
};

module.exports = {
  createSession,
  listSessions,
  revokeSession,
  revokeUserSessions,
  validateSession,
};
