import { useEffect, useState } from 'react';
import { BrainCircuit, RefreshCcw } from 'lucide-react';
import api from '../../shared/services/api';
import LoadingSpinner from '../../shared/components/LoadingSpinner';

export default function IntelligencePage() {
  const [period, setPeriod] = useState({ start: '', end: '' });
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  const money = (value) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value || 0));

  const loadInsights = async () => {
    setLoading(true);
    setMessage('');
    const params = {};
    if (period.start) params.start = period.start;
    if (period.end) params.end = period.end;
    try {
      const response = await api.get('/ai/insights', { params });
      setData(response.data);
    } catch (error) {
      setMessage(error.response?.data?.message || 'Erro ao carregar IA');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInsights();
  }, []);

  return (
    <div className="space-y-6">
      <section className="panel p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-medium uppercase text-slate-500">Agente de IA</p>
            <h1 className="mt-2 text-3xl font-semibold text-slate-950">Analise inteligente da operacao</h1>
            <p className="mt-1 text-slate-500">Previsao, estoque, comportamento de clientes e resumo executivo offline.</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-[180px_180px_auto]">
            <input className="input-field" type="datetime-local" value={period.start} onChange={(e) => setPeriod({ ...period, start: e.target.value })} />
            <input className="input-field" type="datetime-local" value={period.end} onChange={(e) => setPeriod({ ...period, end: e.target.value })} />
            <button type="button" onClick={loadInsights} className="inline-flex items-center justify-center gap-2 rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
              <RefreshCcw size={16} /> Analisar
            </button>
          </div>
        </div>
      </section>

      {message && <div className="panel p-4 text-sm text-rose-600">{message}</div>}
      {loading ? <LoadingSpinner /> : data && (
        <>
          <section className="grid gap-4 xl:grid-cols-4">
            <div className="panel p-5">
              <p className="text-sm text-slate-500">Fornecedor</p>
              <p className="mt-2 text-xl font-semibold text-slate-950">{data.provider}</p>
            </div>
            <div className="panel p-5">
              <p className="text-sm text-slate-500">Receita atual</p>
              <p className="mt-2 text-2xl font-semibold text-slate-950">{money(data.forecast.currentRevenue)}</p>
            </div>
            <div className="panel p-5">
              <p className="text-sm text-slate-500">Previsao</p>
              <p className="mt-2 text-2xl font-semibold text-slate-950">{money(data.forecast.forecastRevenue)}</p>
            </div>
            <div className="panel p-5">
              <p className="text-sm text-slate-500">Tendencia</p>
              <p className={`mt-2 text-2xl font-semibold ${data.forecast.trendPercent >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>{data.forecast.trendPercent}%</p>
            </div>
          </section>

          <section className="grid gap-4 xl:grid-cols-[1fr_0.9fr]">
            <div className="panel p-6">
              <div className="flex items-center gap-2">
                <BrainCircuit size={18} />
                <h2 className="text-xl font-semibold text-slate-950">Resumo executivo automatico</h2>
              </div>
              <p className="mt-4 leading-7 text-slate-600">{data.executiveSummary}</p>
              <div className="mt-5 grid gap-3">
                {data.recommendations.map((item) => (
                  <div key={item} className="rounded-lg border border-blue-100 bg-blue-50 p-4 text-sm text-blue-900">{item}</div>
                ))}
              </div>
            </div>

            <div className="panel p-6">
              <h2 className="text-xl font-semibold text-slate-950">Comportamento dos clientes</h2>
              <div className="mt-5 space-y-3">
                {data.customerBehavior.length === 0 ? (
                  <p className="text-sm text-slate-500">Sem clientes suficientes para classificar perfis.</p>
                ) : data.customerBehavior.map((client) => (
                  <div key={client.clienteCpf} className="rounded-lg border border-slate-200 bg-white p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-semibold text-slate-950">{client.clienteNome}</p>
                      <span className="status-chip bg-slate-100 text-slate-700">{client.perfil}</span>
                    </div>
                    <p className="mt-2 text-sm text-slate-500">{client.visitas} visita(s) · {money(client.consumo)}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="panel p-6">
            <h2 className="text-xl font-semibold text-slate-950">Sugestao inteligente de estoque</h2>
            <div className="mt-5 overflow-x-auto rounded-lg border border-slate-200">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Produto</th>
                    <th className="px-4 py-3">Categoria</th>
                    <th className="px-4 py-3 text-right">Estoque</th>
                    <th className="px-4 py-3 text-right">Demanda</th>
                    <th className="px-4 py-3 text-right">Comprar</th>
                    <th className="px-4 py-3 text-right">Risco</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {data.stockSuggestions.map((item) => (
                    <tr key={item.produtoId || item.nome}>
                      <td className="px-4 py-3 font-medium text-slate-950">{item.nome}</td>
                      <td className="px-4 py-3 text-slate-600">{item.categoria}</td>
                      <td className="px-4 py-3 text-right">{item.estoqueAtual}</td>
                      <td className="px-4 py-3 text-right">{item.demandaProjetada}</td>
                      <td className="px-4 py-3 text-right font-semibold text-slate-950">{item.compraSugerida}</td>
                      <td className="px-4 py-3 text-right">
                        <span className={`status-chip ${item.riscoRuptura === 'alto' ? 'bg-rose-50 text-rose-700' : item.riscoRuptura === 'medio' ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'}`}>
                          {item.riscoRuptura}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
