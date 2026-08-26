const express = require('express');
const { z } = require('zod');
const controller = require('../../controllers/manager-operations.controller');
const authenticate = require('../middleware/auth.middleware');
const authorize = require('../middleware/authorize.middleware');
const managerOnly = require('../middleware/manager.middleware');
const validate = require('../middleware/validate.middleware');

const router = express.Router();
const id = z.string().uuid();
const messageSchema = z.object({
  subscriberIds: z.array(id).max(500).optional().default([]),
  title: z.string().trim().min(2).max(120),
  body: z.string().trim().min(3).max(2000),
  severity: z.enum(['info', 'aviso', 'urgente']).default('info'),
  expiresAt: z.string().datetime().optional().nullable(),
});
const ticketSchema = z.object({
  subscriberId: id,
  subject: z.string().trim().min(3).max(160),
  description: z.string().trim().min(3).max(4000),
  priority: z.enum(['baixa', 'normal', 'alta', 'urgente']).default('normal'),
  comment: z.string().trim().max(2000).optional().or(z.literal('')),
});
const ticketUpdateSchema = z.object({
  status: z.enum(['aberto', 'em_atendimento', 'resolvido', 'fechado']),
  priority: z.enum(['baixa', 'normal', 'alta', 'urgente']),
});

router.use(managerOnly, authenticate);
router.get('/notifications', authorize.permission('subscriptions:read'), controller.notifications);
router.get('/pulse', authorize.permission('monitoring:read', 'subscriptions:read'), controller.pulse);
router.get('/pending', authorize.permission('monitoring:read', 'subscriptions:read'), controller.pending);
router.get('/monitoring', authorize.permission('monitoring:read'), controller.monitoring);
router.get('/subscribers/:id/profile', authorize.permission('subscriptions:read'), controller.subscriberProfile);
router.patch('/subscribers/:id/onboarding/:step', authorize.permission('subscriptions:write'), validate(z.object({
  completed: z.boolean(),
  note: z.string().trim().max(500).optional().or(z.literal('')),
})), controller.setOnboardingStep);
router.get('/messages', authorize.permission('messages:read'), controller.listMessages);
router.post('/messages', authorize.permission('messages:write'), validate(messageSchema), controller.sendMessage);
router.post('/messages/:id/deactivate', authorize.permission('messages:write'), controller.deactivateMessage);
router.get('/tickets', authorize.permission('support:read'), controller.listTickets);
router.post('/tickets', authorize.permission('support:write'), validate(ticketSchema), controller.createTicket);
router.put('/tickets/:id', authorize.permission('support:write'), validate(ticketUpdateSchema), controller.updateTicket);
router.post('/tickets/:id/comments', authorize.permission('support:write'), validate(z.object({ body: z.string().trim().min(2).max(2000) })), controller.commentTicket);

module.exports = router;
