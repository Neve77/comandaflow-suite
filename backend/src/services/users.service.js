const bcrypt = require('bcrypt');
const prisma = require('../infra/prisma/client');

const listUsers = async () => {
  return prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      active: true,
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

  const hashedPassword = await bcrypt.hash(password, 10);
  return prisma.user.create({
    data: {
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      role: role || 'operador',
      active: true
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      active: true
    }
  });
};

const updateUser = async (id, { name, email, password, role, active }) => {
  const data = {};
  if (name !== undefined) data.name = name.trim();
  if (email !== undefined) data.email = email.toLowerCase().trim();
  if (role !== undefined) data.role = role;
  if (active !== undefined) data.active = Boolean(active);
  if (password) {
    data.password = await bcrypt.hash(password, 10);
  }

  return prisma.user.update({
    where: { id },
    data,
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      active: true
    }
  });
};

const deleteUser = async (id, currentUserId) => {
  if (id === currentUserId) {
    const error = new Error('Você não pode excluir sua própria conta de usuário logado.');
    error.status = 400;
    throw error;
  }

  const count = await prisma.user.count({ where: { role: 'administrador' } });
  const target = await prisma.user.findUnique({ where: { id } });

  if (target?.role === 'administrador' && count <= 1) {
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

  const hashedPassword = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({
    where: { id: userId },
    data: { password: hashedPassword }
  });

  return { message: 'Senha alterada com sucesso!' };
};

module.exports = {
  listUsers,
  createUser,
  updateUser,
  deleteUser,
  changePassword
};
