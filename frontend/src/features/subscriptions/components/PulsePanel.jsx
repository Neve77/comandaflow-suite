import { useCallback, useEffect, useMemo, useState } from 'react';
import { Activity, AlertTriangle, CheckCircle2, RefreshCw, ShieldAlert, Wifi, WifiOff } from 'lucide-react';
import api from '../../../shared/services/api';

const levels = {
  excellent: { label: 'Excelente', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  good: { label: 'Saudável', className: 'bg-blue-50 text-blue-700 border-blue-200' },
  attention: { label: 'Atenção', className: 'bg-amber-50 text-amber-700 border-amber-200' },
  critical: { label: 'Crítico', className: 'bg-rose-50 text-rose-700 border-rose-200' },
};

export default function PulsePanel({ onOpenProfile }) {
  const [snapshot, setSnapshot] = useState({ summary: {}, clients: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    try {
      const response = await api.get('/manager/pulse');
      setSnapshot(response.data);
      setError('');
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Não foi possível calcular a saúde dos assinantes.');
    } finally { setLoading(false); }
  }, []);
  useEffect(() => {
    load();
    const refresh = () => { if (document.visibilityState === 'visible') load(); };
    const interval = setInterval(refresh, 30000);
    document.addEventListener('visibilitychange', refresh);
    return () => { clearInterval(interval); document.removeEventListener('visibilitychange', refresh); };
  }, [load]);

  const cards = useMemo(() => [
    { label: 'Média da base', value: snapshot.summary.average ?? 100, suffix: '/100', icon: Activity, tone: 'bg-violet-50 text-violet-700' },
    { label: 'Excelentes', value: snapshot.summary.excellent || 0, icon: CheckCircle2, tone: 'bg-emerald-50 text-emerald-700' },
    { label: 'Precisam de atenção', value: snapshot.summary.attention || 0, icon: AlertTriangle, tone: 'bg-amber-50 text-amber-700' },
    { label: 'Críticos', value: snapshot.summary.critical || 0, icon: ShieldAlert, tone: 'bg-rose-50 text-rose-700' },
  ], [snapshot.summary]);

  return <div className="space-y-5">
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map(({ label, value, suffix, icon: Icon, tone }) => <article key={label} className="panel flex items-center gap-4 p-5"><div className={`rounded-xl p-3 ${tone}`}><Icon size={22} /></div><div><p className="text-2xl font-extrabold text-slate-900">{value}<small className="ml-1 text-xs text-slate-400">{suffix}</small></p><p className="text-xs font-semibold text-slate-500">{label}</p></div></article>)}
    </section>

    <section className="panel overflow-hidden">
      <header className="flex flex-col gap-3 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="font-extrabold text-slate-900">Saúde da base</h2><p className="text-xs text-slate-500">Pontuação calculada por conexão, cobrança, suporte, versão e onboarding.</p></div><button className="btn-secondary" onClick={load}><RefreshCw size={16} />Atualizar</button></header>
      {error && <div className="m-4 rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</div>}
      <div className="responsive-table-wrap overflow-x-auto"><table className="responsive-data-table w-full min-w-[920px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500"><tr><th className="px-5 py-3">Assinante</th><th className="px-5 py-3">Pulse</th><th className="px-5 py-3">Conexão</th><th className="px-5 py-3">Principais fatores</th><th className="px-5 py-3">Onboarding</th><th className="px-5 py-3 text-right">Ação</th></tr></thead><tbody className="divide-y divide-slate-100">
        {snapshot.clients.map((client) => {
          const level = levels[client.level] || levels.good;
          return <tr key={client.subscriberId} className="hover:bg-slate-50/70"><td data-label="Assinante" className="px-5 py-4"><p className="font-bold text-slate-900">{client.businessName}</p><p className="text-xs text-slate-500">Conta {client.accountStatus}</p></td><td data-label="Pulse" className="px-5 py-4"><div className="flex items-center gap-3"><strong className="text-xl text-slate-900">{client.score}</strong><span className={`rounded-full border px-2.5 py-1 text-xs font-bold ${level.className}`}>{level.label}</span></div></td><td data-label="Conexão" className="px-5 py-4"><span className={`inline-flex items-center gap-1.5 font-bold ${client.online ? 'text-emerald-700' : 'text-slate-500'}`}>{client.online ? <Wifi size={15} /> : <WifiOff size={15} />}{client.online ? 'Online' : 'Offline'}</span><p className="mt-1 font-mono text-[11px] text-slate-400">{client.appVersion || 'sem versão'}</p></td><td data-label="Fatores" className="px-5 py-4"><div className="flex max-w-md flex-wrap gap-1.5">{client.factors.slice(0, 3).map((factor) => <span key={factor.code} className={`rounded-full px-2 py-1 text-[11px] font-semibold ${factor.severity === 'critical' ? 'bg-rose-50 text-rose-700' : factor.severity === 'warning' ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>{factor.label}</span>)}{!client.factors.length && <span className="text-xs text-emerald-700">Nenhum alerta</span>}</div></td><td data-label="Onboarding" className="px-5 py-4"><div className="w-28"><div className="mb-1 flex justify-between text-[11px] font-bold text-slate-500"><span>{client.onboarding.percentage}%</span><span>{client.onboarding.completed}/{client.onboarding.total}</span></div><div className="h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-emerald-500" style={{ width: `${client.onboarding.percentage}%` }} /></div></div></td><td data-label="Ação" className="px-5 py-4 text-right"><button className="btn-secondary px-3" onClick={() => onOpenProfile(client.subscriberId)}>Abrir ficha</button></td></tr>;
        })}
        {!loading && !snapshot.clients.length && <tr className="responsive-table-empty"><td colSpan="6" className="px-5 py-12 text-center text-slate-500">Nenhum assinante cadastrado.</td></tr>}
        {loading && <tr className="responsive-table-empty"><td colSpan="6" className="px-5 py-12 text-center text-slate-500">Calculando Pulse...</td></tr>}
      </tbody></table></div>
    </section>
  </div>;
}
