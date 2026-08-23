const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
const prisma = require('../infra/prisma/client');
const auditService = require('./audit.service');

dotenv.config();

const isSetupRequired = async () => {
  const userCount = await prisma.user.count();
  return userCount === 0;
};

const setup = async ({ name, email, password }) => {
  const userCount = await prisma.user.count();
  if (userCount > 0) {
    const error = new Error('A configuração inicial já foi concluída.');
    error.status = 409;
    throw error;
  }

  const normalizedEmail = email.toLowerCase().trim();
  const hashedPassword = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: {
      name: name.trim(),
      email: normalizedEmail,
      password: hashedPassword,
      role: process.env.COMANDAFLOW_MANAGER_MODE === 'true' ? 'proprietario' : 'administrador',
      active: true,
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
    },
  });

  await auditService.writeAudit({
    userId: user.id,
    action: 'setup_completed',
    entity: 'System',
    metadata: { email: user.email },
  });

  return user;
};

const login = async (email, password) => {
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
  if (!user || !user.active) {
    const error = new Error('Credenciais invalidas');
    error.status = 401;
    throw error;
  }

  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    const error = new Error('Credenciais invalidas');
    error.status = 401;
    throw error;
  }

  const token = jwt.sign(
    { userId: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '8h' }
  );

  await auditService.writeAudit({
    userId: user.id,
    action: 'login',
    entity: 'User',
    entityId: user.id,
    metadata: { email: user.email }
  });

  return {
    user: { id: user.id, email: user.email, name: user.name, role: user.role },
    token
  };
};

module.exports = { login, isSetupRequired, setup };
