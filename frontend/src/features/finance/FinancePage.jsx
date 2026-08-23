import { useEffect, useState } from 'react';
import { PlusCircle } from 'lucide-react';
import api from '../../shared/services/api';
import LoadingSpinner from '../../shared/components/LoadingSpinner';

const emptyForm = { type: 'entrada', amount: '', description: '' };

export default function FinancePage() {
  const [summary, setSummary] = useState(null);
  const [period, setPeriod] = useState({ start: '', end: '' });
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  const money = (value) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value || 0));

  const loadFinance = async () => {
    setLoading(true);
    setMessage('');
    const params = {};
    if (period.start) params.start = period.start;
    if (period.end) params.end = period.end;
    try {
      const response = await api.get('/finance/summary', { params });
      setSummary(response.data);
    } catch (error) {
      setMessage(error.response?.data?.message || 'Erro ao carregar financeiro');
    } finally {
      setLoading(false);
    }
  };

  const saveMovement = async (event) => {
    event.preventDefault();
    try {
      await api.post('/finance/movements', { ...form, amount: Number(form.amount) });
      setForm(emptyForm);
      await loadFinance();
    } catch (error) {
      setMessage(error.response?.data?.message || 'Erro ao registrar movimento');
    }
  };

  useEffect(() => {
    loadFinance();
  }, []);

  return (
    <div className="space-y-6">
      <section className="panel p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-medium uppercase text-slate-500">Financeiro</p>
            <h1 className="mt-2 text-3xl font-semibold text-slate-950">Fluxo de caixa</h1>
            <p className="mt-1 text-slate-500">Acompanhe vendas, entradas, saidas, sangrias e fechamento.</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-[180px_180px_auto]">
            <input className="input-field" type="datetime-local" value={period.start} onChange={(e) => setPeriod({ ...period, start: e.target.value })} />
            <input className="input-field" type="datetime-local" value={period.end} onChange={(e) => setPeriod({ ...period, end: e.target.value })} />
            <button type="button" onClick={loadFinance} className="rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">Atualizar</button>
          </div>
        </div>
      </section>

      {message && <div className="panel p-4 text-sm text-rose-600">{message}</div>}
      {loading ? <LoadingSpinner /> : summary && (
        <>
          <section className="grid gap-4 xl:grid-cols-5">
            <div className="panel p-5"><p className="text-sm text-slate-500">Vendas</p><p className="mt-2 text-2xl font-semibold text-slate-950">{money(summary.salesTotal)}</p></div>
            <div className="panel p-5"><p className="text-sm text-slate-500">Entradas</p><p className="mt-2 text-2xl font-semibold text-emerald-700">{money(summary.manualEntries)}</p></div>
            <div className="panel p-5"><p className="text-sm text-slate-500">Saidas</p><p className="mt-2 text-2xl font-semibold text-rose-700">{money(summary.exits)}</p></div>
            <div className="panel p-5"><p className="text-sm text-slate-500">Saldo</p><p className="mt-2 text-2xl font-semibold text-slate-950">{money(summary.netCash)}</p></div>
            <div className="panel p-5"><p className="text-sm text-slate-500">Ticket medio</p><p className="mt-2 text-2xl font-semibold text-slate-950">{money(summary.averageTicket)}</p></div>
          </section>

          <section className="grid gap-4 xl:grid-cols-[0.8fr_1.2fr]">
            <form onSubmit={saveMovement} className="panel p-6">
              <div className="flex items-center gap-2">
                <PlusCircle size={18} />
                <h2 className="text-xl font-semibold text-slate-950">Novo movimento</h2>
              </div>
              <div className="mt-5 grid gap-3">
                <select className="input-field" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                  <option value="abertura">Abertura</option>
                  <option value="entrada">Entrada</option>
                  <option value="saida">Saida</option>
                  <option value="sangria">Sangria</option>
                  <option value="fechamento">Fechamento</option>
                </select>
                <input className="input-field" type="number" min="0" step="0.01" placeholder="Valor" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
                <textarea className="input-field min-h-24" placeholder="Descricao" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
              <button className="mt-5 rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700" type="submit">Registrar</button>
            </form>

            <div className="panel p-6">
              <h2 className="text-xl font-semibold text-slate-950">Ultimos movimentos</h2>
              <div className="mt-5 overflow-x-auto rounded-lg border border-slate-200">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500">
                    <tr><th className="px-4 py-3">Tipo</th><th className="px-4 py-3">Descricao</th><th className="px-4 py-3 text-right">Valor</th><th className="px-4 py-3 text-right">Data</th></tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {summary.movements.map((item) => (
                      <tr key={item.id}>
                        <td className="px-4 py-3"><span className="status-chip bg-slate-100 text-slate-700">{item.type}</span></td>
                        <td className="px-4 py-3 text-slate-950">{item.description}</td>
                        <td className="px-4 py-3 text-right font-semibold">{money(item.amount)}</td>
                        <td className="px-4 py-3 text-right text-slate-500">{new Date(item.createdAt).toLocaleString('pt-BR')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
