const express = require('express');
const router = express.Router();
const mesasController = require('../../controllers/mesas.controller');
const authenticate = require('../middleware/auth.middleware');

router.use(authenticate);

router.get('/', mesasController.listMesas);
router.get('/:id/history', mesasController.getMesaHistory);
router.get('/:id', mesasController.getMesaById);
router.post('/', mesasController.createMesa);
router.put('/:id', mesasController.updateMesa);
router.delete('/:id', mesasController.deleteMesa);

module.exports = router;
