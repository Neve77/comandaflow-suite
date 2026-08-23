const express = require('express');
const { z } = require('zod');
const subscriptionsController = require('../../controllers/subscriptions.controller');
const authenticate = require('../middleware/auth.middleware');
const authorize = require('../middleware/authorize.middleware');
const managerOnly = require('../middleware/manager.middleware');
const validate = require('../middleware/validate.middleware');

const router = express.Router();
router.use(managerOnly, authenticate, authorize('proprietario'));

const subscriberSchema = z.object({
  businessName: z.string().trim().min(2).max(150),
  contactName: z.string().trim().max(120).optional().or(z.literal('')),
  email: z.string().trim().email().max(255),
  phone: z.string().trim().max(30).optional().or(z.literal('')),
  document: z.string().trim().max(30).optional().or(z.literal('')),
  notes: z.string().trim().max(1000).optional().or(z.literal('')),
});

const updateSchema = subscriberSchema.partial();

const issueSchema = z.object({
  plan: z.enum(['Mensal', 'Trimestral', 'Semestral', 'Anual', 'Personalizado']),
  days: z.number().int().min(1).max(3650),
  maxDevices: z.number().int().min(1).max(50).default(1),
});

const suspendSchema = z.object({
  mode: z.enum(['imediato', 'prazo']),
  accessUntil: z.string().datetime().optional().nullable(),
  message: z.string().trim().min(3).max(600),
});

const messageSchema = z.object({
  message: z.string().trim().min(3).max(600),
});

const localHosts = new Set(['localhost', '127.0.0.1', '0.0.0.0', '::1']);
const allowLocalServer = () => process.env.NODE_ENV === 'test' || process.env.COMANDAFLOW_ALLOW_LOCAL_SERVER === 'true';

const settingsSchema = z.object({
  publicServerUrl: z.string().trim().url().refine((value) => {
    try {
      const url = new URL(value);
      return allowLocalServer() || (url.protocol === 'https:' && !localHosts.has(url.hostname));
    } catch { return false; }
  }, 'Use o endereco HTTPS publico do tunel. localhost e 127.0.0.1 nao funcionam em outro computador.'),
  offlineGraceHours: z.number().int().min(1).max(168),
  syncIntervalMinutes: z.number().int().min(1).max(60),
  defaultSuspensionMessage: z.string().trim().min(3).max(600),
});

router.get('/summary', subscriptionsController.summary);
router.get('/settings', subscriptionsController.getSettings);
router.put('/settings', validate(settingsSchema), subscriptionsController.saveSettings);
router.get('/subscribers', subscriptionsController.list);
router.post('/subscribers', validate(subscriberSchema), subscriptionsController.create);
router.put('/subscribers/:id', validate(updateSchema), subscriptionsController.update);
router.post('/subscribers/:id/issue', validate(issueSchema), subscriptionsController.issue);
router.post('/subscribers/:id/suspend', validate(suspendSchema), subscriptionsController.suspend);
router.post('/subscribers/:id/reactivate', subscriptionsController.reactivate);
router.post('/subscribers/:id/cancel', validate(messageSchema), subscriptionsController.cancelSubscriber);
router.post('/licenses/:id/cancel', subscriptionsController.cancelSubscription);

module.exports = router;
