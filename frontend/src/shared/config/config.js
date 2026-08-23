const desktopPort = typeof window !== 'undefined'
  ? new URLSearchParams(window.location.search).get('apiPort')
  : null;

export const CONFIG = {
  API_BASE_URL: desktopPort
    ? `http://127.0.0.1:${desktopPort}`
    : (import.meta.env.VITE_API_URL || 'http://localhost:3002'),
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
