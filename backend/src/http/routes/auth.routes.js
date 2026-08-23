const express = require('express');
const { z } = require('zod');
const validate = require('../middleware/validate.middleware');
const authController = require('../../controllers/auth.controller');

const router = express.Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6)
});

const setupSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(255),
  password: z.string().min(10).max(128),
});

router.get('/setup-status', authController.setupStatus);
router.post('/setup', validate(setupSchema), authController.setup);
router.post('/login', validate(loginSchema), authController.login);

module.exports = router;
