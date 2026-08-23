const express = require('express');
const { z } = require('zod');
const validate = require('../middleware/validate.middleware');
const authenticate = require('../middleware/auth.middleware');
const loyaltyController = require('../../controllers/loyalty.controller');

const router = express.Router();

const redeemSchema = z.object({
  cpf: z.string().transform((value) => value.replace(/\D/g, '')).refine((value) => /^[0-9]{11}$/.test(value), {
    message: 'CPF deve conter 11 digitos numericos'
  }),
  amount: z.coerce.number().positive()
});

router.use(authenticate);
router.get('/summary', loyaltyController.summary);
router.post('/redeem', validate(redeemSchema), loyaltyController.redeem);

module.exports = router;
