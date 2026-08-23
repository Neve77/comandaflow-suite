const productsService = require('../services/products.service');

const getAll = async (req, res, next) => {
  try {
    const products = await productsService.listAll();
    res.json({ products });
  } catch (error) {
    next(error);
  }
};

const getOne = async (req, res, next) => {
  try {
    const { id } = req.validated;
    const product = await productsService.getProduct(id);
    res.json({ product });
  } catch (error) {
    next(error);
  }
};

const create = async (req, res, next) => {
  try {
    const data = req.validated;
    const product = await productsService.createProduct(data);
    res.status(201).json({ product });
  } catch (error) {
    next(error);
  }
};

const update = async (req, res, next) => {
  try {
    const { id, ...data } = req.validated;
    const product = await productsService.updateProduct(id, data);
    res.json({ product });
  } catch (error) {
    next(error);
  }
};

const toggleActive = async (req, res, next) => {
  try {
    const { id, ativo } = req.validated;
    const product = await productsService.toggleActive(id, ativo);
    res.json({ product });
  } catch (error) {
    next(error);
  }
};

const remove = async (req, res, next) => {
  try {
    const { id } = req.validated;
    await productsService.deleteProduct(id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

module.exports = { getAll, getOne, create, update, toggleActive, delete: remove };
