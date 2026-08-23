const express = require('express');
const { z } = require('zod');
const validate = require('../middleware/validate.middleware');
const authenticate = require('../middleware/auth.middleware');
const pedidosController = require('../../controllers/pedidos.controller');

const router = express.Router();

const createSchema = z.object({
  comandaId: z.string().uuid(),
  produtoId: z.string().uuid().optional().or(z.literal('')),
  nome: z.string().trim().optional(),
  quantidade: z.coerce.number().int({ message: 'Quantidade deve ser um número inteiro' }).positive({ message: 'Quantidade deve ser maior que zero' }),
  valorUnitario: z.coerce.number().positive({ message: 'Valor unitário deve ser maior que zero' }).optional(),
  observacao: z.string().optional().default('')
}).superRefine((data, ctx) => {
  if (!data.produtoId && !data.nome) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['nome'],
      message: 'Nome do item é obrigatório quando produtoId não for informado'
    });
  }

  if (!data.produtoId && !data.valorUnitario) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['valorUnitario'],
      message: 'Valor unitário é obrigatório quando produtoId não for informado'
    });
  }
});

const cancelSchema = z.object({ id: z.string().uuid() });

router.use(authenticate);
router.get('/active', pedidosController.listActive);
router.post('/', validate(createSchema), pedidosController.create);
router.patch('/:id/status', pedidosController.updateStatus);
router.patch('/:id/cancel', validate(cancelSchema), pedidosController.cancel);

module.exports = router;
