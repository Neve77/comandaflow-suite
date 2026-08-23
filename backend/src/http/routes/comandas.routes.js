const express = require('express');
const { z } = require('zod');
const validate = require('../middleware/validate.middleware');
const authenticate = require('../middleware/auth.middleware');
const comandasController = require('../../controllers/comandas.controller');

const router = express.Router();

const openSchema = z.object({
  mesaId: z.string().optional().or(z.literal('')),
  mesaNumero: z.string().optional().or(z.literal('')),
  number: z.string().optional().or(z.literal('')),
  clienteNome: z.string().optional().default(''),
  clienteCpf: z.string().optional().default(''),
  clienteTelefone: z.string().optional().default(''),
  clienteEmail: z.string().optional().default(''),
  clienteNascimento: z.string().optional().or(z.literal('')),
  eventId: z.string().optional().or(z.literal(''))
}).refine((data) => {
  if (data.clienteCpf && data.clienteCpf.trim()) {
    const raw = data.clienteCpf.replace(/\D/g, '');
    return raw.length === 11;
  }
  return true;
}, {
  message: 'CPF deve conter 11 dígitos numéricos',
  path: ['clienteCpf']
}).transform((data) => ({
  ...data,
  mesaId: data.mesaId || null,
  mesaNumero: data.mesaNumero || null,
  number: data.number || null,
  clienteNome: data.clienteNome || '',
  clienteCpf: data.clienteCpf ? data.clienteCpf.replace(/\D/g, '') : '',
  clienteTelefone: data.clienteTelefone ? data.clienteTelefone.replace(/\D/g, '') : '',
  clienteEmail: data.clienteEmail || '',
  clienteNascimento: data.clienteNascimento || null,
  eventId: data.eventId || null
}));

const closeSchema = z.object({
  id: z.string().uuid(),
  formaPagamento: z.string().optional().default('dinheiro'),
  desconto: z.number().nonnegative().optional().default(0)
});

const idSchema = z.object({ id: z.string().uuid() });

router.use(authenticate);
router.get('/', comandasController.listOpen);
router.post('/open', validate(openSchema), comandasController.open);
router.post('/:id/transfer', comandasController.transfer);
router.post('/:id/cancel', comandasController.cancel);
router.get('/history/:number', comandasController.historyByBraceletNumber);
router.post('/:id/close', validate(closeSchema), comandasController.close);
router.get('/:id', validate(idSchema), comandasController.get);

module.exports = router;
