const express = require('express');
const router = express.Router();
const usersController = require('../../controllers/users.controller');
const authenticate = require('../middleware/auth.middleware');
const authorize = require('../middleware/authorize.middleware');
const { z } = require('zod');
const validate = require('../middleware/validate.middleware');

router.use(authenticate);
router.post('/change-password', validate(z.object({
  currentPassword: z.string().min(6).max(128),
  newPassword: z.string().min(10).max(128),
})), usersController.changePassword);

router.use(authorize('proprietario', 'administrador'));
const roles = z.enum(['proprietario', 'financeiro', 'suporte', 'operador', 'auditor', 'administrador', 'gerente', 'caixa']);
const createSchema = z.object({ name: z.string().trim().min(2).max(100), email: z.string().trim().email().max(255), password: z.string().min(10).max(128), role: roles });
const updateSchema = z.object({ id: z.string().uuid(), name: z.string().trim().min(2).max(100).optional(), email: z.string().trim().email().max(255).optional(), password: z.string().min(10).max(128).optional().or(z.literal('')), role: roles.optional(), active: z.boolean().optional() });

router.get('/', usersController.listUsers);
router.post('/', validate(createSchema), usersController.createUser);
router.put('/:id', validate(updateSchema), usersController.updateUser);
router.delete('/:id', usersController.deleteUser);

module.exports = router;
