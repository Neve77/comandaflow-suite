import { useCallback, useEffect, useMemo, useState } from 'react';
import { MonitorSmartphone, RefreshCw, Wifi, WifiOff } from 'lucide-react';
import api from '../../../shared/services/api';

const dateTime = (value) => value
  ? new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value))
  : 'Nunca';

export default function MonitoringPanel() {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdatedAt, setLastUpdatedAt] = useState(null);
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      const response = await api.get('/manager/monitoring');
      setClients(response.data.clients || []);
      setLastUpdatedAt(response.data.generatedAt || new Date().toISOString());
      setError('');
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Não foi possível consultar os clientes.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);
  useEffect(() => {
    load();
    const refreshWhenVisible = () => {
      if (document.visibilityState === 'visible') load();
    };
    const interval = setInterval(refreshWhenVisible, 15000);
    document.addEventListener('visibilitychange', refreshWhenVisible);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', refreshWhenVisible);
    };
  }, [load]);
  const totals = useMemo(() => ({
    online: clients.filter((client) => client.online).length,
    devices: clients.reduce((sum, client) => sum + client.activeDevices, 0),
  }), [clients]);

  return (
    <section className="panel overflow-hidden">
      <header className="flex flex-col gap-3 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <div className="shrink-0 rounded-xl bg-cyan-50 p-3 text-cyan-700"><MonitorSmartphone size={21} /></div>
          <div className="min-w-0">
            <h2 className="font-extrabold text-slate-900">Monitoramento dos clientes</h2>
            <p className="text-xs text-slate-500">{totals.online} online · {clients.length - totals.online} offline · {totals.devices} dispositivos ativos</p>
            {lastUpdatedAt && <p className="mt-1 text-[11px] text-slate-400">Painel atualizado em {dateTime(lastUpdatedAt)} · atualização automática a cada 15 segundos</p>}
          </div>
        </div>
        <button className="btn-secondary w-full sm:w-auto" onClick={load} disabled={refreshing}>
          <RefreshCw className={refreshing ? 'animate-spin' : ''} size={16} />
          {refreshing ? 'Atualizando...' : 'Atualizar agora'}
        </button>
      </header>

      {error && <div className="m-4 rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</div>}

      <div className="responsive-table-wrap overflow-x-auto">
        <table className="responsive-data-table w-full min-w-[760px] text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-5 py-3">Cliente</th>
              <th className="px-5 py-3">Conexão</th>
              <th className="px-5 py-3">Última sincronização</th>
              <th className="px-5 py-3">Versão</th>
              <th className="px-5 py-3">Dispositivos</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {clients.map((client) => (
              <tr key={client.subscriberId}>
                <td data-label="Cliente" className="px-5 py-4">
                  <p className="font-bold text-slate-900">{client.businessName}</p>
                  <p className="text-xs text-slate-500">Conta {client.accountStatus}</p>
                </td>
                <td data-label="Conexão" className="px-5 py-4">
                  <span className={`inline-flex items-center gap-1.5 font-bold ${client.online ? 'text-emerald-700' : 'text-slate-500'}`}>
                    {client.online ? <Wifi size={15} /> : <WifiOff size={15} />}
                    {client.online ? 'Online' : 'Offline'}
                  </span>
                </td>
                <td data-label="Última sincronização" className="px-5 py-4 text-slate-600">{dateTime(client.lastSyncAt)}</td>
                <td data-label="Versão" className="px-5 py-4 font-mono text-xs text-slate-700">{client.appVersion || 'Não informada'}</td>
                <td data-label="Dispositivos" className="px-5 py-4"><strong>{client.activeDevices}</strong> / {client.maxDevices}</td>
              </tr>
            ))}
            {!loading && !clients.length && (
              <tr className="responsive-table-empty">
                <td colSpan="5" className="px-5 py-10 text-center text-slate-500">Nenhuma instalação sincronizada.</td>
              </tr>
            )}
            {loading && (
              <tr className="responsive-table-empty">
                <td colSpan="5" className="px-5 py-10 text-center text-slate-500">Consultando clientes...</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
