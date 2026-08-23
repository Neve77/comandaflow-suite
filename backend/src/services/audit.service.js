const prisma = require('../infra/prisma/client');

const writeAudit = async ({ userId, action, entity, entityId, metadata, ip, device }) => {
  try {
    await prisma.auditLog.create({
      data: {
        userId: userId || null,
        action,
        entity,
        entityId: entityId || null,
        metadata: metadata ? JSON.stringify(metadata) : null,
        ip: ip || null,
        device: device || null
      }
    });
  } catch (error) {
    console.warn('Falha ao registrar auditoria:', error.message);
  }
};

const listAudit = async ({ take = 100 } = {}) => {
  return prisma.auditLog.findMany({
    orderBy: { createdAt: 'desc' },
    take,
    include: { user: { select: { id: true, name: true, email: true, role: true } } }
  });
};

module.exports = { writeAudit, listAudit };
