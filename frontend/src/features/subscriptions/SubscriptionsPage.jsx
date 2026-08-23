import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Building2,
  Check,
  CreditCard,
  Globe2,
  KeyRound,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  UploadCloud,
  UserRoundCheck,
  UsersRound,
} from 'lucide-react';
import api from '../../shared/services/api';
import {
  IssueModal,
  LicenseModal,
  MessageModal,
  PublishUpdateModal,
  ServerSettingsModal,
  SubscriberModal,
  SuspensionModal,
} from './components/SubscriptionModals';
import {
  copyText,
  emptySubscriber,
  formatDate,
  formatFileSize,
  statusStyle,
} from './subscription-utils';

export default function SubscriptionsPage() {
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
  const [messageModal, setMessageModal] = useState(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [updateModalOpen, setUpdateModalOpen] = useState(false);
  const [publishedUpdate, setPublishedUpdate] = useState(null);
  const [settings, setSettings] = useState({
    publicServerUrl: '', offlineGraceHours: 24, syncIntervalMinutes: 1,
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
      const [listResponse, summaryResponse, settingsResponse, updateResponse] = await Promise.all([
        api.get('/subscriptions/subscribers', { params: { search: search || undefined, status } }),
        api.get('/subscriptions/summary'),
        api.get('/subscriptions/settings'),
        api.get('/updates/published'),
      ]);
      setSubscribers(listResponse.data.subscribers || []);
      setSummary(summaryResponse.data);
      setSettings(settingsResponse.data);
      setPublishedUpdate(updateResponse.data.published);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Nao foi possivel carregar os assinantes.');
    } finally {
      setLoading(false);
    }
  }, [search, status]);

  useEffect(() => {
    const timeout = setTimeout(loadData, 250);
    return () => clearTimeout(timeout);
  }, [loadData]);

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

  const saveServerSettings = async (nextSettings) => {
    try {
      const response = await api.put('/subscriptions/settings', {
        ...nextSettings,
        offlineGraceHours: Number(nextSettings.offlineGraceHours),
        syncIntervalMinutes: Number(nextSettings.syncIntervalMinutes),
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
        version: form.version,
        releaseNotes: form.releaseNotes,
        mandatory: form.mandatory,
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
      showNotice(`Atualizacao ${form.version} publicada para os restaurantes.`);
      await loadData();
    } catch (requestError) {
      throw new Error(requestError.response?.data?.message || 'Nao foi possivel publicar a atualizacao.');
    }
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

  const cards = useMemo(() => [
    { label: 'Assinantes', value: summary.total, icon: UsersRound, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Ativos', value: summary.active, icon: UserRoundCheck, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Suspensos', value: summary.suspended, icon: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'Vencem em 7 dias', value: summary.expiringSoon, icon: CreditCard, color: 'text-rose-600', bg: 'bg-rose-50' },
  ], [summary]);

  return (
    <div className="space-y-6">
      <section className="panel p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-emerald-100 p-3 text-emerald-700"><ShieldCheck size={26} /></div>
            <div>
              <h1 className="section-title">Gerenciador de Assinaturas</h1>
              <p className="section-subtitle">Cadastre clientes, renove planos e gere chaves de ativacao.</p>
            </div>
          </div>
          <button className="btn-primary bg-emerald-600 hover:bg-emerald-700" onClick={() => setSubscriberModal(emptySubscriber)}>
            <Plus size={18} /> Novo assinante
          </button>
        </div>
      </section>

      <section className={`rounded-2xl border p-5 ${publicServerReady ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50'}`}>
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
          <button className="btn-secondary shrink-0" onClick={() => setSettingsOpen(true)}>Configurar servidor</button>
        </div>
      </section>

      <section className="rounded-2xl border border-blue-200 bg-blue-50 p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-blue-100 p-3 text-blue-700"><UploadCloud size={22} /></div>
            <div>
              <p className="font-extrabold text-slate-900">Atualizacao dos restaurantes</p>
              {publishedUpdate?.manifest ? (
                <>
                  <p className="mt-1 text-sm text-slate-600">Versao {publishedUpdate.manifest.version} publicada em {formatDate(publishedUpdate.manifest.publishedAt)} · {formatFileSize(publishedUpdate.manifest.size)}</p>
                  <p className="mt-1 text-xs text-slate-500">{publishedUpdate.manifest.mandatory ? 'Atualizacao obrigatoria' : 'O restaurante pode escolher instalar depois'}.</p>
                </>
              ) : <p className="mt-1 text-sm text-slate-600">Nenhum instalador foi publicado pelo Gestor.</p>}
            </div>
          </div>
          <button className="btn-primary shrink-0 bg-blue-600 hover:bg-blue-700" onClick={() => setUpdateModalOpen(true)}><UploadCloud size={17} />Publicar nova versao</button>
        </div>
      </section>

      {notice && <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800"><Check size={18} />{notice}</div>}
      {error && <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-800">{error}</div>}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(({ label, value, icon: Icon, color, bg }) => (
          <article key={label} className="panel flex items-center gap-4 p-5">
            <div className={`rounded-xl p-3 ${bg} ${color}`}><Icon size={22} /></div>
            <div><p className="text-2xl font-extrabold text-slate-900">{value}</p><p className="text-xs font-semibold text-slate-500">{label}</p></div>
          </article>
        ))}
      </section>

      <section className="panel overflow-hidden">
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
          <button className="btn-secondary" onClick={loadData} title="Atualizar"><RefreshCw size={17} /></button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
              <tr><th className="px-5 py-3">Assinante</th><th className="px-5 py-3">Contato</th><th className="px-5 py-3">Status</th><th className="px-5 py-3">Plano atual</th><th className="px-5 py-3">Validade</th><th className="px-5 py-3 text-right">Acoes</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {subscribers.map((subscriber) => {
                const current = subscriber.subscriptions?.find((item) => item.status === 'ativo') || subscriber.subscriptions?.[0];
                return (
                  <tr key={subscriber.id} className="hover:bg-slate-50/70">
                    <td className="px-5 py-4"><div className="flex items-center gap-3"><div className="rounded-lg bg-slate-100 p-2 text-slate-600"><Building2 size={17} /></div><div><p className="font-bold text-slate-900">{subscriber.businessName}</p><p className="text-xs text-slate-500">{subscriber.document || 'Sem documento'}</p></div></div></td>
                    <td className="px-5 py-4"><p className="font-medium text-slate-700">{subscriber.contactName || '—'}</p><p className="text-xs text-slate-500">{subscriber.email}</p></td>
                    <td className="px-5 py-4">
                      <span className={`status-chip ${statusStyle[subscriber.status]}`}>{subscriber.status}</span>
                      {subscriber.status === 'suspenso' && (
                        <p className="mt-1 max-w-44 text-xs text-slate-500">
                          {subscriber.suspensionMode === 'prazo' && subscriber.accessUntil
                            ? `Liberado ate ${new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(subscriber.accessUntil))}`
                            : 'Bloqueio imediato'}
                        </p>
                      )}
                    </td>
                    <td className="px-5 py-4"><p className="font-semibold text-slate-700">{current?.plan || 'Sem assinatura'}</p><p className="text-xs text-slate-500">{current ? `${current.maxDevices} dispositivo(s)` : '—'}</p></td>
                    <td className="px-5 py-4"><p className="font-semibold text-slate-700">{formatDate(current?.expiresAt)}</p><p className="text-xs text-slate-500">{current?.status || '—'}</p></td>
                    <td className="px-5 py-4"><div className="flex justify-end gap-2">
                      {current?.licenseKey && <button className="btn-secondary px-3" onClick={() => setLicenseModal({ ...current, businessName: subscriber.businessName })} title="Ver chave"><KeyRound size={16} /></button>}
                      <button className="btn-secondary px-3" onClick={() => setSubscriberModal(subscriber)}>Editar</button>
                      {subscriber.status === 'ativo'
                        ? <button className="btn-secondary px-3 text-amber-700" onClick={() => setSuspendModal(subscriber)}>Suspender</button>
                        : <button className="btn-secondary px-3 text-emerald-700" onClick={() => reactivate(subscriber)}>Ativar</button>}
                      <button className="btn-primary bg-emerald-600 px-3 hover:bg-emerald-700" disabled={subscriber.status !== 'ativo'} onClick={() => setIssueModal(subscriber)}><CreditCard size={16} /> Emitir</button>
                    </div></td>
                  </tr>
                );
              })}
              {!loading && subscribers.length === 0 && <tr><td colSpan="6" className="px-5 py-14 text-center text-slate-500">Nenhum assinante encontrado.</td></tr>}
              {loading && <tr><td colSpan="6" className="px-5 py-14 text-center text-slate-500">Carregando assinantes...</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      {subscriberModal && <SubscriberModal initial={subscriberModal} onClose={() => setSubscriberModal(null)} onSave={saveSubscriber} />}
      {issueModal && <IssueModal subscriber={issueModal} onClose={() => setIssueModal(null)} onIssue={issueSubscription} />}
      {licenseModal && <LicenseModal subscription={licenseModal} onClose={() => setLicenseModal(null)} onCopy={() => { copyText(licenseModal.licenseKey); showNotice('Chave copiada para a area de transferencia.'); }} />}
      {suspendModal && <SuspensionModal subscriber={suspendModal} defaultMessage={settings.defaultSuspensionMessage} onClose={() => setSuspendModal(null)} onSuspend={suspendSubscriber} />}
      {messageModal && <MessageModal data={messageModal} onClose={() => setMessageModal(null)} onCopy={() => { copyText(messageModal.message); showNotice('Mensagem copiada para a area de transferencia.'); }} />}
      {settingsOpen && <ServerSettingsModal initial={settings} onClose={() => setSettingsOpen(false)} onSave={saveServerSettings} />}
      {updateModalOpen && <PublishUpdateModal current={publishedUpdate?.manifest} onClose={() => setUpdateModalOpen(false)} onPublish={publishUpdate} />}
    </div>
  );
}
