const express = require('express');
const { z } = require('zod');
const validate = require('../middleware/validate.middleware');
const authenticate = require('../middleware/auth.middleware');
const mobileController = require('../../controllers/mobile.controller');
const mobileService = require('../../services/mobile.service');

const router = express.Router();

const cpfRegex = /^[0-9]{11}$/;
const phoneRegex = /^[0-9]{10,15}$/;

const requireWaiter = (req, res, next) => {
  try {
    mobileService.requireWaiter(req.user);
    next();
  } catch (error) {
    next(error);
  }
};

const loginSchema = z.object({
  pin: z.string().min(4).max(12).optional(),
  email: z.string().email().optional(),
  password: z.string().min(6).optional()
}).superRefine((data, ctx) => {
  if (!data.pin && (!data.email || !data.password)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['pin'],
      message: 'Informe PIN ou usuario e senha'
    });
  }
});

const querySchema = z.object({
  q: z.string().trim().optional().default('')
});

const braceletQuerySchema = querySchema.extend({
  status: z.enum(['livre', 'em_uso', 'bloqueada']).optional()
});

const productQuerySchema = querySchema.extend({
  categoria: z.string().optional()
});

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
  notes: z.string().optional()
}).superRefine((data, ctx) => {
  const name = data.name || data.clienteNome;
  const cpf = String(data.cpf || data.clienteCpf || '').replace(/\D/g, '');
  const phone = String(data.phone || data.clienteTelefone || '').replace(/\D/g, '');
  if (!name) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['name'], message: 'Nome e obrigatorio' });
  if (!cpfRegex.test(cpf)) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['cpf'], message: 'CPF deve conter 11 digitos numericos' });
  if (!phoneRegex.test(phone)) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['phone'], message: 'Telefone deve conter entre 10 e 15 digitos numericos' });
}).transform((data) => ({
  ...data,
  cpf: String(data.cpf || data.clienteCpf || '').replace(/\D/g, ''),
  phone: String(data.phone || data.clienteTelefone || '').replace(/\D/g, ''),
  blocked: false
}));

const openSchema = z.object({
  number: z.string().min(1),
  clienteNome: z.string().min(1, 'Nome do cliente e obrigatorio'),
  clienteCpf: z.string().transform((value) => value.replace(/\D/g, '')).refine((value) => cpfRegex.test(value), {
    message: 'CPF deve conter 11 digitos numericos'
  }),
  clienteTelefone: z.string().transform((value) => value.replace(/\D/g, '')).refine((value) => phoneRegex.test(value), {
    message: 'Telefone deve conter entre 10 e 15 digitos numericos'
  }),
  clienteEmail: z.string().email().optional().or(z.literal('')),
  clienteNascimento: z.string().optional().or(z.literal('')),
  eventId: z.string().uuid().optional().or(z.literal(''))
}).transform((data) => ({
  ...data,
  clienteEmail: data.clienteEmail || '',
  clienteNascimento: data.clienteNascimento || null,
  eventId: data.eventId || null
}));

const idSchema = z.object({ id: z.string().uuid() });

const pedidoSchema = z.object({
  comandaId: z.string().uuid(),
  produtoId: z.string().uuid().optional(),
  nome: z.string().trim().optional(),
  quantidade: z.coerce.number().int().positive(),
  valorUnitario: z.coerce.number().positive().optional()
}).superRefine((data, ctx) => {
  if (!data.produtoId && !data.nome) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['nome'], message: 'Nome do item e obrigatorio' });
  }
  if (!data.produtoId && !data.valorUnitario) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['valorUnitario'], message: 'Valor unitario e obrigatorio' });
  }
});

router.post('/auth/login', validate(loginSchema), mobileController.login);

router.use(authenticate, requireWaiter);
router.get('/dashboard', mobileController.dashboard);
router.get('/search', validate(querySchema), mobileController.search);
router.get('/clients', validate(querySchema), mobileController.clients);
router.post('/clients', validate(clientSchema), mobileController.saveClient);
router.get('/bracelets', validate(braceletQuerySchema), mobileController.bracelets);
router.get('/comandas', validate(querySchema), mobileController.comandas);
router.post('/comandas/open', validate(openSchema), mobileController.openComanda);
router.get('/comandas/:id', validate(idSchema), mobileController.getComanda);
router.get('/products', validate(productQuerySchema), mobileController.products);
router.post('/pedidos', validate(pedidoSchema), mobileController.createPedido);

module.exports = router;
