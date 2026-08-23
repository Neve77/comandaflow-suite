import { useState } from 'react';
import { CheckCircle2, KeyRound, LockKeyhole } from 'lucide-react';
import api from '../../shared/services/api';

export default function LicenseActivationPage({ status, onActivated }) {
  const [licenseKey, setLicenseKey] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState(status?.error || '');
  const [loading, setLoading] = useState(false);

  const activate = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');
    try {
      const response = await api.post('/license/activate', { licenseKey });
      setMessage(response.data.message);
      await onActivated();
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Nao foi possivel ativar esta chave.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-950 p-5">
      <section className="w-full max-w-xl rounded-3xl border border-slate-700 bg-slate-900 p-8 shadow-2xl">
        <div className="flex items-center gap-4">
          <div className="rounded-2xl bg-amber-400/10 p-3 text-amber-300"><LockKeyhole size={28} /></div>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-400">ComandaFlow</p>
            <h1 className="mt-1 text-2xl font-extrabold text-white">
              {['suspenso', 'cancelado'].includes(status?.status) ? 'Acesso suspenso' : 'Ative sua assinatura'}
            </h1>
          </div>
        </div>

        <p className="mt-5 text-sm leading-6 text-slate-300">
          {status?.message || (status?.status === 'expirado'
            ? 'Seu periodo de uso terminou. Solicite uma renovacao e cole abaixo a nova chave enviada pelo fornecedor.'
            : 'Cole a chave de assinatura fornecida pelo gestor para liberar o sistema neste computador.')}
        </p>

        <form onSubmit={activate} className="mt-6 space-y-4">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
            Chave de ativacao
            <textarea
              className="mt-2 min-h-32 w-full resize-y rounded-xl border border-slate-700 bg-slate-950 p-3 font-mono text-xs text-slate-100 outline-none focus:border-emerald-500"
              value={licenseKey}
              onChange={(event) => setLicenseKey(event.target.value)}
              placeholder="CF3-..."
              required
            />
          </label>

          {error && <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-200">{error}</div>}
          {message && <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-200"><CheckCircle2 size={17} />{message}</div>}

          <button type="submit" disabled={loading} className="btn-primary w-full justify-center bg-emerald-600 hover:bg-emerald-700">
            <KeyRound size={18} /> {loading ? 'Validando...' : 'Ativar assinatura'}
          </button>
        </form>
      </section>
    </main>
  );
}
