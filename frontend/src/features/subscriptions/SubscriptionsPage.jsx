import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowRight,
  AlertTriangle,
  Ban,
  Building2,
  Check,
  CreditCard,
  Globe2,
  KeyRound,
  LoaderCircle,
  MonitorDown,
  Plus,
  PauseCircle,
  PlayCircle,
  RefreshCw,
  Repeat2,
  Search,
  UploadCloud,
  UserRoundCheck,
  UsersRound,
  WalletCards,
} from 'lucide-react';
import { useAuth } from '../../app/providers/AuthContext';
import api from '../../shared/services/api';
import {
  canAccessManagerItem,
  managerNavigation,
} from '../../shared/config/manager-navigation';
import {
  IssueModal,
  CancellationModal,
  LicenseModal,
  MessageModal,
  PublishUpdateModal,
  ServerSettingsModal,
  SubscriberModal,
  SuspensionModal,
} from './components/SubscriptionModals';
import BillingPanel from './components/BillingPanel';
import { BillingChargeModal, BillingHistoryModal, PaymentModal, RecurringBillingModal } from './components/BillingModals';
import MessagesPanel from './components/MessagesPanel';
import MonitoringPanel from './components/MonitoringPanel';
import SecurityPanel from './components/SecurityPanel';
import SupportPanel from './components/SupportPanel';
import {
  copyText,
  emptySubscriber,
  formatDate,
  formatFileSize,
  statusStyle,
} from './subscription-utils';

export default function SubscriptionsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { section } = useParams();
  const can = useCallback((permission) => user?.role === 'proprietario' || user?.permissions?.includes('*') || user?.permissions?.includes(permission), [user]);
  const accessibleSections = useMemo(
    () => managerNavigation.filter((item) => canAccessManagerItem(item, user)),
    [user]
  );
  const requestedSection = section || 'overview';
  const activeSection = accessibleSections.find((item) => item.key === requestedSection)
    || accessibleSections[0]
    || managerNavigation[0];
  const ActiveSectionIcon = activeSection.icon;
  const [subscribers, setSubscribers] = useState([]);
  const [summary, setSummary] = useState({ total: 0, active: 0, suspended: 0, expiringSoon: 0 });
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('todos');
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [subscriberModal, setSubscriberModal] = useState(null);
  const [issueModal, setIssueModal] = useState(null);
  const [licenseModal, setLicenseModal] = useState(null);
  const [suspendModal, setSuspendModal] = useState(null);
  const [cancelSubscriberModal, setCancelSubscriberModal] = useState(null);
  const [messageModal, setMessageModal] = useState(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [updateModalOpen, setUpdateModalOpen] = useState(false);
  const [publishedUpdate, setPublishedUpdate] = useState(null);
  const [managerUpdate, setManagerUpdate] = useState(null);
  const [managerUpdateStatus, setManagerUpdateStatus] = useState({ status: 'idle', available: false, currentVersion: '' });
  const [installingManager, setInstallingManager] = useState(false);
  const [charges, setCharges] = useState([]);
  const [billingSummary, setBillingSummary] = useState({ pending: 0, overdue: 0, cancelledThisMonth: 0, cancelledSubscribers: 0, outstandingTotal: 0, receivedThisMonth: 0, recurringMonthly: 0 });
  const [billingModal, setBillingModal] = useState(null);
  const [paymentModal, setPaymentModal] = useState(null);
  const [billingHistory, setBillingHistory] = useState(null);
  const [recurrenceModal, setRecurrenceModal] = useState(null);
  const [settings, setSettings] = useState({
    publicServerUrl: '', offlineGraceHours: 24, syncIntervalMinutes: 1,
    automaticSuspensionEnabled: true, paymentGraceDays: 3,
    defaultSuspensionMessage: 'Sua assinatura esta pendente. Entre em contato para regularizar o acesso.',
  });
  const publicServerReady = useMemo(() => {
    try {
      const url = new URL(settings.publicServerUrl);
      return url.protocol === 'https:' && !['localhost', '127.0.0.1', '0.0.0.0', '::1'].includes(url.hostname);
    } catch { return false; }
  }, [settings.publicServerUrl]);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const billingAllowed = can('billing:read');
      const [listResponse, summaryResponse, settingsResponse, updateResponse, managerUpdateResponse, managerStatusResponse, chargesResponse, billingResponse] = await Promise.all([
        api.get('/subscriptions/subscribers', { params: { search: search || undefined, status } }),
        api.get('/subscriptions/summary'),
        api.get('/subscriptions/settings'),
        api.get('/updates/published', { params: { product: 'client' } }),
        api.get('/updates/published', { params: { product: 'manager' } }),
        api.get('/updates/manager/status'),
        billingAllowed ? api.get('/billing/charges') : Promise.resolve({ data: { charges: [] } }),
        billingAllowed ? api.get('/billing/summary') : Promise.resolve({ data: {} }),
      ]);
      setSubscribers(listResponse.data.subscribers || []);
      setSummary(summaryResponse.data);
      setSettings(settingsResponse.data);
      setPublishedUpdate(updateResponse.data.published);
      setManagerUpdate(managerUpdateResponse.data.published);
      setManagerUpdateStatus(managerStatusResponse.data);
      setCharges(chargesResponse.data.charges || []);
      setBillingSummary(billingResponse.data);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Nao foi possivel carregar os assinantes.');
    } finally {
      setLoading(false);
    }
  }, [can, search, status]);

  useEffect(() => {
    const timeout = setTimeout(loadData, 250);
    return () => clearTimeout(timeout);
  }, [loadData]);

  useEffect(() => {
    if (requestedSection !== activeSection.key) navigate(activeSection.to, { replace: true });
    document.querySelector('.content-area')?.scrollTo({ top: 0, behavior: 'smooth' });
  }, [activeSection.key, activeSection.to, navigate, requestedSection]);

  const showNotice = (text) => {
    setNotice(text);
    setTimeout(() => setNotice(''), 3500);
  };

  const saveSubscriber = async (form) => {
    try {
      if (subscriberModal?.id) {
        await api.put(`/subscriptions/subscribers/${subscriberModal.id}`, form);
        showNotice('Cadastro atualizado com sucesso.');
      } else {
        await api.post('/subscriptions/subscribers', form);
        showNotice('Assinante cadastrado com sucesso.');
      }
      setSubscriberModal(null);
      await loadData();
    } catch (requestError) {
      throw new Error(requestError.response?.data?.message || 'Nao foi possivel salvar o cadastro.');
    }
  };

  const reactivate = async (subscriber) => {
    try {
      await api.post(`/subscriptions/subscribers/${subscriber.id}/reactivate`);
      showNotice(`Acesso de ${subscriber.businessName} reativado.`);
      await loadData();
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Nao foi possivel alterar o status.');
    }
  };

  const suspendSubscriber = async (form) => {
    try {
      const payload = {
        mode: form.mode,
        accessUntil: form.mode === 'prazo' ? new Date(form.accessUntil).toISOString() : null,
        message: form.message,
      };
      await api.post(`/subscriptions/subscribers/${suspendModal.id}/suspend`, payload);
      const customer = suspendModal;
      setSuspendModal(null);
      setMessageModal({ customer, message: form.message, accessUntil: payload.accessUntil, mode: form.mode });
      await loadData();
    } catch (requestError) {
      throw new Error(requestError.response?.data?.message || 'Nao foi possivel suspender o acesso.');
    }
  };

  const cancelSubscriber = async (form) => {
    try {
      await api.post(`/subscriptions/subscribers/${cancelSubscriberModal.id}/cancel`, form);
      setCancelSubscriberModal(null); showNotice('Conta cancelada e recorrência interrompida.'); await loadData();
    } catch (requestError) { throw new Error(requestError.response?.data?.message || 'Não foi possível cancelar a conta.'); }
  };

  const saveServerSettings = async (nextSettings) => {
    try {
      const response = await api.put('/subscriptions/settings', {
        ...nextSettings,
        offlineGraceHours: Number(nextSettings.offlineGraceHours),
        syncIntervalMinutes: Number(nextSettings.syncIntervalMinutes),
        paymentGraceDays: Number(nextSettings.paymentGraceDays),
      });
      setSettings(response.data.settings);
      setSettingsOpen(false);
      showNotice('Configuracao do servidor salva.');
    } catch (requestError) {
      throw new Error(requestError.response?.data?.message || 'Nao foi possivel salvar o servidor.');
    }
  };

  const publishUpdate = async (form, onProgress) => {
    try {
      const started = await api.post('/updates/publish/start', {
        product: form.product,
        version: form.version,
        releaseNotes: form.releaseNotes,
        mandatory: form.mandatory,
        rollout: form.rollout,
        pilotSubscriberIds: form.pilotSubscriberIds,
        fileName: form.file.name,
        size: form.file.size,
      });
      await api.put(`/updates/publish/${started.data.uploadToken}`, form.file, {
        headers: { 'Content-Type': 'application/octet-stream' },
        timeout: 0,
        onUploadProgress: (event) => {
          if (event.total) onProgress(Math.round((event.loaded / event.total) * 100));
        },
      });
      setUpdateModalOpen(false);
      showNotice(`Atualização ${form.version} publicada para ${form.product === 'manager' ? 'o Gestor' : 'os restaurantes'}.`);
      await loadData();
    } catch (requestError) {
      throw new Error(requestError.response?.data?.message || 'Nao foi possivel publicar a atualizacao.');
    }
  };

  const installManagerUpdate = async () => {
    if (!window.confirm(`Instalar o ComandaFlow Gestor ${managerUpdateStatus.manifest?.version}? O aplicativo será reiniciado.`)) return;
    setInstallingManager(true);
    setError('');
    try {
      await api.post('/updates/manager/install');
      showNotice('Instalador do Gestor aberto. O aplicativo será reiniciado.');
    } catch (requestError) {
      setInstallingManager(false);
      setError(requestError.response?.data?.message || 'Não foi possível iniciar a atualização do Gestor.');
    }
  };

  const controlUpdate = async (action) => {
    if (action === 'withdraw' && !window.confirm('Retirar esta atualização de todos os clientes?')) return;
    try {
      await api.patch('/updates/published/control', { action });
      showNotice(action === 'promote' ? 'Atualização liberada para todos.' : action === 'pause' ? 'Atualização pausada.' : action === 'resume' ? 'Atualização retomada.' : 'Atualização retirada.');
      await loadData();
    } catch (requestError) { setError(requestError.response?.data?.message || 'Não foi possível alterar a atualização.'); }
  };

  const issueSubscription = async (form) => {
    try {
      const response = await api.post(`/subscriptions/subscribers/${issueModal.id}/issue`, form);
      setIssueModal(null);
      setLicenseModal({ ...response.data.subscription, businessName: issueModal.businessName });
      await loadData();
    } catch (requestError) {
      throw new Error(requestError.response?.data?.message || 'Nao foi possivel emitir a assinatura.');
    }
  };

  const saveCharge = async (form) => {
    try {
      if (billingModal?.id) await api.put(`/billing/charges/${billingModal.id}`, form);
      else await api.post(`/billing/subscribers/${form.subscriberId}/charges`, form);
      setBillingModal(null); showNotice(billingModal?.id ? 'Cobrança atualizada.' : 'Cobrança criada.'); await loadData();
    } catch (requestError) { throw new Error(requestError.response?.data?.message || 'Não foi possível salvar a cobrança.'); }
  };

  const payCharge = async (form) => {
    try {
      const response = await api.post(`/billing/charges/${paymentModal.id}/pay`, form);
      setPaymentModal(null); showNotice(response.data.reactivated ? 'Pagamento registrado e acesso reativado.' : 'Pagamento registrado.'); await loadData();
    } catch (requestError) { throw new Error(requestError.response?.data?.message || 'Não foi possível registrar o pagamento.'); }
  };

  const saveRecurrence = async (form) => {
    try {
      await api.put(`/billing/subscribers/${recurrenceModal.id}/recurrence`, form);
      setRecurrenceModal(null); showNotice(form.enabled ? 'Mensalidade recorrente configurada.' : 'Mensalidade recorrente desativada.'); await loadData();
    } catch (requestError) { throw new Error(requestError.response?.data?.message || 'Não foi possível atualizar a recorrência.'); }
  };

  const cancelCharge = async (charge) => {
    if (!window.confirm(`Cancelar a cobrança de ${charge.subscriber.businessName}?`)) return;
    try { const response = await api.post(`/billing/charges/${charge.id}/cancel`, { reason: 'Cancelada pelo Gestor.' }); showNotice(response.data.reactivated ? 'Cobrança cancelada e acesso reativado.' : 'Cobrança cancelada.'); await loadData(); }
    catch (requestError) { setError(requestError.response?.data?.message || 'Não foi possível cancelar a cobrança.'); }
  };

  const cards = useMemo(() => [
    { label: 'Assinantes', value: summary.total, icon: UsersRound, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Ativos', value: summary.active, icon: UserRoundCheck, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Suspensos', value: summary.suspended, icon: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'Vencem em 7 dias', value: summary.expiringSoon, icon: CreditCard, color: 'text-rose-600', bg: 'bg-rose-50' },
  ], [summary]);

  const renderHeaderAction = () => {
    if (['overview', 'clients'].includes(activeSection.key) && can('subscriptions:write')) {
      return <button className="btn-primary manager-header-action bg-emerald-600 hover:bg-emerald-700" onClick={() => setSubscriberModal(emptySubscriber)}><Plus size={18} />Novo assinante</button>;
    }
    if (activeSection.key === 'billing' && can('billing:write')) {
      return <button className="btn-primary manager-header-action bg-blue-600 hover:bg-blue-700" onClick={() => setBillingModal({})}><WalletCards size={18} />Nova cobrança</button>;
    }
    if (activeSection.key === 'updates' && can('updates:write')) {
      return <button className="btn-primary manager-header-action bg-indigo-600 hover:bg-indigo-700" onClick={() => setUpdateModalOpen('client')}><UploadCloud size={18} />Publicar versão</button>;
    }
    if (activeSection.key === 'settings' && can('subscriptions:write')) {
      return <button className="btn-primary manager-header-action bg-slate-800 hover:bg-slate-700" onClick={() => setSettingsOpen(true)}><Globe2 size={18} />Editar servidor</button>;
    }
    return null;
  };

  return (
    <div key={activeSection.key} className="manager-page space-y-6 animate-fade-slide-up">
      <section className="panel p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className={`rounded-xl p-3 ${activeSection.tone}`}><ActiveSectionIcon size={26} /></div>
            <div className="min-w-0">
              <h1 className="section-title">{activeSection.title}</h1>
              <p className="section-subtitle">{activeSection.description}</p>
            </div>
          </div>
          {renderHeaderAction()}
        </div>
      </section>

      {loading && <div className="manager-loading-bar" role="status" aria-label="Atualizando dados"><span /></div>}

      {['overview', 'settings'].includes(activeSection.key) && <section className={`rounded-2xl border p-5 ${publicServerReady ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50'}`}>
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-3">
            <div className={`rounded-xl p-3 ${publicServerReady ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}><Globe2 size={22} /></div>
            <div>
              <p className="font-extrabold text-slate-900">Servidor de assinaturas neste computador</p>
              <p className="mt-1 break-all text-sm text-slate-600">
                {publicServerReady
                  ? settings.publicServerUrl
                  : settings.publicServerUrl
                    ? `${settings.publicServerUrl} — este endereco e apenas local e nao chega a outro computador.`
                    : 'Configure o endereco HTTPS fixo antes de emitir chaves online.'}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                O Gestor precisa permanecer aberto. Clientes toleram ate {settings.offlineGraceHours}h sem contato. Nunca use 127.0.0.1 para clientes externos.
              </p>
            </div>
          </div>
          {can('subscriptions:write') && <button className="btn-secondary shrink-0" onClick={() => setSettingsOpen(true)}>Configurar servidor</button>}
        </div>
      </section>}

      {activeSection.key === 'updates' && <section className="rounded-2xl border border-blue-200 bg-blue-50 p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-blue-100 p-3 text-blue-700"><UploadCloud size={22} /></div>
            <div>
              <p className="font-extrabold text-slate-900">Atualizacao dos restaurantes</p>
              {publishedUpdate?.manifest ? (
                <>
                  <p className="mt-1 text-sm text-slate-600">Versao {publishedUpdate.manifest.version} publicada em {formatDate(publishedUpdate.manifest.publishedAt)} · {formatFileSize(publishedUpdate.manifest.size)}</p>
                  <p className="mt-1 text-xs text-slate-500">{publishedUpdate.manifest.mandatory ? 'Atualizacao obrigatoria' : 'O restaurante pode escolher instalar depois'} · {publishedUpdate.control?.audience === 'pilot' ? 'clientes de teste' : 'todos os clientes'} · {{ active: 'ativa', paused: 'pausada', withdrawn: 'retirada' }[publishedUpdate.control?.state] || 'ativa'}.</p>
                </>
              ) : <p className="mt-1 text-sm text-slate-600">Nenhum instalador foi publicado pelo Gestor.</p>}
            </div>
          </div>
          {can('updates:write') && <div className="flex flex-wrap justify-end gap-2">{publishedUpdate?.control?.audience === 'pilot' && <button className="btn-secondary text-emerald-700" onClick={() => controlUpdate('promote')}>Liberar para todos</button>}{publishedUpdate?.control?.state === 'paused' ? <button className="btn-secondary" onClick={() => controlUpdate('resume')}><PlayCircle size={16} />Retomar</button> : publishedUpdate?.control?.state !== 'withdrawn' && <button className="btn-secondary" onClick={() => controlUpdate('pause')}><PauseCircle size={16} />Pausar</button>}{publishedUpdate && publishedUpdate.control?.state !== 'withdrawn' && <button className="btn-secondary text-rose-700" onClick={() => controlUpdate('withdraw')}><Ban size={16} />Retirar</button>}<button className="btn-primary shrink-0 bg-blue-600 hover:bg-blue-700" onClick={() => setUpdateModalOpen('client')}><UploadCloud size={17} />Publicar nova versão</button></div>}
        </div>
      </section>}

      {activeSection.key === 'updates' && <section className="rounded-2xl border border-violet-200 bg-violet-50 p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-violet-100 p-3 text-violet-700"><MonitorDown size={22} /></div>
            <div>
              <p className="font-extrabold text-slate-900">Atualização do Gestor</p>
              {managerUpdate?.manifest ? <>
                <p className="mt-1 text-sm text-slate-600">Versão {managerUpdate.manifest.version} pronta · {formatFileSize(managerUpdate.manifest.size)}</p>
                <p className="mt-1 text-xs text-slate-500">Versão instalada: {managerUpdateStatus.currentVersion || 'não identificada'}. O instalador anterior é removido automaticamente depois da atualização.</p>
              </> : <p className="mt-1 text-sm text-slate-600">Gestor {managerUpdateStatus.currentVersion || ''} instalado e nenhum pacote novo pendente.</p>}
            </div>
          </div>
          {can('updates:write') && <div className="flex flex-wrap justify-end gap-2">
            {managerUpdateStatus.available && <button className="btn-primary bg-violet-600 hover:bg-violet-700" onClick={installManagerUpdate} disabled={installingManager}>{installingManager ? <LoaderCircle className="animate-spin" size={17} /> : <MonitorDown size={17} />}{installingManager ? 'Abrindo instalador...' : 'Instalar e reiniciar'}</button>}
            <button className="btn-secondary" onClick={() => setUpdateModalOpen('manager')}><UploadCloud size={17} />Publicar versão do Gestor</button>
          </div>}
        </div>
      </section>}

      {notice && <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800"><Check size={18} />{notice}</div>}
      {error && <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-800">{error}</div>}

      {['overview', 'clients'].includes(activeSection.key) && <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(({ label, value, icon: Icon, color, bg }) => (
          <article key={label} className="panel flex items-center gap-4 p-5">
            <div className={`rounded-xl p-3 ${bg} ${color}`}><Icon size={22} /></div>
            <div><p className="text-2xl font-extrabold text-slate-900">{value}</p><p className="text-xs font-semibold text-slate-500">{label}</p></div>
          </article>
        ))}
      </section>}

      {activeSection.key === 'overview' && <section className="panel p-5 sm:p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div><h2 className="text-lg font-extrabold text-slate-900">Acesso rápido</h2><p className="text-sm text-slate-500">Abra cada função do Gestor sem procurar em uma página longa.</p></div>
          <p className="text-xs font-semibold text-slate-400">{accessibleSections.length - 1} áreas disponíveis para seu perfil</p>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {accessibleSections.filter((item) => item.key !== 'overview').map((item) => {
            const ItemIcon = item.icon;
            return <button key={item.key} type="button" className="manager-quick-action" onClick={() => navigate(item.to)}><span className={`rounded-xl p-2.5 ${item.tone}`}><ItemIcon size={20} /></span><span className="min-w-0 flex-1 text-left"><strong>{item.label}</strong><small>{item.description}</small></span><ArrowRight size={17} /></button>;
          })}
        </div>
      </section>}

      {activeSection.key === 'settings' && <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <article className="panel p-5"><p className="text-xs font-bold uppercase tracking-wider text-slate-500">Endereço público</p><p className={`mt-2 text-sm font-extrabold ${publicServerReady ? 'text-emerald-700' : 'text-amber-700'}`}>{publicServerReady ? 'Configurado e válido' : 'Configuração necessária'}</p><p className="mt-1 break-all text-xs text-slate-500">{settings.publicServerUrl || 'Nenhum endereço informado'}</p></article>
        <article className="panel p-5"><p className="text-xs font-bold uppercase tracking-wider text-slate-500">Sincronização</p><p className="mt-2 text-2xl font-extrabold text-slate-900">{settings.syncIntervalMinutes} min</p><p className="mt-1 text-xs text-slate-500">Intervalo normal entre verificações</p></article>
        <article className="panel p-5"><p className="text-xs font-bold uppercase tracking-wider text-slate-500">Tolerância offline</p><p className="mt-2 text-2xl font-extrabold text-slate-900">{settings.offlineGraceHours}h</p><p className="mt-1 text-xs text-slate-500">Prazo sem contato com o Gestor</p></article>
        <article className="panel p-5"><p className="text-xs font-bold uppercase tracking-wider text-slate-500">Inadimplência</p><p className={`mt-2 text-sm font-extrabold ${settings.automaticSuspensionEnabled ? 'text-emerald-700' : 'text-slate-600'}`}>{settings.automaticSuspensionEnabled ? 'Bloqueio automático ativo' : 'Bloqueio automático desativado'}</p><p className="mt-1 text-xs text-slate-500">Tolerância de {settings.paymentGraceDays} dia(s)</p></article>
      </section>}

      {activeSection.key === 'billing' && can('billing:read') && <BillingPanel summary={billingSummary} charges={charges} loading={loading} canWrite={can('billing:write')} showCreateButton={false} onCreate={(subscriberId) => setBillingModal(subscriberId ? { subscriberId } : {})} onEdit={setBillingModal} onPay={setPaymentModal} onCancel={cancelCharge} onHistory={setBillingHistory} />}

      {activeSection.key === 'monitoring' && can('monitoring:read') && <MonitoringPanel />}
      {activeSection.key === 'messages' && can('messages:read') && <MessagesPanel subscribers={subscribers} canWrite={can('messages:write')} />}
      {activeSection.key === 'support' && can('support:read') && <SupportPanel subscribers={subscribers} canWrite={can('support:write')} />}
      {activeSection.key === 'security' && <SecurityPanel canManageUsers={['proprietario', 'administrador'].includes(user?.role)} canAudit={['proprietario', 'administrador'].includes(user?.role) || can('audit:read')} />}

      {activeSection.key === 'clients' && <section className="panel overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 md:flex-row md:items-center">
          <label className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
            <input className="input-field pl-10" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por empresa, responsavel, e-mail ou documento" />
          </label>
          <select className="input-field md:w-44" value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="todos">Todos os status</option>
            <option value="ativo">Ativos</option>
            <option value="suspenso">Suspensos</option>
            <option value="cancelado">Cancelados</option>
          </select>
          <button className="btn-secondary" onClick={loadData} title="Atualizar"><RefreshCw size={17} /><span className="md:hidden">Atualizar</span></button>
        </div>

        <div className="responsive-table-wrap overflow-x-auto">
          <table className="responsive-data-table w-full min-w-[900px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
              <tr><th className="px-5 py-3">Assinante</th><th className="px-5 py-3">Contato</th><th className="px-5 py-3">Status</th><th className="px-5 py-3">Plano atual</th><th className="px-5 py-3">Validade</th><th className="px-5 py-3 text-right">Acoes</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {subscribers.map((subscriber) => {
                const current = subscriber.subscriptions?.find((item) => item.status === 'ativo') || subscriber.subscriptions?.[0];
                return (
                  <tr key={subscriber.id} className="hover:bg-slate-50/70">
                    <td data-label="Assinante" className="px-5 py-4"><div className="flex items-center gap-3"><div className="rounded-lg bg-slate-100 p-2 text-slate-600"><Building2 size={17} /></div><div><p className="font-bold text-slate-900">{subscriber.businessName}</p><p className="text-xs text-slate-500">{subscriber.document || 'Sem documento'}</p></div></div></td>
                    <td data-label="Contato" className="px-5 py-4"><p className="font-medium text-slate-700">{subscriber.contactName || '—'}</p><p className="break-all text-xs text-slate-500">{subscriber.email}</p></td>
                    <td data-label="Status" className="px-5 py-4">
                      <span className={`status-chip ${statusStyle[subscriber.status]}`}>{subscriber.status}</span>
                      {subscriber.status === 'suspenso' && (
                        <p className="mt-1 max-w-44 text-xs text-slate-500">
                          {subscriber.suspensionMode === 'prazo' && subscriber.accessUntil
                            ? `Liberado ate ${new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(subscriber.accessUntil))}`
                            : 'Bloqueio imediato'}
                        </p>
                      )}
                    </td>
                    <td data-label="Plano atual" className="px-5 py-4"><p className="font-semibold text-slate-700">{current?.plan || 'Sem assinatura'}</p><p className="text-xs text-slate-500">{current ? `${current.maxDevices} dispositivo(s)` : '—'}</p></td>
                    <td data-label="Validade" className="px-5 py-4"><p className="font-semibold text-slate-700">{formatDate(current?.expiresAt)}</p><p className="text-xs text-slate-500">{current?.status || '—'}</p></td>
                    <td data-label="Ações" className="px-5 py-4"><div className="responsive-table-actions flex flex-wrap justify-end gap-2">
                      {current?.licenseKey && <button className="btn-secondary px-3" onClick={() => setLicenseModal({ ...current, businessName: subscriber.businessName })} title="Ver chave"><KeyRound size={16} /><span className="md:hidden">Chave</span></button>}
                      {can('subscriptions:write') && <button className="btn-secondary px-3" onClick={() => setSubscriberModal(subscriber)}>Editar</button>}
                      {can('billing:write') && <button className="btn-secondary px-3 text-blue-700" title="Nova cobrança" onClick={() => setBillingModal({ subscriberId: subscriber.id })}><WalletCards size={16} /><span className="md:hidden">Cobrar</span></button>}
                      {can('billing:write') && <button className={`btn-secondary px-3 ${subscriber.recurringBillingEnabled ? 'text-violet-700' : ''}`} title="Configurar mensalidade recorrente" onClick={() => setRecurrenceModal(subscriber)}><Repeat2 size={16} /><span className="md:hidden">Recorrência</span></button>}
                      {can('subscriptions:write') && (subscriber.status === 'ativo'
                        ? <button className="btn-secondary px-3 text-amber-700" onClick={() => setSuspendModal(subscriber)}>Suspender</button>
                        : <button className="btn-secondary px-3 text-emerald-700" onClick={() => reactivate(subscriber)}>Ativar</button>)}
                      {can('subscriptions:write') && subscriber.status !== 'cancelado' && <button className="btn-secondary px-3 text-rose-700" onClick={() => setCancelSubscriberModal(subscriber)}>Cancelar conta</button>}
                      {can('subscriptions:write') && <button className="btn-primary bg-emerald-600 px-3 hover:bg-emerald-700" disabled={subscriber.status !== 'ativo'} onClick={() => setIssueModal(subscriber)}><CreditCard size={16} /> Emitir</button>}
                    </div></td>
                  </tr>
                );
              })}
              {!loading && subscribers.length === 0 && <tr className="responsive-table-empty"><td colSpan="6" className="px-5 py-14 text-center text-slate-500">Nenhum assinante encontrado.</td></tr>}
              {loading && <tr className="responsive-table-empty"><td colSpan="6" className="px-5 py-14 text-center text-slate-500">Carregando assinantes...</td></tr>}
            </tbody>
          </table>
        </div>
      </section>}

      {subscriberModal && <SubscriberModal initial={subscriberModal} onClose={() => setSubscriberModal(null)} onSave={saveSubscriber} />}
      {issueModal && <IssueModal subscriber={issueModal} onClose={() => setIssueModal(null)} onIssue={issueSubscription} />}
      {licenseModal && <LicenseModal subscription={licenseModal} onClose={() => setLicenseModal(null)} onCopy={() => { copyText(licenseModal.licenseKey); showNotice('Chave copiada para a area de transferencia.'); }} />}
      {suspendModal && <SuspensionModal subscriber={suspendModal} defaultMessage={settings.defaultSuspensionMessage} onClose={() => setSuspendModal(null)} onSuspend={suspendSubscriber} />}
      {cancelSubscriberModal && <CancellationModal subscriber={cancelSubscriberModal} onClose={() => setCancelSubscriberModal(null)} onCancel={cancelSubscriber} />}
      {messageModal && <MessageModal data={messageModal} onClose={() => setMessageModal(null)} onCopy={() => { copyText(messageModal.message); showNotice('Mensagem copiada para a area de transferencia.'); }} />}
      {settingsOpen && <ServerSettingsModal initial={settings} onClose={() => setSettingsOpen(false)} onSave={saveServerSettings} />}
      {updateModalOpen && <PublishUpdateModal current={publishedUpdate?.manifest} managerCurrent={managerUpdate?.manifest || { version: managerUpdateStatus.currentVersion }} initialProduct={updateModalOpen} subscribers={subscribers} onClose={() => setUpdateModalOpen(false)} onPublish={publishUpdate} />}
      {billingModal && <BillingChargeModal subscribers={subscribers} initial={billingModal} onClose={() => setBillingModal(null)} onSave={saveCharge} />}
      {paymentModal && <PaymentModal charge={paymentModal} onClose={() => setPaymentModal(null)} onPay={payCharge} />}
      {billingHistory && <BillingHistoryModal charge={billingHistory} onClose={() => setBillingHistory(null)} />}
      {recurrenceModal && <RecurringBillingModal subscriber={recurrenceModal} onClose={() => setRecurrenceModal(null)} onSave={saveRecurrence} />}
    </div>
  );
}
