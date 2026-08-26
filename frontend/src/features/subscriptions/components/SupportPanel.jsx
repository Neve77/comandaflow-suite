import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  ChevronRight,
  Clock3,
  Headphones,
  Inbox,
  MessageCircle,
  Plus,
  Search,
  Send,
  X,
} from 'lucide-react';
import api from '../../../shared/services/api';

const statusLabels = { aberto: 'Aberto', em_atendimento: 'Em atendimento', resolvido: 'Resolvido', fechado: 'Fechado' };
const statusStyles = {
  aberto: 'bg-blue-100 text-blue-700',
  em_atendimento: 'bg-amber-100 text-amber-700',
  resolvido: 'bg-emerald-100 text-emerald-700',
  fechado: 'bg-slate-100 text-slate-600',
};
const priorityLabels = { baixa: 'Baixa', normal: 'Normal', alta: 'Alta', urgente: 'Urgente' };
const priorityStyles = { baixa: 'text-slate-500', normal: 'text-blue-700', alta: 'text-amber-700', urgente: 'text-rose-700' };
const requestMessage = (error) => error.response?.data?.message || 'Não foi possível concluir a operação.';
const formatDateTime = (value) => value
  ? new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value))
  : 'Agora';

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
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedTicketId, setSelectedTicketId] = useState('');

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
      const response = await api.post('/manager/tickets', form);
      setForm({ subscriberId: '', subject: '', description: '', priority: 'normal' });
      setCreateOpen(false);
      setSelectedTicketId(response.data.ticket?.id || '');
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
      || ticket.subscriber?.businessName?.toLowerCase().includes(term));
  }), [filter, search, tickets]);

  useEffect(() => {
    if (!filteredTickets.length) {
      setSelectedTicketId('');
      return;
    }
    if (!filteredTickets.some((ticket) => ticket.id === selectedTicketId)) {
      setSelectedTicketId(filteredTickets[0].id);
    }
  }, [filteredTickets, selectedTicketId]);

  const selectedTicket = filteredTickets.find((ticket) => ticket.id === selectedTicketId);
  const totals = useMemo(() => ({
    open: tickets.filter((ticket) => ticket.status === 'aberto').length,
    inProgress: tickets.filter((ticket) => ticket.status === 'em_atendimento').length,
    completed: tickets.filter((ticket) => ['resolvido', 'fechado'].includes(ticket.status)).length,
  }), [tickets]);

  return (
    <section className="space-y-4">
      <div className="panel overflow-hidden">
        <header className="flex flex-col gap-4 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="shrink-0 rounded-xl bg-amber-50 p-3 text-amber-700"><Headphones size={21} /></div>
            <div><h2 className="font-extrabold text-slate-900">Central de suporte</h2><p className="text-xs text-slate-500">Fila, conversa e resolução no mesmo lugar.</p></div>
          </div>
          {canWrite && <button type="button" className={createOpen ? 'btn-secondary' : 'btn-primary bg-amber-600 hover:bg-amber-700'} onClick={() => setCreateOpen((value) => !value)}>{createOpen ? <X size={16} /> : <Plus size={16} />}{createOpen ? 'Cancelar' : 'Novo chamado'}</button>}
        </header>
        <div className="grid gap-px bg-slate-100 sm:grid-cols-3">
          <article className="flex items-center gap-3 bg-white p-4"><div className="rounded-lg bg-blue-50 p-2 text-blue-700"><Inbox size={17} /></div><div><p className="text-xl font-extrabold text-slate-900">{totals.open}</p><p className="text-xs text-slate-500">Aguardando triagem</p></div></article>
          <article className="flex items-center gap-3 bg-white p-4"><div className="rounded-lg bg-amber-50 p-2 text-amber-700"><Clock3 size={17} /></div><div><p className="text-xl font-extrabold text-slate-900">{totals.inProgress}</p><p className="text-xs text-slate-500">Em atendimento</p></div></article>
          <article className="flex items-center gap-3 bg-white p-4"><div className="rounded-lg bg-emerald-50 p-2 text-emerald-700"><CheckCircle2 size={17} /></div><div><p className="text-xl font-extrabold text-slate-900">{totals.completed}</p><p className="text-xs text-slate-500">Concluídos</p></div></article>
        </div>
      </div>

      {error && <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div>}
      {notice && <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{notice}</div>}

      {canWrite && createOpen && (
        <form className="panel grid gap-3 p-5 md:grid-cols-2" onSubmit={create}>
          <div className="md:col-span-2"><h3 className="font-extrabold text-slate-900">Abrir novo chamado</h3><p className="text-xs text-slate-500">Vincule o atendimento ao restaurante para manter o histórico completo.</p></div>
          <select className="input-field" value={form.subscriberId} onChange={(event) => setForm((value) => ({ ...value, subscriberId: event.target.value }))} required><option value="">Selecione o assinante...</option>{subscribers.map((subscriber) => <option key={subscriber.id} value={subscriber.id}>{subscriber.businessName}</option>)}</select>
          <select className="input-field" value={form.priority} onChange={(event) => setForm((value) => ({ ...value, priority: event.target.value }))}>{Object.entries(priorityLabels).map(([value, label]) => <option key={value} value={value}>Prioridade {label.toLowerCase()}</option>)}</select>
          <input className="input-field md:col-span-2" placeholder="Assunto do chamado" value={form.subject} onChange={(event) => setForm((value) => ({ ...value, subject: event.target.value }))} required />
          <textarea className="input-field min-h-24 md:col-span-2" placeholder="Descreva o problema ou a solicitação" value={form.description} onChange={(event) => setForm((value) => ({ ...value, description: event.target.value }))} required />
          <div className="flex justify-end gap-2 md:col-span-2"><button type="button" className="btn-secondary" onClick={() => setCreateOpen(false)}>Cancelar</button><button className="btn-primary bg-amber-600 hover:bg-amber-700" disabled={submitting}><Plus size={16} />{submitting ? 'Abrindo...' : 'Abrir chamado'}</button></div>
        </form>
      )}

      <div className="panel grid min-h-[32rem] overflow-hidden lg:grid-cols-[minmax(280px,0.8fr)_minmax(0,1.5fr)]">
        <aside className="border-b border-slate-200 lg:border-b-0 lg:border-r">
          <div className="space-y-3 border-b border-slate-100 p-4">
            <label className="relative block"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input className="input-field pl-9" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar chamado" /></label>
            <div className="grid grid-cols-3 gap-1 rounded-xl bg-slate-100 p-1">{[['andamento', 'Fila'], ['concluidos', 'Concluídos'], ['todos', 'Todos']].map(([value, label]) => <button key={value} type="button" className={`rounded-lg px-2 py-2 text-xs font-bold transition-colors ${filter === value ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`} onClick={() => setFilter(value)}>{label}</button>)}</div>
          </div>
          <div className="max-h-[34rem] overflow-y-auto p-2">
            {filteredTickets.map((ticket) => <button key={ticket.id} type="button" className={`mb-1 flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-colors ${selectedTicketId === ticket.id ? 'border-blue-300 bg-blue-50' : 'border-transparent hover:border-slate-200 hover:bg-slate-50'}`} onClick={() => setSelectedTicketId(ticket.id)}><span className={`h-9 w-1 shrink-0 rounded-full ${ticket.priority === 'urgente' ? 'bg-rose-500' : ticket.priority === 'alta' ? 'bg-amber-500' : 'bg-blue-500'}`} /><span className="min-w-0 flex-1"><strong className="block truncate text-sm text-slate-900">{ticket.subject}</strong><small className="block truncate text-slate-500">{ticket.subscriber?.businessName || 'Assinante'} · {statusLabels[ticket.status]}</small></span><ChevronRight className="shrink-0 text-slate-400" size={16} /></button>)}
            {loading && <p className="py-10 text-center text-sm text-slate-500">Carregando chamados...</p>}
            {!loading && !filteredTickets.length && <p className="py-10 text-center text-sm text-slate-500">Nenhum chamado neste filtro.</p>}
          </div>
        </aside>

        <div className="min-w-0">
          {selectedTicket ? (
            <div className="flex h-full min-h-[32rem] flex-col">
              <header className="border-b border-slate-100 p-5">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className={`status-chip ${statusStyles[selectedTicket.status]}`}>{statusLabels[selectedTicket.status]}</span><span className={`text-xs font-extrabold ${priorityStyles[selectedTicket.priority]}`}>Prioridade {priorityLabels[selectedTicket.priority]}</span></div><h3 className="mt-2 break-words text-lg font-extrabold text-slate-900">{selectedTicket.subject}</h3><p className="mt-1 text-xs font-semibold text-slate-500">{selectedTicket.subscriber?.businessName || 'Assinante'} · aberto em {formatDateTime(selectedTicket.createdAt)}</p></div>
                  {canWrite && <div className="flex flex-col gap-2 sm:flex-row"><select aria-label="Status do chamado" className="input-field py-2 text-xs sm:w-44" value={selectedTicket.status} disabled={busyTicketId === selectedTicket.id} onChange={(event) => update(selectedTicket, { status: event.target.value })}>{Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><select aria-label="Prioridade do chamado" className="input-field py-2 text-xs sm:w-36" value={selectedTicket.priority} disabled={busyTicketId === selectedTicket.id} onChange={(event) => update(selectedTicket, { priority: event.target.value })}>{Object.entries(priorityLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>}
                </div>
              </header>
              <div className="flex-1 space-y-4 overflow-y-auto bg-slate-50/70 p-4 sm:p-5">
                <article className="max-w-3xl rounded-2xl rounded-tl-md border border-slate-200 bg-white p-4 shadow-sm"><p className="whitespace-pre-wrap break-words text-sm leading-6 text-slate-700">{selectedTicket.description}</p><p className="mt-2 text-[11px] font-semibold text-slate-400">Solicitação inicial</p></article>
                {(selectedTicket.comments || []).map((item) => <article key={item.id} className="ml-auto max-w-3xl rounded-2xl rounded-tr-md border border-blue-200 bg-blue-50 p-4"><div className="flex items-center gap-2 text-xs font-extrabold text-blue-800"><MessageCircle size={14} />{item.authorName || 'Equipe'}</div><p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-slate-700">{item.body}</p><p className="mt-2 text-[11px] font-semibold text-slate-400">{formatDateTime(item.createdAt)}</p></article>)}
                {!(selectedTicket.comments || []).length && <p className="py-6 text-center text-xs font-semibold text-slate-400">Ainda não há respostas neste chamado.</p>}
              </div>
              {canWrite && <div className="border-t border-slate-100 p-4"><textarea className="input-field min-h-20 resize-y" placeholder="Escreva uma resposta para o assinante..." value={comment[selectedTicket.id] || ''} onChange={(event) => setComment((value) => ({ ...value, [selectedTicket.id]: event.target.value }))} /><div className="mt-2 flex justify-end"><button type="button" className="btn-primary w-full bg-blue-600 hover:bg-blue-700 sm:w-auto" disabled={busyTicketId === selectedTicket.id || !comment[selectedTicket.id]?.trim()} onClick={() => addComment(selectedTicket)}><Send size={16} />{busyTicketId === selectedTicket.id ? 'Enviando...' : 'Enviar resposta'}</button></div></div>}
            </div>
          ) : <div className="flex min-h-[32rem] flex-col items-center justify-center p-8 text-center"><div className="rounded-2xl bg-slate-100 p-4 text-slate-400"><Inbox size={28} /></div><p className="mt-3 font-extrabold text-slate-900">Selecione um chamado</p><p className="mt-1 max-w-xs text-sm text-slate-500">Escolha um item da fila para ver a conversa e atualizar o atendimento.</p></div>}
        </div>
      </div>
    </section>
  );
}
