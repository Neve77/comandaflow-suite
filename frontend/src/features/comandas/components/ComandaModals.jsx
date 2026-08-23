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
  return (
    <>
      {showCloseModal && comanda && (
        <div className="modal-overlay">
          <div className="modal-content max-w-xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-base font-bold text-slate-950">
                  Fechar Comanda — Mesa {comanda.mesa?.numero || '00'}
                </h2>
                <p className="text-xs text-slate-500">
                  {comanda.clienteNome ? `Cliente: ${comanda.clienteNome}` : 'Atendimento avulso'}
                </p>
              </div>
              <button onClick={() => setShowCloseModal(false)} className="btn-icon">
                <X size={18} />
              </button>
            </div>

            <div className="mt-4 space-y-4">
              <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 space-y-2 text-sm">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal:</span>
                  <span className="font-bold text-slate-950">R$ {subtotal.toFixed(2)}</span>
                </div>

                <div className="flex items-center justify-between gap-4">
                  <span className="text-slate-600 font-medium">Desconto (R$):</span>
                  <input
                    type="number"
                    min="0"
                    step="0.50"
                    value={desconto}
                    onChange={(e) => setDesconto(e.target.value)}
                    className="input-field max-w-[110px] py-1 px-2 text-right font-bold text-xs"
                  />
                </div>

                <div className="border-t border-slate-200 pt-2 flex justify-between text-base font-black text-slate-950">
                  <span>Total a Pagar:</span>
                  <span className="text-emerald-700">R$ {totalFinal.toFixed(2)}</span>
                </div>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-white">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                  <Users2 size={16} className="text-slate-500" />
                  <span>Dividir entre quantas pessoas?</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center border border-slate-300 rounded-lg overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setNumPessoas(p => Math.max(1, p - 1))}
                      className="px-2.5 py-1 text-slate-700 hover:bg-slate-100 font-bold"
                    >
                      -
                    </button>
                    <span className="px-3 py-1 font-bold text-xs bg-slate-50 text-slate-900">
                      {numPessoas}
                    </span>
                    <button
                      type="button"
                      onClick={() => setNumPessoas(p => p + 1)}
                      className="px-2.5 py-1 text-slate-700 hover:bg-slate-100 font-bold"
                    >
                      +
                    </button>
                  </div>
                  {numPessoas > 1 && (
                    <span className="text-xs font-black text-emerald-700">
                      = {money(valorPorPessoa)} / pessoa
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  {isMultiPayment ? 'Pagamentos Múltiplos / Parciais' : 'Forma de Pagamento'}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setIsMultiPayment(!isMultiPayment);
                    if (!isMultiPayment && payments.length === 1) {
                      setPayments([{ forma: 'pix', valor: totalFinal.toFixed(2) }]);
                    }
                  }}
                  className="text-xs font-bold text-emerald-700 hover:underline flex items-center gap-1"
                >
                  <Split size={13} />
                  {isMultiPayment ? 'Usar pagamento único' : 'Dividir formas de pagamento'}
                </button>
              </div>
              {!isMultiPayment ? (
                <div>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { id: 'pix', label: 'PIX', icon: QrCode },
                      { id: 'dinheiro', label: 'Dinheiro', icon: Banknote },
                      { id: 'debito', label: 'Cartão Débito', icon: CreditCard },
                      { id: 'credito', label: 'Cartão Crédito', icon: CreditCard }
                    ].map(({ id, label, icon: Icon }) => (
                      <button
                        key={id}
                        type="button"
                        onClick={() => setFormaPagamento(id)}
                        className={`flex items-center gap-2 rounded-lg border p-3 font-semibold text-xs transition ${
                          formaPagamento === id
                            ? 'border-slate-950 bg-slate-950 text-white shadow-sm'
                            : 'border-slate-200 bg-white text-slate-800 hover:bg-slate-50'
                        }`}
                      >
                        <Icon size={16} />
                        <span>{label}</span>
                      </button>
                    ))}
                  </div>
                  {formaPagamento === 'dinheiro' && (
                    <div className="mt-3 rounded-xl border border-slate-300 bg-slate-50 p-3.5 space-y-2">
                      <div className="flex items-center justify-between gap-3">
                        <label className="text-xs font-bold uppercase tracking-wider text-slate-800">
                          Valor Recebido:
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="1"
                          placeholder="Ex: 50"
                          value={valorRecebido}
                          onChange={(e) => setValorRecebido(e.target.value)}
                          className="input-field max-w-[120px] py-1.5 px-3 text-right font-bold text-xs bg-white"
                          autoFocus
                        />
                      </div>

                      {numRecebido > 0 && (
                        <div className="flex justify-between items-center border-t border-slate-200 pt-2 text-xs font-bold text-slate-900">
                          <span>Troco a devolver:</span>
                          <span className="text-base text-emerald-700">
                            R$ {troco.toFixed(2)}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {payments.map((p, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <select
                        value={p.forma}
                        onChange={(e) => handleUpdatePayment(idx, 'forma', e.target.value)}
                        className="input-field max-w-[150px] py-2 text-xs font-semibold"
                      >
                        <option value="pix">PIX</option>
                        <option value="dinheiro">Dinheiro</option>
                        <option value="debito">Cartão Débito</option>
                        <option value="credito">Cartão Crédito</option>
                      </select>

                      <div className="relative flex-1">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-bold">R$</span>
                        <input
                          type="number"
                          step="0.50"
                          min="0"
                          placeholder="0,00"
                          value={p.valor}
                          onChange={(e) => handleUpdatePayment(idx, 'valor', e.target.value)}
                          className="input-field pl-9 py-2 text-xs font-bold"
                        />
                      </div>

                      {payments.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemovePaymentRow(idx)}
                          className="p-2 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  ))}

                  <div className="flex items-center justify-between pt-1">
                    <button
                      type="button"
                      onClick={handleAddPaymentRow}
                      className="text-xs font-bold text-emerald-700 hover:underline"
                    >
                      + Adicionar outra forma de pagamento
                    </button>

                    <div className="text-right text-xs font-bold">
                      <span className="text-slate-500">Restante: </span>
                      <span className={restanteMulti === 0 ? 'text-emerald-700' : 'text-amber-700'}>
                        R$ {restanteMulti.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              )}
              <div className="flex justify-between items-center pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleOpenWhatsappModal}
                  className="btn-secondary btn-sm text-emerald-700 border-emerald-200 hover:bg-emerald-50 font-bold"
                >
                  <MessageSquare size={14} />
                  <span>Enviar no WhatsApp</span>
                </button>

                <div className="flex gap-2.5">
                  <button
                    type="button"
                    onClick={() => setShowCloseModal(false)}
                    className="btn-secondary btn-sm"
                    disabled={closing}
                  >
                    Voltar
                  </button>
                  <button
                    type="button"
                    onClick={handleFinalizePayment}
                    disabled={closing || (isMultiPayment && restanteMulti > 0.01)}
                    className="btn-success btn-sm px-6 font-bold"
                  >
                    {closing ? 'Finalizando...' : 'Confirmar Pagamento'}
                  </button>
                </div>
              </div>
            </div>
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
