const usersService = require('../services/users.service');

const disconnectUser = (req, userId) => {
  const sockets = req.app.get('io')?.sockets?.sockets;
  if (!sockets) return;
  for (const socket of sockets.values()) {
    if (socket.user?.userId === userId) socket.disconnect(true);
  }
};

const listUsers = async (req, res, next) => {
  try {
    const users = await usersService.listUsers();
    return res.json({ users });
  } catch (error) {
    next(error);
  }
};

const createUser = async (req, res, next) => {
  try {
    const user = await usersService.createUser(req.body);
    return res.status(201).json({ user, message: 'Usuário cadastrado com sucesso' });
  } catch (error) {
    next(error);
  }
};

const updateUser = async (req, res, next) => {
  try {
    const values = req.validated || req.body;
    const user = await usersService.updateUser(req.params.id, values, req.user?.userId);
    if (values.active === false || values.password || values.role || values.email) {
      disconnectUser(req, req.params.id);
    }
    return res.json({ user, message: 'Usuário atualizado com sucesso' });
  } catch (error) {
    next(error);
  }
};

const deleteUser = async (req, res, next) => {
  try {
    await usersService.deleteUser(req.params.id, req.user?.userId);
    return res.json({ message: 'Usuário excluído com sucesso' });
  } catch (error) {
    next(error);
  }
};

const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Informe a senha atual e a nova senha.' });
    }
    const result = await usersService.changePassword({
      userId: req.user.userId,
      currentPassword,
      newPassword
    });
    return res.json(result);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  listUsers,
  createUser,
  updateUser,
  deleteUser,
  changePassword
};
