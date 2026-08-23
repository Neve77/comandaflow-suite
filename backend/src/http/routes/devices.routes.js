const express = require('express');
const { z } = require('zod');
const validate = require('../middleware/validate.middleware');
const authenticate = require('../middleware/auth.middleware');
const authorize = require('../middleware/authorize.middleware');
const devicesController = require('../../controllers/devices.controller');

const router = express.Router();

const pairingSchema = z.object({
  role: z.enum(['administrador', 'gerente', 'caixa', 'garcom', 'operador']).default('garcom'),
  ttlMinutes: z.coerce.number().int().min(1).max(120).default(15)
});

const confirmSchema = z.object({
  pairingCode: z.string().regex(/^[0-9]{6}$/),
  name: z.string().min(1).optional()
});

router.post('/pairing/confirm', validate(confirmSchema), devicesController.confirmPairing);

router.use(authenticate);
router.get('/status', authorize('administrador', 'gerente'), devicesController.status);
router.post('/pairing', authorize('administrador', 'gerente'), validate(pairingSchema), devicesController.createPairing);

module.exports = router;
