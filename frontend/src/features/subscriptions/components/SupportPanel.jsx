import { useCallback, useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Clock3, Headphones, MessageSquarePlus, Plus, Search } from 'lucide-react';
import api from '../../../shared/services/api';

const statusLabels = { aberto: 'Aberto', em_atendimento: 'Em atendimento', resolvido: 'Resolvido', fechado: 'Fechado' };
const requestMessage = (error) => error.response?.data?.message || 'Não foi possível concluir a operação.';

export default function SupportPanel({ subscribers, canWrite }) {
  const [tickets, setTickets] = useState([]);
  const [form, setForm] = useState({ subscriberId: '', subject: '', description: '', priority: 'normal' });
  const [comment, setComment] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [busyTicketId, setBusyTicketId] = useState('');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('andamento');
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    try {
      const response = await api.get('/manager/tickets');
      setTickets(response.data.tickets || []);
      setError('');
    } catch (requestError) {
      setError(requestMessage(requestError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const create = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      await api.post('/manager/tickets', form);
      setForm({ subscriberId: '', subject: '', description: '', priority: 'normal' });
      setNotice('Chamado aberto com sucesso.');
      await load();
    } catch (requestError) {
      setError(requestMessage(requestError));
    } finally {
      setSubmitting(false);
    }
  };

  const update = async (ticket, values) => {
    setBusyTicketId(ticket.id);
    setError('');
    try {
      await api.put(`/manager/tickets/${ticket.id}`, {
        status: values.status || ticket.status,
        priority: values.priority || ticket.priority,
      });
      setNotice('Chamado atualizado.');
      await load();
    } catch (requestError) {
      setError(requestMessage(requestError));
    } finally {
      setBusyTicketId('');
    }
  };

  const addComment = async (ticket) => {
    if (!comment[ticket.id]?.trim()) return;
    setBusyTicketId(ticket.id);
    setError('');
    try {
      await api.post(`/manager/tickets/${ticket.id}/comments`, { body: comment[ticket.id] });
      setComment((value) => ({ ...value, [ticket.id]: '' }));
      setNotice('Resposta adicionada ao chamado.');
      await load();
    } catch (requestError) {
      setError(requestMessage(requestError));
    } finally {
      setBusyTicketId('');
    }
  };

  const filteredTickets = useMemo(() => tickets.filter((ticket) => {
    const matchesStatus = filter === 'todos'
      || (filter === 'andamento' && ['aberto', 'em_atendimento'].includes(ticket.status))
      || (filter === 'concluidos' && ['resolvido', 'fechado'].includes(ticket.status));
    const term = search.trim().toLowerCase();
    return matchesStatus && (!term
      || ticket.subject.toLowerCase().includes(term)
      || ticket.subscriber.businessName.toLowerCase().includes(term));
  }), [filter, search, tickets]);

  const totals = useMemo(() => ({
    open: tickets.filter((ticket) => ticket.status === 'aberto').length,
    inProgress: tickets.filter((ticket) => ticket.status === 'em_atendimento').length,
    completed: tickets.filter((ticket) => ['resolvido', 'fechado'].includes(ticket.status)).length,
  }), [tickets]);

  return (
    <section className="panel p-5">
      <div className="flex items-center gap-3">
        <div className="shrink-0 rounded-xl bg-amber-50 p-3 text-amber-700"><Headphones size={21} /></div>
        <div>
          <h2 className="font-extrabold text-slate-900">Chamados de suporte</h2>
          <p className="text-xs text-slate-500">Histórico e atendimento vinculados ao assinante.</p>
        </div>
      </div>

      {error && <div className="mt-4 rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</div>}
      {notice && <div className="mt-4 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700">{notice}</div>}

      {canWrite && (
        <form className="mt-5 grid gap-3 md:grid-cols-2" onSubmit={create}>
          <select className="input-field" value={form.subscriberId} onChange={(event) => setForm((value) => ({ ...value, subscriberId: event.target.value }))} required>
            <option value="">Selecione o assinante...</option>
            {subscribers.map((subscriber) => <option key={subscriber.id} value={subscriber.id}>{subscriber.businessName}</option>)}
          </select>
          <select className="input-field" value={form.priority} onChange={(event) => setForm((value) => ({ ...value, priority: event.target.value }))}>
            <option value="baixa">Prioridade baixa</option>
            <option value="normal">Prioridade normal</option>
            <option value="alta">Prioridade alta</option>
            <option value="urgente">Urgente</option>
          </select>
          <input className="input-field md:col-span-2" placeholder="Assunto do chamado" value={form.subject} onChange={(event) => setForm((value) => ({ ...value, subject: event.target.value }))} required />
          <textarea className="input-field min-h-20 md:col-span-2" placeholder="Descreva o problema ou solicitação" value={form.description} onChange={(event) => setForm((value) => ({ ...value, description: event.target.value }))} required />
          <div className="flex justify-end md:col-span-2">
            <button className="btn-primary w-full bg-amber-600 hover:bg-amber-700 sm:w-auto" disabled={submitting}>
              <Plus size={16} />{submitting ? 'Abrindo...' : 'Abrir chamado'}
            </button>
          </div>
        </form>
      )}

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <article className="flex items-center gap-3 rounded-xl border border-slate-200 p-3"><div className="rounded-lg bg-blue-50 p-2 text-blue-700"><Plus size={17} /></div><div><p className="font-extrabold text-slate-900">{totals.open}</p><p className="text-xs text-slate-500">Abertos</p></div></article>
        <article className="flex items-center gap-3 rounded-xl border border-slate-200 p-3"><div className="rounded-lg bg-amber-50 p-2 text-amber-700"><Clock3 size={17} /></div><div><p className="font-extrabold text-slate-900">{totals.inProgress}</p><p className="text-xs text-slate-500">Em atendimento</p></div></article>
        <article className="flex items-center gap-3 rounded-xl border border-slate-200 p-3"><div className="rounded-lg bg-emerald-50 p-2 text-emerald-700"><CheckCircle2 size={17} /></div><div><p className="font-extrabold text-slate-900">{totals.completed}</p><p className="text-xs text-slate-500">Concluídos</p></div></article>
      </div>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row">
        <label className="relative flex-1"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input className="input-field pl-9" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por assunto ou restaurante" /></label>
        <select className="input-field sm:w-48" value={filter} onChange={(event) => setFilter(event.target.value)}><option value="andamento">Em andamento</option><option value="concluidos">Concluídos</option><option value="todos">Todos</option></select>
      </div>

      <div className="mt-5 space-y-3">
        {filteredTickets.map((ticket) => (
          <article key={ticket.id} className="rounded-xl border border-slate-200 p-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div className="min-w-0">
                <p className="break-words font-extrabold text-slate-900">{ticket.subject}</p>
                <p className="text-xs font-semibold text-slate-500">{ticket.subscriber.businessName} · prioridade {ticket.priority}</p>
                <p className="mt-2 break-words text-sm text-slate-600">{ticket.description}</p>
              </div>
              {canWrite ? (
                <div className="flex w-full flex-col gap-2 sm:flex-row md:w-auto">
                  <select className="input-field py-2 text-xs" value={ticket.status} disabled={busyTicketId === ticket.id} onChange={(event) => update(ticket, { status: event.target.value })}>
                    {Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </select>
                  <select className="input-field py-2 text-xs" value={ticket.priority} disabled={busyTicketId === ticket.id} onChange={(event) => update(ticket, { priority: event.target.value })}>
                    {['baixa', 'normal', 'alta', 'urgente'].map((value) => <option key={value}>{value}</option>)}
                  </select>
                </div>
              ) : <span className="status-chip bg-slate-100 text-slate-700">{statusLabels[ticket.status]}</span>}
            </div>
            {ticket.comments.map((item) => (
              <div key={item.id} className="mt-3 break-words rounded-lg bg-slate-50 p-3 text-sm"><strong>{item.authorName || 'Equipe'}:</strong> {item.body}</div>
            ))}
            {canWrite && (
              <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                <input className="input-field" placeholder="Adicionar resposta" value={comment[ticket.id] || ''} onChange={(event) => setComment((value) => ({ ...value, [ticket.id]: event.target.value }))} />
                <button type="button" className="btn-secondary w-full shrink-0 sm:w-auto" disabled={busyTicketId === ticket.id || !comment[ticket.id]?.trim()} onClick={() => addComment(ticket)}>
                  <MessageSquarePlus size={16} />{busyTicketId === ticket.id ? 'Enviando...' : 'Responder'}
                </button>
              </div>
            )}
          </article>
        ))}
        {loading && <p className="py-5 text-center text-sm text-slate-500">Carregando chamados...</p>}
        {!loading && !filteredTickets.length && <p className="py-5 text-center text-sm text-slate-500">Nenhum chamado encontrado neste filtro.</p>}
      </div>
    </section>
  );
}
