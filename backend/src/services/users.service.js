const bcrypt = require('bcrypt');
const prisma = require('../infra/prisma/client');
const authSessionsService = require('./auth-sessions.service');

const listUsers = async () => {
  return prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      active: true,
      twoFactorEnabled: true,
      createdAt: true,
      updatedAt: true
    },
    orderBy: { createdAt: 'asc' }
  });
};

const createUser = async ({ name, email, password, role = 'operador' }) => {
  const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
  if (existing) {
    const error = new Error('Já existe um usuário cadastrado com este e-mail');
    error.status = 400;
    throw error;
  }

  const hashedPassword = await bcrypt.hash(password, 12);
  return prisma.user.create({
    data: {
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      role: role || 'operador',
      active: true,
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      active: true,
      twoFactorEnabled: true,
    }
  });
};

const updateUser = async (id, { name, email, password, role, active }, currentUserId) => {
  const current = await prisma.user.findUnique({ where: { id } });
  if (!current) throw Object.assign(new Error('Usuário não encontrado.'), { status: 404 });
  if (id === currentUserId && active === false) {
    throw Object.assign(new Error('Você não pode desativar a própria conta.'), { status: 400 });
  }
  if (current.role === 'proprietario' && role && role !== 'proprietario') {
    const owners = await prisma.user.count({ where: { role: 'proprietario', active: true } });
    if (owners <= 1) throw Object.assign(new Error('Mantenha pelo menos um proprietário ativo.'), { status: 400 });
  }
  const data = {};
  if (name !== undefined) data.name = name.trim();
  if (email !== undefined) data.email = email.toLowerCase().trim();
  if (role !== undefined) data.role = role;
  if (active !== undefined) data.active = Boolean(active);
  if (password) {
    data.password = await bcrypt.hash(password, 12);
  }

  const updatedUser = await prisma.user.update({
    where: { id },
    data,
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      active: true,
      twoFactorEnabled: true,
    }
  });
  const securityChanged = active === false
    || Boolean(password)
    || (role !== undefined && role !== current.role)
    || (email !== undefined && email.toLowerCase().trim() !== current.email);
  if (securityChanged) {
    await authSessionsService.revokeUserSessions(id, 'Conta ou permissões alteradas pelo Gestor');
  }
  return updatedUser;
};

const deleteUser = async (id, currentUserId) => {
  if (id === currentUserId) {
    const error = new Error('Você não pode excluir sua própria conta de usuário logado.');
    error.status = 400;
    throw error;
  }

  const count = await prisma.user.count({ where: { role: { in: ['administrador', 'proprietario'] } } });
  const target = await prisma.user.findUnique({ where: { id } });

  if (['administrador', 'proprietario'].includes(target?.role) && count <= 1) {
    const error = new Error('Não é possível excluir o único administrador do sistema.');
    error.status = 400;
    throw error;
  }

  return prisma.user.delete({ where: { id } });
};

const changePassword = async ({ userId, currentPassword, newPassword }) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    const error = new Error('Usuário não encontrado');
    error.status = 404;
    throw error;
  }

  const matches = await bcrypt.compare(currentPassword, user.password);
  if (!matches) {
    const error = new Error('Senha atual incorreta');
    error.status = 400;
    throw error;
  }

  const hashedPassword = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({
    where: { id: userId },
    data: { password: hashedPassword }
  });

  await authSessionsService.revokeUserSessions(userId, 'Senha alterada');

  return { message: 'Senha alterada. Entre novamente com a nova senha.' };
};

module.exports = {
  listUsers,
  createUser,
  updateUser,
  deleteUser,
  changePassword
};
