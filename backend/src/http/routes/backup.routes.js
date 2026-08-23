const express = require('express');
const { z } = require('zod');
const validate = require('../middleware/validate.middleware');
const authenticate = require('../middleware/auth.middleware');
const authorize = require('../middleware/authorize.middleware');
const backupController = require('../../controllers/backup.controller');

const router = express.Router();

const idSchema = z.object({ id: z.string().uuid() });

router.use(authenticate);
router.use(authorize('administrador'));
router.get('/', backupController.list);
router.post('/', backupController.create);
router.post('/:id/restore', validate(idSchema), backupController.restore);

module.exports = router;
