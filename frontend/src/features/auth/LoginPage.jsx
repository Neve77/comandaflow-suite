import { useEffect, useState } from 'react';
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  ShieldCheck,
  Smartphone,
  UserRound,
  Zap,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../app/providers/AuthContext';
import api from '../../shared/services/api';

const features = [
  {
    title: 'Operação em tempo real',
    description: 'Pedidos, estoque e mesas atualizados em um só lugar.',
    icon: Smartphone,
    color: '#34d399',
    bg: 'rgba(16,185,129,0.13)',
  },
  {
    title: 'Visão clara do negócio',
    description: 'Acompanhe vendas e resultados sem perder o ritmo.',
    icon: BarChart3,
    color: '#60a5fa',
    bg: 'rgba(59,130,246,0.13)',
  },
  {
    title: 'Feito para o pico',
    description: 'Uma experiência rápida para a rotina do seu time.',
    icon: Zap,
    color: '#fbbf24',
    bg: 'rgba(245,158,11,0.13)',
  },
];

const inputStyle = {
  width: '100%',
  borderRadius: 12,
  border: '1px solid rgba(148,163,184,0.24)',
  background: 'rgba(15,23,42,0.64)',
  color: '#f8fafc',
  padding: '12px 14px',
  fontSize: 13.5,
  fontWeight: 500,
  fontFamily: 'inherit',
  outline: 'none',
  transition: 'border-color 0.15s ease, box-shadow 0.15s ease, background 0.15s ease',
};

const focusInput = (event) => {
  event.target.style.borderColor = '#34d399';
  event.target.style.background = 'rgba(15,23,42,0.92)';
  event.target.style.boxShadow = '0 0 0 4px rgba(16,185,129,0.13)';
};

const blurInput = (event) => {
  event.target.style.borderColor = 'rgba(148,163,184,0.24)';
  event.target.style.background = 'rgba(15,23,42,0.64)';
  event.target.style.boxShadow = 'none';
};

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
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [setupRequired, setSetupRequired] = useState(false);
  const [setupLoading, setSetupLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();

    const loadSetupStatus = async () => {
      try {
        const response = await api.get('/auth/setup-status', { signal: controller.signal });
        setSetupRequired(Boolean(response.data?.setupRequired));
      } catch (requestError) {
        if (requestError.code !== 'ERR_CANCELED') setSetupRequired(false);
      } finally {
        if (!controller.signal.aborted) setSetupLoading(false);
      }
    };

    loadSetupStatus();
    return () => controller.abort();
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    if (setupRequired && password !== passwordConfirmation) {
      setError('As senhas não coincidem.');
      return;
    }

    setLoading(true);
    try {
      if (setupRequired) {
        await api.post('/auth/setup', { name, email, password });
      }
      await login(email, password, twoFactorCode);
      navigate(system.subscriptionManager ? '/subscriptions' : '/dashboard');
    } catch (requestError) {
      if (requestError.response?.data?.code === 'TWO_FACTOR_REQUIRED') setTwoFactorRequired(true);
      setError(requestError.response?.data?.message || 'Não foi possível concluir o acesso. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const mode = setupRequired ? {
    eyebrow: 'Primeiro acesso',
    title: 'Vamos preparar seu espaço.',
    description: 'Crie a conta responsável pelas configurações iniciais do ComandaFlow.',
    submitLabel: 'Criar e acessar o sistema',
  } : {
    eyebrow: 'Acesse sua conta',
    title: 'Bem-vindo de volta.',
    description: 'Entre para continuar a operação do seu negócio.',
    submitLabel: 'Entrar no sistema',
  };

  return (
    <main style={{
      minHeight: '100vh',
      background: 'radial-gradient(ellipse 70% 55% at 12% 12%, rgba(16,185,129,0.17) 0%, transparent 72%), radial-gradient(ellipse 58% 50% at 92% 88%, rgba(59,130,246,0.16) 0%, transparent 72%), linear-gradient(145deg, #020617 0%, #0b1220 48%, #020617 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px 16px',
      position: 'relative',
      overflow: 'hidden',
    }}>
      <div aria-hidden="true" style={{
        position: 'absolute', inset: 0, pointerEvents: 'none', opacity: 0.7,
        backgroundImage: 'linear-gradient(rgba(148,163,184,0.045) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.045) 1px, transparent 1px)',
        backgroundSize: '44px 44px',
        maskImage: 'linear-gradient(to bottom, black, transparent)',
      }} />

      <section style={{
        position: 'relative', width: '100%', maxWidth: 1080, minHeight: 610, display: 'flex',
        borderRadius: 28, overflow: 'hidden', border: '1px solid rgba(148,163,184,0.16)',
        background: 'rgba(8,15,30,0.82)',
        boxShadow: '0 40px 130px -36px rgba(0,0,0,0.92), 0 0 0 1px rgba(255,255,255,0.025) inset',
        backdropFilter: 'blur(24px)',
      }} className="flex-col lg:flex-row">
        <aside style={{
          flex: 1, padding: '46px 44px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
          background: 'linear-gradient(150deg, rgba(16,185,129,0.12) 0%, rgba(14,23,43,0.1) 48%, rgba(59,130,246,0.09) 100%)',
          borderRight: '1px solid rgba(148,163,184,0.12)',
        }} className="hidden lg:flex">
          <div>
            <Brand />
            <div style={{ marginTop: 52 }}>
              <p style={{ color: '#6ee7b7', fontSize: 11, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 13 }}>
                Gestão que acompanha você
              </p>
              <h1 style={{ maxWidth: 470, color: '#f8fafc', fontSize: 32, fontWeight: 800, letterSpacing: '-0.045em', lineHeight: 1.18, margin: 0 }}>
                Mais controle para uma operação que não para.
              </h1>
              <p style={{ maxWidth: 450, marginTop: 17, color: 'rgba(203,213,225,0.78)', fontSize: 14, lineHeight: 1.7 }}>
                Comandas, mesas, pedidos e indicadores reunidos em uma experiência simples para a sua equipe.
              </p>
            </div>
          </div>

          <div style={{ display: 'grid', gap: 10, marginTop: 36 }}>
            {features.map(({ title, description, icon: Icon, color, bg }) => (
              <div key={title} style={{
                display: 'flex', alignItems: 'center', gap: 13, padding: '13px 14px',
                border: '1px solid rgba(148,163,184,0.12)', borderRadius: 14, background: 'rgba(15,23,42,0.46)',
              }}>
                <div style={{
                  width: 38, height: 38, flexShrink: 0, borderRadius: 11, background: bg, color,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Icon size={18} strokeWidth={2.2} />
                </div>
                <div>
                  <p style={{ margin: 0, color: '#f8fafc', fontSize: 13, fontWeight: 750 }}>{title}</p>
                  <p style={{ margin: '2px 0 0', color: 'rgba(148,163,184,0.9)', fontSize: 12, lineHeight: 1.45 }}>{description}</p>
                </div>
              </div>
            ))}
          </div>
        </aside>

        <div style={{ width: '100%', maxWidth: 446, padding: '38px 34px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div className="lg:hidden" style={{ marginBottom: 36 }}><Brand compact /></div>

          <div style={{ marginBottom: 28 }}>
            <p style={{ margin: 0, color: '#6ee7b7', fontSize: 11, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase' }}>
              {mode.eyebrow}
            </p>
            <h2 style={{ margin: '10px 0 7px', color: '#f8fafc', fontSize: 26, fontWeight: 800, lineHeight: 1.2, letterSpacing: '-0.04em' }}>
              {mode.title}
            </h2>
            <p style={{ margin: 0, color: 'rgba(148,163,184,0.92)', fontSize: 13.5, lineHeight: 1.6 }}>
              {setupLoading ? 'Verificando a configuração do aplicativo…' : mode.description}
            </p>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 15 }}>
            {setupRequired && (
              <Field label="Seu nome" icon={UserRound}>
                <input
                  type="text" value={name} onChange={(event) => setName(event.target.value)} placeholder="Como podemos chamar você?"
                  autoComplete="name" minLength={2} required style={inputStyle} onFocus={focusInput} onBlur={blurInput}
                />
              </Field>
            )}

            {!setupRequired && twoFactorRequired && (
              <Field label="Código de segurança" icon={ShieldCheck}>
                <input
                  type="text" value={twoFactorCode} onChange={(event) => setTwoFactorCode(event.target.value.toUpperCase())}
                  placeholder="6 dígitos ou código de recuperação" autoComplete="one-time-code" minLength={6} maxLength={20}
                  required style={inputStyle} onFocus={focusInput} onBlur={blurInput}
                />
              </Field>
            )}

            <Field label="E-mail" icon={Mail}>
              <input
                type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="voce@empresa.com"
                autoComplete="email" required style={inputStyle} onFocus={focusInput} onBlur={blurInput}
              />
            </Field>

            <Field label={setupRequired ? 'Crie uma senha' : 'Senha'} icon={LockKeyhole}>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'} value={password} onChange={(event) => setPassword(event.target.value)}
                  placeholder={setupRequired ? 'No mínimo 10 caracteres' : 'Digite sua senha'}
                  autoComplete={setupRequired ? 'new-password' : 'current-password'} minLength={setupRequired ? 10 : 6} required
                  style={{ ...inputStyle, paddingRight: 48 }} onFocus={focusInput} onBlur={blurInput}
                />
                <PasswordToggle show={showPassword} onClick={() => setShowPassword((value) => !value)} />
              </div>
            </Field>

            {setupRequired && (
              <Field label="Confirme a senha" icon={LockKeyhole}>
                <input
                  type={showPassword ? 'text' : 'password'} value={passwordConfirmation}
                  onChange={(event) => setPasswordConfirmation(event.target.value)} placeholder="Repita a senha escolhida"
                  autoComplete="new-password" minLength={10} required style={inputStyle} onFocus={focusInput} onBlur={blurInput}
                />
              </Field>
            )}

            {error && (
              <div role="alert" style={{
                borderRadius: 12, border: '1px solid rgba(251,113,133,0.35)', background: 'rgba(190,24,93,0.13)',
                padding: '11px 13px', color: '#fecdd3', fontSize: 12.5, fontWeight: 600, lineHeight: 1.45,
              }}>
                {error}
              </div>
            )}

            <button
              type="submit" disabled={loading || setupLoading}
              style={{
                marginTop: 3, width: '100%', minHeight: 48, borderRadius: 12, border: 'none', display: 'inline-flex',
                alignItems: 'center', justifyContent: 'center', gap: 9, background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                color: '#fff', fontFamily: 'inherit', fontSize: 13.5, fontWeight: 750,
                cursor: loading || setupLoading ? 'wait' : 'pointer', opacity: loading || setupLoading ? 0.62 : 1,
                boxShadow: '0 10px 26px rgba(5,150,105,0.24)', transition: 'transform 0.15s ease, box-shadow 0.15s ease',
              }}
              onMouseEnter={(event) => {
                if (!loading && !setupLoading) {
                  event.currentTarget.style.transform = 'translateY(-1px)';
                  event.currentTarget.style.boxShadow = '0 14px 30px rgba(5,150,105,0.33)';
                }
              }}
              onMouseLeave={(event) => {
                event.currentTarget.style.transform = 'none';
                event.currentTarget.style.boxShadow = '0 10px 26px rgba(5,150,105,0.24)';
              }}
            >
              {loading ? 'Aguarde…' : mode.submitLabel}
              {!loading && !setupLoading && <ArrowRight size={16} strokeWidth={2.4} />}
            </button>
          </form>

          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, marginTop: 22,
            color: 'rgba(148,163,184,0.76)', fontSize: 11.5, fontWeight: 600,
          }}>
            <CheckCircle2 size={14} color="#34d399" />
            Seus dados ficam protegidos neste dispositivo.
          </div>
        </div>
      </section>
    </main>
  );
}

function Brand({ compact = false }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
      <div style={{
        width: compact ? 40 : 44, height: compact ? 40 : 44, borderRadius: 13, overflow: 'hidden', flexShrink: 0,
        background: 'linear-gradient(135deg, #10b981, #047857)', boxShadow: '0 8px 22px rgba(16,185,129,0.27)',
      }}>
        <img
          src="./logo-icon.png" alt="ComandaFlow" style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          onError={(event) => { event.currentTarget.style.display = 'none'; }}
        />
      </div>
      <div>
        <p style={{ margin: 0, color: '#f8fafc', fontSize: compact ? 15 : 16, fontWeight: 850, letterSpacing: '-0.035em' }}>ComandaFlow</p>
        <p style={{ margin: '1px 0 0', color: 'rgba(148,163,184,0.76)', fontSize: 11, fontWeight: 600 }}>Gestão para restaurantes</p>
      </div>
    </div>
  );
}

function Field({ label, icon: Icon, children }) {
  return (
    <label style={{ display: 'block' }}>
      <span style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 7, color: 'rgba(203,213,225,0.9)', fontSize: 12.5, fontWeight: 650 }}>
        <Icon size={14} color="#6ee7b7" strokeWidth={2.1} />
        {label}
      </span>
      {children}
    </label>
  );
}

function PasswordToggle({ show, onClick }) {
  return (
    <button
      type="button" onClick={onClick} aria-label={show ? 'Ocultar senha' : 'Mostrar senha'}
      style={{
        position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', padding: 6, border: 'none',
        background: 'transparent', color: 'rgba(148,163,184,0.82)', cursor: 'pointer', lineHeight: 0,
      }}
    >
      {show ? <EyeOff size={16} /> : <Eye size={16} />}
    </button>
  );
}
