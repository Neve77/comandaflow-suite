const { Prisma } = require('@prisma/client');
const prisma = require('../infra/prisma/client');

const createPedido = async ({ comandaId, produtoId, nome, quantidade, valorUnitario, observacao = '' }) => {
  const comanda = await prisma.comanda.findUnique({ where: { id: comandaId } });
  if (!comanda) {
    const error = new Error('Comanda não encontrada');
    error.status = 404;
    throw error;
  }
  if (comanda.status !== 'aberta') {
    const error = new Error('Não é possível adicionar pedido em comanda fechada');
    error.status = 400;
    throw error;
  }

  let pedidoNome = nome;
  let unitPrice = valorUnitario;

  if (produtoId) {
    const product = await prisma.produto.findUnique({ where: { id: produtoId } });
    if (!product) {
      const error = new Error('Produto não encontrado');
      error.status = 404;
      throw error;
    }
    if (!product.ativo) {
      const error = new Error('Produto inativo não pode ser vendido');
      error.status = 400;
      throw error;
    }
    if (product.estoque < quantidade) {
      const error = new Error('Estoque insuficiente para este produto');
      error.status = 400;
      throw error;
    }

    pedidoNome = product.nome;
    unitPrice = product.preco;
  }

  const subtotal = new Prisma.Decimal(unitPrice).mul(quantidade);

  return prisma.$transaction(async (tx) => {
    const comandaUpdate = await tx.comanda.updateMany({
      where: { id: comandaId, status: 'aberta' },
      data: { total: { increment: subtotal } }
    });
    if (comandaUpdate.count !== 1) {
      const error = new Error('Não é possível adicionar pedido em comanda fechada');
      error.status = 409;
      throw error;
    }

    if (produtoId) {
      const currentProduct = await tx.produto.findUnique({ where: { id: produtoId } });
      const stockUpdate = await tx.produto.updateMany({
        where: { id: produtoId, estoque: { gte: quantidade } },
        data: { estoque: { decrement: quantidade } }
      });

      if (stockUpdate.count !== 1) {
        const error = new Error('Estoque insuficiente para este produto');
        error.status = 400;
        throw error;
      }

      await tx.stockMovement.create({
        data: {
          produtoId,
          type: 'saida',
          quantity: quantidade,
          previousStock: currentProduct.estoque,
          newStock: currentProduct.estoque - quantidade,
          reason: 'Venda em comanda'
        }
      });
    }

    const pedido = await tx.pedido.create({
      data: {
        comandaId,
        produtoId,
        nome: pedidoNome,
        quantidade,
        valorUnitario: new Prisma.Decimal(unitPrice),
        subtotal,
        observacao: observacao || '',
        status: 'pendente',
        cancelado: false
      }
    });

    return pedido;
  });
};

const updateStatus = async (id, status) => {
  const validStatuses = ['pendente', 'em_preparo', 'pronto', 'entregue'];
  if (!validStatuses.includes(status)) {
    const error = new Error(`Status inválido: ${status}`);
    error.status = 400;
    throw error;
  }

  const pedido = await prisma.pedido.findUnique({ where: { id } });
  if (!pedido) {
    const error = new Error('Pedido não encontrado');
    error.status = 404;
    throw error;
  }

  return prisma.pedido.update({
    where: { id },
    data: { status }
  });
};

const listActivePedidos = async () => {
  return prisma.pedido.findMany({
    where: {
      cancelado: false,
      status: { in: ['pendente', 'em_preparo', 'pronto'] },
      comanda: { status: 'aberta' }
    },
    orderBy: { createdAt: 'asc' },
    include: {
      comanda: {
        include: {
          mesa: true,
          bracelet: true
        }
      }
    }
  });
};

const cancelPedido = async (id) => {
  const pedido = await prisma.pedido.findUnique({ where: { id } });
  if (!pedido) {
    const error = new Error('Pedido não encontrado');
    error.status = 404;
    throw error;
  }
  if (pedido.cancelado) {
    const error = new Error('Pedido já foi cancelado');
    error.status = 400;
    throw error;
  }

  return prisma.$transaction(async (tx) => {
    const cancelUpdate = await tx.pedido.updateMany({
      where: { id, cancelado: false },
      data: { cancelado: true }
    });

    if (cancelUpdate.count !== 1) {
      const error = new Error('Pedido já foi cancelado');
      error.status = 409;
      throw error;
    }

    const canceled = await tx.pedido.findUnique({ where: { id } });

    if (pedido.produtoId) {
      const currentProduct = await tx.produto.findUnique({ where: { id: pedido.produtoId } });
      await tx.produto.update({
        where: { id: pedido.produtoId },
        data: { estoque: { increment: pedido.quantidade } }
      });
      await tx.stockMovement.create({
        data: {
          produtoId: pedido.produtoId,
          type: 'entrada',
          quantity: pedido.quantidade,
          previousStock: currentProduct.estoque,
          newStock: currentProduct.estoque + pedido.quantidade,
          reason: 'Cancelamento de pedido'
        }
      });
    }

    await tx.comanda.update({
      where: { id: pedido.comandaId },
      data: { total: { decrement: pedido.subtotal } }
    });

    return canceled;
  });
};

module.exports = { createPedido, updateStatus, listActivePedidos, cancelPedido };
