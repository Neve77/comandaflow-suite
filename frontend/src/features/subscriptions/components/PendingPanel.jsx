import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertCircle, AlertTriangle, CircleDot, ClipboardCheck, RefreshCw } from 'lucide-react';
import api from '../../../shared/services/api';

const severity = {
  critical: { label: 'Urgente', className: 'bg-rose-50 text-rose-700 border-rose-200', icon: AlertCircle },
  warning: { label: 'Atenção', className: 'bg-amber-50 text-amber-700 border-amber-200', icon: AlertTriangle },
  info: { label: 'Acompanhar', className: 'bg-blue-50 text-blue-700 border-blue-200', icon: CircleDot },
};
const typeLabels = { billing: 'Cobrança', offline: 'Conexão', expiration: 'Assinatura', support: 'Suporte', update: 'Atualização', onboarding: 'Onboarding' };

export default function PendingPanel({ onOpenProfile }) {
  const [data, setData] = useState({ summary: {}, items: [] });
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    try { const response = await api.get('/manager/pending'); setData(response.data); setError(''); }
    catch (requestError) { setError(requestError.response?.data?.message || 'Não foi possível consultar as pendências.'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);
  const items = useMemo(() => filter === 'all' ? data.items : data.items.filter((item) => item.severity === filter || item.type === filter), [data.items, filter]);

  return <div className="space-y-5">
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {[['Total', data.summary.total || 0, ClipboardCheck, 'bg-slate-100 text-slate-700'], ['Urgentes', data.summary.critical || 0, AlertCircle, 'bg-rose-50 text-rose-700'], ['Atenção', data.summary.warning || 0, AlertTriangle, 'bg-amber-50 text-amber-700'], ['Acompanhar', data.summary.info || 0, CircleDot, 'bg-blue-50 text-blue-700']].map(([label, value, Icon, tone]) => <article key={label} className="panel flex items-center gap-4 p-5"><div className={`rounded-xl p-3 ${tone}`}><Icon size={22} /></div><div><p className="text-2xl font-extrabold text-slate-900">{value}</p><p className="text-xs font-semibold text-slate-500">{label}</p></div></article>)}
    </section>
    <section className="panel overflow-hidden">
      <header className="flex flex-col gap-3 border-b border-slate-100 p-5 lg:flex-row lg:items-center lg:justify-between"><div><h2 className="font-extrabold text-slate-900">Fila de trabalho</h2><p className="text-xs text-slate-500">Pendências priorizadas automaticamente para a equipe.</p></div><div className="flex flex-col gap-2 sm:flex-row"><select className="input-field sm:w-48" value={filter} onChange={(event) => setFilter(event.target.value)}><option value="all">Todas</option><option value="critical">Urgentes</option><option value="warning">Atenção</option><option value="billing">Cobranças</option><option value="offline">Conexão</option><option value="support">Suporte</option><option value="update">Atualizações</option><option value="onboarding">Onboarding</option></select><button className="btn-secondary" onClick={load}><RefreshCw size={16} />Atualizar</button></div></header>
      {error && <div className="m-4 rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</div>}
      <div className="divide-y divide-slate-100">
        {items.map((item) => { const visual = severity[item.severity] || severity.info; const Icon = visual.icon; return <article key={item.id} className="flex flex-col gap-3 p-5 hover:bg-slate-50/70 md:flex-row md:items-center"><div className={`shrink-0 rounded-xl border p-3 ${visual.className}`}><Icon size={19} /></div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className="font-extrabold text-slate-900">{item.title}</h3><span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase ${visual.className}`}>{visual.label}</span><span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase text-slate-500">{typeLabels[item.type] || item.type}</span></div><p className="mt-1 text-sm text-slate-600">{item.businessName} · {item.description}</p></div><button className="btn-secondary shrink-0" onClick={() => onOpenProfile(item.subscriberId)}>Resolver na ficha</button></article>; })}
        {!loading && !items.length && <div className="p-12 text-center"><ClipboardCheck className="mx-auto text-emerald-500" size={34} /><p className="mt-3 font-bold text-slate-800">Nenhuma pendência neste filtro</p><p className="mt-1 text-sm text-slate-500">A base está em dia.</p></div>}
        {loading && <div className="p-12 text-center text-sm text-slate-500">Organizando pendências...</div>}
      </div>
    </section>
  </div>;
}
