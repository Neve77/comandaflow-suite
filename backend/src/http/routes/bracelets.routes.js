const express = require('express');
const { z } = require('zod');
const validate = require('../middleware/validate.middleware');
const authenticate = require('../middleware/auth.middleware');
const authorize = require('../middleware/authorize.middleware');
const braceletsController = require('../../controllers/bracelets.controller');

const router = express.Router();

const createBraceletSchema = z.object({
  number: z.string().min(1),
  type: z.enum(['QR', 'RFID', 'NFC']).default('QR')
});

const statusSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(['livre', 'em_uso', 'bloqueada']),
  blockedReason: z.string().optional().or(z.literal(''))
});

router.use(authenticate);
router.get('/', braceletsController.getAll);
router.post('/', authorize('administrador', 'gerente'), validate(createBraceletSchema), braceletsController.create);
router.patch('/:id/status', authorize('administrador', 'gerente', 'caixa'), validate(statusSchema), braceletsController.updateStatus);

module.exports = router;
