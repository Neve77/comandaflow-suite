const prisma = require('../infra/prisma/client');

const listMesas = async () => {
  return prisma.mesa.findMany({
    orderBy: { numero: 'asc' },
    include: {
      comandas: {
        where: { status: 'aberta' },
        include: {
          pedidos: { where: { cancelado: false } }
        }
      }
    }
  });
};

const getMesaById = async (id) => {
  const mesa = await prisma.mesa.findUnique({
    where: { id },
    include: {
      comandas: {
        where: { status: 'aberta' },
        include: {
          pedidos: { where: { cancelado: false } }
        }
      }
    }
  });
  if (!mesa) {
    const error = new Error('Mesa não encontrada');
    error.status = 404;
    throw error;
  }
  return mesa;
};

const getMesaHistory = async (id, { date, startDate, endDate } = {}) => {
  const mesa = await prisma.mesa.findUnique({
    where: { id }
  });

  if (!mesa) {
    const error = new Error('Mesa não encontrada');
    error.status = 404;
    throw error;
  }

  const whereClause = { mesaId: id };

  if (date) {
    const start = new Date(`${date}T00:00:00.000Z`);
    const end = new Date(`${date}T23:59:59.999Z`);
    whereClause.openedAt = { gte: start, lte: end };
  } else if (startDate || endDate) {
    whereClause.openedAt = {};
    if (startDate) whereClause.openedAt.gte = new Date(startDate);
    if (endDate) whereClause.openedAt.lte = new Date(endDate);
  }

  const comandas = await prisma.comanda.findMany({
    where: whereClause,
    orderBy: { openedAt: 'desc' },
    include: {
      client: true,
      pedidos: {
        where: { cancelado: false },
        orderBy: { createdAt: 'asc' }
      }
    }
  });

  const totalFaturado = comandas
    .filter(c => c.status === 'fechada')
    .reduce((sum, c) => sum + Number(c.total || 0), 0);

  const totalAtendimentos = comandas.length;
  const comandasAbertas = comandas.filter(c => c.status === 'aberta').length;
  const comandasFechadas = comandas.filter(c => c.status === 'fechada').length;
  const ticketMedio = comandasFechadas > 0 ? totalFaturado / comandasFechadas : 0;

  return {
    mesa,
    resumo: {
      totalAtendimentos,
      comandasAbertas,
      comandasFechadas,
      totalFaturado,
      ticketMedio
    },
    comandas
  };
};

const createMesa = async ({ numero, capacidade = 4 }) => {
  const existing = await prisma.mesa.findUnique({ where: { numero: String(numero) } });
  if (existing) {
    const error = new Error(`Mesa ${numero} já está cadastrada`);
    error.status = 400;
    throw error;
  }

  return prisma.mesa.create({
    data: {
      numero: String(numero),
      capacidade: Number(capacidade) || 4,
      status: 'livre'
    }
  });
};

const updateMesa = async (id, { numero, capacidade, status }) => {
  const data = {};
  if (numero !== undefined) data.numero = String(numero);
  if (capacidade !== undefined) data.capacidade = Number(capacidade);
  if (status !== undefined) data.status = status;

  return prisma.mesa.update({
    where: { id },
    data
  });
};

const deleteMesa = async (id) => {
  const comandaAberta = await prisma.comanda.findFirst({
    where: { mesaId: id, status: 'aberta' }
  });
  if (comandaAberta) {
    const error = new Error('Não é possível excluir uma mesa com comanda aberta');
    error.status = 400;
    throw error;
  }

  return prisma.mesa.delete({ where: { id } });
};

// A primeira execução cria um salão mínimo para o restaurante começar a operar.
const seedDefaultMesas = async () => {
  const count = await prisma.mesa.count();
  if (count === 0) {
    const defaultTables = [
      { numero: '01', capacidade: 4 },
      { numero: '02', capacidade: 4 },
      { numero: '03', capacidade: 2 },
      { numero: '04', capacidade: 6 },
      { numero: '05', capacidade: 4 },
      { numero: '06', capacidade: 4 },
      { numero: '07', capacidade: 8 },
      { numero: '08', capacidade: 2 },
      { numero: '09', capacidade: 4 },
      { numero: '10', capacidade: 6 },
    ];
    for (const table of defaultTables) {
      await prisma.mesa.create({ data: table });
    }
  }
};

module.exports = {
  listMesas,
  getMesaById,
  getMesaHistory,
  createMesa,
  updateMesa,
  deleteMesa,
  seedDefaultMesas
};
