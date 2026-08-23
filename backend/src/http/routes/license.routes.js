const express = require('express');
const router = express.Router();
const { z } = require('zod');
const validate = require('../middleware/validate.middleware');
const managerOnly = require('../middleware/manager.middleware');
const licenseController = require('../../controllers/license.controller');

const syncSchema = z.object({
  licenseKey: z.string().trim().min(40).max(5000),
  installationId: z.string().trim().min(8).max(200),
  deviceName: z.string().trim().max(200).optional(),
});

// Status e ativação são públicos para permitir a regularização mesmo com o sistema bloqueado.
router.get('/status', licenseController.getStatus);
router.post('/activate', licenseController.activate);
router.post('/sync', managerOnly, validate(syncSchema), licenseController.sync);

module.exports = router;
