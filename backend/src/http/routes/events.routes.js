const express = require('express');
const { z } = require('zod');
const validate = require('../middleware/validate.middleware');
const authenticate = require('../middleware/auth.middleware');
const authorize = require('../middleware/authorize.middleware');
const eventsController = require('../../controllers/events.controller');

const router = express.Router();

const idSchema = z.object({ id: z.string().uuid() });

const eventSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional().or(z.literal('')),
  location: z.string().optional().or(z.literal('')),
  capacity: z.coerce.number().int().min(0).default(0),
  status: z.enum(['planejado', 'ativo', 'encerrado', 'cancelado']).default('planejado'),
  startAt: z.string().optional().or(z.literal('')),
  endAt: z.string().optional().or(z.literal(''))
});

const updateSchema = eventSchema.extend({ id: z.string().uuid() });

router.use(authenticate);
router.get('/', eventsController.list);
router.post('/', authorize('administrador', 'gerente'), validate(eventSchema), eventsController.create);
router.get('/:id/dashboard', validate(idSchema), eventsController.getDashboard);
router.put('/:id', authorize('administrador', 'gerente'), validate(updateSchema), eventsController.update);
router.delete('/:id', authorize('administrador'), validate(idSchema), eventsController.delete);

module.exports = router;
