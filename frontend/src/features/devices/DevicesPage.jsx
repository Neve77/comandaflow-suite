import { useEffect, useMemo, useState } from 'react';
import {
  Check,
  Copy,
  Link2,
  MonitorSmartphone,
  QrCode,
  RefreshCcw,
  ShieldCheck,
  Wifi,
} from 'lucide-react';
import api from '../../shared/services/api';
import LoadingSpinner from '../../shared/components/LoadingSpinner';

const addressScore = (url) => {
  const address = String(url || '').replace(/^https?:\/\//, '').split(':')[0];
  if (address.startsWith('192.168.')) return 0;
  if (address.startsWith('10.')) return 1;
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(address)) return 2;
  if (address.startsWith('169.254.')) return 9;
  return 5;
};

export default function DevicesPage() {
  const [status, setStatus] = useState(null);
  const [pairing, setPairing] = useState(null);
  const [qrImage, setQrImage] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [message, setMessage] = useState('');
  const [copied, setCopied] = useState(false);

  const restaurantUrl = useMemo(() => {
    const links = status?.restaurantLinks?.length
      ? status.restaurantLinks
      : (status?.links || []).map((link) => link.replace(/\/mobile\/?$/, ''));
    return [...links].sort((a, b) => addressScore(a) - addressScore(b))[0]
      || status?.restaurantUrl
      || '';
  }, [status]);

  const browserUrl = restaurantUrl ? `${restaurantUrl}/mobile` : '';

  const loadStatus = async ({ initial = false } = {}) => {
    if (initial) setLoading(true);
    else setRefreshing(true);
    setMessage('');
    try {
      const response = await api.get('/devices/status');
      setStatus(response.data);
    } catch (error) {
      setMessage(error.response?.data?.message || 'Não foi possível consultar a conexão local.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadStatus({ initial: true });
    const interval = window.setInterval(() => loadStatus(), 12000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!browserUrl) {
      setQrImage('');
      return undefined;
    }
    let active = true;
    import('qrcode').then((QRCodeLib) => QRCodeLib.default.toDataURL(browserUrl, { margin: 1, width: 220 }))
      .then((image) => { if (active) setQrImage(image); })
      .catch(() => { if (active) setQrImage(''); });
    return () => { active = false; };
  }, [browserUrl]);

  const copyRestaurantUrl = async () => {
    if (!restaurantUrl) return;
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard API unavailable');
      await navigator.clipboard.writeText(restaurantUrl);
    } catch {
      const input = document.createElement('textarea');
      input.value = restaurantUrl;
      input.style.position = 'fixed';
      input.style.opacity = '0';
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      input.remove();
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2500);
  };

  const createPairing = async () => {
    setMessage('');
    try {
      const response = await api.post('/devices/pairing', { role: 'garcom', ttlMinutes: 15 });
      setPairing(response.data);
    } catch (error) {
      setMessage(error.response?.data?.message || 'Não foi possível gerar o código.');
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="device-connect-page">
      <section className="device-connect-hero">
        <div>
          <span><MonitorSmartphone size={17} /> Conexão local</span>
          <h1>Conectar celular ao Restaurante</h1>
          <p>O celular conversa diretamente com este computador. Os dois aparelhos precisam estar no mesmo Wi‑Fi.</p>
        </div>
        <div className="device-status-pill"><i /> Restaurante disponível</div>
      </section>

      <div className="device-direct-note">
        <ShieldCheck size={22} className="shrink-0 text-blue-600" />
        <span><strong>Use o computador do Restaurante.</strong> Não coloque o endereço do Gestor no aplicativo do iPhone.</span>
      </div>

      {message && <div className="service-error" style={{ marginTop: 14 }}>{message}</div>}

      <div className="device-connect-grid">
        <section className="device-connect-panel">
          <h2>Faça assim no iPhone</h2>
          <p>São apenas três passos. Deixe o ComandaFlow Restaurante aberto neste computador.</p>
          <div className="device-steps">
            <div className="device-step"><span>1</span><div><strong>Conecte os dois no mesmo Wi‑Fi</strong><p>Computador e iPhone devem usar a rede do restaurante.</p></div></div>
            <div className="device-step"><span>2</span><div><strong>Abra o ComandaFlow Restaurante no iPhone</strong><p>Na tela “Conecte este iPhone ao restaurante”, digite o endereço abaixo.</p></div></div>
            <div className="device-step">
              <span>3</span><div><strong>Use este endereço no aplicativo</strong><p>Digite exatamente como aparece. Não acrescente “/mobile”.</p></div>
              <div className="device-address-box">
                <code>{restaurantUrl || 'Nenhum endereço de rede encontrado'}</code>
                <button type="button" onClick={copyRestaurantUrl} disabled={!restaurantUrl} className="device-copy-button">{copied ? <Check size={18} /> : <Copy size={18} />}{copied ? 'Copiado' : 'Copiar'}</button>
              </div>
            </div>
          </div>
        </section>

        <aside className="device-connect-panel">
          <div className="flex items-center justify-between gap-3">
            <div><h2>Estado da conexão</h2><p className="mt-1 text-sm text-slate-500">Atualiza automaticamente.</p></div>
            <button type="button" onClick={() => loadStatus()} className="device-refresh-button" disabled={refreshing}><RefreshCcw className={refreshing ? 'animate-spin' : ''} size={16} /> Atualizar</button>
          </div>
          <div className="device-live-card">
            <article><small>Celulares ativos</small><strong>{status?.mobileClients || 0}</strong></article>
            <article><small>Porta local</small><strong>{status?.port || '—'}</strong></article>
            <article><small>Servidor</small><strong style={{ fontSize: 17 }}>{status?.server === 'online' ? 'Online' : 'Indisponível'}</strong></article>
            <article><small>Computador</small><strong style={{ fontSize: 15, overflowWrap: 'anywhere' }}>{status?.hostName || '—'}</strong></article>
          </div>

          <details className="device-browser-optional">
            <summary>Acesso pelo navegador (opcional)</summary>
            <div className="device-browser-body">
              <p>Este QR Code é somente para abrir a versão web no navegador do celular.</p>
              {qrImage ? <img src={qrImage} alt="QR Code do acesso pelo navegador" /> : <QrCode size={60} />}
              <code>{browserUrl || 'Sem endereço disponível'}</code>
              <button type="button" onClick={createPairing} className="device-pair-button">Gerar código para navegador</button>
              {pairing && <div className="device-pairing-code"><small>Código válido por 15 minutos</small><strong>{pairing.pairingCode}</strong></div>}
            </div>
          </details>

          {status?.sessions?.length > 0 && (
            <details className="device-browser-optional">
              <summary>Dispositivos pareados ({status.sessions.length})</summary>
              <div className="mt-3 space-y-2">
                {status.sessions.map((session) => <div key={session.id} className="flex items-center gap-2 rounded-xl border border-slate-200 p-3 text-sm"><Link2 size={16} /><span>{session.name || 'Dispositivo'}</span></div>)}
              </div>
            </details>
          )}
        </aside>
      </div>

      <div className="device-direct-note"><Wifi size={21} className="shrink-0 text-emerald-600" /><span>Se não conectar, confirme que o endereço começa com <strong>http://192.168</strong> ou <strong>http://10.</strong> e que o Restaurante está aberto neste computador.</span></div>
    </div>
  );
}
