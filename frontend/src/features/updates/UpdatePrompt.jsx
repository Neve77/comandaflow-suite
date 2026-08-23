import { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, Download, LoaderCircle, RefreshCw, ShieldCheck, X } from 'lucide-react';
import api from '../../shared/services/api';

const formatSize = (bytes) => {
  if (!bytes) return '';
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
};

export default function UpdatePrompt() {
  const [state, setState] = useState(null);
  const [dismissedVersion, setDismissedVersion] = useState(null);
  const [actionError, setActionError] = useState('');

  const loadStatus = useCallback(async () => {
    try {
      const response = await api.get('/updates/status');
      setState(response.data);
    } catch {
      // A verificação de atualização não interfere no funcionamento do restaurante.
    }
  }, []);

  useEffect(() => {
    api.post('/updates/check').then((response) => setState(response.data)).catch(() => {});
    const interval = setInterval(loadStatus, 3000);
    return () => clearInterval(interval);
  }, [loadStatus]);

  const downloadUpdate = async () => {
    setActionError('');
    try {
      const response = await api.post('/updates/download');
      setState(response.data);
    } catch (error) {
      setActionError(error.response?.data?.message || 'Nao foi possivel iniciar o download.');
    }
  };

  const installUpdate = async () => {
    setActionError('');
    try {
      const response = await api.post('/updates/install');
      setState(response.data);
    } catch (error) {
      setActionError(error.response?.data?.message || 'Nao foi possivel abrir o instalador.');
    }
  };

  const visibleStatuses = ['available', 'downloading', 'ready', 'downloadError', 'installing'];
  if (!state?.manifest || !visibleStatuses.includes(state.status)) return null;
  if (!state.manifest.mandatory && dismissedVersion === state.manifest.version && !['downloading', 'installing'].includes(state.status)) return null;

  const downloading = state.status === 'downloading';
  const ready = state.status === 'ready';
  const installing = state.status === 'installing';

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/75 p-4">
      <section className="w-full max-w-lg overflow-hidden rounded-3xl border border-slate-700 bg-slate-900 text-white shadow-2xl">
        <header className="flex items-start justify-between border-b border-slate-700 p-6">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-emerald-400/10 p-3 text-emerald-300">
              {ready ? <CheckCircle2 size={26} /> : <Download size={26} />}
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-400">Atualizacao oficial</p>
              <h2 className="mt-1 text-xl font-extrabold">ComandaFlow {state.manifest.version}</h2>
            </div>
          </div>
          {!state.manifest.mandatory && !downloading && !installing && (
            <button className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white" onClick={() => setDismissedVersion(state.manifest.version)} title="Lembrar depois"><X size={19} /></button>
          )}
        </header>

        <div className="space-y-5 p-6">
          <div className="flex items-center gap-2 text-sm text-slate-300">
            <ShieldCheck size={17} className="text-emerald-400" />
            Instalador verificado por assinatura digital e SHA-256 · {formatSize(state.manifest.size)}
          </div>

          <div className="max-h-40 overflow-y-auto whitespace-pre-wrap rounded-xl border border-slate-700 bg-slate-950/60 p-4 text-sm leading-6 text-slate-300">
            {state.manifest.releaseNotes}
          </div>

          {state.manifest.mandatory && <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm font-semibold text-amber-200">Esta atualizacao foi marcada como obrigatoria pelo gestor.</div>}

          {downloading && (
            <div>
              <div className="mb-2 flex justify-between text-xs font-bold text-slate-300"><span>Baixando pelo servidor do gestor...</span><span>{state.progress || 0}%</span></div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-700"><div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${state.progress || 0}%` }} /></div>
            </div>
          )}

          {state.status === 'downloadError' && <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-200">{state.error || 'O download foi interrompido. Verifique a internet e tente novamente.'}</div>}
          {actionError && <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-200">{actionError}</div>}

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            {!state.manifest.mandatory && !downloading && !installing && <button className="btn-secondary justify-center border-slate-600 bg-slate-800 text-slate-200 hover:bg-slate-700" onClick={() => setDismissedVersion(state.manifest.version)}>Lembrar depois</button>}
            {!ready && !installing && <button className="btn-primary justify-center bg-emerald-600 hover:bg-emerald-700" disabled={downloading} onClick={downloadUpdate}>{downloading ? <LoaderCircle className="animate-spin" size={18} /> : state.status === 'downloadError' ? <RefreshCw size={18} /> : <Download size={18} />}{downloading ? 'Baixando...' : state.status === 'downloadError' ? 'Tentar novamente' : 'Baixar atualizacao'}</button>}
            {ready && <button className="btn-primary justify-center bg-emerald-600 hover:bg-emerald-700" onClick={installUpdate}><CheckCircle2 size={18} />Instalar e reiniciar</button>}
            {installing && <button className="btn-primary justify-center bg-emerald-600" disabled><LoaderCircle className="animate-spin" size={18} />Abrindo instalador...</button>}
          </div>
          {ready && <p className="text-center text-xs text-slate-400">O ComandaFlow sera fechado e o instalador do Windows sera aberto. Seus dados permanecem salvos.</p>}
        </div>
      </section>
    </div>
  );
}
