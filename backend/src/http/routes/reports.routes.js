const express = require('express');
const { z } = require('zod');
const validate = require('../middleware/validate.middleware');
const authenticate = require('../middleware/auth.middleware');
const authorize = require('../middleware/authorize.middleware');
const reportsController = require('../../controllers/reports.controller');

const router = express.Router();

const dateParam = z.string().refine((value) => !Number.isNaN(new Date(value).getTime()), {
  message: 'Data invalida'
});

const periodSchema = z.object({
  start: dateParam.optional(),
  end: dateParam.optional(),
  category: z.string().optional(),
  eventId: z.string().uuid().optional()
});

router.use(authenticate);
router.use(authorize('administrador', 'gerente', 'caixa'));
router.get('/dashboard', reportsController.dashboard);
router.get('/sales', validate(periodSchema), reportsController.sales);
router.get('/products', validate(periodSchema), reportsController.topProducts);
router.get('/complete', validate(periodSchema), reportsController.complete);

module.exports = router;
