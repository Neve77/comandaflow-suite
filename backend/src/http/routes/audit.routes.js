const express = require('express');
const { z } = require('zod');
const validate = require('../middleware/validate.middleware');
const authenticate = require('../middleware/auth.middleware');
const authorize = require('../middleware/authorize.middleware');
const auditController = require('../../controllers/audit.controller');

const router = express.Router();

const querySchema = z.object({
  take: z.coerce.number().int().min(1).max(500).default(100)
});

router.use(authenticate);
router.use(authorize('administrador', 'gerente', 'proprietario', 'auditor'));
router.get('/', validate(querySchema), auditController.list);

module.exports = router;
