const express = require('express');
const router = express.Router();
const { z } = require('zod');
const validate = require('../middleware/validate.middleware');
const managerOnly = require('../middleware/manager.middleware');
const clientOnly = require('../middleware/client.middleware');
const authenticate = require('../middleware/auth.middleware');
const authorize = require('../middleware/authorize.middleware');
const licenseController = require('../../controllers/license.controller');

const syncSchema = z.object({
  licenseKey: z.string().trim().min(40).max(5000),
  installationId: z.string().trim().min(8).max(200),
  deviceName: z.string().trim().max(200).optional(),
  appVersion: z.string().trim().max(50).optional(),
  platform: z.string().trim().max(80).optional(),
});

const receiptSchema = z.object({
  messageId: z.string().uuid(),
  licenseKey: z.string().trim().min(40).max(5000),
  installationId: z.string().trim().min(8).max(200),
});

const supportTicketSchema = z.object({
  subject: z.string().trim().min(3).max(160),
  description: z.string().trim().min(3).max(4000),
  priority: z.enum(['baixa', 'normal', 'alta', 'urgente']).default('normal'),
});

const supportCommentSchema = z.object({ body: z.string().trim().min(2).max(2000) });
const supportCredentialsSchema = z.object({
  licenseKey: z.string().trim().min(40).max(5000),
  installationId: z.string().trim().min(8).max(200),
});
const remoteActorSchema = z.object({ actorName: z.string().trim().min(2).max(160).optional() });

// Status e ativação são públicos para permitir a regularização mesmo com o sistema bloqueado.
router.get('/status', licenseController.getStatus);
router.post('/activate', licenseController.activate);
router.post('/refresh', clientOnly, authenticate, licenseController.refreshStatus);
router.post('/sync', managerOnly, validate(syncSchema), licenseController.sync);
router.post('/messages/:messageId/read', managerOnly, validate(receiptSchema), licenseController.acknowledgeMessage);
router.post('/messages/:messageId/acknowledge', clientOnly, authenticate, authorize('administrador'), validate(z.object({ messageId: z.string().uuid() })), licenseController.acknowledgeLocalMessage);
router.post('/support/remote/tickets/list', managerOnly, validate(supportCredentialsSchema), licenseController.listRemoteSupportTickets);
router.post('/support/remote/tickets', managerOnly, validate(supportCredentialsSchema.merge(supportTicketSchema).merge(remoteActorSchema)), licenseController.createRemoteSupportTicket);
router.post('/support/remote/tickets/:ticketId/comments', managerOnly, validate(supportCredentialsSchema.merge(supportCommentSchema).merge(remoteActorSchema)), licenseController.commentRemoteSupportTicket);
router.get('/support/tickets', clientOnly, authenticate, licenseController.listLocalSupportTickets);
router.post('/support/tickets', clientOnly, authenticate, validate(supportTicketSchema), licenseController.createLocalSupportTicket);
router.post('/support/tickets/:ticketId/comments', clientOnly, authenticate, validate(supportCommentSchema), licenseController.commentLocalSupportTicket);

module.exports = router;
