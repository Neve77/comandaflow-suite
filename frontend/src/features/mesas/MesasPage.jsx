import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Users,
  RefreshCw,
  Clock,
  ArrowRightLeft,
  AlertCircle,
  X,
  History,
  Phone,
  CreditCard,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import api, { socket } from '../../shared/services/api';
import LoadingSpinner from '../../shared/components/LoadingSpinner';
import { formatPhone, formatCpf } from '../../shared/utils/formatters';

export default function MesasPage() {
  const navigate = useNavigate();
  const [mesas, setMesas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showNewModal, setShowNewModal] = useState(false);
  const [newNumero, setNewNumero] = useState('');
  const [newCapacidade, setNewCapacidade] = useState('4');
  const [saving, setSaving] = useState(false);
  const [transferModalData, setTransferModalData] = useState(null); // { comandaId, currentMesaNumero }
  const [targetMesaId, setTargetMesaId] = useState('');
  const [historyModalMesa, setHistoryModalMesa] = useState(null);
  const [historyDate, setHistoryDate] = useState(new Date().toISOString().slice(0, 10));
  const [historyData, setHistoryData] = useState(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [expandedComandaId, setExpandedComandaId] = useState(null);

  const fetchMesas = async (showLoading = false) => {
    if (showLoading) setLoading(true);
    setError('');
    try {
      const response = await api.get('/mesas');
      setMesas(response.data.mesas || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Erro ao carregar mesas.');
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    fetchMesas(true);

    const handleUpdate = () => {
      fetchMesas();
    };

    socket.on('comanda-opened', handleUpdate);
    socket.on('comanda-closed', handleUpdate);
    socket.on('mesa-update', handleUpdate);
    socket.on('pedido-added', handleUpdate);

    return () => {
      socket.off('comanda-opened', handleUpdate);
      socket.off('comanda-closed', handleUpdate);
      socket.off('mesa-update', handleUpdate);
      socket.off('pedido-added', handleUpdate);
    };
  }, []);

  const handleCreateMesa = async (e) => {
    e.preventDefault();
    if (!newNumero.trim()) return;
    setSaving(true);
    try {
      await api.post('/mesas', {
        numero: newNumero.trim(),
        capacidade: Number(newCapacidade) || 4
      });
      setShowNewModal(false);
      setNewNumero('');
      setNewCapacidade('4');
      await fetchMesas();
    } catch (err) {
      setError(err.response?.data?.message || 'Erro ao criar mesa.');
    } finally {
      setSaving(false);
    }
  };

  const handleMesaClick = (mesa) => {
    const comandaAberta = mesa.comandas?.find((c) => c.status === 'aberta');
    if (comandaAberta) {
      navigate('/comanda', { state: { comandaId: comandaAberta.id, mesaId: mesa.id, mesaNumero: mesa.numero } });
    } else {
      navigate('/atendimento', { state: { preselectedMesaId: mesa.id } });
    }
  };

  const handleTransfer = async (e) => {
    e.preventDefault();
    if (!transferModalData || !targetMesaId) return;
    setSaving(true);
    try {
      await api.post(`/comandas/${transferModalData.comandaId}/transfer`, {
        newMesaId: targetMesaId
      });
      setTransferModalData(null);
      setTargetMesaId('');
      await fetchMesas();
    } catch (err) {
      setError(err.response?.data?.message || 'Erro ao transferir mesa.');
    } finally {
      setSaving(false);
    }
  };
  const handleOpenHistory = async (mesa, date = historyDate) => {
    setHistoryModalMesa(mesa);
    setHistoryLoading(true);
    setHistoryData(null);
    try {
      const res = await api.get(`/mesas/${mesa.id}/history`, {
        params: { date }
      });
      setHistoryData(res.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Erro ao carregar histórico da mesa.');
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleDateChange = (newDate) => {
    setHistoryDate(newDate);
    if (historyModalMesa) {
      handleOpenHistory(historyModalMesa, newDate);
    }
  };

  const formatOpenTime = (openedAt) => {
    if (!openedAt) return '';
    const diffMin = Math.floor((Date.now() - new Date(openedAt).getTime()) / 60000);
    if (diffMin < 1) return 'Aberta agora';
    if (diffMin < 60) return `Há ${diffMin} min`;
    const hours = Math.floor(diffMin / 60);
    const mins = diffMin % 60;
    return `Há ${hours}h ${mins}m`;
  };

  const livres = mesas.filter((m) => m.status === 'livre' && !m.comandas?.some((c) => c.status === 'aberta')).length;
  const ocupadas = mesas.filter((m) => m.status === 'ocupada' || m.comandas?.some((c) => c.status === 'aberta')).length;

  if (loading) return <LoadingSpinner />;

  return (
    <div className="mesas-page space-y-6">
      <section className="mesas-toolbar panel p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="section-title">Mesas</h1>
            <p className="section-subtitle">
              Toque em uma mesa livre para receber um cliente ou em uma ocupada para abrir a conta.
            </p>
          </div>
          <div className="mesas-toolbar-actions flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => fetchMesas(true)}
              className="btn-secondary btn-sm"
              title="Atualizar"
            >
              <RefreshCw size={14} />
              <span>Atualizar</span>
            </button>
            <button
              type="button"
              onClick={() => setShowNewModal(true)}
              className="btn-primary btn-sm"
            >
              <Plus size={15} />
              <span>Nova Mesa</span>
            </button>
          </div>
        </div>
        <div className="mesas-summary mt-5 flex flex-wrap items-center gap-5 border-t border-slate-100 pt-4 text-xs font-semibold">
          <div className="flex items-center gap-2">
            <span className="h-3.5 w-3.5 rounded-sm border border-emerald-300 bg-emerald-100" />
            <span className="text-slate-700">Livre ({livres})</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-3.5 w-3.5 rounded-sm border border-slate-400 bg-slate-900" />
            <span className="text-slate-700">Ocupada ({ocupadas})</span>
          </div>
        </div>
      </section>

      {error && (
        <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 font-medium">
          <AlertCircle size={18} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}
      <div className="mesas-grid grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {mesas.map((mesa) => {
          const comandaAberta = mesa.comandas?.find((c) => c.status === 'aberta');
          const isOcupada = mesa.status === 'ocupada' || Boolean(comandaAberta);
          const totalComanda = comandaAberta ? Number(comandaAberta.total || 0) : 0;
          const clienteNome = comandaAberta?.clienteNome || '';

          return (
            <div
              key={mesa.id}
              onClick={() => handleMesaClick(mesa)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  handleMesaClick(mesa);
                }
              }}
              role="button"
              tabIndex={0}
              aria-label={isOcupada ? `Mesa ${mesa.numero} ocupada. Abrir conta.` : `Mesa ${mesa.numero} livre. Receber cliente.`}
              data-status={isOcupada ? 'ocupada' : 'livre'}
              className={`mesa-card group ${
                isOcupada ? 'mesa-card-ocupada' : 'mesa-card-livre'
              }`}
            >
              <div className="flex w-full items-center justify-between">
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
                  MESA
                </span>
                <div className="mesa-card-tools flex items-center gap-1">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenHistory(mesa);
                    }}
                    className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-emerald-700 transition"
                    title={`Ver histórico de clientes da Mesa ${mesa.numero}`}
                  >
                    <History size={14} />
                  </button>

                  {isOcupada && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setTransferModalData({
                          comandaId: comandaAberta.id,
                          currentMesaNumero: mesa.numero
                        });
                      }}
                      className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-900 transition"
                      title="Transferir mesa"
                    >
                      <ArrowRightLeft size={13} />
                    </button>
                  )}
                </div>
              </div>

              <span className="text-3xl font-black text-slate-950 tracking-tight my-1">
                {mesa.numero}
              </span>

              <div className="w-full">
                {isOcupada ? (
                  <div className="space-y-1">
                    <span className="status-chip bg-slate-950 text-white text-[10px]">
                      OCUPADA
                    </span>
                    <p className="text-base font-black text-slate-950">
                      R$ {totalComanda.toFixed(2)}
                    </p>
                    {clienteNome && (
                      <p className="text-[11px] font-bold text-slate-800 truncate px-1" title={clienteNome}>
                        👤 {clienteNome}
                      </p>
                    )}
                    <div className="flex items-center justify-center gap-1 text-[11px] text-slate-500 font-medium">
                      <Clock size={11} />
                      <span>{formatOpenTime(comandaAberta?.openedAt)}</span>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1 py-1">
                    <span className="status-chip bg-emerald-100 text-emerald-800 border border-emerald-200 text-[10px]">
                      LIVRE
                    </span>
                    <p className="flex items-center justify-center gap-1 text-xs text-slate-500 font-medium">
                      <Users size={13} />
                      {mesa.capacidade} lugares
                    </p>
                  </div>
                )}
              </div>

              <div className="mesa-card-footer mt-3 w-full border-t border-slate-200/70 pt-2 flex items-center justify-between text-xs font-semibold text-slate-700 group-hover:text-slate-950">
                <span>{isOcupada ? 'Ver comanda →' : '+ Abrir mesa'}</span>
                <span
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpenHistory(mesa);
                  }}
                  className="text-[10px] text-slate-400 hover:text-emerald-700 flex items-center gap-0.5"
                  title="Histórico de atendimentos"
                >
                  <History size={11} /> Histórico
                </span>
              </div>
            </div>
          );
        })}
      </div>
      {historyModalMesa && (
        <div className="modal-overlay">
          <div className="modal-content max-w-2xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 shrink-0">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 font-black text-base text-white shadow-sm">
                  {historyModalMesa.numero}
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-950">
                    Histórico da Mesa {historyModalMesa.numero}
                  </h2>
                  <p className="text-xs text-slate-500">
                    Atendimentos e clientes que passaram por esta mesa
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={historyDate}
                  onChange={(e) => handleDateChange(e.target.value)}
                  className="input-field text-xs py-1.5 px-2.5 max-w-[150px]"
                />
                <button onClick={() => setHistoryModalMesa(null)} className="btn-icon">
                  <X size={18} />
                </button>
              </div>
            </div>
            {historyData?.resumo && (
              <div className="grid grid-cols-3 gap-3 my-4 shrink-0">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-center">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Atendimentos no Dia
                  </span>
                  <p className="text-xl font-black text-slate-950 mt-0.5">
                    {historyData.resumo.totalAtendimentos}
                  </p>
                  <span className="text-[10px] text-slate-400">
                    {historyData.resumo.comandasFechadas} fechada(s)
                  </span>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-center">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Faturamento da Mesa
                  </span>
                  <p className="text-xl font-black text-emerald-700 mt-0.5">
                    R$ {Number(historyData.resumo.totalFaturado || 0).toFixed(2)}
                  </p>
                  <span className="text-[10px] text-slate-400">no período</span>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-center">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Ticket Médio
                  </span>
                  <p className="text-xl font-black text-slate-950 mt-0.5">
                    R$ {Number(historyData.resumo.ticketMedio || 0).toFixed(2)}
                  </p>
                  <span className="text-[10px] text-slate-400">por comanda</span>
                </div>
              </div>
            )}
            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {historyLoading ? (
                <div className="py-12"><LoadingSpinner /></div>
              ) : (!historyData?.comandas || historyData.comandas.length === 0) ? (
                <div className="empty-state py-10">
                  <p className="text-sm font-semibold text-slate-600">
                    Nenhum atendimento registrado na Mesa {historyModalMesa.numero} nesta data.
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    Selecione outra data no campo acima para consultar o histórico anterior.
                  </p>
                </div>
              ) : (
                historyData.comandas.map((cmd, idx) => {
                  const isExpanded = expandedComandaId === cmd.id;
                  const isAberta = cmd.status === 'aberta';
                  const isCancelada = cmd.status === 'cancelada';

                  return (
                    <div
                      key={cmd.id}
                      className={`rounded-xl border p-4 transition duration-150 ${
                        isAberta
                          ? 'border-emerald-300 bg-emerald-50/40 shadow-sm'
                          : isCancelada
                          ? 'border-red-200 bg-red-50/30'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-black text-slate-950">
                              #{historyData.comandas.length - idx}
                            </span>
                            <span className={`status-chip text-[10px] ${
                              isAberta
                                ? 'bg-emerald-100 text-emerald-800'
                                : isCancelada
                                ? 'bg-red-100 text-red-700'
                                : 'bg-slate-100 text-slate-700'
                            }`}>
                              {cmd.status.toUpperCase()}
                            </span>
                            <span className="text-xs font-bold text-slate-900">
                              👤 {cmd.clienteNome || 'Cliente Não Identificado'}
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                            {cmd.clienteTelefone && (
                              <span className="flex items-center gap-1">
                                <Phone size={11} /> {formatPhone(cmd.clienteTelefone)}
                              </span>
                            )}
                            {cmd.clienteCpf && (
                              <span className="flex items-center gap-1">
                                <CreditCard size={11} /> CPF: {formatCpf(cmd.clienteCpf)}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-3 text-[11px] text-slate-400 font-medium">
                            <span>
                              🕒 Aberta: {new Date(cmd.openedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            {cmd.closedAt && (
                              <span>
                                • Fechada: {new Date(cmd.closedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            )}
                            {cmd.formaPagamento && (
                              <span className="font-semibold text-slate-700 uppercase">
                                • {cmd.formaPagamento}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="text-right">
                          <p className="text-base font-black text-slate-950">
                            R$ {Number(cmd.total || 0).toFixed(2)}
                          </p>
                          <button
                            type="button"
                            onClick={() => setExpandedComandaId(isExpanded ? null : cmd.id)}
                            className="text-xs font-bold text-emerald-700 hover:underline flex items-center gap-0.5 justify-end mt-1"
                          >
                            <span>{cmd.pedidos?.length || 0} item(ns)</span>
                            {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                          </button>
                        </div>
                      </div>
                      {isExpanded && cmd.pedidos?.length > 0 && (
                        <div className="mt-3 border-t border-slate-100 pt-3 space-y-1.5">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                            Produtos Consumidos:
                          </p>
                          {cmd.pedidos.map((p, pIdx) => (
                            <div key={pIdx} className="flex justify-between text-xs text-slate-700 bg-slate-50 p-2 rounded">
                              <span>{p.quantidade}x {p.nome} {p.observacao ? `(${p.observacao})` : ''}</span>
                              <span className="font-bold">R$ {Number(p.subtotal).toFixed(2)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
            <div className="pt-3 border-t border-slate-100 flex justify-end shrink-0 mt-3">
              <button
                type="button"
                onClick={() => setHistoryModalMesa(null)}
                className="btn-secondary btn-sm"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
      {showNewModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-lg font-bold text-slate-950">Cadastrar Nova Mesa</h2>
              <button onClick={() => setShowNewModal(false)} className="btn-icon">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateMesa} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                  Número / Identificador da Mesa *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: 11, Balcão 1, Deck"
                  value={newNumero}
                  onChange={(e) => setNewNumero(e.target.value)}
                  className="input-field mt-1"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                  Capacidade (Lugares)
                </label>
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={newCapacidade}
                  onChange={(e) => setNewCapacidade(e.target.value)}
                  className="input-field mt-1"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewModal(false)}
                  className="btn-secondary btn-sm"
                  disabled={saving}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn-primary btn-sm"
                  disabled={saving}
                >
                  {saving ? 'Salvando...' : 'Cadastrar Mesa'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {transferModalData && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-lg font-bold text-slate-950">
                Transferir Mesa {transferModalData.currentMesaNumero}
              </h2>
              <button onClick={() => setTransferModalData(null)} className="btn-icon">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleTransfer} className="mt-4 space-y-4">
              <p className="text-xs text-slate-600">
                Escolha para qual mesa livre deseja transferir o consumo desta comanda.
              </p>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                  Mesa de Destino (Livre) *
                </label>
                <select
                  value={targetMesaId}
                  onChange={(e) => setTargetMesaId(e.target.value)}
                  className="input-field mt-1"
                  required
                >
                  <option value="">Selecione a mesa de destino...</option>
                  {mesas
                    .filter((m) => m.status === 'livre' && !m.comandas?.some((c) => c.status === 'aberta'))
                    .map((m) => (
                      <option key={m.id} value={m.id}>
                        Mesa {m.numero} ({m.capacidade} lugares)
                      </option>
                    ))}
                </select>
              </div>

              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setTransferModalData(null)}
                  className="btn-secondary btn-sm"
                  disabled={saving}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn-primary btn-sm"
                  disabled={saving || !targetMesaId}
                >
                  {saving ? 'Transferindo...' : 'Confirmar Transferência'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
