const express = require('express');
const { z } = require('zod');
const validate = require('../middleware/validate.middleware');
const authController = require('../../controllers/auth.controller');
const authenticate = require('../middleware/auth.middleware');
const authorize = require('../middleware/authorize.middleware');

const router = express.Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  twoFactorCode: z.string().trim().min(6).max(20).optional(),
});

const setupSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(255),
  password: z.string().min(10).max(128),
});

router.get('/setup-status', authController.setupStatus);
router.post('/setup', validate(setupSchema), authController.setup);
router.post('/login', validate(loginSchema), authController.login);
router.post('/logout', authenticate, authController.logout);
router.get('/sessions', authenticate, authorize('proprietario', 'administrador'), authController.listSessions);
router.post(
  '/sessions/:sessionId/revoke',
  authenticate,
  authorize('proprietario', 'administrador'),
  validate(z.object({ sessionId: z.string().uuid(), reason: z.string().trim().min(3).max(200).optional() })),
  authController.revokeSession,
);
router.get('/2fa/status', authenticate, authController.twoFactorStatus);
router.post('/2fa/setup', authenticate, authController.setupTwoFactor);
router.post('/2fa/enable', authenticate, validate(z.object({ code: z.string().trim().regex(/^\d{6}$/) })), authController.enableTwoFactor);
router.post('/2fa/disable', authenticate, validate(z.object({ code: z.string().trim().regex(/^\d{6}$/) })), authController.disableTwoFactor);

module.exports = router;
