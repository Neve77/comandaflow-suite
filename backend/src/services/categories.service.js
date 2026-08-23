const prisma = require('../infra/prisma/client');

const listCategories = async () => {
  return prisma.categoria.findMany({
    orderBy: { ordem: 'asc' },
    include: {
      produtos: {
        where: { ativo: true }
      }
    }
  });
};

const createCategory = async ({ nome, ordem = 0, ativa = true }) => {
  const existing = await prisma.categoria.findUnique({ where: { nome: nome.trim() } });
  if (existing) {
    const error = new Error(`Categoria "${nome}" já existe`);
    error.status = 400;
    throw error;
  }

  return prisma.categoria.create({
    data: {
      nome: nome.trim(),
      ordem: Number(ordem) || 0,
      ativa: Boolean(ativa)
    }
  });
};

const updateCategory = async (id, { nome, ordem, ativa }) => {
  const data = {};
  if (nome !== undefined) data.nome = nome.trim();
  if (ordem !== undefined) data.ordem = Number(ordem);
  if (ativa !== undefined) data.ativa = Boolean(ativa);

  return prisma.categoria.update({
    where: { id },
    data
  });
};

const deleteCategory = async (id) => {
  const productsCount = await prisma.produto.count({ where: { categoriaId: id } });
  if (productsCount > 0) {
    const error = new Error(`Não é possível excluir: existem ${productsCount} produto(s) nesta categoria`);
    error.status = 400;
    throw error;
  }

  return prisma.categoria.delete({ where: { id } });
};

// As categorias iniciais evitam um cadastro vazio na primeira operação do restaurante.
const seedDefaultCategories = async () => {
  const count = await prisma.categoria.count();
  if (count === 0) {
    const defaults = [
      { nome: 'Lanches', ordem: 1 },
      { nome: 'Bebidas', ordem: 2 },
      { nome: 'Pizzas', ordem: 3 },
      { nome: 'Porções & Acompanhamentos', ordem: 4 },
      { nome: 'Sobremesas', ordem: 5 },
      { nome: 'Saladas', ordem: 6 },
      { nome: 'Outros', ordem: 7 }
    ];
    for (const cat of defaults) {
      await prisma.categoria.create({ data: cat });
    }
  }
};

module.exports = {
  listCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  seedDefaultCategories
};
