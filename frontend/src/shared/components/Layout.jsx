import { useState, useEffect } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../app/providers/AuthContext';
import api from '../services/api';
import {
  canAccessManagerItem,
  managerItemForPath,
  managerNavigation,
} from '../config/manager-navigation';
import UpdatePrompt from '../../features/updates/UpdatePrompt';
import NotificationCenter from './NotificationCenter';
import {
  LayoutDashboard,
  ClipboardList,
  UtensilsCrossed,
  Package,
  ChefHat,
  DollarSign,
  BarChart3,
  Settings,
  LogOut,
  Menu,
  X,
  Moon,
  Sun,
  Users,
  Wifi,
  WifiOff,
  AlertTriangle,
  Headphones,
} from 'lucide-react';

const restaurantLinks = [
  { to: '/dashboard',  label: 'Início',           icon: LayoutDashboard },
  { to: '/comanda',    label: 'Comandas',          icon: ClipboardList   },
  { to: '/mesas',      label: 'Mesas',             icon: UtensilsCrossed },
  { to: '/products',   label: 'Produtos',          icon: Package         },
  { to: '/pedidos',    label: 'Cozinha / Pedidos', icon: ChefHat         },
  { to: '/finance',    label: 'Caixa',             icon: DollarSign      },
  { to: '/reports',    label: 'Relatórios',        icon: BarChart3       },
  { to: '/clients',    label: 'Clientes',          icon: Users           },
  { to: '/settings',   label: 'Configurações',     icon: Settings        },
  { to: '/support',    label: 'Suporte',            icon: Headphones      },
];

export default function Layout() {
  const { logout, user, system } = useAuth();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen]   = useState(false);
  const [darkMode, setDarkMode]               = useState(() => localStorage.getItem('cf_dark') === 'true');
  const [online, setOnline]                   = useState(navigator.onLine);
  const [licenseStatus, setLicenseStatus]     = useState(null);

  const managerMode = system.subscriptionManager;
  const managerLinks = managerNavigation.filter((item) => canAccessManagerItem(item, user));
  const links = managerMode ? managerLinks : restaurantLinks;
  const currentManagerItem = managerMode ? managerItemForPath(location.pathname) : null;
  const currentRestaurantItem = managerMode ? null : restaurantLinks.find((item) => location.pathname === item.to);
  const restaurantName = managerMode
    ? 'Painel do Proprietario'
    : (localStorage.getItem('cf_nome_restaurante') || 'Meu Restaurante');
  const headerTitle = currentManagerItem?.label || currentRestaurantItem?.label || restaurantName;
  const userInitials   = user?.name
    ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : 'CF';
  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
    localStorage.setItem('cf_dark', darkMode);
  }, [darkMode]);
  useEffect(() => {
    const on  = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online',  on);
    window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);

  useEffect(() => {
    if (managerMode) return undefined;
    let active = true;
    let lastForcedRefreshAt = 0;
    const checkLicense = async (force = false) => {
      try {
        const response = force
          ? await api.post('/license/refresh')
          : await api.get('/license/status');
        if (!active) return;
        const nextStatus = force ? response.data.license : response.data;
        if (!nextStatus.valid) {
          window.dispatchEvent(new Event('comanda:license-required'));
          return;
        }
        setLicenseStatus(nextStatus);
      } catch {
        // O backend controla a tolerância offline; uma falha isolada não bloqueia a operação.
      }
    };
    const refreshAfterResume = () => {
      if (Date.now() - lastForcedRefreshAt < 10000) return;
      lastForcedRefreshAt = Date.now();
      checkLicense(true);
    };
    const refreshWhenVisible = () => {
      if (document.visibilityState === 'visible') refreshAfterResume();
    };
    checkLicense();
    const interval = setInterval(checkLicense, 15000);
    window.addEventListener('online', refreshAfterResume);
    window.addEventListener('focus', refreshAfterResume);
    document.addEventListener('visibilitychange', refreshWhenVisible);
    return () => {
      active = false;
      clearInterval(interval);
      window.removeEventListener('online', refreshAfterResume);
      window.removeEventListener('focus', refreshAfterResume);
      document.removeEventListener('visibilitychange', refreshWhenVisible);
    };
  }, [managerMode]);

  const managedRemotely = !managerMode && Boolean(licenseStatus?.onlineManaged);
  const managerConnected = managedRemotely
    ? online && Boolean(licenseStatus?.sync?.connected)
    : online;
  const syncStatus = licenseStatus?.sync?.status;
  const connectionLabel = !online
    ? 'Sem internet'
    : managerMode
      ? 'Gestor disponivel'
      : !managedRemotely
        ? 'Sistema online'
        : syncStatus === 'syncing'
          ? 'Sincronizando...'
          : managerConnected
            ? 'Sincronizado com Gestor'
            : 'Reconectando ao Gestor';
  const lastSyncLabel = licenseStatus?.sync?.lastSuccessAt
    ? new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'medium' }).format(new Date(licenseStatus.sync.lastSuccessAt))
    : null;
  const connectionColor = managerConnected ? undefined : online ? '#f59e0b' : '#f87171';
  const connectionBackground = managerConnected ? undefined : online ? 'rgba(245,158,11,0.08)' : 'rgba(239,68,68,0.08)';
  const connectionBorder = managerConnected ? undefined : online ? 'rgba(245,158,11,0.2)' : 'rgba(239,68,68,0.2)';

  return (
    <div className="app-layout">
      {!managerMode && <UpdatePrompt />}
      {mobileMenuOpen && (
        <div
          className="sidebar-overlay lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}
      <aside className={`sidebar ${mobileMenuOpen ? 'sidebar-open' : ''}`}>
        <div className="sidebar-brand">
          <div className="sidebar-brand-logo" style={{ background: 'transparent', boxShadow: 'none', padding: 0 }}>
            <img
              src="./logo-icon.png"
              alt="Orqium"
              style={{ width: 38, height: 38, objectFit: 'contain', borderRadius: 8 }}
              onError={e => {
                e.target.style.display = 'none';
                e.target.nextSibling.style.display = 'flex';
              }}
            />
            <span style={{ display: 'none', width: 38, height: 38, alignItems: 'center', justifyContent: 'center', borderRadius: 8, background: 'linear-gradient(135deg,#10b981,#059669)', fontWeight: 900, fontSize: 13, color: '#fff' }}>CF</span>
          </div>
          <div className="sidebar-brand-text">
            <h1>{managerMode ? 'ComandaFlow Gestor' : 'ComandaFlow'}</h1>
            <p>{restaurantName}</p>
          </div>
        </div>
        <div className="sidebar-status" title={lastSyncLabel ? `Ultima sincronizacao: ${lastSyncLabel}` : connectionLabel} style={{ color: connectionColor, background: connectionBackground, borderColor: connectionBorder }}>
          <span className="sidebar-status-dot" style={{ background: managerConnected ? undefined : online ? '#f59e0b' : '#ef4444', boxShadow: managerConnected ? undefined : online ? '0 0 6px rgba(245,158,11,0.5)' : '0 0 6px rgba(239,68,68,0.5)' }} />
          {connectionLabel}
        </div>
        <nav className="sidebar-nav">
          {managerMode ? [...new Set(links.map((item) => item.group))].map((group) => (
            <div key={group} className="contents">
              <p className="sidebar-section-label">{group}</p>
              {links.filter((item) => item.group === group).map(({ to, end, label, icon: Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={end}
                  onClick={() => setMobileMenuOpen(false)}
                  className={({ isActive }) => `sidebar-link ${isActive ? 'sidebar-link-active' : ''}`}
                >
                  <Icon size={17} />
                  <span>{label}</span>
                </NavLink>
              ))}
            </div>
          )) : <>
            <p className="sidebar-section-label">Principal</p>
            {links.slice(0, 6).map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                onClick={() => setMobileMenuOpen(false)}
                className={({ isActive }) => `sidebar-link ${isActive ? 'sidebar-link-active' : ''}`}
              >
                <Icon size={17} />
                <span>{label}</span>
              </NavLink>
            ))}
          </>}
          {!managerMode && <p className="sidebar-section-label" style={{ marginTop: 8 }}>Gerencial</p>}
          {!managerMode && links.slice(6).map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              onClick={() => setMobileMenuOpen(false)}
              className={({ isActive }) => `sidebar-link ${isActive ? 'sidebar-link-active' : ''}`}
            >
              <Icon size={17} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, padding: '0 2px' }}>
            <img
              src="./logo-icon.png"
              alt="Orqium"
              style={{ width: 18, height: 18, objectFit: 'contain', opacity: 0.5 }}
            />
            <span style={{ fontSize: 10, fontWeight: 700, color: 'rgba(100,116,139,0.7)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              by Orqium
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 10px', borderRadius: 10, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9, minWidth: 0 }}>
              <div style={{ height: 32, width: 32, borderRadius: '50%', background: 'linear-gradient(135deg,#10b981,#059669)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 900, color: '#fff', flexShrink: 0 }}>
                {userInitials}
              </div>
              <div style={{ minWidth: 0 }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.name || 'Administrador'}</p>
                <p style={{ fontSize: 10, color: 'rgba(148,163,184,0.7)' }}>
                  {managerConnected ? 'Sincronizado' : online ? 'Reconectando' : 'Offline'}
                </p>
              </div>
            </div>
            <button
              onClick={logout}
              title="Sair do sistema"
              style={{ padding: '6px', borderRadius: 8, color: 'rgba(148,163,184,0.7)', transition: 'all 0.15s', background: 'transparent', border: 'none', cursor: 'pointer' }}
              onMouseEnter={e => { e.currentTarget.style.color = '#f87171'; e.currentTarget.style.background = 'rgba(239,68,68,0.1)'; }}
              onMouseLeave={e => { e.currentTarget.style.color = 'rgba(148,163,184,0.7)'; e.currentTarget.style.background = 'transparent'; }}
            >
              <LogOut size={15} />
            </button>
          </div>
        </div>
      </aside>
      <div className="main-area">
        <header className="top-header">
          <div className="top-header-left">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden btn-icon mr-1"
              aria-label="Abrir menu"
            >
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <h1>{headerTitle}</h1>
                <span className="header-badge">ORQIUM</span>
              </div>
              <p>{user?.name || 'Administrador'}</p>
            </div>
          </div>

          <div className="top-header-right">
            <button
              type="button"
              className="header-icon-btn"
              title={darkMode ? 'Modo claro' : 'Modo escuro'}
              onClick={() => setDarkMode(d => !d)}
            >
              {darkMode ? <Sun size={17} /> : <Moon size={17} />}
            </button>
            <button type="button" className="header-icon-btn" title={lastSyncLabel ? `${connectionLabel}. Ultima sincronizacao: ${lastSyncLabel}` : connectionLabel}>
              {online
                ? <Wifi size={17} style={{ color: managerConnected ? '#10b981' : '#f59e0b' }} />
                : <WifiOff size={17} style={{ color: '#ef4444' }} />
              }
            </button>
            <NotificationCenter managerMode={managerMode} userId={user?.id} licenseStatus={licenseStatus} />
            <div
              className="header-avatar"
              style={{ marginLeft: 4, cursor: 'pointer' }}
              onClick={logout}
              title="Sair do sistema"
            >
              {userInitials}
            </div>
          </div>
        </header>
        <main className="content-area">
          {licenseStatus?.message && (
            <div className="mb-5 flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-amber-900 shadow-sm">
              <AlertTriangle className="mt-0.5 shrink-0" size={20} />
              <div>
                <p className="text-sm font-extrabold">Aviso da assinatura</p>
                <p className="mt-1 text-sm leading-5">{licenseStatus.message}</p>
                {licenseStatus.accessUntil && (
                  <p className="mt-1 text-xs font-semibold">
                    Acesso liberado ate {new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(licenseStatus.accessUntil))}.
                  </p>
                )}
              </div>
            </div>
          )}
          <Outlet />
        </main>
      </div>
    </div>
  );
}
