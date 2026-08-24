import { CalendarClock, CheckCircle2, CircleDollarSign, History, Pencil, Plus, ReceiptText, XCircle } from 'lucide-react';
import { formatDate, formatMoney, statusStyle } from '../subscription-utils';

export default function BillingPanel({ summary, charges, loading, canWrite, showCreateButton = true, onCreate, onEdit, onPay, onCancel, onHistory }) {
  const cards = [
    { label: 'A receber', value: formatMoney(summary.outstandingTotal), icon: CircleDollarSign, tone: 'text-blue-700 bg-blue-50' },
    { label: 'Pendentes', value: summary.pending, icon: CalendarClock, tone: 'text-amber-700 bg-amber-50' },
    { label: 'Inadimplentes', value: summary.overdue, icon: XCircle, tone: 'text-rose-700 bg-rose-50' },
    { label: 'Recebido no mês', value: formatMoney(summary.receivedThisMonth), icon: CheckCircle2, tone: 'text-emerald-700 bg-emerald-50' },
    { label: 'Receita recorrente', value: formatMoney(summary.recurringMonthly), icon: ReceiptText, tone: 'text-violet-700 bg-violet-50' },
    { label: 'Assinaturas canceladas', value: summary.cancelledSubscribers || 0, icon: XCircle, tone: 'text-slate-700 bg-slate-100' },
  ];

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div><h2 className="text-lg font-extrabold text-slate-900">Cobranças e histórico de pagamentos</h2><p className="text-sm text-slate-500">Controle vencimentos, recebimentos e inadimplência.</p></div>
        {canWrite && showCreateButton && <button className="btn-primary bg-blue-600 hover:bg-blue-700" onClick={() => onCreate(null)}><Plus size={17} />Nova cobrança</button>}
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map(({ label, value, icon: Icon, tone }) => <article key={label} className="panel flex items-center gap-3 p-4"><div className={`rounded-xl p-2.5 ${tone}`}><Icon size={20} /></div><div><p className="text-lg font-extrabold text-slate-900">{value}</p><p className="text-xs font-semibold text-slate-500">{label}</p></div></article>)}
      </div>
      <div className="panel overflow-hidden">
        <div className="responsive-table-wrap overflow-x-auto">
          <table className="responsive-data-table w-full min-w-[850px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500"><tr><th className="px-5 py-3">Assinante</th><th className="px-5 py-3">Descrição</th><th className="px-5 py-3">Valor</th><th className="px-5 py-3">Vencimento</th><th className="px-5 py-3">Situação</th><th className="px-5 py-3 text-right">Ações</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {charges.map((charge) => <tr key={charge.id} className="hover:bg-slate-50/70">
                <td data-label="Assinante" className="px-5 py-4 font-bold text-slate-900">{charge.subscriber.businessName}</td>
                <td data-label="Descrição" className="px-5 py-4 text-slate-600">{charge.description || 'Mensalidade'}</td>
                <td data-label="Valor" className="px-5 py-4 font-extrabold text-slate-900">{formatMoney(charge.amount)}</td>
                <td data-label="Vencimento" className="px-5 py-4"><p className="font-semibold text-slate-700">{formatDate(charge.dueDate)}</p>{charge.paidAt && <p className="text-xs text-emerald-700">Pago em {formatDate(charge.paidAt)}</p>}</td>
                <td data-label="Situação" className="px-5 py-4"><span className={`status-chip ${statusStyle[charge.status]}`}>{charge.status}</span>{charge.paymentMethod && <p className="mt-1 text-xs text-slate-500">{charge.paymentMethod}</p>}</td>
                <td data-label="Ações" className="px-5 py-4"><div className="responsive-table-actions flex flex-wrap justify-end gap-2">
                  <button className="btn-secondary px-3" title="Histórico" onClick={() => onHistory(charge)}><History size={15} /><span className="md:hidden">Histórico</span></button>
                  {canWrite && ['pendente', 'vencida'].includes(charge.status) && <><button className="btn-secondary px-3" title="Editar" onClick={() => onEdit(charge)}><Pencil size={15} /><span className="md:hidden">Editar</span></button><button className="btn-primary bg-emerald-600 px-3 hover:bg-emerald-700" onClick={() => onPay(charge)}><ReceiptText size={15} />Receber</button><button className="btn-secondary px-3 text-rose-700" onClick={() => onCancel(charge)}>Cancelar</button></>}
                </div></td>
              </tr>)}
              {!loading && charges.length === 0 && <tr className="responsive-table-empty"><td colSpan="6" className="px-5 py-12 text-center text-slate-500">Nenhuma cobrança cadastrada.</td></tr>}
              {loading && <tr className="responsive-table-empty"><td colSpan="6" className="px-5 py-12 text-center text-slate-500">Carregando cobranças...</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
