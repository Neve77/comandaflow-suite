const prisma = require('../infra/prisma/client');

const adjustStock = async ({ produtoId, type, quantity, reason }) => {
  const product = await prisma.produto.findUnique({ where: { id: produtoId } });
  if (!product) {
    const error = new Error('Produto nao encontrado');
    error.status = 404;
    throw error;
  }

  const current = Number(product.estoque || 0);
  let nextStock = current;
  if (type === 'entrada') nextStock += quantity;
  if (type === 'saida') nextStock -= quantity;
  if (type === 'ajuste') nextStock = quantity;
  if (type === 'inventario') nextStock = quantity;

  if (nextStock < 0) {
    const error = new Error('Movimentacao deixaria o estoque negativo');
    error.status = 400;
    throw error;
  }

  return prisma.$transaction(async (tx) => {
    const updated = await tx.produto.update({
      where: { id: produtoId },
      data: { estoque: nextStock }
    });

    const movement = await tx.stockMovement.create({
      data: {
        produtoId,
        type,
        quantity,
        previousStock: current,
        newStock: nextStock,
        reason: reason || null
      }
    });

    return { product: updated, movement };
  });
};

const listMovements = async () => {
  return prisma.stockMovement.findMany({
    orderBy: { createdAt: 'desc' },
    take: 200,
    include: {
      produto: { select: { id: true, nome: true, categoria: true } }
    }
  });
};

const getStockSummary = async () => {
  const products = await prisma.produto.findMany({ orderBy: { nome: 'asc' } });
  const critical = products.filter((product) => product.estoque <= 3);
  const low = products.filter((product) => product.estoque > 3 && product.estoque <= 8);

  return {
    totalProducts: products.length,
    totalStock: products.reduce((sum, product) => sum + product.estoque, 0),
    critical: critical.length,
    low: low.length,
    products: products.map((product) => ({
      ...product,
      preco: Number(product.preco || 0),
      stockStatus: product.estoque <= 3 ? 'critico' : product.estoque <= 8 ? 'baixo' : 'ok'
    }))
  };
};

module.exports = { adjustStock, getStockSummary, listMovements };
