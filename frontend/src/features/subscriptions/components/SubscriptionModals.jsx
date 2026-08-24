import { useState } from 'react';
import {
  AlertTriangle,
  Clock3,
  Copy,
  Globe2,
  KeyRound,
  MessageSquare,
  UploadCloud,
  X,
} from 'lucide-react';
import { emptySubscriber, formatDate, planDays } from '../subscription-utils';

function Modal({ title, subtitle, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl">
        <header className="flex items-start justify-between border-b border-slate-100 p-5"><div><h2 className="text-lg font-extrabold text-slate-900">{title}</h2><p className="mt-1 text-sm text-slate-500">{subtitle}</p></div><button className="btn-icon" onClick={onClose}><X size={19} /></button></header>
        {children}
      </section>
    </div>
  );
}

function Field({ label, children }) {
  return <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">{label}<div className="mt-1.5">{children}</div></label>;
}

export function SubscriberModal({ initial, onClose, onSave }) {
  const [form, setForm] = useState({ ...emptySubscriber, ...initial });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const set = (field) => (event) => setForm((value) => ({ ...value, [field]: event.target.value }));
  const submit = async (event) => {
    event.preventDefault(); setSaving(true); setError('');
    try { await onSave(form); } catch (saveError) { setError(saveError.message); } finally { setSaving(false); }
  };
  return <Modal title={initial.id ? 'Editar assinante' : 'Novo assinante'} subtitle="Dados de contato e identificacao do cliente." onClose={onClose}>
    <form onSubmit={submit} className="grid gap-4 p-5 sm:grid-cols-2">
      <Field label="Empresa / estabelecimento *"><input className="input-field" value={form.businessName} onChange={set('businessName')} required /></Field>
      <Field label="Responsavel"><input className="input-field" value={form.contactName || ''} onChange={set('contactName')} /></Field>
      <Field label="E-mail *"><input type="email" className="input-field" value={form.email} onChange={set('email')} required /></Field>
      <Field label="Telefone"><input className="input-field" value={form.phone || ''} onChange={set('phone')} /></Field>
      <Field label="CPF / CNPJ"><input className="input-field" value={form.document || ''} onChange={set('document')} /></Field>
      <div className="sm:col-span-2"><Field label="Observacoes"><textarea className="input-field min-h-24" value={form.notes || ''} onChange={set('notes')} /></Field></div>
      {error && <div className="sm:col-span-2 rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</div>}
      <div className="flex justify-end gap-3 border-t border-slate-100 pt-4 sm:col-span-2"><button type="button" className="btn-secondary" onClick={onClose}>Cancelar</button><button className="btn-primary bg-emerald-600 hover:bg-emerald-700" disabled={saving}>{saving ? 'Salvando...' : 'Salvar assinante'}</button></div>
    </form>
  </Modal>;
}

export function IssueModal({ subscriber, onClose, onIssue }) {
  const [form, setForm] = useState({ plan: 'Mensal', days: 30, maxDevices: 1 });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const setPlan = (event) => {
    const plan = event.target.value;
    setForm((value) => ({ ...value, plan, days: planDays[plan] }));
  };
  const submit = async (event) => {
    event.preventDefault(); setSaving(true); setError('');
    try { await onIssue({ ...form, days: Number(form.days), maxDevices: Number(form.maxDevices) }); } catch (issueError) { setError(issueError.message); } finally { setSaving(false); }
  };
  return <Modal title="Emitir assinatura" subtitle={`Nova chave para ${subscriber.businessName}. A chave ativa anterior sera substituida no painel.`} onClose={onClose}>
    <form onSubmit={submit} className="grid gap-4 p-5 sm:grid-cols-3">
      <Field label="Plano"><select className="input-field" value={form.plan} onChange={setPlan}>{Object.keys(planDays).map((plan) => <option key={plan}>{plan}</option>)}</select></Field>
      <Field label="Validade (dias)"><input type="number" min="1" max="3650" className="input-field" value={form.days} onChange={(event) => setForm((value) => ({ ...value, days: event.target.value }))} /></Field>
      <Field label="Dispositivos"><input type="number" min="1" max="50" className="input-field" value={form.maxDevices} onChange={(event) => setForm((value) => ({ ...value, maxDevices: event.target.value }))} /></Field>
      <div className="sm:col-span-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs leading-5 text-emerald-800">A chave sera ligada ao seu servidor online. Suspensoes, prazos e mensagens serao sincronizados automaticamente com os computadores deste cliente.</div>
      {error && <div className="sm:col-span-3 rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</div>}
      <div className="flex justify-end gap-3 border-t border-slate-100 pt-4 sm:col-span-3"><button type="button" className="btn-secondary" onClick={onClose}>Cancelar</button><button className="btn-primary bg-emerald-600 hover:bg-emerald-700" disabled={saving}><KeyRound size={17} />{saving ? 'Emitindo...' : 'Gerar chave'}</button></div>
    </form>
  </Modal>;
}

export function SuspensionModal({ subscriber, defaultMessage, onClose, onSuspend }) {
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
  tomorrow.setMinutes(tomorrow.getMinutes() - tomorrow.getTimezoneOffset());
  const [form, setForm] = useState({
    mode: 'imediato',
    accessUntil: tomorrow.toISOString().slice(0, 16),
    message: subscriber.customerMessage || defaultMessage,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const submit = async (event) => {
    event.preventDefault(); setSaving(true); setError('');
    try { await onSuspend(form); } catch (suspendError) { setError(suspendError.message); } finally { setSaving(false); }
  };

  return <Modal title="Suspender acesso" subtitle={`Defina como ${subscriber.businessName} sera afetado.`} onClose={onClose}>
    <form onSubmit={submit} className="space-y-5 p-5">
      <div className="grid gap-3 sm:grid-cols-2">
        <button type="button" onClick={() => setForm((value) => ({ ...value, mode: 'imediato' }))} className={`rounded-xl border p-4 text-left ${form.mode === 'imediato' ? 'border-rose-400 bg-rose-50 ring-2 ring-rose-100' : 'border-slate-200'}`}>
          <div className="flex items-center gap-2 font-extrabold text-slate-900"><AlertTriangle size={18} className="text-rose-600" />Bloquear imediatamente</div>
          <p className="mt-2 text-xs leading-5 text-slate-600">O cliente perde o acesso na proxima verificacao online, normalmente em ate 1 minuto.</p>
        </button>
        <button type="button" onClick={() => setForm((value) => ({ ...value, mode: 'prazo' }))} className={`rounded-xl border p-4 text-left ${form.mode === 'prazo' ? 'border-amber-400 bg-amber-50 ring-2 ring-amber-100' : 'border-slate-200'}`}>
          <div className="flex items-center gap-2 font-extrabold text-slate-900"><Clock3 size={18} className="text-amber-600" />Liberar ate o prazo</div>
          <p className="mt-2 text-xs leading-5 text-slate-600">Exibe sua mensagem, mantem o sistema aberto e bloqueia automaticamente ao vencer o prazo.</p>
        </button>
      </div>
      {form.mode === 'prazo' && <Field label="Acesso permitido ate *"><input type="datetime-local" className="input-field" value={form.accessUntil} onChange={(event) => setForm((value) => ({ ...value, accessUntil: event.target.value }))} required /></Field>}
      <Field label="Mensagem para o cliente *"><textarea className="input-field min-h-28" maxLength="600" value={form.message} onChange={(event) => setForm((value) => ({ ...value, message: event.target.value }))} required /></Field>
      {error && <div className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</div>}
      <div className="flex justify-end gap-3 border-t border-slate-100 pt-4"><button type="button" className="btn-secondary" onClick={onClose}>Voltar</button><button className="btn-primary bg-amber-600 hover:bg-amber-700" disabled={saving}><AlertTriangle size={17} />{saving ? 'Aplicando...' : 'Aplicar suspensao'}</button></div>
    </form>
  </Modal>;
}

export function CancellationModal({ subscriber, onClose, onCancel }) {
  const [message, setMessage] = useState('Sua conta foi cancelada. Entre em contato com o atendimento para mais informações.');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const submit = async (event) => { event.preventDefault(); setSaving(true); setError(''); try { await onCancel({ message }); } catch (cancelError) { setError(cancelError.message); } finally { setSaving(false); } };
  return <Modal title="Cancelar conta" subtitle={`O acesso de ${subscriber.businessName} será encerrado imediatamente.`} onClose={onClose}><form className="space-y-4 p-5" onSubmit={submit}><div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">Esta ação cancela a conta, interrompe a cobrança recorrente e bloqueia todas as instalações. O cadastro e o histórico financeiro serão preservados.</div><Field label="Mensagem exibida ao cliente *"><textarea className="input-field min-h-28" minLength={3} maxLength={600} value={message} onChange={(event) => setMessage(event.target.value)} required /></Field>{error && <div className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</div>}<div className="flex justify-end gap-3 border-t border-slate-100 pt-4"><button type="button" className="btn-secondary" onClick={onClose}>Voltar</button><button className="btn-primary bg-rose-600 hover:bg-rose-700" disabled={saving}>{saving ? 'Cancelando...' : 'Confirmar cancelamento'}</button></div></form></Modal>;
}

export function MessageModal({ data, onClose, onCopy }) {
  return <Modal title="Mensagem pronta" subtitle={`Suspensao aplicada para ${data.customer.businessName}.`} onClose={onClose}>
    <div className="space-y-4 p-5">
      <div className="flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4 text-blue-900"><MessageSquare className="mt-0.5 shrink-0" size={20} /><div><p className="text-xs font-bold uppercase tracking-wider">Mensagem que aparecera no aplicativo</p><p className="mt-2 whitespace-pre-wrap text-sm leading-6">{data.message}</p></div></div>
      {data.mode === 'prazo' && <p className="text-sm text-slate-600">O acesso ficara liberado ate <strong>{new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(data.accessUntil))}</strong>.</p>}
      {data.customer.phone && <p className="text-sm text-slate-600">Contato cadastrado: <strong>{data.customer.phone}</strong></p>}
      <div className="flex justify-end gap-3"><button className="btn-secondary" onClick={onClose}>Fechar</button><button className="btn-primary bg-blue-600 hover:bg-blue-700" onClick={onCopy}><Copy size={17} />Copiar mensagem</button></div>
    </div>
  </Modal>;
}

export function ServerSettingsModal({ initial, onClose, onSave }) {
  const [form, setForm] = useState({ ...initial });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const set = (field) => (event) => setForm((value) => ({ ...value, [field]: event.target.value }));
  const submit = async (event) => {
    event.preventDefault(); setSaving(true); setError('');
    try { await onSave(form); } catch (saveError) { setError(saveError.message); } finally { setSaving(false); }
  };
  return <Modal title="Servidor online" subtitle="Este endereco conecta os aplicativos dos clientes ao Gestor aberto no seu computador." onClose={onClose}>
    <form onSubmit={submit} className="grid gap-4 p-5 sm:grid-cols-2">
      <div className="sm:col-span-2"><Field label="Endereco publico fixo *"><input type="url" className="input-field" placeholder="https://assinaturas.seudominio.com" value={form.publicServerUrl} onChange={set('publicServerUrl')} required /></Field></div>
      <Field label="Tolerancia sem internet (horas)"><input type="number" min="1" max="168" className="input-field" value={form.offlineGraceHours} onChange={set('offlineGraceHours')} required /></Field>
      <Field label="Verificacao de seguranca (minutos)"><input type="number" min="1" max="60" className="input-field" value={form.syncIntervalMinutes} onChange={set('syncIntervalMinutes')} required /></Field>
      <Field label="Tolerância após vencimento (dias)"><input type="number" min="0" max="90" className="input-field" value={form.paymentGraceDays} onChange={set('paymentGraceDays')} required /></Field>
      <label className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 sm:col-span-2"><input type="checkbox" className="mt-1" checked={Boolean(form.automaticSuspensionEnabled)} onChange={(event) => setForm((value) => ({ ...value, automaticSuspensionEnabled: event.target.checked }))} /><span><strong>Suspensão automática por inadimplência</strong><br /><span className="text-xs">Bloqueia o cliente quando uma cobrança ultrapassar o período de tolerância.</span></span></label>
      <div className="sm:col-span-2"><Field label="Mensagem padrao de suspensao"><textarea className="input-field min-h-24" maxLength="600" value={form.defaultSuspensionMessage} onChange={set('defaultSuspensionMessage')} required /></Field></div>
      <div className="sm:col-span-2 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs leading-5 text-slate-600">Cole aqui o endereco <strong>HTTPS publico</strong>, como https://assinaturas.seudominio.com. Dentro do servico de tunel, ele deve apontar para <strong>http://127.0.0.1:3012</strong>. Nunca cole 127.0.0.1 neste campo.</div>
      {error && <div className="sm:col-span-2 rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</div>}
      <div className="flex justify-end gap-3 border-t border-slate-100 pt-4 sm:col-span-2"><button type="button" className="btn-secondary" onClick={onClose}>Cancelar</button><button className="btn-primary bg-emerald-600 hover:bg-emerald-700" disabled={saving}><Globe2 size={17} />{saving ? 'Salvando...' : 'Salvar servidor'}</button></div>
    </form>
  </Modal>;
}

export function PublishUpdateModal({ current, managerCurrent, initialProduct = 'client', subscribers, onClose, onPublish }) {
  const suggestVersion = (manifest) => manifest?.version
    ? manifest.version.split('.').map(Number).map((part, index, list) => index === list.length - 1 ? part + 1 : part).join('.')
    : '';
  const [form, setForm] = useState({ product: initialProduct, version: suggestVersion(initialProduct === 'manager' ? managerCurrent : current), releaseNotes: '', mandatory: false, file: null, rollout: initialProduct === 'manager' ? 'all' : 'pilot', pilotSubscriberIds: [] });
  const [saving, setSaving] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const submit = async (event) => {
    event.preventDefault(); setSaving(true); setError(''); setProgress(0);
    if (!form.file) { setError('Selecione o instalador .exe correspondente.'); setSaving(false); return; }
    if (form.product === 'client' && form.rollout === 'pilot' && !form.pilotSubscriberIds.length) { setError('Selecione pelo menos um cliente de teste.'); setSaving(false); return; }
    try { await onPublish(form, setProgress); } catch (publishError) { setError(publishError.message); } finally { setSaving(false); }
  };
  return <Modal title="Publicar atualização" subtitle="Envie separadamente o instalador do Gestor ou dos restaurantes." onClose={onClose}>
    <form onSubmit={submit} className="grid gap-4 p-5 sm:grid-cols-2">
      <Field label="Aplicativo *"><select className="input-field" value={form.product} onChange={(event) => { const product = event.target.value; setForm((value) => ({ ...value, product, version: suggestVersion(product === 'manager' ? managerCurrent : current), file: null, rollout: product === 'client' ? value.rollout : 'all', pilotSubscriberIds: product === 'client' ? value.pilotSubscriberIds : [] })); }}><option value="client">Restaurantes</option><option value="manager">Gestor</option></select></Field>
      <Field label="Nova versão *"><input className="input-field" pattern="\d+\.\d+\.\d+" placeholder="2.4.0" value={form.version} onChange={(event) => setForm((value) => ({ ...value, version: event.target.value }))} required /></Field>
      <Field label="Instalador Windows *"><input type="file" accept=".exe,application/vnd.microsoft.portable-executable" className="input-field text-xs" onChange={(event) => setForm((value) => ({ ...value, file: event.target.files?.[0] || null }))} required /></Field>
      <div className="sm:col-span-2"><Field label="O que mudou nesta versão *"><textarea className="input-field min-h-28" maxLength="4000" placeholder={'Exemplo:\n- Nova tela de pedidos\n- Correção na impressão'} value={form.releaseNotes} onChange={(event) => setForm((value) => ({ ...value, releaseNotes: event.target.value }))} required /></Field></div>
      {form.product === 'client' && <Field label="Liberação inicial"><select className="input-field" value={form.rollout} onChange={(event) => setForm((value) => ({ ...value, rollout: event.target.value }))}><option value="pilot">Somente clientes de teste</option><option value="all">Todos os clientes</option></select></Field>}
      {form.product === 'client' && form.rollout === 'pilot' && <div className="sm:col-span-2"><Field label="Clientes de teste *"><select multiple className="input-field min-h-28" value={form.pilotSubscriberIds} onChange={(event) => setForm((value) => ({ ...value, pilotSubscriberIds: [...event.target.selectedOptions].map((option) => option.value) }))}>{subscribers.filter((item) => item.status === 'ativo').map((item) => <option key={item.id} value={item.id}>{item.businessName}</option>)}</select></Field><p className="mt-1 text-xs text-slate-500">Use Ctrl para selecionar mais de um cliente.</p></div>}
      {form.product === 'client' && <label className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 sm:col-span-2"><input type="checkbox" className="mt-1" checked={form.mandatory} onChange={(event) => setForm((value) => ({ ...value, mandatory: event.target.checked }))} /><span><strong>Atualização obrigatória</strong><br /><span className="text-xs">O restaurante não poderá fechar o aviso sem instalar.</span></span></label>}
      <div className="sm:col-span-2 rounded-xl border border-blue-200 bg-blue-50 p-3 text-xs leading-5 text-blue-800">Selecione <strong>{form.product === 'manager' ? `ComandaFlow-Gestor-Setup-${form.version || 'versão'}.exe` : `ComandaFlow-Setup-${form.version || 'versão'}.exe`}</strong>. {form.product === 'manager' ? 'Depois da publicação, use o botão Instalar e reiniciar no cartão do Gestor.' : 'O Gestor precisa permanecer aberto durante o download dos restaurantes.'}</div>
      {saving && <div className="sm:col-span-2"><div className="mb-2 flex justify-between text-xs font-bold text-slate-600"><span>Enviando e verificando instalador...</span><span>{progress}%</span></div><div className="h-2 overflow-hidden rounded-full bg-slate-200"><div className="h-full bg-blue-600 transition-all" style={{ width: `${progress}%` }} /></div></div>}
      {error && <div className="sm:col-span-2 rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</div>}
      <div className="flex justify-end gap-3 border-t border-slate-100 pt-4 sm:col-span-2"><button type="button" className="btn-secondary" onClick={onClose} disabled={saving}>Cancelar</button><button className="btn-primary bg-blue-600 hover:bg-blue-700" disabled={saving}><UploadCloud size={17} />{saving ? 'Publicando...' : 'Publicar atualização'}</button></div>
    </form>
  </Modal>;
}

export function LicenseModal({ subscription, onClose, onCopy }) {
  return <Modal title="Chave de ativacao" subtitle={`${subscription.businessName} · ${subscription.plan} · valida ate ${formatDate(subscription.expiresAt)}`} onClose={onClose}>
    <div className="space-y-4 p-5"><textarea readOnly value={subscription.licenseKey} className="input-field min-h-40 resize-y font-mono text-xs" /><div className="flex justify-end gap-3"><button className="btn-secondary" onClick={onClose}>Fechar</button><button className="btn-primary bg-emerald-600 hover:bg-emerald-700" onClick={onCopy}><Copy size={17} />Copiar chave</button></div></div>
  </Modal>;
}
