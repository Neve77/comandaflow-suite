import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Gift,
  ShieldAlert,
  UserPlus,
  Search,
  User,
  Phone,
  CreditCard,
  UtensilsCrossed,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import api from '../../shared/services/api';
import LoadingSpinner from '../../shared/components/LoadingSpinner';
import { formatCpf, formatPhone, stripNonDigits } from '../../shared/utils/formatters';

const emptyForm = {
  name: '',
  cpf: '',
  phone: '',
  email: '',
  birthDate: '',
  notes: '',
  blocked: false
};

export default function ClientsPage() {
  const navigate = useNavigate();
  const [clients, setClients] = useState([]);
  const [birthdays, setBirthdays] = useState([]);
  const [loyalty, setLoyalty] = useState(null);
  const [selectedClient, setSelectedClient] = useState(null);
  const [history, setHistory] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('success');
  const [search, setSearch] = useState('');

  const money = (value) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value || 0));

  const showToast = (text, type = 'success') => {
    setMessage(text);
    setMessageType(type);
    setTimeout(() => setMessage(''), 4000);
  };

  const loadAll = async () => {
    setLoading(true);
    try {
      const [clientsResponse, loyaltyResponse, birthdaysResponse] = await Promise.all([
        api.get('/clients'),
        api.get('/loyalty/summary'),
        api.get('/clients/birthdays/month')
      ]);
      setClients(clientsResponse.data.clients || []);
      setLoyalty(loyaltyResponse.data);
      setBirthdays(birthdaysResponse.data.clients || []);
    } catch (error) {
      showToast(error.response?.data?.message || 'Erro ao carregar clientes', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const filteredClients = useMemo(() => {
    if (!search.trim()) return clients;
    const term = search.toLowerCase();
    const digits = search.replace(/\D/g, '');
    return clients.filter((client) =>
      (client.clienteNome || '').toLowerCase().includes(term)
      || (client.clienteCpf || '').includes(digits)
      || (client.clienteTelefone || '').includes(digits)
      || (client.clienteEmail || '').toLowerCase().includes(term)
    );
  }, [clients, search]);

  const selectClient = async (client) => {
    setSelectedClient(client);
    setHistoryLoading(true);
    try {
      const response = await api.get(`/clients/${client.clienteCpf}/history`);
      setHistory(response.data.history);
    } catch {
      setHistory(null);
    } finally {
      setHistoryLoading(false);
    }
  };

  const editClient = (client) => {
    setForm({
      name: client.clienteNome || '',
      cpf: formatCpf(client.clienteCpf || ''),
      phone: formatPhone(client.clienteTelefone || ''),
      email: client.clienteEmail || '',
      birthDate: client.clienteNascimento ? new Date(client.clienteNascimento).toISOString().slice(0, 10) : '',
      notes: client.notes || '',
      blocked: Boolean(client.blocked)
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const saveClient = async (event) => {
    event.preventDefault();
    if (!form.name.trim()) {
      showToast('Nome é obrigatório', 'error');
      return;
    }
    const cleanCpf = stripNonDigits(form.cpf);
    const cleanPhone = stripNonDigits(form.phone);

    if (cleanCpf && cleanCpf.length !== 11) {
      showToast('CPF deve conter 11 dígitos numéricos', 'error');
      return;
    }
    if (cleanPhone && cleanPhone.length < 10) {
      showToast('Telefone deve conter pelo menos 10 dígitos', 'error');
      return;
    }

    setSaving(true);
    try {
      await api.post('/clients', {
        name: form.name.trim(),
        cpf: cleanCpf || undefined,
        phone: cleanPhone || undefined,
        email: form.email.trim() || undefined,
        birthDate: form.birthDate || undefined,
        notes: form.notes || undefined,
        blocked: form.blocked
      });
      setForm(emptyForm);
      showToast('Cliente cadastrado com sucesso!');
      await loadAll();
    } catch (error) {
      showToast(error.response?.data?.message || 'Erro ao salvar cliente', 'error');
    } finally {
      setSaving(false);
    }
  };

  const toggleBlocked = async (client) => {
    try {
      await api.patch(`/clients/${client.clienteCpf}/blocked`, { cpf: client.clienteCpf, blocked: !client.blocked });
      await loadAll();
      if (selectedClient?.clienteCpf === client.clienteCpf) {
        setSelectedClient({ ...client, blocked: !client.blocked });
      }
      showToast(client.blocked ? 'Cliente desbloqueado' : 'Cliente bloqueado');
    } catch (error) {
      showToast(error.response?.data?.message || 'Erro ao atualizar bloqueio', 'error');
    }
  };

  const handleOpenMesaForClient = (client) => {
    navigate('/mesas', {
      state: {
        prefillClient: {
          nome: client.clienteNome,
          cpf: client.clienteCpf,
          telefone: client.clienteTelefone
        }
      }
    });
  };

  return (
    <div className="space-y-6">
      {message && (
        <div className={`toast ${messageType === 'error' ? 'toast-error' : 'toast-success'}`}>
          {messageType === 'error' ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
          <span>{message}</span>
        </div>
      )}
      <section className="panel p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="section-title">Cadastro & Gestão de Clientes</h1>
            <p className="section-subtitle">
              Cadastre clientes com Nome, Telefone e CPF para agilizar a abertura e o atendimento nas mesas.
            </p>
          </div>
          <div className="relative w-full max-w-md flex items-center">
            <div className="pointer-events-none absolute left-3.5 flex items-center text-slate-400">
              <Search size={16} />
            </div>
            <input
              className="input-field !pl-10 !pr-4"
              placeholder="Buscar por Nome, Telefone ou CPF..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
        </div>
      </section>
      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-label">Total de Clientes</span>
            <div className="metric-icon green">
              <User size={18} />
            </div>
          </div>
          <div className="metric-value">{loyalty?.totalClients || clients.length}</div>
          <div className="metric-sub">Cadastrados no sistema</div>
        </div>

        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-label">Pontos Emitidos</span>
            <div className="metric-icon blue">
              <Gift size={18} />
            </div>
          </div>
          <div className="metric-value">{loyalty?.totalPoints || 0}</div>
          <div className="metric-sub">Programa de fidelidade</div>
        </div>

        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-label">Cashback Total</span>
            <div className="metric-icon purple">
              <CreditCard size={18} />
            </div>
          </div>
          <div className="metric-value">{money(loyalty?.totalCashback)}</div>
          <div className="metric-sub">Saldo acumulado</div>
        </div>

        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-label">Clientes VIP</span>
            <div className="metric-icon orange">
              <UtensilsCrossed size={18} />
            </div>
          </div>
          <div className="metric-value">{loyalty?.vipClients || 0}</div>
          <div className="metric-sub">Frequentadores assíduos</div>
        </div>
      </section>
      <section className="grid gap-6 xl:grid-cols-12">
        <div className="xl:col-span-5 space-y-6">
          <form onSubmit={saveClient} className="panel p-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <UserPlus size={18} className="text-emerald-600" />
                <h2 className="text-base font-bold text-slate-950">
                  {form.name ? 'Editar Cliente' : 'Cadastrar Novo Cliente'}
                </h2>
              </div>
              {form.name && (
                <button
                  type="button"
                  onClick={() => setForm(emptyForm)}
                  className="text-xs text-slate-500 hover:text-slate-900 font-medium"
                >
                  Limpar
                </button>
              )}
            </div>

            <div className="mt-4 space-y-3.5">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                  Nome Completo *
                </label>
                <input
                  className="input-field mt-1"
                  placeholder="Ex: Carlos Eduardo"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                    Telefone / WhatsApp *
                  </label>
                  <input
                    className="input-field mt-1"
                    placeholder="(00) 00000-0000"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: formatPhone(e.target.value) })}
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                    CPF (11 dígitos) *
                  </label>
                  <input
                    className="input-field mt-1"
                    placeholder="000.000.000-00"
                    value={form.cpf}
                    onChange={(e) => setForm({ ...form, cpf: formatCpf(e.target.value) })}
                    required
                  />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                    E-mail (Opcional)
                  </label>
                  <input
                    type="email"
                    className="input-field mt-1"
                    placeholder="cliente@email.com"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                    Data de Nascimento
                  </label>
                  <input
                    className="input-field mt-1"
                    type="date"
                    value={form.birthDate}
                    onChange={(e) => setForm({ ...form, birthDate: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                  Observações / Preferências
                </label>
                <textarea
                  className="input-field mt-1 min-h-[60px]"
                  placeholder="Ex: Prefere mesa na janela, alérgico a camarão"
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                />
              </div>

              <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={form.blocked}
                  onChange={(e) => setForm({ ...form, blocked: e.target.checked })}
                  className="rounded text-emerald-600"
                />
                Cliente Bloqueado para Novas Comandas
              </label>
            </div>

            <button
              className="mt-5 w-full btn-primary bg-emerald-600 hover:bg-emerald-700 font-bold"
              type="submit"
              disabled={saving}
            >
              <UserPlus size={16} />
              <span>{saving ? 'Salvando...' : 'Salvar Cliente'}</span>
            </button>
          </form>
          <div className="panel p-6">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <Gift size={18} className="text-pink-500" />
              <h2 className="text-base font-bold text-slate-950">Aniversariantes do Mês</h2>
            </div>
            <div className="mt-3 space-y-2 max-h-48 overflow-y-auto">
              {birthdays.length === 0 ? (
                <p className="text-xs text-slate-400 py-3 text-center">Nenhum aniversariante neste mês.</p>
              ) : (
                birthdays.map((client) => (
                  <div key={client.id} className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 p-2.5">
                    <div>
                      <p className="font-bold text-xs text-slate-950">{client.name}</p>
                      <p className="text-[11px] text-slate-500">{formatPhone(client.phone)}</p>
                    </div>
                    <span className="text-xs font-bold text-pink-600 bg-pink-50 px-2 py-0.5 rounded">
                      🎂 {new Date(client.birthDate).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
        <div className="xl:col-span-7 space-y-6">
          <div className="panel p-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-base font-bold text-slate-950">
                Clientes Cadastrados ({filteredClients.length})
              </h2>
            </div>

            {loading ? (
              <div className="py-12"><LoadingSpinner /></div>
            ) : (
              <div className="mt-4 space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
                {filteredClients.length === 0 ? (
                  <div className="empty-state py-8">
                    Nenhum cliente encontrado.
                  </div>
                ) : (
                  filteredClients.map((client) => {
                    const isSelected = selectedClient?.clienteCpf === client.clienteCpf;
                    return (
                      <div
                        key={client.id || client.clienteCpf}
                        onClick={() => selectClient(client)}
                        className={`cursor-pointer rounded-xl border p-4 transition-all duration-150 ${
                          isSelected
                            ? 'border-emerald-600 bg-emerald-50/40 shadow-sm'
                            : 'border-slate-200 bg-white hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-bold text-slate-950 text-sm">{client.clienteNome}</p>
                            <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                              <span className="flex items-center gap-1 font-medium text-slate-700">
                                <Phone size={12} className="text-slate-400" />
                                {formatPhone(client.clienteTelefone)}
                              </span>
                              <span className="flex items-center gap-1">
                                <CreditCard size={12} className="text-slate-400" />
                                CPF: {formatCpf(client.clienteCpf)}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="status-chip bg-slate-100 text-slate-700 text-[10px]">
                              {client.tier || 'Bronze'}
                            </span>
                            {client.blocked && (
                              <span className="status-chip bg-red-100 text-red-700 text-[10px]">
                                Bloqueado
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2.5 text-xs text-slate-500">
                          <span>{client.visits || 0} visita(s) • Total: {money(client.totalSpent)}</span>
                          <span className="font-semibold text-emerald-700">{client.loyaltyPoints || 0} pts</span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
          {selectedClient && (
            <div className="panel p-6 space-y-4">
              <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
                <div>
                  <h2 className="text-lg font-bold text-slate-950">{selectedClient.clienteNome}</h2>
                  <p className="text-xs text-slate-500">
                    Telefone: {formatPhone(selectedClient.clienteTelefone)} • CPF: {formatCpf(selectedClient.clienteCpf)}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleOpenMesaForClient(selectedClient)}
                    className="btn-primary btn-sm bg-emerald-600 hover:bg-emerald-700 font-bold"
                  >
                    <UtensilsCrossed size={14} />
                    <span>Abrir Mesa</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => editClient(selectedClient)}
                    className="btn-secondary btn-sm"
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleBlocked(selectedClient)}
                    className="btn-secondary btn-sm text-red-600 hover:bg-red-50"
                  >
                    <ShieldAlert size={14} />
                    <span>{selectedClient.blocked ? 'Desbloquear' : 'Bloquear'}</span>
                  </button>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3 text-xs">
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <p className="text-slate-500 font-medium">Cashback Acumulado</p>
                  <p className="text-base font-black text-slate-950 mt-0.5">{money(selectedClient.cashbackBalance)}</p>
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <p className="text-slate-500 font-medium">Ticket Médio</p>
                  <p className="text-base font-black text-slate-950 mt-0.5">{money(selectedClient.averageTicket)}</p>
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <p className="text-slate-500 font-medium">Total de Visitas</p>
                  <p className="text-base font-black text-slate-950 mt-0.5">{selectedClient.visits || 0}</p>
                </div>
              </div>
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                  Histórico de Comandas & Mesas
                </h3>
                {historyLoading ? (
                  <LoadingSpinner />
                ) : history?.comandas?.length ? (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {history.comandas.map((cmd) => (
                      <div key={cmd.id} className="rounded-lg border border-slate-200 bg-white p-3 text-xs">
                        <div className="flex justify-between font-bold text-slate-950">
                          <span>Comanda #{cmd.id.slice(0, 6)} ({cmd.status})</span>
                          <span className="text-emerald-700">{money(cmd.total)}</span>
                        </div>
                        <div className="mt-1 text-[11px] text-slate-500">
                          {new Date(cmd.openedAt).toLocaleDateString('pt-BR')} às {new Date(cmd.openedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 py-2">Nenhum histórico registrado ainda.</p>
                )}
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
