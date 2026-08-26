import { Capacitor } from '@capacitor/core';

const MOBILE_SERVER_STORAGE_KEY = 'cf_mobile_server_url';

const desktopPort = typeof window !== 'undefined'
  ? new URLSearchParams(window.location.search).get('apiPort')
  : null;

const trimTrailingSlash = (value) => String(value || '').trim().replace(/\/+$/, '');

const isPrivateIPv4 = (hostname) => {
  const octets = hostname.split('.').map(Number);
  if (octets.length !== 4 || octets.some((octet) => !Number.isInteger(octet) || octet < 0 || octet > 255)) {
    return false;
  }

  return octets[0] === 10
    || (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31)
    || (octets[0] === 192 && octets[1] === 168);
};

const isLocalNetworkHost = (hostname) => (
  isPrivateIPv4(hostname) || hostname.toLowerCase().endsWith('.local')
);

export const isNativeIOS = () => (
  import.meta.env.VITE_IOS_APP === 'true' || Capacitor.getPlatform() === 'ios'
);

export const normalizeMobileServerUrl = (value) => {
  const normalized = trimTrailingSlash(value);
  let parsed;
  try {
    parsed = new URL(normalized);
  } catch {
    throw new Error('Informe um endereco valido, como http://192.168.0.127:3002.');
  }
  const secureRemoteAddress = parsed.protocol === 'https:';
  const privateLocalAddress = parsed.protocol === 'http:' && isLocalNetworkHost(parsed.hostname);
  if (!secureRemoteAddress && !privateLocalAddress) {
    throw new Error('Use HTTPS ou um IP privado da rede local, como http://192.168.0.127:3002.');
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
