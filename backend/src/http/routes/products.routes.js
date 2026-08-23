const express = require('express');
const { z } = require('zod');
const validate = require('../middleware/validate.middleware');
const authenticate = require('../middleware/auth.middleware');
const authorize = require('../middleware/authorize.middleware');
const productsController = require('../../controllers/products.controller');

const router = express.Router();

const priceSchema = z.coerce
  .number()
  .refine(Number.isFinite, { message: 'Preco invalido' })
  .refine((value) => value > 0, { message: 'Preco deve ser maior que zero' });

const stockSchema = z.coerce
  .number()
  .int({ message: 'Estoque deve ser um numero inteiro' })
  .min(0, { message: 'Estoque deve ser maior ou igual a zero' });

const productSchema = z.object({
  nome: z.string().min(1),
  preco: priceSchema,
  categoria: z.string().min(1),
  estoque: stockSchema.default(0),
  ativo: z.boolean().optional()
});

const updateSchema = productSchema.extend({
  id: z.string().uuid()
});

const idSchema = z.object({ id: z.string().uuid() });
const activeSchema = z.object({
  id: z.string().uuid(),
  ativo: z.boolean()
});

router.use(authenticate);
router.get('/', productsController.getAll);
router.get('/:id', validate(idSchema), productsController.getOne);
router.post('/', authorize('administrador', 'gerente'), validate(productSchema), productsController.create);
router.put('/:id', authorize('administrador', 'gerente'), validate(updateSchema), productsController.update);
router.patch('/:id/active', authorize('administrador', 'gerente'), validate(activeSchema), productsController.toggleActive);
router.delete('/:id', authorize('administrador'), validate(idSchema), productsController.delete);

module.exports = router;
