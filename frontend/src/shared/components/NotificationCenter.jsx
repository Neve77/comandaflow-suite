import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, Bell, BellRing, Check, Info, X } from 'lucide-react';
import api from '../services/api';

const tone = {
  info: { icon: Info, className: 'notification-item-info' },
  aviso: { icon: AlertTriangle, className: 'notification-item-warning' },
  urgente: { icon: BellRing, className: 'notification-item-danger' },
};

const readStorage = (key) => {
  try { return new Set(JSON.parse(localStorage.getItem(key) || '[]')); } catch { return new Set(); }
};

export default function NotificationCenter({ managerMode, userId, licenseStatus }) {
  const storageKey = `cf_notifications_read_${userId || 'local'}`;
  const rootRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [managerItems, setManagerItems] = useState([]);
  const [updateItem, setUpdateItem] = useState(null);
  const [dismissed, setDismissed] = useState(() => readStorage(storageKey));

  useEffect(() => setDismissed(readStorage(storageKey)), [storageKey]);

  const load = useCallback(async () => {
    if (managerMode) {
      const response = await api.get('/manager/notifications');
      setManagerItems(response.data.notifications || []);
      return;
    }
    try {
      const response = await api.get('/updates/status');
      const state = response.data;
      if (state?.manifest && ['available', 'downloading', 'ready', 'downloadError'].includes(state.status)) {
        setUpdateItem({
          id: `client-update-${state.manifest.id}-${state.status}`,
          title: state.status === 'ready' ? 'Atualização pronta para instalar' : 'Nova atualização disponível',
          body: `ComandaFlow ${state.manifest.version}${state.status === 'downloading' ? ` · ${state.progress || 0}% baixado` : ''}.`,
          severity: state.manifest.mandatory ? 'urgente' : 'info',
        });
      } else {
        setUpdateItem(null);
      }
    } catch {
      setUpdateItem(null);
    }
  }, [managerMode]);

  useEffect(() => {
    load().catch(() => {});
    const interval = setInterval(() => load().catch(() => {}), 15000);
    return () => clearInterval(interval);
  }, [load]);

  useEffect(() => {
    const closeOutside = (event) => {
      if (rootRef.current && !rootRef.current.contains(event.target)) setOpen(false);
    };
    document.addEventListener('mousedown', closeOutside);
    return () => document.removeEventListener('mousedown', closeOutside);
  }, []);

  const items = useMemo(() => {
    if (managerMode) return managerItems;
    const messages = (licenseStatus?.messages || []).map((message) => ({
      ...message,
      id: `manager-message-${message.id}`,
      messageId: message.id,
    }));
    const licenseItem = licenseStatus?.message ? [{
      id: `license-${licenseStatus.status || 'notice'}-${licenseStatus.accessUntil || 'no-date'}`,
      title: 'Aviso da assinatura',
      body: licenseStatus.message,
      severity: licenseStatus.valid ? 'aviso' : 'urgente',
    }] : [];
    return [...messages, ...licenseItem, ...(updateItem ? [updateItem] : [])];
  }, [licenseStatus, managerItems, managerMode, updateItem]);

  const visibleItems = items.filter((item) => !dismissed.has(item.id));

  const markAsRead = async (item) => {
    if (item.messageId) {
      try { await api.post(`/license/messages/${item.messageId}/acknowledge`); } catch { return; }
    }
    setDismissed((current) => {
      const next = new Set(current);
      next.add(item.id);
      const stored = [...next].slice(-100);
      localStorage.setItem(storageKey, JSON.stringify(stored));
      return new Set(stored);
    });
  };

  const markAll = async () => {
    for (const item of visibleItems) await markAsRead(item);
  };

  return (
    <div className="notification-center" ref={rootRef}>
      <button
        type="button"
        className="header-icon-btn"
        title="Notificações"
        aria-label={`Notificações${visibleItems.length ? `: ${visibleItems.length} não lidas` : ''}`}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <Bell size={17} />
        {visibleItems.length > 0 && <span className="notification-dot">{Math.min(visibleItems.length, 99)}</span>}
      </button>

      {open && (
        <section className="notification-popover" aria-label="Central de notificações">
          <header className="notification-popover-header">
            <div>
              <p className="font-extrabold text-slate-900">Notificações</p>
              <p className="text-xs text-slate-500">{visibleItems.length ? `${visibleItems.length} pendente(s)` : 'Tudo em dia'}</p>
            </div>
            <button type="button" className="btn-icon" onClick={() => setOpen(false)} aria-label="Fechar notificações"><X size={17} /></button>
          </header>

          <div className="notification-list">
            {visibleItems.map((item) => {
              const itemTone = tone[item.severity] || tone.info;
              const Icon = itemTone.icon;
              return (
                <article className={`notification-item ${itemTone.className}`} key={item.id}>
                  <Icon size={18} className="notification-item-icon" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-extrabold text-slate-900">{item.title}</p>
                    <p className="mt-1 text-xs leading-5 text-slate-600">{item.body}</p>
                  </div>
                  <button type="button" className="notification-read-btn" onClick={() => markAsRead(item)} title="Marcar como lida" aria-label={`Marcar ${item.title} como lida`}><Check size={15} /></button>
                </article>
              );
            })}
            {!visibleItems.length && <div className="notification-empty"><Bell size={22} /><p>Nenhuma notificação pendente.</p></div>}
          </div>

          {visibleItems.length > 1 && <button type="button" className="notification-mark-all" onClick={markAll}>Marcar todas como lidas</button>}
        </section>
      )}
    </div>
  );
}
