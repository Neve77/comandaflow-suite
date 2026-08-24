import { useCallback, useEffect, useState } from 'react';
import { Headphones, MessageSquarePlus, Plus } from 'lucide-react';
import api from '../../../shared/services/api';

const statusLabels = { aberto: 'Aberto', em_atendimento: 'Em atendimento', resolvido: 'Resolvido', fechado: 'Fechado' };

export default function SupportPanel({ subscribers, canWrite }) {
  const [tickets, setTickets] = useState([]);
  const [form, setForm] = useState({ subscriberId: '', subject: '', description: '', priority: 'normal' });
  const [comment, setComment] = useState({});
  const load = useCallback(() => api.get('/manager/tickets').then((response) => setTickets(response.data.tickets || [])), []);
  useEffect(() => { load().catch(() => {}); }, [load]);
  const create = async (event) => {
    event.preventDefault();
    await api.post('/manager/tickets', form);
    setForm({ subscriberId: '', subject: '', description: '', priority: 'normal' });
    await load();
  };
  const update = async (ticket, values) => {
    await api.put(`/manager/tickets/${ticket.id}`, { status: values.status || ticket.status, priority: values.priority || ticket.priority });
    await load();
  };
  const addComment = async (ticket) => {
    if (!comment[ticket.id]?.trim()) return;
    await api.post(`/manager/tickets/${ticket.id}/comments`, { body: comment[ticket.id] });
    setComment((value) => ({ ...value, [ticket.id]: '' }));
    await load();
  };

  return <section className="panel p-5"><div className="flex items-center gap-3"><div className="rounded-xl bg-amber-50 p-3 text-amber-700"><Headphones size={21} /></div><div><h2 className="font-extrabold text-slate-900">Chamados de suporte</h2><p className="text-xs text-slate-500">Histórico e atendimento vinculados ao assinante.</p></div></div>{canWrite && <form className="mt-5 grid gap-3 md:grid-cols-2" onSubmit={create}><select className="input-field" value={form.subscriberId} onChange={(event) => setForm((value) => ({ ...value, subscriberId: event.target.value }))} required><option value="">Selecione o assinante...</option>{subscribers.map((subscriber) => <option key={subscriber.id} value={subscriber.id}>{subscriber.businessName}</option>)}</select><select className="input-field" value={form.priority} onChange={(event) => setForm((value) => ({ ...value, priority: event.target.value }))}><option value="baixa">Prioridade baixa</option><option value="normal">Prioridade normal</option><option value="alta">Prioridade alta</option><option value="urgente">Urgente</option></select><input className="input-field md:col-span-2" placeholder="Assunto do chamado" value={form.subject} onChange={(event) => setForm((value) => ({ ...value, subject: event.target.value }))} required /><textarea className="input-field min-h-20 md:col-span-2" placeholder="Descreva o problema ou solicitação" value={form.description} onChange={(event) => setForm((value) => ({ ...value, description: event.target.value }))} required /><div className="flex justify-end md:col-span-2"><button className="btn-primary bg-amber-600 hover:bg-amber-700"><Plus size={16} />Abrir chamado</button></div></form>}<div className="mt-5 space-y-3">{tickets.map((ticket) => <article key={ticket.id} className="rounded-xl border border-slate-200 p-4"><div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between"><div><p className="font-extrabold text-slate-900">{ticket.subject}</p><p className="text-xs font-semibold text-slate-500">{ticket.subscriber.businessName} · prioridade {ticket.priority}</p><p className="mt-2 text-sm text-slate-600">{ticket.description}</p></div>{canWrite ? <div className="flex gap-2"><select className="input-field py-2 text-xs" value={ticket.status} onChange={(event) => update(ticket, { status: event.target.value })}>{Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><select className="input-field py-2 text-xs" value={ticket.priority} onChange={(event) => update(ticket, { priority: event.target.value })}>{['baixa', 'normal', 'alta', 'urgente'].map((value) => <option key={value}>{value}</option>)}</select></div> : <span className="status-chip bg-slate-100 text-slate-700">{statusLabels[ticket.status]}</span>}</div>{ticket.comments.map((item) => <div key={item.id} className="mt-3 rounded-lg bg-slate-50 p-3 text-sm"><strong>{item.authorName || 'Equipe'}:</strong> {item.body}</div>)}{canWrite && <div className="mt-3 flex gap-2"><input className="input-field" placeholder="Adicionar resposta" value={comment[ticket.id] || ''} onChange={(event) => setComment((value) => ({ ...value, [ticket.id]: event.target.value }))} /><button className="btn-secondary shrink-0" onClick={() => addComment(ticket)}><MessageSquarePlus size={16} />Responder</button></div>}</article>)}{!tickets.length && <p className="py-5 text-center text-sm text-slate-500">Nenhum chamado cadastrado.</p>}</div></section>;
}
