import { useCallback, useEffect, useState } from 'react';
import {
  Activity,
  Clock3,
  Copy,
  KeyRound,
  Laptop2,
  LogOut,
  Plus,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Users,
  UserPlus,
  X,
} from 'lucide-react';
import api from '../../../shared/services/api';

const roles = [
  ['proprietario', 'Proprietário — acesso total'],
  ['administrador', 'Administrador legado — acesso total'],
  ['financeiro', 'Financeiro — cobranças e assinantes'],
  ['suporte', 'Suporte — monitoramento, mensagens e chamados'],
  ['operador', 'Operador — consulta e atendimento'],
  ['auditor', 'Auditor — consulta e auditoria'],
];

const requestMessage = (error) => error.response?.data?.message || 'Não foi possível concluir a operação.';
const formatDateTime = (value) => value
  ? new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value))
  : '—';

const deviceLabel = (userAgent) => {
  if (!userAgent) return 'Dispositivo não identificado';
  const platform = /Windows/i.test(userAgent) ? 'Windows'
    : /Android/i.test(userAgent) ? 'Android'
      : /iPhone|iPad/i.test(userAgent) ? 'iPhone/iPad'
        : /Macintosh/i.test(userAgent) ? 'macOS'
          : /Linux/i.test(userAgent) ? 'Linux' : '';
  const app = /Electron/i.test(userAgent) ? 'ComandaFlow desktop'
    : /Edg\//i.test(userAgent) ? 'Microsoft Edge'
      : /Chrome\//i.test(userAgent) ? 'Google Chrome'
        : /Firefox\//i.test(userAgent) ? 'Mozilla Firefox'
          : /Safari\//i.test(userAgent) ? 'Safari' : 'Aplicativo';
  return [app, platform].filter(Boolean).join(' · ');
};

const ipLabel = (ip) => {
  if (!ip) return 'IP não identificado';
  if (['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(ip)) return 'Neste computador';
  return ip.replace(/^::ffff:/, '');
};

const auditActionLabel = {
  login: 'Login realizado',
  login_failed: 'Tentativa de login recusada',
  session_revoked: 'Acesso encerrado',
  setup_completed: 'Configuração inicial concluída',
};

const auditUserLabel = (log) => {
  if (log.user?.email) return log.user.email;
  try {
    return JSON.parse(log.metadata || '{}').email || 'Usuário não identificado';
  } catch {
    return 'Usuário não identificado';
  }
};

export default function SecurityPanel({ canManageUsers, canAudit }) {
  const [users, setUsers] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [logs, setLogs] = useState([]);
  const [twoFactor, setTwoFactor] = useState({ enabled: false });
  const [setup, setSetup] = useState(null);
  const [code, setCode] = useState('');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [processing, setProcessing] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'operador' });
  const [activeTab, setActiveTab] = useState('security');
  const [createOpen, setCreateOpen] = useState(false);
  const [teamSearch, setTeamSearch] = useState('');
  const [sessionFilter, setSessionFilter] = useState('active');
  const [auditSearch, setAuditSearch] = useState('');

  const load = useCallback(async () => {
    try {
      const tasks = [api.get('/auth/2fa/status').then((response) => setTwoFactor(response.data))];
      if (canManageUsers) {
        tasks.push(api.get('/users').then((response) => setUsers(response.data.users || [])));
        tasks.push(api.get('/auth/sessions').then((response) => setSessions(response.data.sessions || [])));
      }
      if (canAudit) tasks.push(api.get('/audit', { params: { take: 100 } }).then((response) => setLogs(response.data.logs || [])));
      await Promise.all(tasks);
      setError('');
    } catch (requestError) {
      setError(requestMessage(requestError));
    }
  }, [canAudit, canManageUsers]);

  useEffect(() => {
    load();
    const interval = window.setInterval(load, 30_000);
    return () => window.clearInterval(interval);
  }, [load]);

  const startTwoFactor = async () => {
    setProcessing(true); setError('');
    try {
      const response = await api.post('/auth/2fa/setup');
      setSetup(response.data); setNotice('Adicione a chave no aplicativo autenticador e confirme o código.');
    } catch (requestError) { setError(requestMessage(requestError)); }
    finally { setProcessing(false); }
  };

  const enableTwoFactor = async () => {
    setProcessing(true); setError('');
    try {
      await api.post('/auth/2fa/enable', { code });
      setCode(''); setSetup(null); setNotice('Autenticação em dois fatores ativada.'); await load();
    } catch (requestError) { setError(requestMessage(requestError)); }
    finally { setProcessing(false); }
  };

  const disableTwoFactor = async () => {
    setProcessing(true); setError('');
    try {
      await api.post('/auth/2fa/disable', { code });
      setCode(''); setNotice('Autenticação em dois fatores desativada.'); await load();
    } catch (requestError) { setError(requestMessage(requestError)); }
    finally { setProcessing(false); }
  };

  const createUser = async (event) => {
    event.preventDefault();
    setProcessing(true); setError('');
    try {
      await api.post('/users', form);
      setForm({ name: '', email: '', password: '', role: 'operador' });
      setCreateOpen(false);
      setNotice('Funcionário adicionado. Envie o e-mail e a senha inicial por um canal seguro.'); await load();
    } catch (requestError) { setError(requestMessage(requestError)); }
    finally { setProcessing(false); }
  };

  const updateUser = async (user, values) => {
    setProcessing(true); setError('');
    try {
      await api.put(`/users/${user.id}`, { ...values });
      setNotice(values.active === false ? 'Funcionário desativado e acessos encerrados.' : 'Funcionário atualizado.');
      await load();
    } catch (requestError) { setError(requestMessage(requestError)); }
    finally { setProcessing(false); }
  };

  const revokeSession = async (session) => {
    if (!window.confirm(`Encerrar o acesso de ${session.user.name || session.user.email}?`)) return;
    setProcessing(true); setError('');
    try {
      await api.post(`/auth/sessions/${session.id}/revoke`, { reason: 'Encerrada manualmente no painel de segurança' });
      setNotice('Acesso encerrado. Essa pessoa precisará entrar novamente.'); await load();
    } catch (requestError) { setError(requestMessage(requestError)); }
    finally { setProcessing(false); }
  };

  const copyTeamInstructions = async () => {
    const instructions = [
      'Acesso ao ComandaFlow Gestor',
      '1. Abra o aplicativo Gestor no computador autorizado.',
      '2. Entre com seu próprio e-mail e sua senha individual.',
      '3. Nunca use ou compartilhe a conta do proprietário.',
      '4. Ative a autenticação em dois fatores na área Segurança.',
    ].join('\n');
    try {
      await navigator.clipboard.writeText(instructions);
      setNotice('Instruções de acesso copiadas para compartilhar com a equipe.');
    } catch {
      setError('Não foi possível copiar. Oriente a equipe a usar uma conta individual.');
    }
  };

  const activeSessions = sessions.filter((session) => session.active);
  const onlineSessions = sessions.filter((session) => session.online);
  const activeUsers = users.filter((item) => item.active);
  const failedAttempts = logs.filter((log) => log.action === 'login_failed').length;
  const visibleUsers = users.filter((item) => {
    const term = teamSearch.trim().toLowerCase();
    return !term || item.name?.toLowerCase().includes(term) || item.email?.toLowerCase().includes(term);
  });
  const visibleSessions = sessions.filter((session) => sessionFilter === 'all' || (sessionFilter === 'online' ? session.online : session.active));
  const visibleLogs = logs.filter((log) => {
    const term = auditSearch.trim().toLowerCase();
    return !term
      || (auditActionLabel[log.action] || log.action).toLowerCase().includes(term)
      || auditUserLabel(log).toLowerCase().includes(term)
      || log.entity?.toLowerCase().includes(term);
  });
  const tabs = [
    ['security', 'Proteção', ShieldCheck],
    ...(canManageUsers ? [['team', 'Equipe', Users], ['sessions', 'Acessos', Laptop2]] : []),
    ...(canAudit ? [['audit', 'Auditoria', Activity]] : []),
  ];

  return (
    <section className="space-y-4">
      <div className="panel overflow-hidden">
        <header className="border-b border-slate-100 p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="shrink-0 rounded-xl bg-emerald-50 p-3 text-emerald-700"><ShieldCheck size={22} /></div>
              <div><h2 className="font-extrabold text-slate-900">Equipe e segurança</h2><p className="text-xs text-slate-500">Controle pessoas, permissões, acessos e proteção da conta.</p></div>
            </div>
            <button type="button" className="btn-secondary" onClick={load}><RefreshCw size={16} />Atualizar dados</button>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <article className="rounded-xl border border-slate-200 p-3"><p className="text-xs font-bold text-slate-500">Proteção da conta</p><p className={`mt-1 text-sm font-extrabold ${twoFactor.enabled ? 'text-emerald-700' : 'text-amber-700'}`}>{twoFactor.enabled ? '2FA ativada' : '2FA pendente'}</p></article>
            {canManageUsers && <article className="rounded-xl border border-slate-200 p-3"><p className="text-xs font-bold text-slate-500">Equipe ativa</p><p className="mt-1 text-xl font-extrabold text-slate-900">{activeUsers.length}</p></article>}
            {canManageUsers && <article className="rounded-xl border border-slate-200 p-3"><p className="text-xs font-bold text-slate-500">Online agora</p><p className="mt-1 text-xl font-extrabold text-emerald-700">{onlineSessions.length}</p></article>}
            {canAudit && <article className="rounded-xl border border-slate-200 p-3"><p className="text-xs font-bold text-slate-500">Tentativas recusadas</p><p className={`mt-1 text-xl font-extrabold ${failedAttempts ? 'text-rose-700' : 'text-slate-900'}`}>{failedAttempts}</p></article>}
          </div>
        </header>
        <nav className="flex gap-1 overflow-x-auto p-2" aria-label="Áreas de segurança">
          {tabs.map(([value, label, Icon]) => <button key={value} type="button" className={`nav-pill ${activeTab === value ? 'nav-pill-active' : ''}`} onClick={() => setActiveTab(value)}><Icon size={15} />{label}</button>)}
        </nav>
      </div>

      {error && <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div>}
      {notice && <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{notice}</div>}

      {activeTab === 'security' && <div className="panel p-5">
        <div className="flex items-center gap-3">
          <div className="shrink-0 rounded-xl bg-emerald-50 p-3 text-emerald-700"><ShieldCheck size={21} /></div>
          <div>
            <h2 className="font-extrabold text-slate-900">Segurança da conta</h2>
            <p className="text-xs text-slate-500">Segundo fator, sessões protegidas e códigos de recuperação.</p>
          </div>
        </div>
        <div className="mt-4 rounded-xl border border-slate-200 p-4">
          <p className="font-bold text-slate-900">
            Autenticação em dois fatores:{' '}
            <span className={twoFactor.enabled ? 'text-emerald-700' : 'text-amber-700'}>{twoFactor.enabled ? 'ativada' : 'desativada'}</span>
          </p>
          {!twoFactor.enabled && !setup && (
            <button className="btn-primary mt-3 w-full bg-emerald-600 hover:bg-emerald-700 sm:w-auto" disabled={processing} onClick={startTwoFactor}>
              <KeyRound size={16} />{processing ? 'Aguarde...' : 'Configurar 2FA'}
            </button>
          )}
          {setup && (
            <div className="mt-3 space-y-3">
              <p className="text-sm text-slate-600">No Google Authenticator, Microsoft Authenticator ou equivalente, adicione esta chave:</p>
              <code className="block break-all rounded-lg bg-slate-900 p-3 text-sm text-emerald-300">{setup.secret}</code>
              <div className="break-words rounded-lg bg-amber-50 p-3 text-xs text-amber-800">
                <strong>Guarde os códigos de recuperação agora:</strong><br />{setup.recoveryCodes.join(' · ')}
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <input className="input-field" inputMode="numeric" placeholder="Código de 6 dígitos" maxLength={6} value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, ''))} />
                <button className="btn-primary w-full bg-emerald-600 hover:bg-emerald-700 sm:w-auto" disabled={processing || code.length !== 6} onClick={enableTwoFactor}>{processing ? 'Confirmando...' : 'Confirmar'}</button>
              </div>
            </div>
          )}
          {twoFactor.enabled && (
            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <input className="input-field" inputMode="numeric" placeholder="Código atual" maxLength={6} value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, ''))} />
              <button className="btn-secondary w-full text-rose-700 sm:w-auto" disabled={processing || !code} onClick={disableTwoFactor}>{processing ? 'Desativando...' : 'Desativar 2FA'}</button>
            </div>
          )}
        </div>
      </div>}

      {canManageUsers && activeTab === 'team' && (
        <div className="panel p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <Users size={21} className="shrink-0 text-blue-700" />
              <div>
                <h2 className="font-extrabold text-slate-900">Equipe do Gestor</h2>
                <p className="text-xs text-slate-500">Uma conta por funcionário, com permissões próprias.</p>
              </div>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <button type="button" className="btn-secondary w-full sm:w-auto" onClick={copyTeamInstructions}><Copy size={16} />Copiar instruções</button>
              <button type="button" className={createOpen ? 'btn-secondary w-full sm:w-auto' : 'btn-primary w-full bg-blue-600 hover:bg-blue-700 sm:w-auto'} onClick={() => setCreateOpen((value) => !value)}>{createOpen ? <X size={16} /> : <UserPlus size={16} />}{createOpen ? 'Cancelar' : 'Adicionar pessoa'}</button>
            </div>
          </div>
          <div className="mt-4 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            <ShieldAlert className="mt-0.5 shrink-0" size={18} />
            <p><strong>Não compartilhe a senha do proprietário.</strong> Cadastre cada pessoa abaixo. Ao desativar uma conta, todos os acessos dela são encerrados imediatamente.</p>
          </div>
          {createOpen && <form className="mt-4 grid gap-3 rounded-2xl border border-blue-200 bg-blue-50 p-4 md:grid-cols-2" onSubmit={createUser}>
            <div className="md:col-span-2"><p className="font-extrabold text-slate-900">Nova conta individual</p><p className="text-xs text-slate-500">A pessoa poderá trocar a senha depois do primeiro acesso.</p></div>
            <input className="input-field" placeholder="Nome" value={form.name} onChange={(event) => setForm((value) => ({ ...value, name: event.target.value }))} required />
            <input type="email" className="input-field" placeholder="E-mail individual" value={form.email} onChange={(event) => setForm((value) => ({ ...value, email: event.target.value }))} required />
            <input type="password" minLength={10} className="input-field" placeholder="Senha inicial (mínimo 10 caracteres)" value={form.password} onChange={(event) => setForm((value) => ({ ...value, password: event.target.value }))} required />
            <select className="input-field" value={form.role} onChange={(event) => setForm((value) => ({ ...value, role: event.target.value }))}>
              {roles.filter(([value]) => !['proprietario', 'administrador'].includes(value)).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
            <div className="flex justify-end md:col-span-2">
              <button className="btn-primary w-full bg-blue-600 hover:bg-blue-700 sm:w-auto" disabled={processing}><Plus size={16} />{processing ? 'Salvando...' : 'Adicionar funcionário'}</button>
            </div>
          </form>}
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <label className="relative block flex-1"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input className="input-field pl-9" placeholder="Buscar por nome ou e-mail" value={teamSearch} onChange={(event) => setTeamSearch(event.target.value)} /></label>
            <span className="text-xs font-bold text-slate-500">{activeUsers.length} de {users.length} contas ativas</span>
          </div>
          <div className="mt-3 space-y-2">
            {visibleUsers.map((user) => (
              <div key={user.id} className="grid items-center gap-2 rounded-xl border border-slate-200 p-3 md:grid-cols-[minmax(0,1fr)_220px_auto]">
                <div className="min-w-0">
                  <p className="truncate font-bold text-slate-900">{user.name || user.email}</p>
                  <p className="break-all text-xs text-slate-500">{user.email} · 2FA {user.twoFactorEnabled ? 'ativo' : 'inativo'} · {user.active ? 'conta ativa' : 'conta bloqueada'}</p>
                </div>
                <select className="input-field py-2 text-xs" value={user.role} disabled={processing} onChange={(event) => updateUser(user, { role: event.target.value })}>
                  {roles.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
                <button className={`btn-secondary w-full md:w-auto ${user.active ? 'text-rose-700' : 'text-emerald-700'}`} disabled={processing} onClick={() => updateUser(user, { active: !user.active })}>{user.active ? 'Desativar' : 'Ativar'}</button>
              </div>
            ))}
            {!visibleUsers.length && <div className="empty-state">Nenhuma pessoa encontrada.</div>}
          </div>
        </div>
      )}

      {canManageUsers && activeTab === 'sessions' && (
        <div className="panel overflow-hidden">
          <header className="border-b border-slate-100 p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <Laptop2 size={21} className="shrink-0 text-violet-700" />
                <div>
                  <h2 className="font-extrabold text-slate-900">Quem acessou o Gestor</h2>
                  <p className="text-xs text-slate-500">Login, última atividade, IP e dispositivo de cada pessoa.</p>
                </div>
              </div>
              <select className="input-field sm:w-48" value={sessionFilter} onChange={(event) => setSessionFilter(event.target.value)}><option value="active">Acessos ativos</option><option value="online">Online agora</option><option value="all">Todo o histórico</option></select>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:max-w-md">
              <div className="rounded-xl bg-emerald-50 p-3"><p className="text-2xl font-extrabold text-emerald-700">{onlineSessions.length}</p><p className="text-xs font-semibold text-slate-500">online agora</p></div>
              <div className="rounded-xl bg-blue-50 p-3"><p className="text-2xl font-extrabold text-blue-700">{activeSessions.length}</p><p className="text-xs font-semibold text-slate-500">sessões ativas</p></div>
            </div>
          </header>
          <div className="max-h-[34rem] space-y-2 overflow-auto p-3 sm:p-4">
            {visibleSessions.map((session) => (
              <article key={session.id} className="grid gap-3 rounded-xl border border-slate-200 p-3 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1fr)_auto] lg:items-center">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate font-bold text-slate-900">{session.user.name || session.user.email}</p>
                    <span className={`status-chip ${session.online ? 'bg-emerald-100 text-emerald-700' : session.active ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500'}`}>
                      {session.online ? 'online' : session.active ? 'ativo' : session.revokedAt ? 'encerrado' : 'expirado'}
                    </span>
                    {session.current && <span className="status-chip bg-violet-100 text-violet-700">esta sessão</span>}
                  </div>
                  <p className="mt-1 break-all text-xs text-slate-500">{session.user.email} · {session.user.role}</p>
                </div>
                <div className="min-w-0 text-xs text-slate-600">
                  <p className="flex items-center gap-2"><Laptop2 className="shrink-0 text-slate-400" size={15} /><span className="truncate" title={session.device || ''}>{deviceLabel(session.device)}</span></p>
                  <p className="mt-1 break-all pl-6">{ipLabel(session.ip)}</p>
                </div>
                <div className="text-xs text-slate-600">
                  <p className="flex items-center gap-2"><Clock3 className="shrink-0 text-slate-400" size={15} />Entrou {formatDateTime(session.createdAt)}</p>
                  <p className="mt-1 pl-6">Atividade {formatDateTime(session.lastSeenAt)}</p>
                </div>
                {session.active && !session.current ? (
                  <button type="button" className="btn-secondary w-full text-rose-700 lg:w-auto" disabled={processing} onClick={() => revokeSession(session)}><LogOut size={16} />Encerrar</button>
                ) : <span className="text-center text-xs text-slate-400 lg:min-w-24">{session.current ? 'Em uso' : session.revokeReason || 'Sem acesso'}</span>}
              </article>
            ))}
            {!visibleSessions.length && <div className="py-10 text-center text-sm text-slate-500">Nenhum acesso encontrado neste filtro.</div>}
          </div>
        </div>
      )}

      {canAudit && activeTab === 'audit' && (
        <div className="panel overflow-hidden">
          <header className="border-b border-slate-100 p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div><h2 className="font-extrabold text-slate-900">Auditoria completa</h2><p className="text-xs text-slate-500">Entradas, tentativas recusadas, alterações, usuário, origem e resultado.</p></div>
              <label className="relative block sm:w-72"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input className="input-field pl-9" placeholder="Buscar no histórico" value={auditSearch} onChange={(event) => setAuditSearch(event.target.value)} /></label>
            </div>
          </header>
          <div className="responsive-table-wrap max-h-[32rem] overflow-auto">
            <table className="responsive-data-table w-full min-w-[720px] text-left text-xs">
              <thead className="sticky top-0 bg-slate-50 uppercase text-slate-500">
                <tr><th className="px-4 py-3">Data</th><th className="px-4 py-3">Usuário</th><th className="px-4 py-3">Ação</th><th className="px-4 py-3">Área</th><th className="px-4 py-3">IP</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visibleLogs.map((log) => (
                  <tr key={log.id} className={log.action === 'login_failed' ? 'bg-rose-50' : ''}>
                    <td data-label="Data" className="px-4 py-3">{formatDateTime(log.createdAt)}</td>
                    <td data-label="Usuário" className="break-all px-4 py-3">{auditUserLabel(log)}</td>
                    <td data-label="Ação" className="break-all px-4 py-3 font-semibold">{auditActionLabel[log.action] || log.action}</td>
                    <td data-label="Área" className="px-4 py-3">{log.entity}</td>
                    <td data-label="IP" className="px-4 py-3">{ipLabel(log.ip)}</td>
                  </tr>
                ))}
                {!visibleLogs.length && <tr className="responsive-table-empty"><td colSpan="5" className="px-4 py-10 text-center text-slate-500">Nenhuma ação encontrada.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}
