const express = require('express');
const { z } = require('zod');
const validate = require('../middleware/validate.middleware');
const authenticate = require('../middleware/auth.middleware');
const authorize = require('../middleware/authorize.middleware');
const clientsController = require('../../controllers/clients.controller');

const router = express.Router();

const cpfSchema = z.object({
  cpf: z.string().transform((value) => value.replace(/\D/g, '')).refine((value) => /^[0-9]{11}$/.test(value), {
    message: 'CPF deve conter 11 digitos numericos'
  })
});

const phoneRegex = /^[0-9]{10,15}$/;

const clientSchema = z.object({
  name: z.string().min(1).optional(),
  clienteNome: z.string().min(1).optional(),
  cpf: z.string().optional(),
  clienteCpf: z.string().optional(),
  phone: z.string().optional(),
  clienteTelefone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  clienteEmail: z.string().email().optional().or(z.literal('')),
  birthDate: z.string().optional().or(z.literal('')),
  clienteNascimento: z.string().optional().or(z.literal('')),
  notes: z.string().optional(),
  blocked: z.boolean().optional()
}).superRefine((data, ctx) => {
  const name = data.name || data.clienteNome;
  const cpf = String(data.cpf || data.clienteCpf || '').replace(/\D/g, '');
  const phone = String(data.phone || data.clienteTelefone || '').replace(/\D/g, '');

  if (!name) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['name'], message: 'Nome e obrigatorio' });
  }
  if (!/^[0-9]{11}$/.test(cpf)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['cpf'], message: 'CPF deve conter 11 digitos numericos' });
  }
  if (!phoneRegex.test(phone)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['phone'], message: 'Telefone deve conter entre 10 e 15 digitos numericos' });
  }
});

const blockedSchema = cpfSchema.extend({
  blocked: z.boolean()
});

router.use(authenticate);
router.get('/', clientsController.listClients);
router.get('/birthdays/month', clientsController.birthdays);
router.post('/', validate(clientSchema), clientsController.saveClient);
router.patch('/:cpf/blocked', authorize('administrador', 'gerente'), validate(blockedSchema), clientsController.updateBlocked);
router.get('/:cpf/history', validate(cpfSchema), clientsController.getClientHistory);

module.exports = router;
