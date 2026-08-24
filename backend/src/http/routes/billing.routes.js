const express = require('express');
const { z } = require('zod');
const controller = require('../../controllers/billing.controller');
const authenticate = require('../middleware/auth.middleware');
const authorize = require('../middleware/authorize.middleware');
const managerOnly = require('../middleware/manager.middleware');
const validate = require('../middleware/validate.middleware');

const router = express.Router();
router.use(managerOnly, authenticate);

const id = z.string().uuid();
const listSchema = z.object({ subscriberId: id.optional(), status: z.enum(['todos', 'pendente', 'vencida', 'paga', 'cancelada']).optional(), search: z.string().trim().max(150).optional() });
const chargeSchema = z.object({ subscriberId: id, subscriptionId: id.optional().nullable(), amount: z.number().positive().max(10000000), dueDate: z.string().datetime(), description: z.string().trim().max(250).optional().or(z.literal('')), recurring: z.boolean().optional().default(false), billingCycleDays: z.number().int().min(1).max(365).optional().default(30) });
const updateSchema = z.object({ id, amount: z.number().positive().max(10000000).optional(), dueDate: z.string().datetime().optional(), description: z.string().trim().max(250).optional().or(z.literal('')) });
const paymentSchema = z.object({ id, paidAt: z.string().datetime().optional(), paymentMethod: z.enum(['pix', 'dinheiro', 'transferencia', 'cartao', 'boleto', 'outro']), notes: z.string().trim().max(500).optional().or(z.literal('')) });
const cancelSchema = z.object({ id, reason: z.string().trim().max(500).optional().or(z.literal('')) });
const recurrenceSchema = z.object({ subscriberId: id, enabled: z.boolean(), amount: z.number().positive().max(10000000).optional(), billingCycleDays: z.number().int().min(1).max(365).optional(), nextBillingDate: z.string().datetime().optional() }).superRefine((data, context) => { if (data.enabled) { for (const field of ['amount', 'billingCycleDays', 'nextBillingDate']) if (data[field] === undefined) context.addIssue({ code: z.ZodIssueCode.custom, path: [field], message: 'Campo obrigatório para recorrência ativa.' }); } });

router.get('/summary', authorize.permission('billing:read'), controller.summary);
router.get('/charges', authorize.permission('billing:read'), validate(listSchema), controller.list);
router.post('/subscribers/:subscriberId/charges', authorize.permission('billing:write'), validate(chargeSchema), controller.create);
router.put('/subscribers/:subscriberId/recurrence', authorize.permission('billing:write'), validate(recurrenceSchema), controller.configureRecurrence);
router.put('/charges/:id', authorize.permission('billing:write'), validate(updateSchema), controller.update);
router.post('/charges/:id/pay', authorize.permission('billing:write'), validate(paymentSchema), controller.pay);
router.post('/charges/:id/cancel', authorize.permission('billing:write'), validate(cancelSchema), controller.cancel);
router.post('/process', authorize.permission('billing:write'), controller.process);

module.exports = router;
