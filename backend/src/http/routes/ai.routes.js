const express = require('express');
const { z } = require('zod');
const validate = require('../middleware/validate.middleware');
const authenticate = require('../middleware/auth.middleware');
const aiController = require('../../controllers/ai.controller');

const router = express.Router();

const dateParam = z.string().refine((value) => !Number.isNaN(new Date(value).getTime()), {
  message: 'Data invalida'
});

const insightSchema = z.object({
  start: dateParam.optional(),
  end: dateParam.optional(),
  eventId: z.string().uuid().optional()
});

router.use(authenticate);
router.get('/insights', validate(insightSchema), aiController.insights);

module.exports = router;
