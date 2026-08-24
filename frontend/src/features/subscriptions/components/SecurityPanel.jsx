import { useCallback, useEffect, useState } from 'react';
import { KeyRound, Plus, ShieldCheck, Users } from 'lucide-react';
import api from '../../../shared/services/api';

const roles = [
  ['proprietario', 'Proprietário — acesso total'],
  ['administrador', 'Administrador legado — acesso total'],
  ['financeiro', 'Financeiro — cobranças e assinantes'],
  ['suporte', 'Suporte — monitoramento, mensagens e chamados'],
  ['operador', 'Operador — consulta e atendimento'],
  ['auditor', 'Auditor — consulta e auditoria'],
];

export default function SecurityPanel({ canManageUsers, canAudit }) {
  const [users, setUsers] = useState([]);
  const [logs, setLogs] = useState([]);
  const [twoFactor, setTwoFactor] = useState({ enabled: false });
  const [setup, setSetup] = useState(null);
  const [code, setCode] = useState('');
  const [notice, setNotice] = useState('');
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'operador' });
  const load = useCallback(async () => {
    const tasks = [api.get('/auth/2fa/status').then((response) => setTwoFactor(response.data))];
    if (canManageUsers) tasks.push(api.get('/users').then((response) => setUsers(response.data.users || [])));
    if (canAudit) tasks.push(api.get('/audit', { params: { take: 60 } }).then((response) => setLogs(response.data.logs || [])));
    await Promise.all(tasks);
  }, [canAudit, canManageUsers]);
  useEffect(() => { load().catch(() => {}); }, [load]);
  const startTwoFactor = async () => {
    const response = await api.post('/auth/2fa/setup');
    setSetup(response.data); setNotice('Adicione a chave no aplicativo autenticador e confirme o código.');
  };
  const enableTwoFactor = async () => {
    await api.post('/auth/2fa/enable', { code });
    setCode(''); setSetup(null); setNotice('Autenticação em dois fatores ativada.'); await load();
  };
  const disableTwoFactor = async () => {
    await api.post('/auth/2fa/disable', { code });
    setCode(''); setNotice('Autenticação em dois fatores desativada.'); await load();
  };
  const createUser = async (event) => {
    event.preventDefault();
    await api.post('/users', form);
    setForm({ name: '', email: '', password: '', role: 'operador' });
    setNotice('Funcionário adicionado.'); await load();
  };
  const updateUser = async (user, values) => {
    await api.put(`/users/${user.id}`, { ...values });
    await load();
  };

  return <section className="space-y-4"><div className="panel p-5"><div className="flex items-center gap-3"><div className="rounded-xl bg-emerald-50 p-3 text-emerald-700"><ShieldCheck size={21} /></div><div><h2 className="font-extrabold text-slate-900">Segurança da conta</h2><p className="text-xs text-slate-500">Segundo fator e códigos de recuperação.</p></div></div>{notice && <div className="mt-4 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700">{notice}</div>}<div className="mt-4 rounded-xl border border-slate-200 p-4"><p className="font-bold text-slate-900">Autenticação em dois fatores: <span className={twoFactor.enabled ? 'text-emerald-700' : 'text-amber-700'}>{twoFactor.enabled ? 'ativada' : 'desativada'}</span></p>{!twoFactor.enabled && !setup && <button className="btn-primary mt-3 bg-emerald-600 hover:bg-emerald-700" onClick={startTwoFactor}><KeyRound size={16} />Configurar 2FA</button>}{setup && <div className="mt-3 space-y-3"><p className="text-sm text-slate-600">No Google Authenticator, Microsoft Authenticator ou equivalente, adicione esta chave:</p><code className="block break-all rounded-lg bg-slate-900 p-3 text-sm text-emerald-300">{setup.secret}</code><div className="rounded-lg bg-amber-50 p-3 text-xs text-amber-800"><strong>Guarde os códigos de recuperação agora:</strong><br />{setup.recoveryCodes.join(' · ')}</div><div className="flex gap-2"><input className="input-field" inputMode="numeric" placeholder="Código de 6 dígitos" maxLength={6} value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, ''))} /><button className="btn-primary bg-emerald-600 hover:bg-emerald-700" onClick={enableTwoFactor}>Confirmar</button></div></div>}{twoFactor.enabled && <div className="mt-3 flex gap-2"><input className="input-field" inputMode="numeric" placeholder="Código atual" maxLength={6} value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, ''))} /><button className="btn-secondary text-rose-700" onClick={disableTwoFactor}>Desativar 2FA</button></div>}</div></div>{canManageUsers && <div className="panel p-5"><div className="flex items-center gap-3"><Users size={21} className="text-blue-700" /><div><h2 className="font-extrabold text-slate-900">Equipe do Gestor</h2><p className="text-xs text-slate-500">Cada perfil possui permissões próprias no servidor.</p></div></div><form className="mt-4 grid gap-3 md:grid-cols-2" onSubmit={createUser}><input className="input-field" placeholder="Nome" value={form.name} onChange={(event) => setForm((value) => ({ ...value, name: event.target.value }))} required /><input type="email" className="input-field" placeholder="E-mail" value={form.email} onChange={(event) => setForm((value) => ({ ...value, email: event.target.value }))} required /><input type="password" minLength={10} className="input-field" placeholder="Senha inicial (mínimo 10 caracteres)" value={form.password} onChange={(event) => setForm((value) => ({ ...value, password: event.target.value }))} required /><select className="input-field" value={form.role} onChange={(event) => setForm((value) => ({ ...value, role: event.target.value }))}>{roles.filter(([value]) => !['proprietario', 'administrador'].includes(value)).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><div className="flex justify-end md:col-span-2"><button className="btn-primary bg-blue-600 hover:bg-blue-700"><Plus size={16} />Adicionar funcionário</button></div></form><div className="mt-4 space-y-2">{users.map((user) => <div key={user.id} className="grid items-center gap-2 rounded-xl border border-slate-200 p-3 md:grid-cols-[1fr_220px_auto]"><div><p className="font-bold text-slate-900">{user.name || user.email}</p><p className="text-xs text-slate-500">{user.email} · 2FA {user.twoFactorEnabled ? 'ativo' : 'inativo'}</p></div><select className="input-field py-2 text-xs" value={user.role} onChange={(event) => updateUser(user, { role: event.target.value })}>{roles.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><button className={`btn-secondary ${user.active ? 'text-rose-700' : 'text-emerald-700'}`} onClick={() => updateUser(user, { active: !user.active })}>{user.active ? 'Desativar' : 'Ativar'}</button></div>)}</div></div>}{canAudit && <div className="panel overflow-hidden"><header className="border-b border-slate-100 p-5"><h2 className="font-extrabold text-slate-900">Auditoria completa</h2><p className="text-xs text-slate-500">Últimas ações, usuário, origem e resultado.</p></header><div className="max-h-96 overflow-auto"><table className="w-full min-w-[720px] text-left text-xs"><thead className="sticky top-0 bg-slate-50 uppercase text-slate-500"><tr><th className="px-4 py-3">Data</th><th className="px-4 py-3">Usuário</th><th className="px-4 py-3">Ação</th><th className="px-4 py-3">Área</th><th className="px-4 py-3">IP</th></tr></thead><tbody className="divide-y divide-slate-100">{logs.map((log) => <tr key={log.id}><td className="px-4 py-3">{new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(log.createdAt))}</td><td className="px-4 py-3">{log.user?.email || 'Sistema'}</td><td className="px-4 py-3 font-mono">{log.action}</td><td className="px-4 py-3">{log.entity}</td><td className="px-4 py-3">{log.ip || '—'}</td></tr>)}</tbody></table></div></div>}</section>;
}
