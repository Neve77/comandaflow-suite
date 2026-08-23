const prisma = require('../infra/prisma/client');

const createBracelet = async ({ number, type = 'QR' }) => {
  const existing = await prisma.bracelet.findUnique({ where: { number } });
  if (existing) {
    const error = new Error('Numero de pulseira ja existe');
    error.status = 409;
    throw error;
  }

  return prisma.bracelet.create({ data: { number, type } });
};

const listAll = async () => {
  return prisma.bracelet.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      comandas: {
        where: { status: 'aberta' },
        take: 1,
        include: {
          pedidos: true,
          event: { select: { id: true, name: true } }
        }
      }
    }
  });
};

const updateStatus = async (id, status, blockedReason = '') => {
  return prisma.bracelet.update({
    where: { id },
    data: {
      status,
      blockedReason: status === 'bloqueada' ? blockedReason || 'Bloqueio manual' : null
    }
  });
};

module.exports = { createBracelet, listAll, updateStatus };
