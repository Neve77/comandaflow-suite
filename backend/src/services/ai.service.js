const prisma = require('../infra/prisma/client');
const reportsService = require('./reports.service');

const classifyRisk = (value) => {
  if (value >= 75) return 'alto';
  if (value >= 40) return 'medio';
  return 'baixo';
};

const analyze = async ({ start, end, eventId } = {}) => {
  const report = await reportsService.getCompleteReport({ start, end, eventId });
  const products = await prisma.produto.findMany({ where: { ativo: true } });

  const trend = report.previousSales.total
    ? (report.sales.total - report.previousSales.total) / report.previousSales.total
    : 0.08;
  const forecastRevenue = Number((report.sales.total * (1 + trend)).toFixed(2));

  const stockSuggestions = (report.topProducts || []).slice(0, 8).map((item) => {
    const product = products.find((candidate) => candidate.id === item.produtoId);
    const currentStock = product?.estoque ?? 0;
    const projectedDemand = Math.ceil(item.quantidade * 1.25);
    const suggestedPurchase = Math.max(projectedDemand - currentStock, 0);
    return {
      produtoId: item.produtoId,
      nome: item.nome,
      categoria: item.categoria,
      estoqueAtual: currentStock,
      demandaProjetada: projectedDemand,
      compraSugerida: suggestedPurchase,
      riscoRuptura: classifyRisk(suggestedPurchase ? 80 : Math.max(0, 50 - currentStock * 5))
    };
  });

  const peak = (report.flow || []).reduce((best, item) => {
    const score = item.entries + item.exits;
    return score > best.score ? { hour: item.hour, score } : best;
  }, { hour: null, score: 0 });

  const topClients = report.topClients || [];
  const customerBehavior = topClients.map((client) => ({
    clienteNome: client.clienteNome || 'Cliente',
    clienteCpf: client.clienteCpf || '',
    visitas: client.visits || 1,
    consumo: client.totalSpent || 0,
    perfil: (client.totalSpent || 0) >= 500 ? 'VIP' : (client.visits || 1) > 1 ? 'Recorrente' : 'Pontual'
  }));

  const recommendations = [
    forecastRevenue > report.sales.total
      ? 'Prepare equipe e estoque para demanda maior no próximo período.'
      : 'Revise ofertas e combos para recuperar ritmo de venda.',
    stockSuggestions.some((item) => item.compraSugerida > 0)
      ? 'Priorize reposição dos produtos com risco de ruptura.'
      : 'Estoque atual atende aos itens líderes do período analisado.',
    peak.hour !== null
      ? `Reforce atendimento perto de ${String(peak.hour).padStart(2, '0')}:00.`
      : 'Ainda não há volume suficiente para prever horário de pico.'
  ];

  return {
    provider: process.env.AI_PROVIDER || 'simulador-offline',
    generatedAt: new Date().toISOString(),
    forecast: {
      currentRevenue: report.sales.total,
      previousRevenue: report.previousSales.total,
      trendPercent: Number((trend * 100).toFixed(1)),
      forecastRevenue
    },
    stockSuggestions,
    peakHours: peak.hour === null ? [] : [{ hour: peak.hour, movement: peak.score }],
    customerBehavior,
    executiveSummary: (report.insights || []).join(' '),
    recommendations
  };
};

module.exports = { analyze };
