const express = require('express');
const router = express.Router();
const usersController = require('../../controllers/users.controller');
const authenticate = require('../middleware/auth.middleware');
const authorize = require('../middleware/authorize.middleware');

router.use(authenticate);
router.post('/change-password', usersController.changePassword);

router.use(authorize('proprietario', 'administrador'));
router.get('/', usersController.listUsers);
router.post('/', usersController.createUser);
router.put('/:id', usersController.updateUser);
router.delete('/:id', usersController.deleteUser);

module.exports = router;
