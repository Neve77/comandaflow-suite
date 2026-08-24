import { useState } from 'react';
import { CheckCircle2, History, X } from 'lucide-react';
import { formatDate, formatMoney } from '../subscription-utils';

function Modal({ title, subtitle, onClose, children }) {
  return (
    <div className="manager-modal-overlay fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/70 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="manager-modal-card flex w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl" role="dialog" aria-modal="true" aria-label={title}>
        <header className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-100 p-5">
          <div className="min-w-0"><h2 className="text-lg font-extrabold text-slate-900">{title}</h2><p className="mt-1 text-sm text-slate-500">{subtitle}</p></div>
          <button type="button" className="btn-icon shrink-0" aria-label="Fechar" onClick={onClose}><X size={19} /></button>
        </header>
        <div className="manager-modal-body overflow-y-auto">{children}</div>
      </section>
    </div>
  );
}

const dateInput = (value) => {
  const date = value ? new Date(value) : new Date(Date.now() + 7 * 86400000);
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 10);
};

export function BillingChargeModal({ subscribers, initial, onClose, onSave }) {
  const [form, setForm] = useState({
    subscriberId: initial?.subscriberId || '',
    amount: initial?.amount || '',
    dueDate: dateInput(initial?.dueDate),
    description: initial?.description || 'Mensalidade',
    recurring: false,
    billingCycleDays: 30,
  });
  const [saving, setSaving] = useState(false); const [error, setError] = useState('');
  const submit = async (event) => { event.preventDefault(); setSaving(true); setError(''); try { const dueDate = new Date(`${form.dueDate}T23:59:59.999`); await onSave({ ...form, amount: Number(form.amount), dueDate: dueDate.toISOString() }); } catch (requestError) { setError(requestError.message); } finally { setSaving(false); } };
  return <Modal title={initial?.id ? 'Editar cobrança' : 'Nova cobrança'} subtitle="Informe o valor e o vencimento da mensalidade." onClose={onClose}><form className="grid gap-4 p-5 sm:grid-cols-2" onSubmit={submit}><label className="text-xs font-bold uppercase tracking-wider text-slate-600 sm:col-span-2">Assinante<select className="input-field mt-1.5" disabled={Boolean(initial?.id)} value={form.subscriberId} onChange={(event) => setForm((value) => ({ ...value, subscriberId: event.target.value }))} required><option value="">Selecione...</option>{subscribers.filter((item) => item.status !== 'cancelado').map((item) => <option key={item.id} value={item.id}>{item.businessName}</option>)}</select></label><label className="text-xs font-bold uppercase tracking-wider text-slate-600">Valor<input type="number" min="0.01" step="0.01" className="input-field mt-1.5" value={form.amount} onChange={(event) => setForm((value) => ({ ...value, amount: event.target.value }))} required /></label><label className="text-xs font-bold uppercase tracking-wider text-slate-600">Vencimento<input type="date" className="input-field mt-1.5" value={form.dueDate} onChange={(event) => setForm((value) => ({ ...value, dueDate: event.target.value }))} required /></label><label className="text-xs font-bold uppercase tracking-wider text-slate-600 sm:col-span-2">Descrição<input className="input-field mt-1.5" maxLength="250" value={form.description} onChange={(event) => setForm((value) => ({ ...value, description: event.target.value }))} /></label>{!initial?.id && <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 sm:col-span-2"><label className="flex items-center gap-3 text-sm font-bold text-slate-800"><input type="checkbox" checked={form.recurring} onChange={(event) => setForm((value) => ({ ...value, recurring: event.target.checked }))} />Gerar esta mensalidade automaticamente</label>{form.recurring && <label className="mt-3 block text-xs font-bold uppercase tracking-wider text-slate-600">Repetir a cada<input type="number" min="1" max="365" className="input-field mt-1.5" value={form.billingCycleDays} onChange={(event) => setForm((value) => ({ ...value, billingCycleDays: Number(event.target.value) }))} /><span className="mt-1 block normal-case font-medium text-slate-500">dias após cada vencimento</span></label>}</div>}{error && <div className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700 sm:col-span-2">{error}</div>}<div className="flex justify-end gap-3 border-t border-slate-100 pt-4 sm:col-span-2"><button type="button" className="btn-secondary" onClick={onClose}>Cancelar</button><button className="btn-primary bg-blue-600 hover:bg-blue-700" disabled={saving}>{saving ? 'Salvando...' : 'Salvar cobrança'}</button></div></form></Modal>;
}

export function RecurringBillingModal({ subscriber, onClose, onSave }) {
  const [form, setForm] = useState({
    enabled: Boolean(subscriber.recurringBillingEnabled),
    amount: subscriber.recurringAmount || '',
    billingCycleDays: subscriber.billingCycleDays || 30,
    nextBillingDate: dateInput(subscriber.nextBillingDate),
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const submit = async (event) => {
    event.preventDefault(); setSaving(true); setError('');
    try {
      await onSave(form.enabled ? { ...form, amount: Number(form.amount), billingCycleDays: Number(form.billingCycleDays), nextBillingDate: new Date(`${form.nextBillingDate}T23:59:59.999`).toISOString() } : { enabled: false });
    } catch (requestError) { setError(requestError.message); } finally { setSaving(false); }
  };
  return <Modal title="Mensalidade recorrente" subtitle={subscriber.businessName} onClose={onClose}><form className="grid gap-4 p-5 sm:grid-cols-2" onSubmit={submit}><label className="flex items-center gap-3 rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm font-bold text-slate-800 sm:col-span-2"><input type="checkbox" checked={form.enabled} onChange={(event) => setForm((value) => ({ ...value, enabled: event.target.checked }))} />Gerar cobranças automaticamente</label>{form.enabled && <><label className="text-xs font-bold uppercase tracking-wider text-slate-600">Valor<input type="number" min="0.01" step="0.01" className="input-field mt-1.5" value={form.amount} onChange={(event) => setForm((value) => ({ ...value, amount: event.target.value }))} required /></label><label className="text-xs font-bold uppercase tracking-wider text-slate-600">Intervalo em dias<input type="number" min="1" max="365" className="input-field mt-1.5" value={form.billingCycleDays} onChange={(event) => setForm((value) => ({ ...value, billingCycleDays: event.target.value }))} required /></label><label className="text-xs font-bold uppercase tracking-wider text-slate-600 sm:col-span-2">Próximo vencimento<input type="date" className="input-field mt-1.5" value={form.nextBillingDate} onChange={(event) => setForm((value) => ({ ...value, nextBillingDate: event.target.value }))} required /></label></>}{error && <div className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700 sm:col-span-2">{error}</div>}<div className="flex justify-end gap-3 border-t border-slate-100 pt-4 sm:col-span-2"><button type="button" className="btn-secondary" onClick={onClose}>Cancelar</button><button className="btn-primary bg-blue-600 hover:bg-blue-700" disabled={saving}>{saving ? 'Salvando...' : 'Salvar recorrência'}</button></div></form></Modal>;
}

export function PaymentModal({ charge, onClose, onPay }) {
  const [form, setForm] = useState({ paymentMethod: 'pix', notes: '' }); const [saving, setSaving] = useState(false); const [error, setError] = useState('');
  const submit = async (event) => { event.preventDefault(); setSaving(true); setError(''); try { await onPay(form); } catch (requestError) { setError(requestError.message); } finally { setSaving(false); } };
  return <Modal title="Registrar pagamento" subtitle={`${charge.subscriber.businessName} · ${formatMoney(charge.amount)}`} onClose={onClose}><form className="space-y-4 p-5" onSubmit={submit}><label className="block text-xs font-bold uppercase tracking-wider text-slate-600">Forma de pagamento<select className="input-field mt-1.5" value={form.paymentMethod} onChange={(event) => setForm((value) => ({ ...value, paymentMethod: event.target.value }))}>{['pix', 'dinheiro', 'transferencia', 'cartao', 'boleto', 'outro'].map((value) => <option key={value}>{value}</option>)}</select></label><label className="block text-xs font-bold uppercase tracking-wider text-slate-600">Observação<textarea className="input-field mt-1.5 min-h-24" value={form.notes} onChange={(event) => setForm((value) => ({ ...value, notes: event.target.value }))} /></label>{error && <div className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</div>}<div className="flex justify-end gap-3 border-t border-slate-100 pt-4"><button type="button" className="btn-secondary" onClick={onClose}>Voltar</button><button className="btn-primary bg-emerald-600 hover:bg-emerald-700" disabled={saving}><CheckCircle2 size={17} />{saving ? 'Registrando...' : 'Confirmar recebimento'}</button></div></form></Modal>;
}

export function BillingHistoryModal({ charge, onClose }) {
  return <Modal title="Histórico da cobrança" subtitle={`${charge.subscriber.businessName} · vencimento ${formatDate(charge.dueDate)}`} onClose={onClose}><div className="space-y-3 p-5">{charge.events.map((event) => <div key={event.id} className="flex gap-3 rounded-xl border border-slate-200 p-3"><History size={17} className="mt-0.5 shrink-0 text-slate-500" /><div><p className="text-sm font-bold text-slate-900">{event.message || event.type}</p><p className="mt-1 text-xs text-slate-500">{new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(event.createdAt))}{event.fromStatus && ` · ${event.fromStatus} → ${event.toStatus}`}</p></div></div>)}{charge.events.length === 0 && <p className="py-8 text-center text-sm text-slate-500">Sem eventos registrados.</p>}<div className="flex justify-end"><button className="btn-secondary" onClick={onClose}>Fechar</button></div></div></Modal>;
}
