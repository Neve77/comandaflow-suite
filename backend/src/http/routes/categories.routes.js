const express = require('express');
const router = express.Router();
const categoriesController = require('../../controllers/categories.controller');
const authenticate = require('../middleware/auth.middleware');

router.use(authenticate);

router.get('/', categoriesController.list);
router.post('/', categoriesController.create);
router.put('/:id', categoriesController.update);
router.delete('/:id', categoriesController.remove);

module.exports = router;
