const categoriesService = require('../services/categories.service');

const list = async (req, res, next) => {
  try {
    const categories = await categoriesService.listCategories();
    res.json({ categories });
  } catch (error) {
    next(error);
  }
};

const create = async (req, res, next) => {
  try {
    const category = await categoriesService.createCategory(req.body);
    res.status(201).json({ category, message: 'Categoria criada com sucesso' });
  } catch (error) {
    next(error);
  }
};

const update = async (req, res, next) => {
  try {
    const category = await categoriesService.updateCategory(req.params.id, req.body);
    res.json({ category, message: 'Categoria atualizada com sucesso' });
  } catch (error) {
    next(error);
  }
};

const remove = async (req, res, next) => {
  try {
    await categoriesService.deleteCategory(req.params.id);
    res.json({ message: 'Categoria excluída com sucesso' });
  } catch (error) {
    next(error);
  }
};

module.exports = { list, create, update, remove };
