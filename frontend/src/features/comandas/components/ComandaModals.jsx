import {
  AlertTriangle,
  Banknote,
  Check,
  Copy,
  CreditCard,
  MessageSquare,
  QrCode,
  Split,
  Trash2,
  Users2,
  X,
} from 'lucide-react';
import { formatPhone } from '../../../shared/utils/formatters';

export default function ComandaModals({
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
}) {
  const cashInsufficient = !isMultiPayment
    && formaPagamento === 'dinheiro'
    && numRecebido > 0
    && numRecebido < totalFinal;

  return (
    <>
      {showCloseModal && comanda && (
        <div className="modal-overlay">
          <div className="modal-content checkout-modal">
            <header className="checkout-header">
              <div>
                <h2>Fechar conta da Mesa {comanda.mesa?.numero || '00'}</h2>
                <p>{comanda.clienteNome ? `Cliente: ${comanda.clienteNome}` : 'Atendimento sem cadastro'}</p>
              </div>
              <button type="button" onClick={() => setShowCloseModal(false)} className="btn-icon" aria-label="Fechar janela">
                <X size={18} />
              </button>
            </header>

            <div className="checkout-body">
              <section className="checkout-section">
                <div className="checkout-section-title"><span><span className="checkout-step-number">1</span>Confira o valor</span></div>
                <div className="checkout-values">
                  <div className="checkout-value-row"><span>Subtotal</span><strong>{money(subtotal)}</strong></div>
                  <label className="checkout-value-row">
                    <span>Desconto em reais</span>
                    <input type="number" min="0" step="0.50" value={desconto} onChange={(event) => setDesconto(event.target.value)} aria-label="Desconto em reais" />
                  </label>
                  <div className="checkout-total"><span>Total a pagar</span><strong>{money(totalFinal)}</strong></div>
                </div>
              </section>

              <section className="checkout-section">
                <div className="checkout-section-title"><span><span className="checkout-step-number">2</span>Dividir por pessoas</span></div>
                <div className="checkout-split-row">
                  <span className="checkout-split-label"><Users2 size={19} /> Quantas pessoas?</span>
                  <div className="checkout-counter">
                    <button type="button" onClick={() => setNumPessoas((value) => Math.max(1, value - 1))} aria-label="Diminuir pessoas">−</button>
                    <span>{numPessoas}</span>
                    <button type="button" onClick={() => setNumPessoas((value) => value + 1)} aria-label="Aumentar pessoas">+</button>
                  </div>
                </div>
                {numPessoas > 1 && <div className="checkout-per-person">{money(valorPorPessoa)} para cada pessoa</div>}
              </section>

              <section className="checkout-section">
                <div className="checkout-section-title">
                  <span><span className="checkout-step-number">3</span>{isMultiPayment ? 'Informe os pagamentos' : 'Escolha como será pago'}</span>
                  <button
                    type="button"
                    className="checkout-mode-button"
                    onClick={() => {
                      setIsMultiPayment(!isMultiPayment);
                      if (!isMultiPayment && payments.length === 1) setPayments([{ forma: 'pix', valor: totalFinal.toFixed(2) }]);
                    }}
                  ><Split size={15} /> {isMultiPayment ? 'Usar uma forma' : 'Usar mais de uma forma'}</button>
                </div>
                {!isMultiPayment ? (
                  <>
                    <div className="checkout-payment-grid">
                    {[
                      { id: 'pix', label: 'PIX', icon: QrCode },
                      { id: 'dinheiro', label: 'Dinheiro', icon: Banknote },
                      { id: 'debito', label: 'Débito', icon: CreditCard },
                      { id: 'credito', label: 'Crédito', icon: CreditCard },
                    ].map(({ id, label, icon: Icon }) => (
                      <button
                        key={id}
                        type="button"
                        onClick={() => setFormaPagamento(id)}
                        className={`checkout-payment-card ${formaPagamento === id ? 'selected' : ''}`}
                      ><Icon size={22} /><span>{label}</span></button>
                    ))}
                    </div>
                    {formaPagamento === 'dinheiro' && (
                      <div className="checkout-cash">
                        <label><span>Quanto o cliente entregou?</span><input type="number" min="0" step="1" placeholder={totalFinal.toFixed(2)} value={valorRecebido} onChange={(event) => setValorRecebido(event.target.value)} autoFocus /></label>
                        {numRecebido > 0 && !cashInsufficient && <div className="checkout-change"><span>Troco a devolver</span><strong>{money(troco)}</strong></div>}
                        {cashInsufficient && <div className="checkout-cash-error">O valor recebido é menor que o total da conta.</div>}
                        {!valorRecebido && <small className="text-slate-500">Deixe vazio quando o cliente pagar o valor exato.</small>}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="checkout-multi-list">
                    {payments.map((payment, index) => (
                      <div key={index} className="checkout-multi-row">
                        <select value={payment.forma} onChange={(event) => handleUpdatePayment(index, 'forma', event.target.value)} className="input-field">
                          <option value="pix">PIX</option><option value="dinheiro">Dinheiro</option><option value="debito">Débito</option><option value="credito">Crédito</option>
                        </select>
                        <input type="number" step="0.50" min="0" placeholder="Valor em R$" value={payment.valor} onChange={(event) => handleUpdatePayment(index, 'valor', event.target.value)} className="input-field" />
                        <button type="button" aria-label="Remover pagamento" disabled={payments.length === 1} onClick={() => handleRemovePaymentRow(index)} className="btn-icon"><Trash2 size={17} /></button>
                      </div>
                    ))}
                    <div className="checkout-multi-bottom">
                      <button type="button" onClick={handleAddPaymentRow}>+ Adicionar outra forma</button>
                      <strong>Falta pagar: {money(restanteMulti)}</strong>
                    </div>
                  </div>
                )}
              </section>
            </div>

            <footer className="checkout-footer">
              <button type="button" onClick={handleOpenWhatsappModal} className="checkout-whatsapp"><MessageSquare size={17} /> WhatsApp</button>
              <div className="checkout-footer-side">
                <button type="button" onClick={() => setShowCloseModal(false)} className="checkout-back" disabled={closing}>Voltar</button>
                <button type="button" onClick={handleFinalizePayment} disabled={closing || cashInsufficient || (isMultiPayment && restanteMulti > 0.01)} className="checkout-confirm">{closing ? 'Finalizando...' : `Confirmar ${money(totalFinal)}`}</button>
              </div>
            </footer>
          </div>
        </div>
      )}
      {showWhatsappModal && comanda && (
        <div className="modal-overlay">
          <div className="modal-content max-w-lg">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-white">
                  <MessageSquare size={18} />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-950">Enviar Conta via WhatsApp</h2>
                  <p className="text-xs text-slate-500">Mesa {comanda.mesa?.numero || 'Balcão'}</p>
                </div>
              </div>
              <button onClick={() => setShowWhatsappModal(false)} className="btn-icon">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSendWhatsapp} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                  Número de WhatsApp do Cliente *
                </label>
                <input
                  type="text"
                  required
                  placeholder="(00) 00000-0000"
                  value={whatsappPhone}
                  onChange={(e) => setWhatsappPhone(formatPhone(e.target.value))}
                  className="input-field mt-1 font-bold text-sm"
                  autoFocus
                />
              </div>

              <div className="flex items-center justify-between px-1">
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includePixInMessage}
                    onChange={(e) => setIncludePixInMessage(e.target.checked)}
                    className="rounded text-emerald-600"
                  />
                  Incluir Chave PIX na mensagem
                </label>

                <button
                  type="button"
                  onClick={handleCopyWhatsappText}
                  className="text-xs font-bold text-slate-700 hover:text-emerald-700 flex items-center gap-1 transition"
                >
                  {copied ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                  <span>{copied ? 'Copiado!' : 'Copiar Texto'}</span>
                </button>
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                  Pré-visualização da Mensagem:
                </label>
                <div className="rounded-xl border border-emerald-200 bg-[#e8f5e9]/70 p-4 text-[12px] text-slate-900 font-mono whitespace-pre-line leading-relaxed max-h-64 overflow-y-auto shadow-inner">
                  {generateWhatsappMessage()}
                </div>
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowWhatsappModal(false)}
                  className="btn-secondary btn-sm"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn-primary btn-sm bg-emerald-600 hover:bg-emerald-700 font-bold px-5"
                >
                  <MessageSquare size={15} />
                  <span>Abrir e Enviar no WhatsApp</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {showTransferModal && comanda && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-base font-bold text-slate-950">
                Transferir Mesa {comanda.mesa?.numero}
              </h2>
              <button onClick={() => setShowTransferModal(false)} className="btn-icon">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleTransferMesa} className="mt-4 space-y-4">
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
                    .filter((m) => m.status === 'livre' && !openComandas.some((c) => c.mesaId === m.id))
                    .map((m) => (
                      <option key={m.id} value={m.id}>
                        Mesa {m.numero}
                      </option>
                    ))}
                </select>
              </div>

              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowTransferModal(false)}
                  className="btn-secondary btn-sm"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn-primary btn-sm"
                  disabled={!targetMesaId}
                >
                  Transferir
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {showCancelComandaModal && comanda && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="flex items-center gap-2 text-red-600 border-b border-slate-100 pb-3">
              <AlertTriangle size={20} />
              <h2 className="text-base font-bold text-slate-950">Cancelar Comanda?</h2>
            </div>
            <p className="mt-3 text-xs text-slate-600">
              Ao cancelar a comanda da Mesa <strong>{comanda.mesa?.numero}</strong>, todos os itens serão devolvidos ao estoque e a mesa será liberada.
            </p>

            <form onSubmit={handleCancelComanda} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                  Motivo do Cancelamento (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ex: Cliente desistiu, erro de lançamento"
                  value={motivoCancelamento}
                  onChange={(e) => setMotivoCancelamento(e.target.value)}
                  className="input-field mt-1"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCancelComandaModal(false)}
                  className="btn-secondary btn-sm"
                >
                  Voltar
                </button>
                <button
                  type="submit"
                  className="btn-danger btn-sm"
                >
                  Confirmar Cancelamento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {cancelModalItem && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2 className="text-base font-bold text-slate-950">Remover Item?</h2>
            <p className="mt-2 text-xs text-slate-600">
              Deseja remover <strong>{cancelModalItem.quantidade}x {cancelModalItem.nome}</strong> desta comanda? O item retornará ao estoque.
            </p>

            <div className="mt-5 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setCancelModalItem(null)}
                className="btn-secondary btn-sm"
              >
                Voltar
              </button>
              <button
                type="button"
                onClick={handleConfirmCancelPedido}
                className="btn-danger btn-sm"
              >
                Remover Item
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
