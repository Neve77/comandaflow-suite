import { Capacitor } from '@capacitor/core';

const MOBILE_SERVER_STORAGE_KEY = 'cf_mobile_server_url';

const desktopPort = typeof window !== 'undefined'
  ? new URLSearchParams(window.location.search).get('apiPort')
  : null;

const trimTrailingSlash = (value) => String(value || '').trim().replace(/\/+$/, '');

export const isNativeIOS = () => (
  import.meta.env.VITE_IOS_APP === 'true' || Capacitor.getPlatform() === 'ios'
);

export const normalizeMobileServerUrl = (value) => {
  const normalized = trimTrailingSlash(value);
  const parsed = new URL(normalized);
  if (parsed.protocol !== 'https:') {
    throw new Error('Use um endereco HTTPS seguro para conectar o iPhone.');
  }
  if (parsed.username || parsed.password || parsed.search || parsed.hash) {
    throw new Error('Informe somente o endereco principal do servidor, sem usuario, parametros ou fragmentos.');
  }
  if (parsed.pathname !== '/' && parsed.pathname !== '') {
    throw new Error('Informe somente o dominio do servidor, sem caminhos adicionais.');
  }
  return parsed.origin;
};

export const getConfiguredMobileServerUrl = () => {
  if (typeof window === 'undefined') return trimTrailingSlash(import.meta.env.VITE_IOS_API_URL);
  return trimTrailingSlash(localStorage.getItem(MOBILE_SERVER_STORAGE_KEY) || import.meta.env.VITE_IOS_API_URL);
};

export const saveMobileServerUrl = (value) => {
  const normalized = normalizeMobileServerUrl(value);
  localStorage.setItem(MOBILE_SERVER_STORAGE_KEY, normalized);
  return normalized;
};

export const clearMobileServerUrl = () => {
  localStorage.removeItem(MOBILE_SERVER_STORAGE_KEY);
};

const mobileServerUrl = getConfiguredMobileServerUrl();

export const CONFIG = {
  API_BASE_URL: desktopPort
    ? `http://127.0.0.1:${desktopPort}`
    : (mobileServerUrl || import.meta.env.VITE_API_URL || 'http://localhost:3002'),
  FRONTEND_URL: import.meta.env.VITE_FRONTEND_URL || 'http://localhost:5173',
};

export const BRACELET_STATUS = {
  LIVRE: 'livre',
  EM_USO: 'em_uso',
  BLOQUEADA: 'bloqueada',
};

export const COMANDA_STATUS = {
  ABERTA: 'aberta',
  FECHADA: 'fechada',
};

export const PRODUCT_CATEGORIES = [
  'Bebidas',
  'Pizzas',
  'Lanches',
  'Saladas',
  'Sobremesas',
  'Acompanhamentos',
];
