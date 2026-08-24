import { createContext, useContext, useEffect, useState } from 'react';
import api, { setToken } from '../../shared/services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setLocalToken] = useState(() => localStorage.getItem('comanda_token'));
  const [loading, setLoading] = useState(true);
  const [system, setSystem] = useState({ subscriptionManager: false, appName: 'ComandaFlow' });
  const [systemLoading, setSystemLoading] = useState(true);

  const clearSession = () => {
    localStorage.removeItem('comanda_token');
    localStorage.removeItem('comanda_user');
    setLocalToken(null);
    setUser(null);
    setToken(null);
  };

  useEffect(() => {
    api.get('/system/capabilities')
      .then((response) => setSystem(response.data))
      .catch(() => setSystem({ subscriptionManager: false, appName: 'ComandaFlow' }))
      .finally(() => setSystemLoading(false));
  }, []);

  useEffect(() => {
    if (token) {
      setToken(token);
      const savedUser = localStorage.getItem('comanda_user');
      if (savedUser) {
        try {
          setUser(JSON.parse(savedUser));
        } catch {
          clearSession();
        }
      }
    }
    setLoading(false);
  }, [token]);

  useEffect(() => {
    window.addEventListener('comanda:unauthorized', clearSession);
    return () => window.removeEventListener('comanda:unauthorized', clearSession);
  }, []);

  const login = async (email, password, twoFactorCode) => {
    const response = await api.post('/auth/login', { email, password, twoFactorCode: twoFactorCode || undefined });
    const { token: jwt, user: userData } = response.data;
    localStorage.setItem('comanda_token', jwt);
    localStorage.setItem('comanda_user', JSON.stringify(userData));
    setLocalToken(jwt);
    setUser(userData);
    setToken(jwt);
  };

  const logout = () => {
    const request = token ? api.post('/auth/logout').catch(() => null) : Promise.resolve();
    clearSession();
    return request;
  };

  return (
    <AuthContext.Provider value={{
      user, login, logout, loading, system, systemLoading, isAuthenticated: Boolean(user)
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth deve ser usado dentro do AuthProvider');
  return context;
};
