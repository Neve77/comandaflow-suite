import { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  BarChart3,
  Check,
  Eye,
  EyeOff,
  LoaderCircle,
  LockKeyhole,
  Mail,
  Moon,
  ShieldCheck,
  Smartphone,
  Store,
  Sun,
  UserRound,
  Zap,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../app/providers/AuthContext';
import api from '../../shared/services/api';

const features = [
  { title: 'Operação em tempo real', description: 'Mesas, comandas e pedidos sincronizados.', icon: Smartphone, tone: 'emerald' },
  { title: 'Decisões mais rápidas', description: 'Indicadores claros para acompanhar o negócio.', icon: BarChart3, tone: 'blue' },
  { title: 'Pronto para o movimento', description: 'Fluxos rápidos para toda a equipe.', icon: Zap, tone: 'amber' },
];

export default function LoginPage() {
  const { login, system } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [twoFactorRequired, setTwoFactorRequired] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [capsLock, setCapsLock] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [setupRequired, setSetupRequired] = useState(false);
  const [setupLoading, setSetupLoading] = useState(true);
  const [darkMode, setDarkMode] = useState(() => document.documentElement.classList.contains('dark'));

  useEffect(() => {
    const controller = new AbortController();
    api.get('/auth/setup-status', { signal: controller.signal })
      .then((response) => setSetupRequired(Boolean(response.data?.setupRequired)))
      .catch((requestError) => {
        if (requestError.code !== 'ERR_CANCELED') setError('Não foi possível conectar ao serviço local. Verifique se o aplicativo iniciou corretamente.');
      })
      .finally(() => {
        if (!controller.signal.aborted) setSetupLoading(false);
      });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
    localStorage.setItem('cf_dark', darkMode);
  }, [darkMode]);

  const passwordChecks = useMemo(() => [
    ['10 caracteres', password.length >= 10],
    ['uma letra', /[A-Za-zÀ-ÿ]/.test(password)],
    ['um número', /\d/.test(password)],
  ], [password]);
  const managerMode = Boolean(system.subscriptionManager);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    const normalizedEmail = email.trim().toLowerCase();

    if (setupRequired && name.trim().length < 2) {
      setError('Informe o nome do responsável pelo sistema.');
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(normalizedEmail)) {
      setError('Informe um endereço de e-mail válido.');
      return;
    }
    if (!password || (!setupRequired && password.length < 6)) {
      setError('Informe sua senha para continuar.');
      return;
    }
    if (setupRequired && passwordChecks.some(([, valid]) => !valid)) {
      setError('Crie uma senha com pelo menos 10 caracteres, uma letra e um número.');
      return;
    }
    if (setupRequired && password !== passwordConfirmation) {
      setError('As senhas não coincidem.');
      return;
    }
    if (twoFactorRequired && twoFactorCode.trim().length < 6) {
      setError('Informe o código de segurança para continuar.');
      return;
    }

    setLoading(true);
    try {
      if (setupRequired) await api.post('/auth/setup', { name: name.trim(), email: normalizedEmail, password });
      await login(normalizedEmail, password, twoFactorCode.trim());
      navigate(system.subscriptionManager ? '/subscriptions' : '/dashboard');
    } catch (requestError) {
      if (requestError.response?.data?.code === 'TWO_FACTOR_REQUIRED') {
        setTwoFactorRequired(true);
        setTwoFactorCode('');
        setError('Confirme sua identidade com o código do autenticador.');
      } else {
        setError(requestError.response?.data?.message || 'Não foi possível concluir o acesso. Tente novamente.');
      }
    } finally {
      setLoading(false);
    }
  };

  const mode = setupRequired ? {
    eyebrow: 'Configuração inicial',
    title: managerMode ? 'Prepare o Gestor.' : 'Prepare seu restaurante.',
    description: managerMode ? 'Crie a conta proprietária responsável pela administração do ComandaFlow.' : 'Crie a conta responsável pela operação e pelas configurações do ComandaFlow.',
    submitLabel: 'Criar conta e acessar',
  } : twoFactorRequired ? {
    eyebrow: 'Verificação de segurança',
    title: 'Confirme que é você.',
    description: 'Use o código do seu aplicativo autenticador ou um código de recuperação.',
    submitLabel: 'Confirmar e entrar',
  } : {
    eyebrow: managerMode ? 'Área do Gestor' : 'Área do restaurante',
    title: 'Bem-vindo de volta.',
    description: 'Entre para continuar a operação do seu restaurante.',
    submitLabel: 'Entrar no sistema',
  };

  return (
    <main className="login-page">
      <div className="login-background" aria-hidden="true"><span /><span /><span /></div>
      <button type="button" className="login-theme-toggle" title={darkMode ? 'Usar tema claro' : 'Usar tema escuro'} aria-label={darkMode ? 'Usar tema claro' : 'Usar tema escuro'} onClick={() => setDarkMode((value) => !value)}>
        {darkMode ? <Sun size={18} /> : <Moon size={18} />}
      </button>

      <section className="login-shell">
        <aside className="login-story">
          <Brand />
          <div className="login-story-copy">
            <span className="login-product-chip"><Store size={14} />{managerMode ? 'ComandaFlow Gestor' : 'ComandaFlow Restaurante'}</span>
            <h1>{managerMode ? 'Sua operação de assinaturas sob controle.' : 'Seu atendimento fluindo do salão ao caixa.'}</h1>
            <p>{managerMode ? 'Clientes, cobranças, suporte e segurança reunidos em uma visão confiável.' : 'Uma operação organizada, rápida e fácil de acompanhar — mesmo nos horários de maior movimento.'}</p>
          </div>
          <div className="login-feature-list">
            {features.map(({ title, description, icon: Icon, tone }) => (
              <article key={title} className="login-feature">
                <span className={`login-feature-icon login-feature-${tone}`}><Icon size={19} /></span>
                <span><strong>{title}</strong><small>{description}</small></span>
              </article>
            ))}
          </div>
          <div className="login-story-footer"><ShieldCheck size={16} /><span>Ambiente local protegido e preparado para trabalhar offline.</span></div>
        </aside>

        <div className="login-form-side">
          <div className="login-mobile-brand"><Brand compact /></div>
          <div className="login-form-heading">
            <span>{mode.eyebrow}</span>
            <h2>{mode.title}</h2>
            <p>{setupLoading ? 'Verificando a configuração do aplicativo…' : mode.description}</p>
          </div>

          <form className="login-form" onSubmit={handleSubmit} noValidate>
            {setupRequired && (
              <Field label="Seu nome" icon={UserRound}>
                <input autoFocus type="text" value={name} onChange={(event) => setName(event.target.value)} placeholder="Nome do responsável" autoComplete="name" minLength={2} required />
              </Field>
            )}

            <Field label="E-mail" icon={Mail}>
              <input autoFocus={!setupRequired && !twoFactorRequired} type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="voce@restaurante.com" autoComplete="username" required disabled={twoFactorRequired} />
            </Field>

            <Field label={setupRequired ? 'Crie uma senha' : 'Senha'} icon={LockKeyhole}>
              <div className="login-password-wrap">
                <input type={showPassword ? 'text' : 'password'} value={password} onChange={(event) => setPassword(event.target.value)} onKeyUp={(event) => setCapsLock(event.getModifierState('CapsLock'))} onKeyDown={(event) => setCapsLock(event.getModifierState('CapsLock'))} placeholder={setupRequired ? 'Crie uma senha segura' : 'Digite sua senha'} autoComplete={setupRequired ? 'new-password' : 'current-password'} minLength={setupRequired ? 10 : 6} required disabled={twoFactorRequired} />
                <button type="button" className="login-password-toggle" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button>
              </div>
              {capsLock && <small className="login-field-hint login-field-warning"><AlertCircle size={13} />Caps Lock está ativado</small>}
            </Field>

            {setupRequired && (
              <>
                <div className="login-password-rules" aria-label="Requisitos da senha">{passwordChecks.map(([label, valid]) => <span key={label} className={valid ? 'valid' : ''}><Check size={13} />{label}</span>)}</div>
                <Field label="Confirme a senha" icon={LockKeyhole}>
                  <input type={showPassword ? 'text' : 'password'} value={passwordConfirmation} onChange={(event) => setPasswordConfirmation(event.target.value)} placeholder="Repita a senha" autoComplete="new-password" minLength={10} required />
                </Field>
              </>
            )}

            {twoFactorRequired && (
              <Field label="Código de segurança" icon={ShieldCheck}>
                <input autoFocus type="text" value={twoFactorCode} onChange={(event) => setTwoFactorCode(event.target.value.replace(/\s/g, '').toUpperCase())} placeholder="000000 ou código de recuperação" autoComplete="one-time-code" minLength={6} maxLength={20} required />
              </Field>
            )}

            {error && <div className={`login-feedback ${twoFactorRequired && error.startsWith('Confirme') ? 'login-feedback-info' : ''}`} role="alert"><AlertCircle size={17} /><span>{error}</span></div>}

            <button type="submit" className="login-submit" disabled={loading || setupLoading}>
              {loading ? <><LoaderCircle className="animate-spin" size={18} />Validando acesso…</> : <>{mode.submitLabel}<ArrowRight size={17} /></>}
            </button>
          </form>

          <p className="login-privacy"><ShieldCheck size={14} />Seus dados permanecem protegidos neste dispositivo.</p>
        </div>
      </section>
    </main>
  );
}

function Brand({ compact = false }) {
  return (
    <div className={`login-brand ${compact ? 'login-brand-compact' : ''}`}>
      <span className="login-brand-logo"><img src="./logo-icon.png" alt="" onError={(event) => { event.currentTarget.style.display = 'none'; }} /><strong>CF</strong></span>
      <span><strong>ComandaFlow</strong><small>Gestão inteligente</small></span>
    </div>
  );
}

function Field({ label, icon: Icon, children }) {
  return <label className="login-field"><span><Icon size={14} />{label}</span>{children}</label>;
}
