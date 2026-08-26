const os = require('os');
const prisma = require('../infra/prisma/client');

const getLocalAddresses = () => {
  const interfaces = os.networkInterfaces();
  const addresses = [];

  Object.entries(interfaces).forEach(([name, values]) => {
    values
      .filter((item) => item.family === 'IPv4' && !item.internal)
      .forEach((item) => {
        addresses.push({
          interface: name,
          address: item.address
        });
      });
  });

  return addresses;
};

const getStatus = async ({ port, connectedSockets = 0, mobileClients = 0 }) => {
  const addresses = getLocalAddresses();
  const primaryAddress = addresses[0]?.address || '127.0.0.1';
  const sessions = await prisma.deviceSession.findMany({
    where: { status: 'ativo' },
    orderBy: { updatedAt: 'desc' },
    take: 50
  });

  return {
    server: 'online',
    port,
    hostName: os.hostname(),
    ip: primaryAddress,
    mobileUrl: `http://${primaryAddress}:${port}/mobile`,
    restaurantUrl: `http://${primaryAddress}:${port}`,
    addresses,
    links: addresses.map((item) => `http://${item.address}:${port}/mobile`),
    restaurantLinks: addresses.map((item) => `http://${item.address}:${port}`),
    localName: `http://${os.hostname()}:${port}/mobile`,
    connectedSockets,
    mobileClients,
    sessions,
    generatedAt: new Date().toISOString()
  };
};

const createPairingCode = async ({ role = 'garcom', ttlMinutes = 15 } = {}) => {
  const pairingCode = String(Math.floor(100000 + Math.random() * 900000));
  const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);

  const session = await prisma.deviceSession.create({
    data: {
      role,
      pairingCode,
      status: 'pareamento',
      expiresAt
    }
  });

  return { pairingCode, expiresAt, sessionId: session.id };
};

const confirmPairing = async ({ pairingCode, name, ip }) => {
  const session = await prisma.deviceSession.findFirst({
    where: {
      pairingCode,
      status: 'pareamento',
      expiresAt: { gt: new Date() }
    },
    orderBy: { createdAt: 'desc' }
  });

  if (!session) {
    const error = new Error('Codigo de pareamento invalido ou expirado');
    error.status = 400;
    throw error;
  }

  return prisma.deviceSession.update({
    where: { id: session.id },
    data: {
      name: name || 'Dispositivo movel',
      role: session.role,
      ip: ip || null,
      status: 'ativo',
      pairingCode: null
    }
  });
};

module.exports = { confirmPairing, createPairingCode, getStatus };
