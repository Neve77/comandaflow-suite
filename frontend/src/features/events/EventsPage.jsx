import { useEffect, useMemo, useState } from 'react';
import { CalendarPlus, Trash2 } from 'lucide-react';
import api from '../../shared/services/api';
import LoadingSpinner from '../../shared/components/LoadingSpinner';

const emptyForm = {
  name: '',
  description: '',
  location: '',
  capacity: '',
  status: 'planejado',
  startAt: '',
  endAt: ''
};

export default function EventsPage() {
  const [events, setEvents] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  const loadEvents = async () => {
    setLoading(true);
    setMessage('');
    try {
      const response = await api.get('/events');
      setEvents(response.data.events || []);
    } catch (error) {
      setMessage(error.response?.data?.message || 'Erro ao carregar eventos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEvents();
  }, []);

  const totals = useMemo(() => ({
    revenue: events.reduce((sum, item) => sum + Number(item.revenue || 0), 0),
    active: events.filter((item) => item.status === 'ativo').length,
    clients: events.reduce((sum, item) => sum + Number(item.clients || 0), 0)
  }), [events]);

  const saveEvent = async (event) => {
    event.preventDefault();
    setMessage('');
    const payload = { ...form, capacity: Number(form.capacity || 0) };
    try {
      if (editingId) {
        await api.put(`/events/${editingId}`, payload);
        setMessage('Evento atualizado com sucesso');
      } else {
        await api.post('/events', payload);
        setMessage('Evento criado com sucesso');
      }
      setForm(emptyForm);
      setEditingId(null);
      await loadEvents();
    } catch (error) {
      setMessage(error.response?.data?.message || 'Erro ao salvar evento');
    }
  };

  const editEvent = (item) => {
    setEditingId(item.id);
    setForm({
      name: item.name || '',
      description: item.description || '',
      location: item.location || '',
      capacity: String(item.capacity || ''),
      status: item.status || 'planejado',
      startAt: item.startAt ? new Date(item.startAt).toISOString().slice(0, 16) : '',
      endAt: item.endAt ? new Date(item.endAt).toISOString().slice(0, 16) : ''
    });
  };

  const removeEvent = async (id) => {
    if (!window.confirm('Excluir este evento?')) return;
    try {
      await api.delete(`/events/${id}`);
      await loadEvents();
    } catch (error) {
      setMessage(error.response?.data?.message || 'Erro ao excluir evento');
    }
  };

  const money = (value) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value || 0));

  return (
    <div className="space-y-6">
      <section className="panel p-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-medium uppercase text-slate-500">Eventos</p>
            <h1 className="mt-2 text-3xl font-semibold text-slate-950">Controle de eventos</h1>
            <p className="mt-1 text-slate-500">Crie eventos, acompanhe lotacao, clientes e faturamento individual.</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs text-slate-500">Ativos</p>
              <p className="text-xl font-semibold text-slate-950">{totals.active}</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs text-slate-500">Clientes</p>
              <p className="text-xl font-semibold text-slate-950">{totals.clients}</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs text-slate-500">Receita</p>
              <p className="text-xl font-semibold text-slate-950">{money(totals.revenue)}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[0.85fr_1.15fr]">
        <form onSubmit={saveEvent} className="panel p-6">
          <div className="flex items-center gap-2">
            <CalendarPlus size={18} />
            <h2 className="text-xl font-semibold text-slate-950">{editingId ? 'Editar evento' : 'Novo evento'}</h2>
          </div>
          <div className="mt-5 grid gap-3">
            <input className="input-field" placeholder="Nome do evento" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <input className="input-field" placeholder="Local" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
            <textarea className="input-field min-h-24" placeholder="Descricao" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            <div className="grid gap-3 sm:grid-cols-2">
              <input className="input-field" type="number" min="0" placeholder="Lotacao" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })} />
              <select className="input-field" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                <option value="planejado">Planejado</option>
                <option value="ativo">Ativo</option>
                <option value="encerrado">Encerrado</option>
                <option value="cancelado">Cancelado</option>
              </select>
              <input className="input-field" type="datetime-local" value={form.startAt} onChange={(e) => setForm({ ...form, startAt: e.target.value })} />
              <input className="input-field" type="datetime-local" value={form.endAt} onChange={(e) => setForm({ ...form, endAt: e.target.value })} />
            </div>
          </div>
          <div className="mt-5 flex gap-2">
            <button className="rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700" type="submit">
              {editingId ? 'Salvar alteracoes' : 'Criar evento'}
            </button>
            {editingId && (
              <button type="button" className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700" onClick={() => { setEditingId(null); setForm(emptyForm); }}>
                Cancelar
              </button>
            )}
          </div>
          {message && <p className="mt-4 text-sm text-slate-600">{message}</p>}
        </form>

        <div className="panel p-6">
          <h2 className="text-xl font-semibold text-slate-950">Eventos cadastrados</h2>
          {loading ? (
            <div className="mt-6"><LoadingSpinner /></div>
          ) : events.length === 0 ? (
            <p className="mt-6 text-sm text-slate-500">Nenhum evento cadastrado.</p>
          ) : (
            <div className="mt-5 space-y-3">
              {events.map((item) => (
                <div key={item.id} className="rounded-lg border border-slate-200 bg-white p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold text-slate-950">{item.name}</h3>
                        <span className="status-chip bg-slate-100 text-slate-700">{item.status}</span>
                      </div>
                      <p className="mt-1 text-sm text-slate-500">{item.location || 'Sem local'} · {item.capacity || 0} lugares</p>
                      <p className="mt-2 text-sm text-slate-500">Receita {money(item.revenue)} · {item.clients} cliente(s) · {item.openComandas} aberta(s)</p>
                    </div>
                    <div className="flex gap-2">
                      <button type="button" className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700" onClick={() => editEvent(item)}>Editar</button>
                      <button type="button" title="Excluir" className="rounded-md bg-rose-50 px-3 py-2 text-rose-700" onClick={() => removeEvent(item.id)}>
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full bg-brand-600" style={{ width: `${Math.min(item.occupancyRate || 0, 100)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
