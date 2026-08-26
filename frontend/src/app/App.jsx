import { HashRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Suspense, lazy, useCallback, useEffect, useRef, useState } from 'react';
import { AuthProvider, useAuth } from './providers/AuthContext';
import api from '../shared/services/api';
import LoadingSpinner from '../shared/components/LoadingSpinner';
import ErrorBoundary from '../shared/components/ErrorBoundary';
import ServerConnectionGate from '../features/mobile/ServerConnectionGate';
import { isNativeIOS } from '../shared/config/config';

const Layout = lazy(() => import('../shared/components/Layout'));
const LoginPage = lazy(() => import('../features/auth/LoginPage'));
const LicenseActivationPage = lazy(() => import('../features/license/LicenseActivationPage'));
const SubscriptionsPage = lazy(() => import('../features/subscriptions/SubscriptionsPage'));
const DashboardPage = lazy(() => import('../features/dashboard/DashboardPage'));
const MesasPage = lazy(() => import('../features/mesas/MesasPage'));
const ComandaPage = lazy(() => import('../features/comandas/ComandaPage'));
const ProductsPage = lazy(() => import('../features/products/ProductsPage'));
const PedidosPage = lazy(() => import('../features/pedidos/PedidosPage'));
const FinancePage = lazy(() => import('../features/finance/FinancePage'));
const ReportsPage = lazy(() => import('../features/reports/ReportsPage'));
const SettingsPage = lazy(() => import('../features/settings/SettingsPage'));
const InventoryPage = lazy(() => import('../features/products/InventoryPage'));
const BraceletsPage = lazy(() => import('../features/bracelets/BraceletsPage'));
const ClientsPage = lazy(() => import('../features/clients/ClientsPage'));
const EventsPage = lazy(() => import('../features/events/EventsPage'));
const IntelligencePage = lazy(() => import('../features/intelligence/IntelligencePage'));
const DevicesPage = lazy(() => import('../features/devices/DevicesPage'));
const BackupPage = lazy(() => import('../features/backup/BackupPage'));
const RestaurantSupportPage = lazy(() => import('../features/support/RestaurantSupportPage'));
const AtendimentoPage = lazy(() => import('../features/atendimento/AtendimentoPage'));

function ProtectedRoute({ children }) {
  const { isAuthenticated, loading, systemLoading } = useAuth();
  if (loading || systemLoading) return <FullScreenLoading />;
  return isAuthenticated ? children : <Navigate to="/login" replace />;
}

function LicenseGate({ children }) {
  const { system } = useAuth();
  const location = useLocation();
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(!system.subscriptionManager);
  const statusRequestRef = useRef(null);

  const loadStatus = useCallback(() => {
    if (system.subscriptionManager) {
      setLoading(false);
      return Promise.resolve();
    }
    if (statusRequestRef.current) return statusRequestRef.current;
    const request = api.get('/license/status')
      .then((response) => setStatus(response.data))
      .catch((error) => setStatus((current) => current || ({ valid: false, error: error.response?.data?.message || 'Nao foi possivel validar a assinatura.' })))
      .finally(() => {
        if (statusRequestRef.current === request) statusRequestRef.current = null;
        setLoading(false);
      });
    statusRequestRef.current = request;
    return request;
  }, [system.subscriptionManager]);

  useEffect(() => { loadStatus(); }, [loadStatus]);
  useEffect(() => {
    const handleLicenseRequired = (event) => {
      if (event.detail && typeof event.detail.valid === 'boolean') {
        setStatus(event.detail);
        setLoading(false);
        return;
      }
      loadStatus();
    };
    window.addEventListener('comanda:license-required', handleLicenseRequired);
    return () => window.removeEventListener('comanda:license-required', handleLicenseRequired);
  }, [loadStatus]);

  if (loading) return <FullScreenLoading />;
  const supportAvailable = location.pathname === '/support' && status?.onlineManaged;
  if (!system.subscriptionManager && !status?.valid && !supportAvailable) {
    return <LicenseActivationPage status={status} onActivated={loadStatus} />;
  }
  return children;
}

function ModeRoute({ manager, children }) {
  const { system } = useAuth();
  return system.subscriptionManager === manager
    ? children
    : <Navigate to={system.subscriptionManager ? '/subscriptions' : '/dashboard'} replace />;
}

function HomeRedirect() {
  const { system } = useAuth();
  const destination = system.subscriptionManager
    ? '/subscriptions'
    : isNativeIOS()
      ? '/atendimento'
      : '/dashboard';
  return <Navigate to={destination} replace />;
}

function FullScreenLoading() {
  return <div className="min-h-screen flex items-center justify-center text-slate-700"><LoadingSpinner /></div>;
}

const RestaurantOnly = ({ children }) => <ModeRoute manager={false}>{children}</ModeRoute>;
const ManagerOnly = ({ children }) => <ModeRoute manager>{children}</ModeRoute>;

export default function App() {
  return (
    <ErrorBoundary>
      <ServerConnectionGate>
        <AuthProvider>
          <HashRouter>
            <Suspense fallback={<FullScreenLoading />}>
              <Routes>
                <Route path="/login" element={<LoginPage />} />
                <Route path="/" element={<ProtectedRoute><LicenseGate><Layout /></LicenseGate></ProtectedRoute>}>
                  <Route index element={<HomeRedirect />} />
                  <Route path="subscriptions" element={<ManagerOnly><SubscriptionsPage /></ManagerOnly>} />
                  <Route path="subscriptions/:section" element={<ManagerOnly><SubscriptionsPage /></ManagerOnly>} />
                  <Route path="dashboard" element={<RestaurantOnly><DashboardPage /></RestaurantOnly>} />
                  <Route path="atendimento" element={<RestaurantOnly><AtendimentoPage /></RestaurantOnly>} />
                  <Route path="comanda" element={<RestaurantOnly><ComandaPage /></RestaurantOnly>} />
                  <Route path="mesas" element={<RestaurantOnly><MesasPage /></RestaurantOnly>} />
                  <Route path="products" element={<RestaurantOnly><ProductsPage /></RestaurantOnly>} />
                  <Route path="pedidos" element={<RestaurantOnly><PedidosPage /></RestaurantOnly>} />
                  <Route path="finance" element={<RestaurantOnly><FinancePage /></RestaurantOnly>} />
                  <Route path="reports" element={<RestaurantOnly><ReportsPage /></RestaurantOnly>} />
                  <Route path="settings" element={<RestaurantOnly><SettingsPage /></RestaurantOnly>} />
                  <Route path="inventory" element={<RestaurantOnly><InventoryPage /></RestaurantOnly>} />
                  <Route path="bracelets" element={<RestaurantOnly><BraceletsPage /></RestaurantOnly>} />
                  <Route path="clients" element={<RestaurantOnly><ClientsPage /></RestaurantOnly>} />
                  <Route path="events" element={<RestaurantOnly><EventsPage /></RestaurantOnly>} />
                  <Route path="intelligence" element={<RestaurantOnly><IntelligencePage /></RestaurantOnly>} />
                  <Route path="devices" element={<RestaurantOnly><DevicesPage /></RestaurantOnly>} />
                  <Route path="backup" element={<RestaurantOnly><BackupPage /></RestaurantOnly>} />
                  <Route path="support" element={<RestaurantOnly><RestaurantSupportPage /></RestaurantOnly>} />
                </Route>
                <Route path="*" element={<ProtectedRoute><HomeRedirect /></ProtectedRoute>} />
              </Routes>
            </Suspense>
          </HashRouter>
        </AuthProvider>
      </ServerConnectionGate>
    </ErrorBoundary>
  );
}
