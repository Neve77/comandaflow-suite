import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Clock3,
  Headphones,
  MessageSquarePlus,
  Plus,
  RefreshCw,
  Search,
  Send,
  Wifi,
  WifiOff,
} from 'lucide-react';
import api from '../../shared/services/api';

const statusLabels = {
  aberto: 'Aberto',
  em_atendimento: 'Em atendimento',
  resolvido: 'Resolvido',
  fechado: 'Fechado',
};

const statusTones = {
  aberto: 'bg-blue-50 text-blue-700',
  em_atendimento: 'bg-amber-50 text-amber-700',
  resolvido: 'bg-emerald-50 text-emerald-700',
  fechado: 'bg-slate-100 text-slate-700',
};

const priorityTones = {
  baixa: 'text-slate-500',
  normal: 'text-blue-700',
  alta: 'text-amber-700',
  urgente: 'text-rose-700',
};

const dateTime = (value) => new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'short',
  timeStyle: 'short',
}).format(new Date(value));

const requestMessage = (error) => error.response?.data?.message || 'Não foi possível conectar ao suporte do Gestor.';

export default function RestaurantSupportPage() {
  const [tickets, setTickets] = useState([]);
  const [license, setLicense] = useState(null);
  const [form, setForm] = useState({ subject: '', description: '', priority: 'normal' });
  const [replies, setReplies] = useState({});
  const [filter, setFilter] = useState('andamento');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [busyTicketId, setBusyTicketId] = useState('');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [lastUpdatedAt, setLastUpdatedAt] = useState(null);

  const load = useCallback(async (forceSync = false) => {
    setRefreshing(true);
    try {
      if (forceSync) await api.post('/license/refresh').catch(() => null);
      const [licenseResponse, ticketsResponse] = await Promise.all([
        api.get('/license/status'),
        api.get('/license/support/tickets'),
      ]);
      setLicense(licenseResponse.data);
      setTickets(ticketsResponse.data.tickets || []);
      setLastUpdatedAt(new Date().toISOString());
      setError('');
    } catch (requestError) {
      setError(requestMessage(requestError));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load(true);
    const refreshWhenVisible = () => {
      if (document.visibilityState === 'visible') load(false);
    };
    const interval = setInterval(refreshWhenVisible, 30000);
    document.addEventListener('visibilitychange', refreshWhenVisible);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', refreshWhenVisible);
    };
  }, [load]);

  const createTicket = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      await api.post('/license/support/tickets', form);
      setForm({ subject: '', description: '', priority: 'normal' });
      setNotice('Chamado enviado ao Gestor. Você pode acompanhar a resposta nesta tela.');
      setFilter('andamento');
      await load(false);
    } catch (requestError) {
      setError(requestMessage(requestError));
    } finally {
      setSubmitting(false);
    }
  };

  const reply = async (ticket) => {
    const body = replies[ticket.id]?.trim();
    if (!body) return;
    setBusyTicketId(ticket.id);
    setError('');
    try {
      await api.post(`/license/support/tickets/${ticket.id}/comments`, { body });
      setReplies((current) => ({ ...current, [ticket.id]: '' }));
      setNotice(ticket.status === 'resolvido' ? 'Resposta enviada e chamado reaberto.' : 'Resposta enviada ao Gestor.');
      await load(false);
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
    const matchesSearch = !term
      || ticket.subject.toLowerCase().includes(term)
      || ticket.description.toLowerCase().includes(term);
    return matchesStatus && matchesSearch;
  }), [filter, search, tickets]);

  const totals = useMemo(() => ({
    open: tickets.filter((ticket) => ticket.status === 'aberto').length,
    inProgress: tickets.filter((ticket) => ticket.status === 'em_atendimento').length,
    completed: tickets.filter((ticket) => ['resolvido', 'fechado'].includes(ticket.status)).length,
  }), [tickets]);

  const connected = !error && Boolean(license?.onlineManaged);

  return (
    <div className="space-y-5 animate-fade-slide-up">
      <section className="panel p-5 sm:p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <div className="shrink-0 rounded-xl bg-violet-50 p-3 text-violet-700"><Headphones size={25} /></div>
            <div className="min-w-0">
              <h1 className="section-title">Suporte ComandaFlow</h1>
              <p className="section-subtitle">Abra chamados e acompanhe as respostas enviadas pelo Gestor.</p>
            </div>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <span className={`inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-bold ${connected ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
              {connected ? <Wifi size={15} /> : <WifiOff size={15} />}
              {connected ? 'Conectado ao Gestor' : 'Gestor indisponível'}
            </span>
            <button type="button" className="btn-secondary w-full sm:w-auto" onClick={() => load(true)} disabled={refreshing}>
              <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />{refreshing ? 'Atualizando...' : 'Atualizar'}
            </button>
          </div>
        </div>
        {lastUpdatedAt && <p className="mt-3 text-xs text-slate-400">Última atualização em {dateTime(lastUpdatedAt)} · consulta automática a cada 30 segundos</p>}
      </section>

      {error && (
        <div className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
          <AlertCircle size={19} className="mt-0.5 shrink-0" />
          <div><strong>Não foi possível acessar o suporte.</strong><p className="mt-1">{error} Confirme se o computador do Gestor e o túnel estão ligados.</p></div>
        </div>
      )}
      {notice && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800">
          <CheckCircle2 size={18} />{notice}
        </div>
      )}

      <section className="grid gap-3 sm:grid-cols-3">
        <article className="panel flex items-center gap-3 p-4"><div className="rounded-xl bg-blue-50 p-2.5 text-blue-700"><Plus size={19} /></div><div><p className="text-xl font-extrabold text-slate-900">{totals.open}</p><p className="text-xs font-semibold text-slate-500">Abertos</p></div></article>
        <article className="panel flex items-center gap-3 p-4"><div className="rounded-xl bg-amber-50 p-2.5 text-amber-700"><Clock3 size={19} /></div><div><p className="text-xl font-extrabold text-slate-900">{totals.inProgress}</p><p className="text-xs font-semibold text-slate-500">Em atendimento</p></div></article>
        <article className="panel flex items-center gap-3 p-4"><div className="rounded-xl bg-emerald-50 p-2.5 text-emerald-700"><CheckCircle2 size={19} /></div><div><p className="text-xl font-extrabold text-slate-900">{totals.completed}</p><p className="text-xs font-semibold text-slate-500">Concluídos</p></div></article>
      </section>

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(300px,380px)_minmax(0,1fr)]">
        <section className="panel p-5">
          <div className="flex items-center gap-3"><MessageSquarePlus size={20} className="text-violet-700" /><div><h2 className="font-extrabold text-slate-900">Novo chamado</h2><p className="text-xs text-slate-500">Descreva o problema com o máximo de detalhes.</p></div></div>
          <form className="mt-5 space-y-4" onSubmit={createTicket}>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">Assunto<input className="input-field mt-1.5" maxLength={160} value={form.subject} onChange={(event) => setForm((current) => ({ ...current, subject: event.target.value }))} placeholder="Ex.: Não consigo fechar a comanda" required /></label>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">Prioridade<select className="input-field mt-1.5" value={form.priority} onChange={(event) => setForm((current) => ({ ...current, priority: event.target.value }))}><option value="baixa">Baixa</option><option value="normal">Normal</option><option value="alta">Alta</option><option value="urgente">Urgente — operação parada</option></select></label>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">Descrição<textarea className="input-field mt-1.5 min-h-36 resize-y" maxLength={4000} value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} placeholder="Informe o que aconteceu, em qual tela e o que já tentou fazer." required /></label>
            <button className="btn-primary w-full bg-violet-600 hover:bg-violet-700" disabled={submitting || !connected}><Send size={17} />{submitting ? 'Enviando...' : 'Enviar chamado'}</button>
          </form>
        </section>

        <section className="min-w-0 space-y-3">
          <div className="panel flex flex-col gap-3 p-4 sm:flex-row">
            <label className="relative flex-1"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input className="input-field pl-9" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar chamado" /></label>
            <select className="input-field sm:w-48" value={filter} onChange={(event) => setFilter(event.target.value)}><option value="andamento">Em andamento</option><option value="concluidos">Concluídos</option><option value="todos">Todos</option></select>
          </div>

          {filteredTickets.map((ticket) => (
            <article key={ticket.id} className="panel overflow-hidden">
              <header className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-start sm:justify-between sm:p-5">
                <div className="min-w-0"><h3 className="break-words font-extrabold text-slate-900">{ticket.subject}</h3><p className="mt-1 text-xs text-slate-500">Aberto em {dateTime(ticket.createdAt)} · atualizado em {dateTime(ticket.updatedAt)}</p></div>
                <div className="flex flex-wrap items-center gap-2"><span className={`status-chip ${statusTones[ticket.status] || statusTones.fechado}`}>{statusLabels[ticket.status] || ticket.status}</span><span className={`text-xs font-extrabold uppercase ${priorityTones[ticket.priority] || priorityTones.normal}`}>{ticket.priority}</span></div>
              </header>
              <div className="space-y-4 p-4 sm:p-5">
                <div className="rounded-xl bg-slate-50 p-4"><p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Problema informado</p><p className="mt-2 whitespace-pre-wrap break-words text-sm text-slate-700">{ticket.description}</p></div>
                <div className="space-y-2">
                  {(ticket.comments || []).map((comment) => {
                    const fromRestaurant = comment.authorName?.startsWith('Restaurante ·');
                    return <div key={comment.id} className={`flex ${fromRestaurant ? 'justify-end' : 'justify-start'}`}><div className={`max-w-[92%] rounded-2xl p-3 text-sm sm:max-w-[78%] ${fromRestaurant ? 'rounded-br-md bg-violet-600 text-white' : 'rounded-bl-md bg-slate-100 text-slate-700'}`}><p className="text-xs font-extrabold opacity-80">{fromRestaurant ? 'Restaurante' : comment.authorName || 'Equipe do Gestor'}</p><p className="mt-1 whitespace-pre-wrap break-words">{comment.body}</p><p className="mt-1 text-[10px] opacity-65">{dateTime(comment.createdAt)}</p></div></div>;
                  })}
                  {!(ticket.comments || []).length && <p className="py-2 text-center text-xs text-slate-400">Aguardando a primeira resposta da equipe.</p>}
                </div>
                {ticket.status !== 'fechado' ? (
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <textarea className="input-field min-h-20 flex-1 resize-y" maxLength={2000} value={replies[ticket.id] || ''} onChange={(event) => setReplies((current) => ({ ...current, [ticket.id]: event.target.value }))} placeholder={ticket.status === 'resolvido' ? 'Responder reabrirá o chamado' : 'Escreva uma resposta para o suporte'} />
                    <button type="button" className="btn-secondary w-full self-end sm:w-auto" disabled={busyTicketId === ticket.id || !replies[ticket.id]?.trim() || !connected} onClick={() => reply(ticket)}><Send size={16} />{busyTicketId === ticket.id ? 'Enviando...' : 'Responder'}</button>
                  </div>
                ) : <p className="rounded-xl bg-slate-50 p-3 text-center text-xs font-semibold text-slate-500">Chamado fechado. Abra um novo chamado se precisar de mais ajuda.</p>}
              </div>
            </article>
          ))}

          {loading && <div className="panel p-10 text-center text-sm text-slate-500">Carregando chamados...</div>}
          {!loading && !filteredTickets.length && <div className="panel p-10 text-center"><Headphones size={28} className="mx-auto text-slate-300" /><p className="mt-3 text-sm font-semibold text-slate-500">Nenhum chamado encontrado neste filtro.</p></div>}
        </section>
      </div>
    </div>
  );
}
