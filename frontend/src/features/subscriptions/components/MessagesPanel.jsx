import { useCallback, useEffect, useState } from 'react';
import { Megaphone, Send, XCircle } from 'lucide-react';
import api from '../../../shared/services/api';

const dateTime = (value) => new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value));

export default function MessagesPanel({ subscribers, canWrite }) {
  const [messages, setMessages] = useState([]);
  const [form, setForm] = useState({ audience: 'all', subscriberIds: [], title: '', body: '', severity: 'info' });
  const [notice, setNotice] = useState('');
  const load = useCallback(() => api.get('/manager/messages').then((response) => setMessages(response.data.messages || [])), []);
  useEffect(() => { load().catch(() => {}); }, [load]);
  const submit = async (event) => {
    event.preventDefault();
    await api.post('/manager/messages', { ...form, subscriberIds: form.audience === 'all' ? [] : form.subscriberIds });
    setForm({ audience: 'all', subscriberIds: [], title: '', body: '', severity: 'info' });
    setNotice('Mensagem enviada e será exibida na próxima sincronização.');
    await load();
  };
  const deactivate = async (id) => {
    await api.post(`/manager/messages/${id}/deactivate`);
    await load();
  };
  return <section className="panel p-5"><div className="flex items-center gap-3"><div className="rounded-xl bg-violet-50 p-3 text-violet-700"><Megaphone size={21} /></div><div><h2 className="font-extrabold text-slate-900">Mensagens aos restaurantes</h2><p className="text-xs text-slate-500">Envio individual, para um grupo ou para todos.</p></div></div>{canWrite && <form className="mt-5 grid gap-3 md:grid-cols-2" onSubmit={submit}><select className="input-field" value={form.audience} onChange={(event) => setForm((value) => ({ ...value, audience: event.target.value }))}><option value="all">Todos os clientes</option><option value="selected">Clientes selecionados</option></select><select className="input-field" value={form.severity} onChange={(event) => setForm((value) => ({ ...value, severity: event.target.value }))}><option value="info">Informativa</option><option value="aviso">Aviso</option><option value="urgente">Urgente</option></select>{form.audience === 'selected' && <label className="md:col-span-2 text-xs font-bold text-slate-600">Selecione um ou mais clientes<select multiple className="input-field mt-1 min-h-28" value={form.subscriberIds} onChange={(event) => setForm((value) => ({ ...value, subscriberIds: [...event.target.selectedOptions].map((option) => option.value) }))} required>{subscribers.map((subscriber) => <option key={subscriber.id} value={subscriber.id}>{subscriber.businessName}</option>)}</select></label>}<input className="input-field md:col-span-2" placeholder="Título" maxLength={120} value={form.title} onChange={(event) => setForm((value) => ({ ...value, title: event.target.value }))} required /><textarea className="input-field min-h-24 md:col-span-2" placeholder="Mensagem que aparecerá no sistema do restaurante" maxLength={2000} value={form.body} onChange={(event) => setForm((value) => ({ ...value, body: event.target.value }))} required /><div className="md:col-span-2 flex justify-end"><button className="btn-primary bg-violet-600 hover:bg-violet-700"><Send size={16} />Enviar mensagem</button></div></form>}{notice && <div className="mt-3 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700">{notice}</div>}<div className="mt-5 space-y-2">{messages.slice(0, 12).map((message) => <article key={message.id} className={`rounded-xl border p-3 ${message.active ? 'border-slate-200' : 'border-slate-100 opacity-60'}`}><div className="flex items-start justify-between gap-3"><div><p className="font-bold text-slate-900">{message.title}</p><p className="mt-1 text-sm text-slate-600">{message.body}</p><p className="mt-2 text-xs text-slate-400">{message.subscriber?.businessName || 'Todos os clientes'} · {dateTime(message.createdAt)} · {message._count.receipts} leitura(s)</p></div>{canWrite && message.active && <button className="btn-icon text-rose-600" title="Retirar mensagem" onClick={() => deactivate(message.id)}><XCircle size={17} /></button>}</div></article>)}{!messages.length && <p className="py-5 text-center text-sm text-slate-500">Nenhuma mensagem enviada.</p>}</div></section>;
}
