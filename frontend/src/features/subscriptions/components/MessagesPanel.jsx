import { useCallback, useEffect, useState } from 'react';
import { Megaphone, Send, XCircle } from 'lucide-react';
import api from '../../../shared/services/api';

const dateTime = (value) => new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value));
const requestMessage = (error) => error.response?.data?.message || 'Não foi possível concluir a operação.';

export default function MessagesPanel({ subscribers, canWrite }) {
  const [messages, setMessages] = useState([]);
  const [form, setForm] = useState({ audience: 'all', subscriberIds: [], title: '', body: '', severity: 'info' });
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [deactivatingId, setDeactivatingId] = useState('');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const response = await api.get('/manager/messages');
      setMessages(response.data.messages || []);
      setError('');
    } catch (requestError) {
      setError(requestMessage(requestError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const submit = async (event) => {
    event.preventDefault();
    setSending(true);
    setError('');
    try {
      await api.post('/manager/messages', { ...form, subscriberIds: form.audience === 'all' ? [] : form.subscriberIds });
      setForm({ audience: 'all', subscriberIds: [], title: '', body: '', severity: 'info' });
      setNotice('Mensagem enviada e será exibida na próxima sincronização.');
      await load();
    } catch (requestError) {
      setError(requestMessage(requestError));
    } finally {
      setSending(false);
    }
  };

  const deactivate = async (id) => {
    setDeactivatingId(id);
    setError('');
    try {
      await api.post(`/manager/messages/${id}/deactivate`);
      setNotice('Mensagem retirada dos sistemas dos restaurantes.');
      await load();
    } catch (requestError) {
      setError(requestMessage(requestError));
    } finally {
      setDeactivatingId('');
    }
  };

  return (
    <section className="panel p-5">
      <div className="flex items-center gap-3">
        <div className="shrink-0 rounded-xl bg-violet-50 p-3 text-violet-700"><Megaphone size={21} /></div>
        <div>
          <h2 className="font-extrabold text-slate-900">Mensagens aos restaurantes</h2>
          <p className="text-xs text-slate-500">Envio individual, para um grupo ou para todos.</p>
        </div>
      </div>

      {error && <div className="mt-4 rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</div>}
      {notice && <div className="mt-4 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700">{notice}</div>}

      {canWrite && (
        <form className="mt-5 grid gap-3 md:grid-cols-2" onSubmit={submit}>
          <select className="input-field" value={form.audience} onChange={(event) => setForm((value) => ({ ...value, audience: event.target.value }))}>
            <option value="all">Todos os clientes</option>
            <option value="selected">Clientes selecionados</option>
          </select>
          <select className="input-field" value={form.severity} onChange={(event) => setForm((value) => ({ ...value, severity: event.target.value }))}>
            <option value="info">Informativa</option>
            <option value="aviso">Aviso</option>
            <option value="urgente">Urgente</option>
          </select>
          {form.audience === 'selected' && (
            <label className="text-xs font-bold text-slate-600 md:col-span-2">
              Selecione um ou mais clientes
              <select multiple className="input-field mt-1 min-h-28" value={form.subscriberIds} onChange={(event) => setForm((value) => ({ ...value, subscriberIds: [...event.target.selectedOptions].map((option) => option.value) }))} required>
                {subscribers.map((subscriber) => <option key={subscriber.id} value={subscriber.id}>{subscriber.businessName}</option>)}
              </select>
            </label>
          )}
          <input className="input-field md:col-span-2" placeholder="Título" maxLength={120} value={form.title} onChange={(event) => setForm((value) => ({ ...value, title: event.target.value }))} required />
          <textarea className="input-field min-h-24 md:col-span-2" placeholder="Mensagem que aparecerá no sistema do restaurante" maxLength={2000} value={form.body} onChange={(event) => setForm((value) => ({ ...value, body: event.target.value }))} required />
          <div className="flex justify-end md:col-span-2">
            <button className="btn-primary w-full bg-violet-600 hover:bg-violet-700 sm:w-auto" disabled={sending || (form.audience === 'selected' && !form.subscriberIds.length)}>
              <Send size={16} />{sending ? 'Enviando...' : 'Enviar mensagem'}
            </button>
          </div>
        </form>
      )}

      <div className="mt-5 space-y-2">
        {messages.slice(0, 12).map((message) => (
          <article key={message.id} className={`rounded-xl border p-3 ${message.active ? 'border-slate-200' : 'border-slate-100 opacity-60'}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="break-words font-bold text-slate-900">{message.title}</p>
                <p className="mt-1 break-words text-sm text-slate-600">{message.body}</p>
                <p className="mt-2 text-xs text-slate-400">{message.subscriber?.businessName || 'Todos os clientes'} · {dateTime(message.createdAt)} · {message._count.receipts} leitura(s)</p>
              </div>
              {canWrite && message.active && (
                <button type="button" className="btn-icon shrink-0 text-rose-600" title="Retirar mensagem" aria-label={`Retirar mensagem ${message.title}`} disabled={deactivatingId === message.id} onClick={() => deactivate(message.id)}>
                  <XCircle size={17} />
                </button>
              )}
            </div>
          </article>
        ))}
        {loading && <p className="py-5 text-center text-sm text-slate-500">Carregando mensagens...</p>}
        {!loading && !messages.length && <p className="py-5 text-center text-sm text-slate-500">Nenhuma mensagem enviada.</p>}
      </div>
    </section>
  );
}
