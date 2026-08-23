const { Prisma } = require('@prisma/client');
const prisma = require('../infra/prisma/client');
const clientsService = require('./clients.service');
const loyaltyService = require('./loyalty.service');

const openComanda = async ({
  mesaId,
  mesaNumero,
  number, // fallback for bracelet
  clienteNome = '',
  clienteCpf = '',
  clienteTelefone = '',
  clienteEmail = '',
  clienteNascimento,
  eventId,
  userId
}) => {
  let resolvedMesaId = mesaId || null;
  let resolvedBraceletId = null;

  // Números informados por integrações antigas ainda criam a mesa automaticamente.
  if (!resolvedMesaId && mesaNumero) {
    let mesa = await prisma.mesa.findUnique({ where: { numero: String(mesaNumero) } });
    if (!mesa) {
      mesa = await prisma.mesa.create({
        data: { numero: String(mesaNumero), status: 'livre' }
      });
    }
    resolvedMesaId = mesa.id;
  }

  // A mesa escolhida precisa existir e estar disponível antes da abertura.
  if (resolvedMesaId) {
    const mesa = await prisma.mesa.findUnique({ where: { id: resolvedMesaId } });
    if (!mesa) {
      const error = new Error('Mesa não encontrada');
      error.status = 404;
      throw error;
    }
    const comandaAberta = await prisma.comanda.findFirst({
      where: { mesaId: resolvedMesaId, status: 'aberta' }
    });
    if (comandaAberta) {
      const error = new Error(`A Mesa ${mesa.numero} já possui uma comanda aberta`);
      error.status = 400;
      throw error;
    }
  }

  // Pulseiras continuam aceitas para instalações anteriores ao módulo de mesas.
  if (number) {
    let bracelet = await prisma.bracelet.findUnique({ where: { number } });
    if (!bracelet) {
      bracelet = await prisma.bracelet.create({
        data: { number, status: 'livre' }
      });
    }
    if (bracelet.status !== 'livre') {
      const error = new Error('Pulseira não está disponível para abrir comanda');
      error.status = 400;
      throw error;
    }
    resolvedBraceletId = bracelet.id;
  }

  if (!resolvedMesaId && !resolvedBraceletId) {
    const error = new Error('Selecione uma mesa para abrir a comanda');
    error.status = 400;
    throw error;
  }

  if (eventId) {
    const event = await prisma.event.findUnique({ where: { id: eventId } });
    if (!event) {
      const error = new Error('Evento não encontrado');
      error.status = 404;
      throw error;
    }
    if (event.status === 'cancelado' || event.status === 'encerrado') {
      const error = new Error('Evento não aceita novas comandas');
      error.status = 400;
      throw error;
    }
  }

  return prisma.$transaction(async (tx) => {
    let clientId = null;
    if (clienteCpf && clienteCpf.trim()) {
      const client = await clientsService.upsertClientFromComanda(tx, {
        clienteNome,
        clienteCpf,
        clienteTelefone,
        clienteEmail,
        clienteNascimento
      });
      clientId = client?.id || null;
    }

    const comanda = await tx.comanda.create({
      data: {
        mesaId: resolvedMesaId,
        braceletId: resolvedBraceletId,
        clientId,
        eventId: eventId || null,
        total: new Prisma.Decimal(0),
        desconto: new Prisma.Decimal(0),
        clienteNome: clienteNome || '',
        clienteCpf: clienteCpf || '',
        clienteTelefone: clienteTelefone || '',
        clienteEmail: clienteEmail || '',
        clienteNascimento: clienteNascimento ? new Date(clienteNascimento) : null
      },
      include: {
        mesa: true,
        bracelet: true
      }
    });

    if (resolvedMesaId) {
      await tx.mesa.update({ where: { id: resolvedMesaId }, data: { status: 'ocupada' } });
    }

    if (resolvedBraceletId) {
      await tx.bracelet.update({ where: { id: resolvedBraceletId }, data: { status: 'em_uso' } });
    }

    if (eventId) {
      await tx.event.update({ where: { id: eventId }, data: { checkIns: { increment: 1 } } });
    }

    await tx.auditLog.create({
      data: {
        userId: userId || null,
        action: 'open',
        entity: 'Comanda',
        entityId: comanda.id,
        metadata: JSON.stringify({ mesaId: resolvedMesaId, bracelet: number, clienteNome })
      }
    });

    return comanda;
  });
};

const closeComanda = async (id, { formaPagamento = 'dinheiro', desconto = 0 } = {}, userId) => {
  const comanda = await prisma.comanda.findUnique({
    where: { id },
    include: { mesa: true, bracelet: true }
  });

  if (!comanda) {
    const error = new Error('Comanda não encontrada');
    error.status = 404;
    throw error;
  }
  if (comanda.status !== 'aberta') {
    const error = new Error('Comanda já está fechada ou cancelada');
    error.status = 400;
    throw error;
  }

  return prisma.$transaction(async (tx) => {
    const totalAgg = await tx.pedido.aggregate({
      where: { comandaId: id, cancelado: false },
      _sum: { subtotal: true }
    });

    const subtotalValue = new Prisma.Decimal(totalAgg._sum.subtotal || 0);
    const descontoValue = new Prisma.Decimal(desconto || 0);
    const finalTotal = Prisma.Decimal.max(new Prisma.Decimal(0), subtotalValue.sub(descontoValue));

    const closeUpdate = await tx.comanda.updateMany({
      where: { id, status: 'aberta' },
      data: {
        status: 'fechada',
        closedAt: new Date(),
        total: finalTotal,
        desconto: descontoValue,
        formaPagamento: String(formaPagamento).toLowerCase()
      }
    });

    if (closeUpdate.count !== 1) {
      const error = new Error('Comanda já foi fechada ou cancelada');
      error.status = 409;
      throw error;
    }

    const closed = await tx.comanda.findUnique({
      where: { id },
      include: { mesa: true, bracelet: true, pedidos: { where: { cancelado: false } } }
    });

    if (comanda.mesaId) {
      await tx.mesa.update({ where: { id: comanda.mesaId }, data: { status: 'livre' } });
    }

    if (comanda.braceletId) {
      await tx.bracelet.update({ where: { id: comanda.braceletId }, data: { status: 'livre' } });
    }

    const identificador = comanda.mesa?.numero ? `Mesa ${comanda.mesa.numero}` : `Comanda #${id.slice(0, 6)}`;

    if (Number(finalTotal) > 0) {
      await tx.cashMovement.create({
        data: {
          type: 'entrada',
          formaPagamento: String(formaPagamento).toLowerCase(),
          amount: finalTotal,
          description: `Venda ${identificador} (${formaPagamento})`
        }
      });
    }

    await loyaltyService.applyRewardsForClosedComanda(tx, comanda, finalTotal);

    await tx.auditLog.create({
      data: {
        userId: userId || null,
        action: 'close',
        entity: 'Comanda',
        entityId: id,
        metadata: JSON.stringify({ total: Number(finalTotal), formaPagamento, desconto })
      }
    });

    return closed;
  });
};

const transferMesa = async (comandaId, newMesaId, userId) => {
  const comanda = await prisma.comanda.findUnique({ where: { id: comandaId } });
  if (!comanda) {
    const error = new Error('Comanda não encontrada');
    error.status = 404;
    throw error;
  }
  if (comanda.status !== 'aberta') {
    const error = new Error('Apenas comandas abertas podem ser transferidas');
    error.status = 400;
    throw error;
  }

  const targetMesa = await prisma.mesa.findUnique({ where: { id: newMesaId } });
  if (!targetMesa) {
    const error = new Error('Mesa de destino não encontrada');
    error.status = 404;
    throw error;
  }

  const ocupada = await prisma.comanda.findFirst({
    where: { mesaId: newMesaId, status: 'aberta' }
  });
  if (ocupada) {
    const error = new Error(`A Mesa ${targetMesa.numero} já está ocupada`);
    error.status = 400;
    throw error;
  }

  return prisma.$transaction(async (tx) => {
    if (comanda.mesaId) {
      await tx.mesa.update({ where: { id: comanda.mesaId }, data: { status: 'livre' } });
    }

    await tx.mesa.update({ where: { id: newMesaId }, data: { status: 'ocupada' } });

    const updated = await tx.comanda.update({
      where: { id: comandaId },
      data: { mesaId: newMesaId },
      include: { mesa: true, pedidos: { where: { cancelado: false } } }
    });

    await tx.auditLog.create({
      data: {
        userId: userId || null,
        action: 'transfer_mesa',
        entity: 'Comanda',
        entityId: comandaId,
        metadata: JSON.stringify({ fromMesaId: comanda.mesaId, toMesaId: newMesaId })
      }
    });

    return updated;
  });
};

const cancelComanda = async (id, motivo = 'Cancelado pelo operador', userId) => {
  const comanda = await prisma.comanda.findUnique({
    where: { id },
    include: { pedidos: { where: { cancelado: false } } }
  });

  if (!comanda) {
    const error = new Error('Comanda não encontrada');
    error.status = 404;
    throw error;
  }
  if (comanda.status !== 'aberta') {
    const error = new Error('Apenas comandas abertas podem ser canceladas');
    error.status = 400;
    throw error;
  }

  return prisma.$transaction(async (tx) => {
    // O cancelamento integral devolve ao estoque todos os itens ainda válidos.
    for (const item of comanda.pedidos) {
      if (item.produtoId) {
        const prod = await tx.produto.findUnique({ where: { id: item.produtoId } });
        if (prod) {
          await tx.produto.update({
            where: { id: item.produtoId },
            data: { estoque: { increment: item.quantidade } }
          });
          await tx.stockMovement.create({
            data: {
              produtoId: item.produtoId,
              type: 'entrada',
              quantity: item.quantidade,
              previousStock: prod.estoque,
              newStock: prod.estoque + item.quantidade,
              reason: `Cancelamento de comanda (${motivo})`
            }
          });
        }
      }
      await tx.pedido.update({
        where: { id: item.id },
        data: { cancelado: true }
      });
    }

    if (comanda.mesaId) {
      await tx.mesa.update({ where: { id: comanda.mesaId }, data: { status: 'livre' } });
    }
    if (comanda.braceletId) {
      await tx.bracelet.update({ where: { id: comanda.braceletId }, data: { status: 'livre' } });
    }

    const cancelled = await tx.comanda.update({
      where: { id },
      data: {
        status: 'cancelada',
        canceladaEm: new Date(),
        motivoCancelamento: motivo || 'Cancelamento'
      }
    });

    await tx.auditLog.create({
      data: {
        userId: userId || null,
        action: 'cancel_comanda',
        entity: 'Comanda',
        entityId: id,
        metadata: JSON.stringify({ motivo })
      }
    });

    return cancelled;
  });
};

const getComanda = async (id) => {
  const comanda = await prisma.comanda.findUnique({
    where: { id },
    include: {
      mesa: true,
      bracelet: { select: { id: true, number: true, status: true } },
      client: true,
      event: { select: { id: true, name: true, status: true } },
      pedidos: { where: { cancelado: false }, orderBy: { createdAt: 'desc' } }
    }
  });
  if (!comanda) {
    const error = new Error('Comanda não encontrada');
    error.status = 404;
    throw error;
  }
  return comanda;
};

const getHistoryByBraceletNumber = async (number) => {
  const bracelet = await prisma.bracelet.findUnique({
    where: { number },
    include: {
      comandas: {
        orderBy: { openedAt: 'desc' },
        include: {
          mesa: true,
          event: { select: { id: true, name: true } },
          pedidos: { where: { cancelado: false } }
        }
      }
    }
  });

  if (!bracelet) {
    const error = new Error('Pulseira não cadastrada');
    error.status = 404;
    throw error;
  }

  return bracelet;
};

const listOpenComandas = async () => {
  return prisma.comanda.findMany({
    where: { status: 'aberta' },
    orderBy: { openedAt: 'desc' },
    include: {
      mesa: true,
      bracelet: { select: { id: true, number: true, status: true } },
      client: true,
      event: { select: { id: true, name: true, status: true } },
      pedidos: { where: { cancelado: false } }
    }
  });
};

module.exports = {
  openComanda,
  closeComanda,
  transferMesa,
  cancelComanda,
  getComanda,
  listOpenComandas,
  getHistoryByBraceletNumber
};
