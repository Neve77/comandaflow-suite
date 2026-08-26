import axios from 'axios';
import { io } from 'socket.io-client';
import { CONFIG } from '../config/config';

const api = axios.create({
  baseURL: CONFIG.API_BASE_URL,
  headers: { 'Content-Type': 'application/json' }
});

let lastLicenseRequiredEventAt = 0;

export const setToken = (token) => {
  if (token) {
    api.defaults.headers.common.Authorization = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common.Authorization;
  }
  socket.auth = { ...(socket.auth || {}), token, room: 'admin' };
  if (!token) {
    socket.disconnect();
  } else if (socket.connected) {
    socket.disconnect().connect();
  } else {
    socket.connect();
  }
};

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('comanda_token');
      localStorage.removeItem('comanda_user');
      setToken(null);
      window.dispatchEvent(new Event('comanda:unauthorized'));
    }
    if (error.response?.data?.code === 'LICENSE_EXPIRED') {
      const now = Date.now();
      if (now - lastLicenseRequiredEventAt > 1000) {
        lastLicenseRequiredEventAt = now;
        window.dispatchEvent(new Event('comanda:license-required'));
      }
    }
    return Promise.reject(error);
  }
);

export const socket = io(CONFIG.API_BASE_URL, {
  autoConnect: false,
  auth: {
    token: localStorage.getItem('comanda_token'),
    room: 'admin'
  }
});

export default api;
