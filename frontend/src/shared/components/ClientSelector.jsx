import { useState, useEffect, useRef } from 'react';
import { Search, UserPlus, X, User, Phone, CreditCard } from 'lucide-react';
import api from '../services/api';
import { formatCpf, formatPhone, stripNonDigits } from '../utils/formatters';

export default function ClientSelector({
  clientData,
  onChange,
  disabled = false
}) {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [showQuickAddModal, setShowQuickAddModal] = useState(false);
  const [quickName, setQuickName] = useState('');
  const [quickPhone, setQuickPhone] = useState('');
  const [quickCpf, setQuickCpf] = useState('');
  const [quickLoading, setQuickLoading] = useState(false);
  const [quickError, setQuickError] = useState('');

  const dropdownRef = useRef(null);

  const fetchClients = async () => {
    try {
      setLoading(true);
      const res = await api.get('/clients');
      setClients(res.data.clients || []);
    } catch {
      setClients([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, []);
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredClients = clients.filter((c) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase().replace(/\D/g, '');
    const textQuery = searchQuery.toLowerCase();
    const matchName = (c.clienteNome || '').toLowerCase().includes(textQuery);
    const matchCpf = (c.clienteCpf || '').includes(query);
    const matchPhone = (c.clienteTelefone || '').includes(query);
    return matchName || matchCpf || matchPhone;
  });

  const handleSelectClient = (client) => {
    onChange({
      nome: client.clienteNome || '',
      cpf: formatCpf(client.clienteCpf || ''),
      telefone: formatPhone(client.clienteTelefone || '')
    });
    setDropdownOpen(false);
    setSearchQuery('');
  };

  const handleClear = () => {
    onChange({ nome: '', cpf: '', telefone: '' });
    setSearchQuery('');
  };

  const handleQuickAdd = async (e) => {
    e.preventDefault();
    if (!quickName.trim()) {
      setQuickError('Nome do cliente é obrigatório.');
      return;
    }
    const cleanCpf = stripNonDigits(quickCpf);
    const cleanPhone = stripNonDigits(quickPhone);

    if (cleanCpf && cleanCpf.length !== 11) {
      setQuickError('CPF deve conter 11 dígitos numéricos.');
      return;
    }
    if (cleanPhone && cleanPhone.length < 10) {
      setQuickError('Telefone deve conter pelo menos 10 dígitos.');
      return;
    }

    setQuickLoading(true);
    setQuickError('');

    try {
      await api.post('/clients', {
        name: quickName.trim(),
        cpf: cleanCpf || undefined,
        phone: cleanPhone || undefined
      });

      onChange({
        nome: quickName.trim(),
        cpf: formatCpf(cleanCpf),
        telefone: formatPhone(cleanPhone)
      });

      setShowQuickAddModal(false);
      setQuickName('');
      setQuickPhone('');
      setQuickCpf('');
      await fetchClients();
    } catch (err) {
      setQuickError(err.response?.data?.message || 'Erro ao cadastrar cliente.');
    } finally {
      setQuickLoading(false);
    }
  };

  const hasSelectedClient = Boolean(clientData?.nome || clientData?.cpf || clientData?.telefone);

  return (
    <div className="space-y-3">
      {hasSelectedClient ? (
        <div className="flex items-center justify-between rounded-xl border border-emerald-300 bg-emerald-50/60 p-3.5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-600 text-white">
              <User size={18} />
            </div>
            <div>
              <p className="text-sm font-bold text-emerald-950">
                {clientData.nome || 'Cliente sem nome'}
              </p>
              <div className="flex flex-wrap items-center gap-3 text-xs text-emerald-800 font-medium mt-0.5">
                {clientData.telefone && (
                  <span className="flex items-center gap-1">
                    <Phone size={12} /> {clientData.telefone}
                  </span>
                )}
                {clientData.cpf && (
                  <span className="flex items-center gap-1">
                    <CreditCard size={12} /> CPF: {clientData.cpf}
                  </span>
                )}
              </div>
            </div>
          </div>

          {!disabled && (
            <button
              type="button"
              onClick={handleClear}
              className="rounded-lg p-1.5 text-emerald-700 hover:bg-emerald-100 hover:text-emerald-900 transition"
              title="Trocar / Limpar cliente"
            >
              <X size={16} />
            </button>
          )}
        </div>
      ) : (
        <div className="relative" ref={dropdownRef}>
          <div className="flex gap-2">
            <div className="relative flex-1 flex items-center">
              <div className="pointer-events-none absolute left-3.5 flex items-center text-slate-400">
                <Search size={15} />
              </div>
              <input
                type="text"
                placeholder="Buscar cliente por Nome, CPF ou Telefone..."
                value={searchQuery}
                onFocus={() => setDropdownOpen(true)}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setDropdownOpen(true);
                }}
                disabled={disabled}
                className="input-field !pl-10 !pr-4 text-xs"
              />
            </div>

            <button
              type="button"
              onClick={() => setShowQuickAddModal(true)}
              disabled={disabled}
              className="btn-secondary btn-sm shrink-0 flex items-center gap-1.5 text-xs text-emerald-700 border-emerald-200 hover:bg-emerald-50"
              title="Cadastrar novo cliente"
            >
              <UserPlus size={14} />
              <span>+ Novo</span>
            </button>
          </div>
          {dropdownOpen && (
            <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-60 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl">
              {filteredClients.length === 0 ? (
                <div className="p-3 text-center text-xs text-slate-500">
                  Nenhum cliente encontrado.{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setDropdownOpen(false);
                      setQuickName(searchQuery);
                      setShowQuickAddModal(true);
                    }}
                    className="font-bold text-emerald-700 hover:underline inline-block mt-1"
                  >
                    + Cadastrar "{searchQuery}"
                  </button>
                </div>
              ) : (
                filteredClients.slice(0, 10).map((c) => (
                  <div
                    key={c.id || c.clienteCpf}
                    onClick={() => handleSelectClient(c)}
                    className="flex cursor-pointer items-center justify-between rounded-lg p-2.5 hover:bg-slate-100 transition"
                  >
                    <div>
                      <p className="text-xs font-bold text-slate-900">{c.clienteNome}</p>
                      <p className="text-[11px] text-slate-500">
                        {c.clienteTelefone ? formatPhone(c.clienteTelefone) : 'Sem tel.'} • CPF:{' '}
                        {c.clienteCpf ? formatCpf(c.clienteCpf) : 'Não informado'}
                      </p>
                    </div>
                    <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                      Selecionar
                    </span>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}
      {!hasSelectedClient && (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Nome
            </label>
            <input
              type="text"
              placeholder="Nome do cliente"
              value={clientData?.nome || ''}
              onChange={(e) => onChange({ ...clientData, nome: e.target.value })}
              disabled={disabled}
              className="input-field mt-1 text-xs py-1.5 px-3"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Telefone
            </label>
            <input
              type="text"
              placeholder="(00) 00000-0000"
              value={clientData?.telefone || ''}
              onChange={(e) => onChange({ ...clientData, telefone: formatPhone(e.target.value) })}
              disabled={disabled}
              className="input-field mt-1 text-xs py-1.5 px-3"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">
              CPF
            </label>
            <input
              type="text"
              placeholder="000.000.000-00"
              value={clientData?.cpf || ''}
              onChange={(e) => onChange({ ...clientData, cpf: formatCpf(e.target.value) })}
              disabled={disabled}
              className="input-field mt-1 text-xs py-1.5 px-3"
            />
          </div>
        </div>
      )}
      {showQuickAddModal && (
        <div className="modal-overlay">
          <div className="modal-content max-w-md">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <UserPlus size={18} className="text-emerald-600" />
                <h2 className="text-base font-bold text-slate-950">Cadastrar Novo Cliente</h2>
              </div>
              <button
                onClick={() => setShowQuickAddModal(false)}
                className="btn-icon"
                disabled={quickLoading}
              >
                <X size={18} />
              </button>
            </div>

            {quickError && (
              <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-2.5 text-xs text-red-700 font-medium">
                {quickError}
              </div>
            )}

            <form onSubmit={handleQuickAdd} className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                  Nome Completo *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: João da Silva"
                  value={quickName}
                  onChange={(e) => setQuickName(e.target.value)}
                  className="input-field mt-1"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                  Telefone / WhatsApp *
                </label>
                <input
                  type="text"
                  required
                  placeholder="(00) 00000-0000"
                  value={quickPhone}
                  onChange={(e) => setQuickPhone(formatPhone(e.target.value))}
                  className="input-field mt-1"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                  CPF (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="000.000.000-00"
                  value={quickCpf}
                  onChange={(e) => setQuickCpf(formatCpf(e.target.value))}
                  className="input-field mt-1"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowQuickAddModal(false)}
                  className="btn-secondary btn-sm"
                  disabled={quickLoading}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn-primary btn-sm bg-emerald-600 hover:bg-emerald-700"
                  disabled={quickLoading}
                >
                  {quickLoading ? 'Salvando...' : 'Salvar e Selecionar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
