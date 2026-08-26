import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Plus,
  Trash2,
  CheckCircle2,
  DollarSign,
  Receipt,
  CreditCard,
  Minus,
  AlertTriangle,
  ArrowRightLeft,
  Ban,
  User,
  Phone,
  MessageSquare,
  Users2,
  Search,
} from 'lucide-react';
import { useComanda } from './useComanda';
import { useProducts } from '../products/useProducts';
import api from '../../shared/services/api';
import ComandaModals from './components/ComandaModals';
import { formatCpf, formatPhone, stripNonDigits } from '../../shared/utils/formatters';

export default function ComandaPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const {
    comanda,
    setComanda,
    openComandas,
    loading,
    closeComanda,
    addPedido,
    cancelPedido,
    loadComanda,
    loadOpenComandas
  } = useComanda();

  const { products } = useProducts();
  const availableProducts = products.filter((p) => p.ativo && p.estoque > 0);

  const [mesas, setMesas] = useState([]);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('success');
  const [selectedProductId, setSelectedProductId] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [quantidade, setQuantidade] = useState(1);
  const [observacao, setObservacao] = useState('');
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [formaPagamento, setFormaPagamento] = useState('pix');
  const [desconto, setDesconto] = useState('0');
  const [valorRecebido, setValorRecebido] = useState('');
  const [closing, setClosing] = useState(false);
  const [numPessoas, setNumPessoas] = useState(1);
  const [isMultiPayment, setIsMultiPayment] = useState(false);
  const [payments, setPayments] = useState([{ forma: 'pix', valor: '' }]);
  const [cancelModalItem, setCancelModalItem] = useState(null);
  const [showCancelComandaModal, setShowCancelComandaModal] = useState(false);
  const [motivoCancelamento, setMotivoCancelamento] = useState('');
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [targetMesaId, setTargetMesaId] = useState('');
  const [showWhatsappModal, setShowWhatsappModal] = useState(false);
  const [whatsappPhone, setWhatsappPhone] = useState('');
  const [includePixInMessage, setIncludePixInMessage] = useState(true);
  const [copied, setCopied] = useState(false);
  const orderEntryRef = useRef(null);
  const filteredProducts = useMemo(() => {
    const query = productSearch.trim().toLowerCase();
    if (!query) return availableProducts;
    return availableProducts.filter((product) => (
      product.nome?.toLowerCase().includes(query)
      || product.categoria?.toLowerCase().includes(query)
    ));
  }, [availableProducts, productSearch]);
  useEffect(() => {
    const fetchMesas = async () => {
      try {
        const res = await api.get('/mesas');
        setMesas(res.data.mesas || []);
      } catch {
        setMesas([]);
      }
    };
    fetchMesas();
  }, []);
  useEffect(() => {
    if (location.state?.comandaId) {
      loadComanda(location.state.comandaId);
    }
  }, [location.state, loadComanda]);
  useEffect(() => {
    if (!comanda?.id || !location.state?.focusProducts) return undefined;
    const timeout = window.setTimeout(() => {
      orderEntryRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 180);
    return () => window.clearTimeout(timeout);
  }, [comanda?.id, location.state?.focusProducts]);

  const showFeedback = (text, type = 'success') => {
    setMessage(text);
    setMessageType(type);
    setTimeout(() => setMessage(''), 4000);
  };

  const handleAddPedido = async (e) => {
    e?.preventDefault();
    if (!comanda) return;
    if (!selectedProductId) {
      showFeedback('Selecione um produto.', 'error');
      return;
    }

    const prod = products.find((p) => p.id === selectedProductId);
    if (!prod) return;

    try {
      await addPedido({
        produtoId: prod.id,
        nome: prod.nome,
        quantidade: Number(quantidade) || 1,
        valorUnitario: prod.preco,
        observacao: observacao.trim()
      });
      setSelectedProductId('');
      setProductSearch('');
      setQuantidade(1);
      setObservacao('');
      showFeedback(`${quantidade}x ${prod.nome} adicionado(s)!`);
    } catch (err) {
      showFeedback(err.response?.data?.message || err.message || 'Erro ao adicionar item.', 'error');
    }
  };

  const handleConfirmCancelPedido = async () => {
    if (!cancelModalItem) return;
    try {
      await cancelPedido(cancelModalItem.id);
      showFeedback('Item cancelado.');
      setCancelModalItem(null);
    } catch (err) {
      showFeedback(err.response?.data?.message || err.message || 'Erro ao cancelar item.', 'error');
    }
  };

  const handleTransferMesa = async (e) => {
    e.preventDefault();
    if (!comanda || !targetMesaId) return;
    try {
      await api.post(`/comandas/${comanda.id}/transfer`, { newMesaId: targetMesaId });
      setShowTransferModal(false);
      setTargetMesaId('');
      await loadComanda(comanda.id);
      await loadOpenComandas();
      showFeedback('Comanda transferida com sucesso!');
    } catch (err) {
      showFeedback(err.response?.data?.message || 'Erro ao transferir comanda.', 'error');
    }
  };

  const handleCancelComanda = async (e) => {
    e.preventDefault();
    if (!comanda) return;
    try {
      await api.post(`/comandas/${comanda.id}/cancel`, { motivo: motivoCancelamento });
      setShowCancelComandaModal(false);
      setMotivoCancelamento('');
      setComanda(null);
      await loadOpenComandas();
      showFeedback('Comanda cancelada com sucesso. Itens devolvidos ao estoque.');
    } catch (err) {
      showFeedback(err.response?.data?.message || 'Erro ao cancelar comanda.', 'error');
    }
  };
  const subtotal = comanda ? Number(comanda.total || 0) : 0;
  const numDesconto = Math.max(0, Number(desconto) || 0);
  const totalFinal = Math.max(0, subtotal - numDesconto);
  const valorPorPessoa = numPessoas > 0 ? (totalFinal / numPessoas) : totalFinal;
  const numRecebido = Number(valorRecebido) || 0;
  const troco = Math.max(0, numRecebido - totalFinal);
  const totalPagoMulti = payments.reduce((sum, p) => sum + (Number(p.valor) || 0), 0);
  const restanteMulti = Math.max(0, totalFinal - totalPagoMulti);

  const handleAddPaymentRow = () => {
    setPayments([...payments, { forma: 'pix', valor: restanteMulti > 0 ? restanteMulti.toFixed(2) : '' }]);
  };

  const handleRemovePaymentRow = (index) => {
    setPayments(payments.filter((_, i) => i !== index));
  };

  const handleUpdatePayment = (index, field, value) => {
    const next = [...payments];
    next[index][field] = value;
    setPayments(next);
  };

  const handleFinalizePayment = async () => {
    if (!comanda) return;
    setClosing(true);

    const primaryForma = isMultiPayment
      ? payments.map(p => `${p.forma}: R$ ${Number(p.valor).toFixed(2)}`).join(' + ')
      : formaPagamento;

    try {
      await closeComanda(comanda.id, {
        formaPagamento: primaryForma,
        desconto: Number(desconto) || 0
      });
      setShowCloseModal(false);
      setDesconto('0');
      setValorRecebido('');
      setIsMultiPayment(false);
      setNumPessoas(1);
      showFeedback('Comanda fechada com sucesso! Mesa liberada.', 'success');
    } catch (err) {
      showFeedback(err.response?.data?.message || err.message || 'Erro ao finalizar comanda.', 'error');
    } finally {
      setClosing(false);
    }
  };
  const generateWhatsappMessage = () => {
    if (!comanda) return '';

    const restaurantName = localStorage.getItem('cf_nome_restaurante') || 'ComandaFlow';
    const chavePix = localStorage.getItem('cf_chave_pix') || '';
    const tipoChave = localStorage.getItem('cf_tipo_chave_pix') || 'PIX';
    const customFooter = localStorage.getItem('cf_mensagem_cupom') || 'Obrigado pela preferência! Volte sempre.';
    const hour = new Date().getHours();
    const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';
    const cliente = comanda.clienteNome ? `*${comanda.clienteNome}*` : 'Amigo(a)';
    const itemsFormatted = (comanda.pedidos || [])
      .map((p) => `▫️ *${p.quantidade}x* ${p.nome} — R$ ${Number(p.subtotal).toFixed(2)}`)
      .join('\n');
    const splitSection = numPessoas > 1
      ? `\n👥 *Divisão da Conta (${numPessoas} pessoas):*\n👉 *R$ ${valorPorPessoa.toFixed(2)}* por pessoa\n`
      : '';
    const pixSection = includePixInMessage && chavePix
      ? `\n🔑 *Chave ${tipoChave} para Pagamento:*\n\`${chavePix}\`\n`
      : '';
    const now = new Date();
    const dateStr = now.toLocaleDateString('pt-BR');
    const timeStr = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    return `✨ *${restaurantName.toUpperCase()}* ✨
────────────────────────────
👋 ${greeting}, ${cliente}!
Aqui está o resumo do seu consumo:

📍 *Local:* Mesa ${comanda.mesa?.numero || 'Balcão'}
📅 *Data:* ${dateStr} às ${timeStr}

🧾 *ITENS CONSUMIDOS:*
${itemsFormatted || '▫️ Nenhum item lançado'}
────────────────────────────
💵 *Subtotal:* R$ ${subtotal.toFixed(2)}${numDesconto > 0 ? `\n🏷️ *Desconto:* -R$ ${numDesconto.toFixed(2)}` : ''}
💰 *TOTAL A PAGAR:* *R$ ${totalFinal.toFixed(2)}*
${splitSection}${pixSection}────────────────────────────
${customFooter} 😊🍽️`;
  };

  const handleOpenWhatsappModal = () => {
    setWhatsappPhone(formatPhone(comanda?.clienteTelefone || ''));
    setCopied(false);
    setShowWhatsappModal(true);
  };

  const handleCopyWhatsappText = () => {
    const text = generateWhatsappMessage();
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const handleSendWhatsapp = (e) => {
    e?.preventDefault();
    if (!comanda) return;

    const digits = stripNonDigits(whatsappPhone || comanda.clienteTelefone);
    if (!digits || digits.length < 10) {
      showFeedback('Informe um número de telefone com DDD válido.', 'error');
      return;
    }

    const text = generateWhatsappMessage();
    const url = `https://wa.me/55${digits}?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
    setShowWhatsappModal(false);
    showFeedback('Resumo enviado para o WhatsApp!');
  };

  const money = (val) => Number(val || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  return (
    <div className="space-y-6">
      {message && (
        <div className={`toast ${messageType === 'error' ? 'toast-error' : 'toast-success'}`}>
          {messageType === 'error' ? <AlertTriangle size={18} /> : <CheckCircle2 size={18} />}
          <span>{message}</span>
        </div>
      )}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="lg:col-span-8 space-y-6">
          {comanda ? (
            <div className="panel p-6 space-y-6">
              <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 pb-4">
                <div>
                  <div className="flex items-center gap-3">
                    <span className="rounded-lg bg-slate-950 px-3 py-1 text-xs font-black text-white tracking-wide">
                      MESA {comanda.mesa?.numero || '00'}
                    </span>
                    <span className="status-chip bg-emerald-100 text-emerald-800 border border-emerald-200">
                      EM ATENDIMENTO
                    </span>
                  </div>
                  {(comanda.clienteNome || comanda.clienteCpf || comanda.clienteTelefone) && (
                    <div className="mt-3 flex items-center gap-2 rounded-lg bg-slate-50 border border-slate-200 px-3 py-2 text-xs">
                      <User size={14} className="text-slate-600 shrink-0" />
                      <div className="flex flex-wrap items-center gap-3">
                        {comanda.clienteNome && (
                          <span className="font-bold text-slate-950">{comanda.clienteNome}</span>
                        )}
                        {comanda.clienteTelefone && (
                          <span className="text-slate-600 flex items-center gap-1">
                            <Phone size={11} /> {formatPhone(comanda.clienteTelefone)}
                          </span>
                        )}
                        {comanda.clienteCpf && (
                          <span className="text-slate-600 flex items-center gap-1">
                            <CreditCard size={11} /> CPF: {formatCpf(comanda.clienteCpf)}
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  <p className="text-[11px] text-slate-400 mt-1">
                    Aberta às {new Date(comanda.openedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleOpenWhatsappModal}
                    className="btn-secondary btn-sm text-emerald-700 hover:bg-emerald-50 border-emerald-200 font-bold"
                    title="Enviar conta pelo WhatsApp"
                  >
                    <MessageSquare size={14} />
                    <span>WhatsApp</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowTransferModal(true)}
                    className="btn-secondary btn-sm"
                    title="Transferir de mesa"
                  >
                    <ArrowRightLeft size={14} />
                    <span>Transferir</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCancelComandaModal(true)}
                    className="btn-secondary btn-sm text-red-600 hover:bg-red-50"
                    title="Cancelar comanda inteira"
                  >
                    <Ban size={14} />
                    <span>Cancelar</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCloseModal(true)}
                    className="btn-primary btn-sm bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 font-bold"
                  >
                    <Receipt size={15} />
                    <span>Fechar / Cobrar</span>
                  </button>
                </div>
              </div>
              <form ref={orderEntryRef} id="adicionar-itens" onSubmit={handleAddPedido} className="order-entry-card">
                <div className="order-entry-heading">
                  <div><span>Etapa final do atendimento</span><h3>Adicionar itens à Mesa {comanda.mesa?.numero}</h3></div>
                  <Plus size={23} className="text-emerald-600" />
                </div>
                <label className="order-product-search">
                  <Search size={20} />
                  <input value={productSearch} onChange={(event) => setProductSearch(event.target.value)} placeholder="Buscar bebida, prato ou produto..." />
                </label>
                <div className="order-product-grid">
                  {filteredProducts.length ? filteredProducts.map((product) => (
                    <button
                      key={product.id}
                      type="button"
                      className={`order-product-card ${selectedProductId === product.id ? 'selected' : ''}`}
                      onClick={() => setSelectedProductId(product.id)}
                    >
                      <strong>{product.nome}</strong>
                      <span>{product.categoria || 'Produto'} <b>R$ {Number(product.preco).toFixed(2)}</b></span>
                    </button>
                  )) : <div className="service-empty" style={{ gridColumn: '1 / -1' }}>Nenhum produto encontrado.</div>}
                </div>
                <div className="order-controls">
                  <div>
                    <label className="order-control-label">Quantidade</label>
                    <div className="order-quantity">
                      <button type="button" aria-label="Diminuir quantidade" onClick={() => setQuantidade((q) => Math.max(1, q - 1))}><Minus size={18} /></button>
                      <input aria-label="Quantidade" type="number" min="1" value={quantidade} onChange={(event) => setQuantidade(Math.max(1, Number(event.target.value) || 1))} />
                      <button type="button" aria-label="Aumentar quantidade" onClick={() => setQuantidade((q) => q + 1)}><Plus size={18} /></button>
                    </div>
                  </div>
                  <div>
                    <label className="order-control-label" htmlFor="order-note">Observação (opcional)</label>
                    <input id="order-note" className="order-note" value={observacao} onChange={(event) => setObservacao(event.target.value)} placeholder="Ex.: sem cebola" />
                  </div>
                  <button type="submit" disabled={loading || !selectedProductId} className="order-add-button"><Plus size={19} /> Adicionar item</button>
                </div>
              </form>
              <div>
                <h3 className="text-sm font-bold text-slate-950 mb-3">
                  Itens Consumidos ({comanda.pedidos?.length || 0})
                </h3>

                {(!comanda.pedidos || comanda.pedidos.length === 0) ? (
                  <div className="empty-state py-8">
                    Nenhum produto lançado nesta mesa ainda.
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white overflow-hidden">
                    {comanda.pedidos.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between p-3.5 hover:bg-slate-50 transition"
                      >
                        <div className="flex-1 min-w-0 pr-4">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-950 text-sm">
                              {item.quantidade}x {item.nome}
                            </span>
                            <span className="text-xs text-slate-400">
                              (R$ {Number(item.valorUnitario).toFixed(2)})
                            </span>
                          </div>
                          {item.observacao && (
                            <p className="text-xs font-semibold text-amber-800 mt-0.5">
                              Obs: {item.observacao}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center gap-4 shrink-0">
                          <span className="text-sm font-black text-slate-950">
                            R$ {Number(item.subtotal).toFixed(2)}
                          </span>
                          <button
                            type="button"
                            onClick={() => setCancelModalItem(item)}
                            className="text-slate-400 hover:text-red-600 p-1 rounded hover:bg-red-50 transition"
                            title="Remover Item"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="rounded-xl bg-slate-950 p-5 text-white shadow space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Total Acumulado
                    </span>
                    <p className="text-3xl font-black tracking-tight">
                      R$ {Number(comanda.total || 0).toFixed(2)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleOpenWhatsappModal}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600/30 border border-emerald-500/40 px-3.5 py-2.5 text-xs font-bold text-emerald-300 hover:bg-emerald-600/50 transition"
                    >
                      <MessageSquare size={14} />
                      <span>WhatsApp</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowCloseModal(true)}
                      className="btn-success px-5 py-2.5 text-sm font-bold"
                    >
                      <DollarSign size={18} />
                      <span>Fechar Comanda</span>
                    </button>
                  </div>
                </div>
                <div className="flex items-center justify-between border-t border-slate-800 pt-3 text-xs text-slate-400">
                  <div className="flex items-center gap-2">
                    <Users2 size={15} className="text-slate-500" />
                    <span>Divisão de conta:</span>
                    <div className="flex items-center gap-1 bg-slate-900 px-2 py-1 rounded border border-slate-800">
                      <button
                        type="button"
                        onClick={() => setNumPessoas(p => Math.max(1, p - 1))}
                        className="text-slate-400 hover:text-white font-bold px-1"
                      >
                        -
                      </button>
                      <span className="text-white font-bold px-1.5">{numPessoas} {numPessoas === 1 ? 'pessoa' : 'pessoas'}</span>
                      <button
                        type="button"
                        onClick={() => setNumPessoas(p => p + 1)}
                        className="text-slate-400 hover:text-white font-bold px-1"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {numPessoas > 1 && (
                    <div className="text-right">
                      <span className="text-emerald-400 font-bold text-sm">
                        {money(subtotal / numPessoas)}
                      </span>
                      <span className="text-slate-400 text-[11px] block">por pessoa</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="panel p-8 text-center min-h-[330px] flex flex-col items-center justify-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700 border border-emerald-200">
                <User size={29} />
              </div>
              <h2 className="mt-5 text-2xl font-black text-slate-950">Comece pelo cliente</h2>
              <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
                Para evitar erros, o novo fluxo identifica o cliente, escolhe a mesa e depois libera o lançamento de itens.
              </p>
              <button type="button" onClick={() => navigate('/atendimento')} className="service-primary-action mt-5">
                Iniciar novo atendimento <Plus size={20} />
              </button>
              {openComandas.length > 0 && <p className="mt-4 text-xs font-semibold text-slate-500">Ou escolha uma comanda aberta ao lado.</p>}
            </div>
          )}
        </div>
        <div className="lg:col-span-4 space-y-4">
          <div className="panel p-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-600">
                Comandas Abertas ({openComandas.length})
              </h2>
              <button
                type="button"
                onClick={() => loadOpenComandas()}
                className="text-xs font-bold text-slate-900 hover:underline"
              >
                Atualizar
              </button>
            </div>

            <div className="mt-3 space-y-2.5 max-h-[600px] overflow-y-auto pr-1">
              {openComandas.length === 0 ? (
                <p className="py-8 text-center text-xs text-slate-400">
                  Nenhuma comanda aberta no momento.
                </p>
              ) : (
                openComandas.map((item) => {
                  const isSelected = comanda?.id === item.id;
                  const total = Number(item.total || 0);

                  return (
                    <div
                      key={item.id}
                      onClick={() => loadComanda(item.id)}
                      className={`cursor-pointer rounded-xl border p-3.5 transition duration-150 ${
                        isSelected
                          ? 'border-slate-950 bg-slate-50 shadow-sm'
                          : 'border-slate-200 bg-white hover:border-slate-400'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-black text-slate-950 text-sm">
                          MESA {item.mesa?.numero || '00'}
                        </span>
                        <span className="text-sm font-black text-slate-950">
                          R$ {total.toFixed(2)}
                        </span>
                      </div>
                      <div className="mt-1 flex items-center justify-between text-xs text-slate-500">
                        <span className="truncate max-w-[150px] font-medium text-slate-700">
                          {item.clienteNome || 'Cliente avulso'}
                        </span>
                        <span>{item.pedidos?.length || 0} item(ns)</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
      <ComandaModals
        {...{
          showCloseModal,
          comanda,
          setShowCloseModal,
          subtotal,
          desconto,
          setDesconto,
          totalFinal,
          setNumPessoas,
          numPessoas,
          money,
          valorPorPessoa,
          isMultiPayment,
          setIsMultiPayment,
          payments,
          setPayments,
          formaPagamento,
          setFormaPagamento,
          valorRecebido,
          setValorRecebido,
          numRecebido,
          troco,
          handleUpdatePayment,
          handleRemovePaymentRow,
          handleAddPaymentRow,
          restanteMulti,
          handleOpenWhatsappModal,
          closing,
          handleFinalizePayment,
          showWhatsappModal,
          setShowWhatsappModal,
          handleSendWhatsapp,
          whatsappPhone,
          setWhatsappPhone,
          includePixInMessage,
          setIncludePixInMessage,
          handleCopyWhatsappText,
          copied,
          generateWhatsappMessage,
          showTransferModal,
          setShowTransferModal,
          handleTransferMesa,
          targetMesaId,
          setTargetMesaId,
          mesas,
          openComandas,
          showCancelComandaModal,
          setShowCancelComandaModal,
          handleCancelComanda,
          motivoCancelamento,
          setMotivoCancelamento,
          cancelModalItem,
          setCancelModalItem,
          handleConfirmCancelPedido,
        }}
      />
    </div>
  );
}
