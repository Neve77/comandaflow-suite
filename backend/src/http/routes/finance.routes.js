const express = require('express');
const { z } = require('zod');
const validate = require('../middleware/validate.middleware');
const authenticate = require('../middleware/auth.middleware');
const authorize = require('../middleware/authorize.middleware');
const financeController = require('../../controllers/finance.controller');

const router = express.Router();

const dateParam = z.string().refine((value) => !Number.isNaN(new Date(value).getTime()), {
  message: 'Data invalida'
});

const periodSchema = z.object({
  start: dateParam.optional(),
  end: dateParam.optional()
});

const movementSchema = z.object({
  type: z.enum(['entrada', 'saida', 'sangria', 'abertura', 'fechamento']),
  amount: z.coerce.number().positive(),
  description: z.string().min(1)
});

router.use(authenticate);
router.get('/summary', authorize('administrador', 'gerente', 'caixa'), validate(periodSchema), financeController.summary);
router.get('/movements', authorize('administrador', 'gerente', 'caixa'), validate(periodSchema), financeController.list);
router.post('/movements', authorize('administrador', 'gerente', 'caixa'), validate(movementSchema), financeController.create);

module.exports = router;
