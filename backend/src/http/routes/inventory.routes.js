const express = require('express');
const { z } = require('zod');
const validate = require('../middleware/validate.middleware');
const authenticate = require('../middleware/auth.middleware');
const authorize = require('../middleware/authorize.middleware');
const inventoryController = require('../../controllers/inventory.controller');

const router = express.Router();

const adjustmentSchema = z.object({
  produtoId: z.string().uuid(),
  type: z.enum(['entrada', 'saida', 'ajuste', 'inventario']),
  quantity: z.coerce.number().int().min(0),
  reason: z.string().optional().or(z.literal(''))
}).superRefine((data, ctx) => {
  if (['entrada', 'saida'].includes(data.type) && data.quantity <= 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['quantity'],
      message: 'Quantidade deve ser maior que zero'
    });
  }
});

router.use(authenticate);
router.get('/summary', inventoryController.summary);
router.get('/movements', inventoryController.movements);
router.post('/adjustments', authorize('administrador', 'gerente', 'caixa'), validate(adjustmentSchema), inventoryController.adjust);

module.exports = router;
