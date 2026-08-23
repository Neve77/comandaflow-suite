import { useEffect, useMemo, useState } from 'react';
import api from '../../shared/services/api';
import LoadingSpinner from '../../shared/components/LoadingSpinner';
import { Bar, Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement } from 'chart.js';
import { FileText, Download, RefreshCw } from 'lucide-react';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement);

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ef4444', '#0ea5e9', '#14b8a6', '#64748b'];
const REPORT_TYPES = [
  { value: 'executivo', label: 'PDF Executivo de Faturamento' },
  { value: 'completo', label: 'PDF Relatório Completo Gerencial' },
  { value: 'simplificado', label: 'PDF Resumo Simplificado' },
  { value: 'financeiro', label: 'PDF Fluxo Financeiro' },
  { value: 'estoque', label: 'PDF Posição de Estoque' },
  { value: 'clientes', label: 'PDF Ranking de Clientes' }
];

export default function ReportsPage() {
  const [period, setPeriod] = useState({ start: '', end: '' });
  const [category, setCategory] = useState('');
  const [eventId, setEventId] = useState('');
  const [reportType, setReportType] = useState('completo');
  const [report, setReport] = useState(null);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const money = (value) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value || 0));
  const number = (value) => new Intl.NumberFormat('pt-BR').format(Number(value || 0));
  const dateTime = (value) => value ? new Date(value).toLocaleString('pt-BR') : '';

  const restaurantName = localStorage.getItem('cf_nome_restaurante') || 'ComandaFlow';

  const params = () => {
    const data = {};
    if (period.start) data.start = period.start;
    if (period.end) data.end = period.end;
    if (category) data.category = category;
    if (eventId) data.eventId = eventId;
    return data;
  };

  const loadReports = async () => {
    setLoading(true);
    setError('');
    try {
      const [reportResponse, eventsResponse] = await Promise.all([
        api.get('/reports/complete', { params: params() }),
        api.get('/events')
      ]);
      setReport(reportResponse.data);
      setEvents(eventsResponse.data.events || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Erro ao carregar relatórios');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, []);

  const selectedEvent = events.find((item) => item.id === eventId);
  const periodLabel = period.start || period.end
    ? `${period.start ? new Date(period.start).toLocaleDateString('pt-BR') : 'Início'} até ${period.end ? new Date(period.end).toLocaleDateString('pt-BR') : 'Hoje'}`
    : 'Todo o Período Histórico';

  const productStats = useMemo(() => {
    const totalQuantity = report?.topProducts?.reduce((sum, item) => sum + Number(item.quantidade || 0), 0) || 0;
    const totalRevenue = report?.topProducts?.reduce((sum, item) => sum + Number(item.faturamento || 0), 0) || 0;
    return { totalQuantity, totalRevenue };
  }, [report]);

  const revenueChart = {
    labels: report?.revenueByPeriod?.map((item) => item.period) || [],
    datasets: [{
      label: 'Receita (R$)',
      data: report?.revenueByPeriod?.map((item) => item.total) || [],
      backgroundColor: 'rgba(16, 185, 129, 0.85)',
      borderRadius: 6
    }]
  };

  const categoryChart = {
    labels: report?.categoryConsumption?.map((item) => item.categoria) || [],
    datasets: [{
      data: report?.categoryConsumption?.map((item) => item.faturamento) || [],
      backgroundColor: report?.categoryConsumption?.map((_, index) => COLORS[index % COLORS.length]) || [],
      borderWidth: 0
    }]
  };

  const drawPdfTable = (doc, rows, columns, state) => {
    const pageWidth = 595.28;
    const pageHeight = 841.89;
    const margin = 40;
    const tableWidth = pageWidth - margin * 2;
    const totalWeight = columns.reduce((s, c) => s + (c.width || 1), 0);
    const colWidths = columns.map(c => ((c.width || 1) / totalWeight) * tableWidth);

    const header = () => {
      doc.setFillColor(15, 23, 42); // slate-950
      doc.roundedRect(margin, state.y, tableWidth, 24, 4, 4, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(255, 255, 255);

      let curX = margin;
      columns.forEach((col, idx) => {
        const align = col.align || 'left';
        const posX = align === 'right' ? curX + colWidths[idx] - 10 : curX + 10;
        doc.text(col.label, posX, state.y + 15, { align });
        curX += colWidths[idx];
      });
      state.y += 26;
    };

    header();

    rows.forEach((row, rowIndex) => {
      if (state.y > pageHeight - 75) {
        doc.addPage();
        state.y = 65;
        header();
      }

      const isEven = rowIndex % 2 === 0;
      doc.setFillColor(isEven ? 248 : 255, isEven ? 250 : 255, isEven ? 252 : 255);
      doc.rect(margin, state.y, tableWidth, 22, 'F');
      doc.setDrawColor(241, 245, 249);
      doc.line(margin, state.y + 22, margin + tableWidth, state.y + 22);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(30, 41, 59);

      let curX = margin;
      columns.forEach((col, idx) => {
        const val = String(row[col.key] ?? '');
        const align = col.align || 'left';
        const posX = align === 'right' ? curX + colWidths[idx] - 10 : curX + 10;
        doc.text(val, posX, state.y + 14, { align, maxWidth: colWidths[idx] - 12 });
        curX += colWidths[idx];
      });
      state.y += 22;
    });

    state.y += 16;
  };

  const exportToPDF = async () => {
    if (!report) return;
    const { default: jsPDF } = await import('jspdf');
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    const page = { width: 595.28, height: 841.89 };
    const margin = 40;
    const state = { y: 55 };
    const typeLabel = REPORT_TYPES.find((item) => item.value === reportType)?.label || 'Relatório Gerencial';

    const addHeader = () => {
      doc.setFillColor(15, 23, 42); // slate-950
      doc.rect(0, 0, page.width, 68, 'F');
      doc.setFillColor(16, 185, 129); // emerald-500
      doc.roundedRect(margin, 15, 38, 38, 8, 8, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.setTextColor(255, 255, 255);
      doc.text('CF', margin + 9, 39);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(255, 255, 255);
      doc.text(restaurantName, margin + 48, 32);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(148, 163, 184); // slate-400
      doc.text(`${typeLabel} • ${periodLabel}`, margin + 48, 48);
      doc.setFontSize(8);
      doc.setTextColor(203, 213, 225);
      doc.text(`Emissão: ${dateTime(new Date())}`, page.width - margin, 32, { align: 'right' });
      doc.text(`Sistema: ComandaFlow`, page.width - margin, 46, { align: 'right' });

      state.y = 88;
    };

    const addFooter = () => {
      const totalPages = doc.internal.getNumberOfPages();
      for (let index = 1; index <= totalPages; index += 1) {
        doc.setPage(index);
        doc.setDrawColor(226, 232, 240);
        doc.line(margin, page.height - 35, page.width - margin, page.height - 35);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184);
        doc.text(`${restaurantName} — ComandaFlow Gestão Inteligente`, margin, page.height - 20);
        doc.text(`Página ${index} de ${totalPages}`, page.width - margin, page.height - 20, { align: 'right' });
      }
    };

    const ensure = (height) => {
      if (state.y + height > page.height - 65) {
        doc.addPage();
        addHeader();
      }
    };
    addHeader();
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(15, 23, 42);
    doc.text('Resumo Financeiro & Operacional', margin, state.y);
    state.y += 18;

    const cards = [
      ['Faturamento Total', money(report.executive?.receitaTotal || 0)],
      ['Clientes Atendidos', number(report.executive?.quantidadeClientes || 0)],
      ['Comandas Fechadas', number(report.executive?.comandasFechadas || 0)],
      ['Ticket Médio', money(report.executive?.ticketMedio || 0)],
      ['Lucro Estimado', money(report.executive?.lucroEstimado || 0)]
    ];

    const cardWidth = (page.width - margin * 2 - 24) / 3;
    cards.forEach((card, index) => {
      const col = index % 3;
      const row = Math.floor(index / 3);
      const x = margin + col * (cardWidth + 12);
      const y = state.y + row * 52;

      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(x, y, cardWidth, 44, 6, 6, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      doc.text(card[0].toUpperCase(), x + 10, y + 15);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(15, 23, 42);
      doc.text(card[1], x + 10, y + 33);
    });

    state.y += Math.ceil(cards.length / 3) * 52 + 20;
    if (['completo', 'executivo', 'simplificado', 'financeiro'].includes(reportType) && report.topProducts?.length) {
      ensure(100);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(15, 23, 42);
      doc.text('Produtos Mais Vendidos', margin, state.y);
      state.y += 14;

      drawPdfTable(
        doc,
        report.topProducts.map((item, index) => ({
          pos: `#${index + 1}`,
          nome: item.nome,
          categoria: item.categoria || 'Geral',
          qtd: `${item.quantidade} un.`,
          faturamento: money(item.faturamento)
        })),
        [
          { key: 'pos', label: 'POS', width: 0.5 },
          { key: 'nome', label: 'PRODUTO', width: 2.2 },
          { key: 'categoria', label: 'CATEGORIA', width: 1.2 },
          { key: 'qtd', label: 'QTD', width: 0.8, align: 'right' },
          { key: 'faturamento', label: 'FATURAMENTO', width: 1.3, align: 'right' }
        ],
        state
      );
    }
    if (['completo', 'clientes'].includes(reportType) && report.topClients?.length) {
      ensure(100);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(15, 23, 42);
      doc.text('Ranking de Clientes (Maior Consumo)', margin, state.y);
      state.y += 14;

      drawPdfTable(
        doc,
        report.topClients.map((item, index) => ({
          pos: `#${index + 1}`,
          nome: item.clienteNome || 'Cliente',
          cpf: item.clienteCpf ? item.clienteCpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4') : 'Não informado',
          visitas: `${item.visits || 0} visitas`,
          consumo: money(item.totalSpent)
        })),
        [
          { key: 'pos', label: 'POS', width: 0.5 },
          { key: 'nome', label: 'CLIENTE', width: 2.2 },
          { key: 'cpf', label: 'CPF', width: 1.5 },
          { key: 'visitas', label: 'VISITAS', width: 1.0, align: 'right' },
          { key: 'consumo', label: 'TOTAL GASTO', width: 1.3, align: 'right' }
        ],
        state
      );
    }
    if (['completo', 'estoque'].includes(reportType) && report.lowStock?.length) {
      ensure(100);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(15, 23, 42);
      doc.text('Alerta de Estoque Baixo / Reposição', margin, state.y);
      state.y += 14;

      drawPdfTable(
        doc,
        report.lowStock.map((item) => ({
          nome: item.nome,
          categoria: item.categoria,
          estoque: `${item.estoque} un.`,
          preco: money(item.preco)
        })),
        [
          { key: 'nome', label: 'PRODUTO', width: 2.5 },
          { key: 'categoria', label: 'CATEGORIA', width: 1.5 },
          { key: 'estoque', label: 'ESTOQUE ATUAL', width: 1.0, align: 'right' },
          { key: 'preco', label: 'PREÇO VENDA', width: 1.0, align: 'right' }
        ],
        state
      );
    }
    if (reportType !== 'simplificado' && report.insights?.length) {
      ensure(80);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(15, 23, 42);
      doc.text('Destaques & Insights do Estabelecimento', margin, state.y);
      state.y += 14;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(71, 85, 105);

      report.insights.forEach((insight) => {
        ensure(16);
        doc.text(`✓  ${insight}`, margin + 5, state.y, { maxWidth: page.width - margin * 2 - 10 });
        state.y += 16;
      });
    }

    addFooter();
    doc.save(`relatorio-${reportType}-${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  const exportToExcel = async () => {
    if (!report) return;
    const excelModule = await import('exceljs');
    const ExcelJS = excelModule.default || excelModule;
    const workbook = new ExcelJS.Workbook();

    const addWorksheet = (name, sourceRows = []) => {
      const worksheet = workbook.addWorksheet(name);
      const rows = sourceRows.map((row) => Object.fromEntries(
        Object.entries(row || {}).map(([key, value]) => [
          key,
          value && typeof value === 'object' ? JSON.stringify(value) : value ?? '',
        ])
      ));
      const keys = [...new Set(rows.flatMap((row) => Object.keys(row)))];

      worksheet.columns = keys.map((key) => ({
        header: key,
        key,
        width: Math.min(40, Math.max(14, key.length + 2)),
      }));
      worksheet.addRows(rows);
      worksheet.views = [{ state: 'frozen', ySplit: 1 }];
      worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
      worksheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F766E' } };
    };

    addWorksheet('Resumo', [report.executive]);
    addWorksheet('Produtos', report.topProducts);
    addWorksheet('Clientes', report.topClients);
    addWorksheet('Categorias', report.categoryConsumption);

    const buffer = await workbook.xlsx.writeBuffer();
    const url = URL.createObjectURL(new Blob(
      [buffer],
      { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }
    ));
    const link = document.createElement('a');
    link.href = url;
    link.download = `relatorio-comandaflow-${new Date().toISOString().slice(0, 10)}.xlsx`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const exportToCSV = () => {
    if (!report) return;
    const rows = [
      ['Produto', 'Categoria', 'Quantidade', 'Faturamento'],
      ...report.topProducts.map((item) => [item.nome, item.categoria, item.quantidade, money(item.faturamento)])
    ];
    const csv = rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `produtos-comandaflow-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <section className="panel p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="section-title">Relatórios Gerenciais</h1>
            <p className="section-subtitle">
              Gere PDFs executivos profissionais, planilhas Excel e acompanhe o desempenho em tempo real.
            </p>
          </div>
          <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-[160px_160px_160px_auto]">
            <input
              className="input-field text-xs"
              type="date"
              value={period.start}
              onChange={(e) => setPeriod({ ...period, start: e.target.value })}
            />
            <input
              className="input-field text-xs"
              type="date"
              value={period.end}
              onChange={(e) => setPeriod({ ...period, end: e.target.value })}
            />
            <select
              className="input-field text-xs"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="">Todas categorias</option>
              {[...new Set(report?.categoryConsumption?.map((item) => item.categoria) || [])].map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
            <button
              className="btn-primary btn-sm bg-emerald-600 hover:bg-emerald-700 font-bold"
              onClick={loadReports}
            >
              <RefreshCw size={14} />
              <span>Filtrar</span>
            </button>
          </div>
        </div>
      </section>

      {error && <div className="panel p-4 text-sm text-red-600 font-medium">{error}</div>}
      <section className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        {report && [
          ['Faturamento Total', money(report.executive?.receitaTotal)],
          ['Clientes Atendidos', number(report.executive?.quantidadeClientes)],
          ['Comandas Fechadas', number(report.executive?.comandasFechadas)],
          ['Ticket Médio', money(report.executive?.ticketMedio)],
          ['Lucro Estimado', money(report.executive?.lucroEstimado)]
        ].map(([label, value], idx) => (
          <div key={label} className="metric-card">
            <span className="metric-label">{label}</span>
            <p className="metric-value">{value}</p>
          </div>
        ))}
      </section>
      <section className="panel p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <FileText size={18} className="text-emerald-600" />
            <div>
              <h2 className="text-sm font-bold text-slate-950">Exportação de Relatórios</h2>
              <p className="text-xs text-slate-500">Escolha o modelo de PDF ou exporte em planilha</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              className="input-field max-w-xs text-xs font-semibold py-2"
              value={reportType}
              onChange={(e) => setReportType(e.target.value)}
            >
              {REPORT_TYPES.map((item) => (
                <option key={item.value} value={item.value}>{item.label}</option>
              ))}
            </select>
            <button
              onClick={exportToPDF}
              className="btn-primary btn-sm bg-red-600 hover:bg-red-700 font-bold"
            >
              <Download size={14} />
              <span>Baixar PDF</span>
            </button>
            <button
              onClick={exportToExcel}
              className="btn-secondary btn-sm text-emerald-700 border-emerald-200 hover:bg-emerald-50 font-bold"
            >
              <span>Excel (.xlsx)</span>
            </button>
            <button
              onClick={exportToCSV}
              className="btn-secondary btn-sm text-blue-700 border-blue-200 hover:bg-blue-50 font-bold"
            >
              <span>CSV</span>
            </button>
          </div>
        </div>
      </section>
      <section className="grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
        <div className="panel p-6">
          <h2 className="text-base font-bold text-slate-950">Faturamento por Período</h2>
          <div className="mt-4 rounded-xl border border-slate-100 bg-white p-4">
            <Bar
              data={revenueChart}
              options={{
                responsive: true,
                plugins: { legend: { display: false } },
                scales: { x: { grid: { display: false } }, y: { beginAtZero: true } }
              }}
            />
          </div>

          <div className="mt-6 border-t border-slate-100 pt-5">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-950">Mais Vendidos no Período</h3>
              <p className="text-xs text-slate-500 font-medium">
                {number(productStats.totalQuantity)} itens • {money(productStats.totalRevenue)}
              </p>
            </div>

            <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200">
              <table className="min-w-full divide-y divide-slate-200 text-xs">
                <thead className="bg-slate-50 text-left font-bold uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-4 py-3">#</th>
                    <th className="px-4 py-3">Produto</th>
                    <th className="px-4 py-3">Categoria</th>
                    <th className="px-4 py-3 text-right">Qtd</th>
                    <th className="px-4 py-3 text-right">Faturamento</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {report?.topProducts?.map((item, index) => (
                    <tr key={item.produtoId || item.nome} className="hover:bg-slate-50">
                      <td className="px-4 py-2.5 text-slate-400 font-bold">{index + 1}</td>
                      <td className="px-4 py-2.5 font-bold text-slate-950">{item.nome}</td>
                      <td className="px-4 py-2.5 text-slate-600">{item.categoria}</td>
                      <td className="px-4 py-2.5 text-right font-bold text-slate-900">{number(item.quantidade)}</td>
                      <td className="px-4 py-2.5 text-right font-bold text-emerald-700">{money(item.faturamento)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="panel p-6">
            <h2 className="text-base font-bold text-slate-950">Consumo por Categoria</h2>
            <div className="mt-4 rounded-xl border border-slate-100 bg-white p-4">
              <Doughnut data={categoryChart} options={{ plugins: { legend: { position: 'bottom' } }, cutout: '65%' }} />
            </div>
          </div>

          <div className="panel p-6">
            <h2 className="text-base font-bold text-slate-950">Destaques & Insights</h2>
            <div className="mt-3 space-y-2.5">
              {report?.insights?.map((item, idx) => (
                <div key={idx} className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-3 text-xs text-emerald-950 font-medium">
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
