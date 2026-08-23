const { Prisma } = require('@prisma/client');
const prisma = require('../infra/prisma/client');

const createProduct = async ({ nome, preco, categoria, estoque = 0, ativo = true }) => {
  return prisma.produto.create({
    data: { nome, preco: new Prisma.Decimal(preco), categoria, estoque, ativo }
  });
};

const listAll = async () => {
  return prisma.produto.findMany({ orderBy: { createdAt: 'desc' } });
};

const getProduct = async (id) => {
  const product = await prisma.produto.findUnique({ where: { id } });
  if (!product) {
    const error = new Error('Produto não encontrado');
    error.status = 404;
    throw error;
  }
  return product;
};

const updateProduct = async (id, data) => {
  const current = await getProduct(id);
  return prisma.$transaction(async (tx) => {
    const updated = await tx.produto.update({
      where: { id },
      data: {
        nome: data.nome,
        preco: new Prisma.Decimal(data.preco),
        categoria: data.categoria,
        estoque: data.estoque,
        ativo: data.ativo
      }
    });

    if (typeof data.estoque === 'number' && data.estoque !== current.estoque) {
      await tx.stockMovement.create({
        data: {
          produtoId: id,
          type: 'ajuste',
          quantity: data.estoque,
          previousStock: current.estoque,
          newStock: data.estoque,
          reason: 'Atualizacao manual do produto'
        }
      });
    }

    return updated;
  });
};

const deleteProduct = async (id) => {
  await getProduct(id);
  return prisma.produto.delete({ where: { id } });
};

const toggleActive = async (id, ativo) => {
  await getProduct(id);
  return prisma.produto.update({ where: { id }, data: { ativo } });
};

module.exports = { createProduct, listAll, getProduct, updateProduct, deleteProduct, toggleActive };
