import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Suspense, lazy, useCallback, useEffect, useState } from 'react';
import { AuthProvider, useAuth } from './providers/AuthContext';
import api from '../shared/services/api';
import LoadingSpinner from '../shared/components/LoadingSpinner';
import ErrorBoundary from '../shared/components/ErrorBoundary';

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

function ProtectedRoute({ children }) {
  const { isAuthenticated, loading, systemLoading } = useAuth();
  if (loading || systemLoading) return <FullScreenLoading />;
  return isAuthenticated ? children : <Navigate to="/login" replace />;
}

function LicenseGate({ children }) {
  const { system } = useAuth();
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(!system.subscriptionManager);

  const loadStatus = useCallback(async () => {
    if (system.subscriptionManager) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const response = await api.get('/license/status');
      setStatus(response.data);
    } catch (error) {
      setStatus({ valid: false, error: error.response?.data?.message || 'Nao foi possivel validar a assinatura.' });
    } finally {
      setLoading(false);
    }
  }, [system.subscriptionManager]);

  useEffect(() => { loadStatus(); }, [loadStatus]);
  useEffect(() => {
    window.addEventListener('comanda:license-required', loadStatus);
    return () => window.removeEventListener('comanda:license-required', loadStatus);
  }, [loadStatus]);

  if (loading) return <FullScreenLoading />;
  if (!system.subscriptionManager && !status?.valid) {
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
  return <Navigate to={system.subscriptionManager ? '/subscriptions' : '/dashboard'} replace />;
}

function FullScreenLoading() {
  return <div className="min-h-screen flex items-center justify-center text-slate-700"><LoadingSpinner /></div>;
}

const RestaurantOnly = ({ children }) => <ModeRoute manager={false}>{children}</ModeRoute>;
const ManagerOnly = ({ children }) => <ModeRoute manager>{children}</ModeRoute>;

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <HashRouter>
          <Suspense fallback={<FullScreenLoading />}>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/" element={<ProtectedRoute><LicenseGate><Layout /></LicenseGate></ProtectedRoute>}>
                <Route index element={<HomeRedirect />} />
                <Route path="subscriptions" element={<ManagerOnly><SubscriptionsPage /></ManagerOnly>} />
                <Route path="dashboard" element={<RestaurantOnly><DashboardPage /></RestaurantOnly>} />
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
              </Route>
              <Route path="*" element={<ProtectedRoute><HomeRedirect /></ProtectedRoute>} />
            </Routes>
          </Suspense>
        </HashRouter>
      </AuthProvider>
    </ErrorBoundary>
  );
}
