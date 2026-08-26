import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  DollarSign,
  ClipboardList,
  ChefHat,
  UtensilsCrossed,
  TrendingUp,
  Clock,
  ArrowRight,
  RefreshCw,
  Boxes,
  QrCode,
  Banknote,
  CreditCard,
  CalendarDays,
  Plus,
  Package,
  BarChart3,
  Wallet
} from 'lucide-react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend
} from 'chart.js';
import api, { socket } from '../../shared/services/api';
import LoadingSpinner from '../../shared/components/LoadingSpinner';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip, Legend);

export default function DashboardPage() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState(null);

  const fetchDashboard = useCallback(async (showLoading = false) => {
    if (showLoading) setLoading(true);
    else setRefreshing(true);
    setError('');
    try {
      const response = await api.get('/reports/dashboard');
      setData(response.data);
      setLastUpdated(new Date());
    } catch (err) {
      setError(err.response?.data?.message || 'Erro ao carregar painel');
    } finally {
      if (showLoading) setLoading(false);
      else setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard(true);

    const handleUpdate = () => {
      fetchDashboard();
    };

    socket.on('pedido-added', handleUpdate);
    socket.on('pedido-status-updated', handleUpdate);
    socket.on('pedido-cancelled', handleUpdate);
    socket.on('comanda-opened', handleUpdate);
    socket.on('comanda-closed', handleUpdate);
    socket.on('dashboard:update', handleUpdate);

    return () => {
      socket.off('pedido-added', handleUpdate);
      socket.off('pedido-status-updated', handleUpdate);
      socket.off('pedido-cancelled', handleUpdate);
      socket.off('comanda-opened', handleUpdate);
      socket.off('comanda-closed', handleUpdate);
      socket.off('dashboard:update', handleUpdate);
    };
  }, [fetchDashboard]);

  if (loading) return <LoadingSpinner />;
  if (error && !data) {
    return (
      <div className="panel p-8 text-center max-w-md mx-auto my-12">
        <p className="text-red-600 font-bold text-sm">{error}</p>
        <button onClick={() => fetchDashboard(true)} className="btn-primary btn-sm mt-4">
          Tentar novamente
        </button>
      </div>
    );
  }

  const salesToday = Number(data?.totalSoldToday || 0);
  const pixToday = Number(data?.pixToday || 0);
  const dinheiroToday = Number(data?.dinheiroToday || 0);
  const cartaoToday = Number(data?.cartaoToday || 0);
  const openComandas = Number(data?.comandasAberta || 0);
  const pedidosAndamento = Number(data?.pedidosEmAndamento || 0);
  const mesasOcupadas = Number(data?.mesasOcupadas || 0);
  const totalMesas = Number(data?.totalMesas || 12);
  const ticketMedio = Number(data?.ticketMedioHoje || 0);
  const lowStock = Number(data?.lowStock || 0);
  const comandasLongas = data?.comandasLongas || [];
  const recentPedidos = data?.recentPedidos || [];
  const occupancyPct = totalMesas > 0 ? Math.round((mesasOcupadas / totalMesas) * 100) : 0;
  const totalPayments = pixToday + dinheiroToday + cartaoToday;
  const pixPct = totalPayments > 0 ? ((pixToday / totalPayments) * 100).toFixed(1) : '0.0';
  const dinheiroPct = totalPayments > 0 ? ((dinheiroToday / totalPayments) * 100).toFixed(1) : '0.0';
  const cartaoPct = totalPayments > 0 ? ((cartaoToday / totalPayments) * 100).toFixed(1) : '0.0';
  const today = new Date();
  const dateStr = `Hoje, ${today.getDate()} de ${['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'][today.getMonth()]}`;
  const chartLabels = data?.faturamento7dias?.map(d => {
    const date = new Date(d.date || d.data);
    return `${date.getDate()} ${['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'][date.getMonth()]}`;
  }) || generateLast7DaysLabels();

  const chartValues = data?.faturamento7dias?.map(d => Number(d.total || d.valor || 0)) || [0, 0, 0, 0, 0, 0, 0];
  const chartTextColor = document.documentElement.classList.contains('dark') ? '#94a3b8' : '#64748b';
  const chartPointBorder = document.documentElement.classList.contains('dark') ? '#111827' : '#ffffff';

  const chartData = {
    labels: chartLabels,
    datasets: [
      {
        label: 'Faturamento (R$)',
        data: chartValues,
        borderColor: '#10b981',
        backgroundColor: 'rgba(16, 185, 129, 0.08)',
        fill: true,
        tension: 0.4,
        pointBackgroundColor: '#10b981',
        pointBorderColor: chartPointBorder,
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6,
        borderWidth: 2.5,
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'top',
        align: 'end',
        labels: {
          usePointStyle: true,
          pointStyle: 'line',
          font: { size: 11, weight: 600 },
          color: chartTextColor,
          padding: 16,
        }
      },
      tooltip: {
        backgroundColor: '#0f172a',
        titleFont: { size: 12, weight: 600 },
        bodyFont: { size: 12 },
        padding: 10,
        cornerRadius: 8,
        callbacks: {
          label: ctx => `R$ ${ctx.parsed.y.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
        }
      }
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: {
          font: { size: 11 },
          color: chartTextColor
        }
      },
      y: {
        beginAtZero: true,
        grid: { color: 'rgba(148, 163, 184, 0.1)' },
        ticks: {
          font: { size: 11 },
          color: chartTextColor,
          callback: v => `R$ ${v >= 1000 ? (v/1000).toFixed(0) + '.' + '000' : v}`
        }
      }
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between animate-fade-slide-up">
        <div>
          <h1 className="section-title">Painel Geral</h1>
          <p className="section-subtitle">Resumo em tempo real do movimento e faturamento do dia.</p>
        </div>

        <div className="flex items-center gap-3 self-start">
          <span className="dashboard-date-chip">
            <CalendarDays size={13} />
            <span>{dateStr}</span>
          </span>
          <button
            type="button"
            onClick={() => fetchDashboard()}
            className="dashboard-refresh-btn"
            title="Atualizar dados"
            disabled={refreshing}
          >
            <RefreshCw className={refreshing ? 'animate-spin' : ''} size={13} />
            {refreshing ? 'Atualizando' : 'Atualizar'}
          </button>
        </div>
      </div>
      <button type="button" className="dashboard-new-service" onClick={() => navigate('/atendimento')}>
        <span><Plus size={24} /></span>
        <span><strong>Cliente chegou? Iniciar atendimento</strong><small>Identificar cliente → escolher mesa → adicionar itens</small></span>
        <ArrowRight size={22} />
      </button>
      {error && data && <div className="flex items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-700"><span>{error}. Os últimos dados continuam visíveis.</span><button type="button" className="font-extrabold underline" onClick={() => fetchDashboard()}>Tentar novamente</button></div>}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5 stagger-children">
        <div className="metric-card accent-green animate-fade-slide-up">
          <div className="metric-header">
            <span className="metric-label">Faturamento Hoje</span>
            <div className="metric-icon green"><DollarSign size={17} /></div>
          </div>
          <div className="metric-value">R$ {salesToday.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
          <div className="metric-sub">Atualizado em {lastUpdated?.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) || '—'}</div>
        </div>
        <button type="button" className="metric-card accent-blue animate-fade-slide-up cursor-pointer text-left" onClick={() => navigate('/comanda')}>
          <div className="metric-header">
            <span className="metric-label">Comandas Abertas</span>
            <div className="metric-icon blue"><ClipboardList size={17} /></div>
          </div>
          <div className="metric-value">{openComandas}</div>
          <div className="metric-sub">Ver todas <ArrowRight size={10} /></div>
        </button>
        <button type="button" className="metric-card accent-orange animate-fade-slide-up cursor-pointer text-left" onClick={() => navigate('/pedidos')}>
          <div className="metric-header">
            <span className="metric-label">Cozinha / Bar</span>
            <div className="metric-icon orange"><ChefHat size={17} /></div>
          </div>
          <div className="metric-value">{pedidosAndamento}</div>
          <div className="metric-sub">Em preparo</div>
        </button>
        <button type="button" className="metric-card accent-purple animate-fade-slide-up cursor-pointer text-left" onClick={() => navigate('/mesas')}>
          <div className="metric-header">
            <span className="metric-label">Mesas Ocupadas</span>
            <div className="metric-icon purple"><UtensilsCrossed size={17} /></div>
          </div>
          <div className="metric-value">
            {mesasOcupadas}
            <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-muted)', marginLeft: 2 }}>/ {totalMesas}</span>
          </div>
          <div className="metric-sub">{occupancyPct}% ocupação</div>
        </button>
        <div className="metric-card accent-red animate-fade-slide-up col-span-2 sm:col-span-1">
          <div className="metric-header">
            <span className="metric-label">Ticket Médio</span>
            <div className="metric-icon red"><TrendingUp size={17} /></div>
          </div>
          <div className="metric-value">R$ {ticketMedio.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
          <div className="metric-sub">Por comanda</div>
        </div>
      </div>
      <div className="panel p-5">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-4">
          Faturamento de Hoje por Forma de Pagamento
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="payment-method-card">
            <div className="flex items-center gap-3">
              <div className="pm-icon" style={{ background: 'rgba(16, 185, 129, 0.1)' }}>
                <QrCode size={20} style={{ color: '#10b981' }} />
              </div>
              <div>
                <div className="pm-label">PIX</div>
              </div>
            </div>
            <div className="text-right">
              <div className="pm-value">R$ {pixToday.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
              <div className="pm-change text-emerald-600">{pixPct}% do recebido</div>
            </div>
          </div>

          <div className="payment-method-card">
            <div className="flex items-center gap-3">
              <div className="pm-icon" style={{ background: 'rgba(59, 130, 246, 0.1)' }}>
                <Banknote size={20} style={{ color: '#3b82f6' }} />
              </div>
              <div>
                <div className="pm-label">Dinheiro</div>
              </div>
            </div>
            <div className="text-right">
              <div className="pm-value">R$ {dinheiroToday.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
              <div className="pm-change text-emerald-600">{dinheiroPct}% do recebido</div>
            </div>
          </div>

          <div className="payment-method-card">
            <div className="flex items-center gap-3">
              <div className="pm-icon" style={{ background: 'rgba(139, 92, 246, 0.1)' }}>
                <CreditCard size={20} style={{ color: '#8b5cf6' }} />
              </div>
              <div>
                <div className="pm-label">Cartão</div>
              </div>
            </div>
            <div className="text-right">
              <div className="pm-value">R$ {cartaoToday.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
              <div className="pm-change text-emerald-600">{cartaoPct}% do recebido</div>
            </div>
          </div>
        </div>
      </div>
      {(lowStock > 0 || comandasLongas.length > 0) && (
        <div className="grid gap-4 sm:grid-cols-2">
          {lowStock > 0 && (
            <div
              onClick={() => navigate('/inventory')}
              className="alert-banner alert-banner-warning"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: 'rgba(16, 185, 129, 0.15)' }}>
                  <Boxes size={20} className="text-emerald-700" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-emerald-950">
                    {lowStock} produto(s) com estoque baixo
                  </h3>
                  <p className="text-xs text-emerald-700">
                    Toque para verificar a lista e repor.
                  </p>
                </div>
              </div>
              <ArrowRight size={16} className="text-emerald-700" />
            </div>
          )}

          {comandasLongas.length > 0 && (
            <div
              onClick={() => navigate('/comanda')}
              className="alert-banner alert-banner-info"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: 'rgba(59, 130, 246, 0.15)' }}>
                  <Clock size={20} className="text-blue-700" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-blue-950">
                    Mesa {comandasLongas[0].mesaNumero} aberta há mais de 2 horas
                  </h3>
                  <p className="text-xs text-blue-700">
                    Consumo acumulado: R$ {comandasLongas[0].total.toFixed(2)}
                  </p>
                </div>
              </div>
              <ArrowRight size={16} className="text-blue-700" />
            </div>
          )}
        </div>
      )}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="panel p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <h2 className="text-sm font-bold text-slate-950">
                Últimos Pedidos Registrados
              </h2>
              <span className="live-badge">Ao Vivo</span>
            </div>
            <button
              onClick={() => navigate('/pedidos')}
              className="text-xs font-semibold text-slate-500 hover:text-slate-900 flex items-center gap-1 transition"
            >
              Ver todos <ArrowRight size={12} />
            </button>
          </div>

          <div className="divide-y divide-slate-100">
            {recentPedidos.length === 0 ? (
              <p className="py-8 text-center text-sm text-slate-400">
                Nenhum pedido registrado hoje ainda.
              </p>
            ) : (
              recentPedidos.slice(0, 4).map((pedido) => (
                <div key={pedido.id} className="pedido-row">
                  <div className="flex items-center gap-3">
                    <span className={`pedido-mesa-badge ${!pedido.mesaNumero ? 'balcao' : ''}`}>
                      {pedido.mesaNumero ? `Mesa ${String(pedido.mesaNumero).padStart(2, '0')}` : 'Balcão'}
                    </span>
                    <div>
                      <p className="font-semibold text-slate-900 text-sm">
                        {pedido.quantidade}x {pedido.nome}
                      </p>
                      {pedido.observacao && (
                        <p className="text-xs text-slate-400">
                          {pedido.observacao}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <span className={`pedido-status ${
                      pedido.status === 'pronto' ? 'pronto' :
                      pedido.status === 'em_preparo' ? 'preparo' : 'aguardando'
                    }`}>
                      {pedido.status === 'pronto' ? 'Pronto' :
                       pedido.status === 'em_preparo' ? 'Em Preparo' : 'Aguardando'}
                    </span>
                    <span className="text-xs text-slate-400 tabular-nums">
                      {pedido.createdAt ? new Date(pedido.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : ''}
                    </span>
                    <span className="text-sm font-bold text-slate-900 tabular-nums">
                      R$ {Number(pedido.subtotal).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
        <div className="panel p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-slate-950">
              Faturamento dos últimos 7 dias
            </h2>
            <span className="text-xs text-slate-400 font-medium">R$ ▼</span>
          </div>
          <div className="chart-container">
            <Line data={chartData} options={chartOptions} />
          </div>
        </div>
      </div>
      <div className="quick-actions-bar">
        <span className="qa-title">Ações rápidas</span>
        <span className="qa-divider"></span>
        <button className="quick-action-btn" onClick={() => navigate('/atendimento')}>
          <Plus size={16} />
          <span>Novo Atendimento</span>
        </button>
        <button className="quick-action-btn" onClick={() => navigate('/mesas')}>
          <UtensilsCrossed size={16} />
          <span>Abrir Mesa</span>
        </button>
        <button className="quick-action-btn" onClick={() => navigate('/products')}>
          <Package size={16} />
          <span>Produtos</span>
        </button>
        <button className="quick-action-btn" onClick={() => navigate('/finance')}>
          <Wallet size={16} />
          <span>Fechar Caixa</span>
        </button>
        <button className="quick-action-btn" onClick={() => navigate('/reports')}>
          <BarChart3 size={16} />
          <span>Relatórios</span>
        </button>
      </div>
    </div>
  );
}

function generateLast7DaysLabels() {
  const labels = [];
  const months = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    labels.push(`${d.getDate()} ${months[d.getMonth()]}`);
  }
  return labels;
}
