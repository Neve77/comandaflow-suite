import { useEffect, useState } from 'react';
import { Link2, QrCode, RefreshCcw } from 'lucide-react';
import api from '../../shared/services/api';
import LoadingSpinner from '../../shared/components/LoadingSpinner';

export default function DevicesPage() {
  const [status, setStatus] = useState(null);
  const [pairing, setPairing] = useState(null);
  const [qrImage, setQrImage] = useState('');
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  const mainLink = status?.mobileUrl || status?.links?.[0] || '';

  const loadStatus = async () => {
    setLoading(true);
    setMessage('');
    try {
      const response = await api.get('/devices/status');
      setStatus(response.data);
      const link = response.data.links?.[0] || '';
      if (link) {
        const QRCodeLib = await import('qrcode');
        const image = await QRCodeLib.default.toDataURL(link, { margin: 1, width: 220 });
        setQrImage(image);
      }
    } catch (error) {
      setMessage(error.response?.data?.message || 'Erro ao carregar dispositivos');
    } finally {
      setLoading(false);
    }
  };

  const createPairing = async () => {
    setMessage('');
    try {
      const response = await api.post('/devices/pairing', { role: 'garcom', ttlMinutes: 15 });
      setPairing(response.data);
    } catch (error) {
      setMessage(error.response?.data?.message || 'Erro ao gerar pareamento');
    }
  };

  useEffect(() => {
    loadStatus();
  }, []);

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <section className="panel p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-medium uppercase text-slate-500">Garcom exclusivo</p>
            <h1 className="mt-2 text-3xl font-semibold text-slate-950">Conexao Mobile</h1>
            <p className="mt-1 text-slate-500">Abra o Mobile Web na rede local. O QR Code serve apenas para acessar a tela mobile.</p>
          </div>
          <button type="button" onClick={loadStatus} className="inline-flex items-center gap-2 rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700">
            <RefreshCcw size={16} /> Atualizar
          </button>
        </div>
      </section>

      {message && <div className="panel p-4 text-sm text-rose-600">{message}</div>}

      <section className="grid gap-4 xl:grid-cols-[0.8fr_1.2fr]">
        <div className="panel p-6">
          <div className="flex items-center gap-2">
            <QrCode size={18} />
            <h2 className="text-xl font-semibold text-slate-950">QR Code</h2>
          </div>
          <div className="mt-5 grid place-items-center rounded-lg border border-slate-200 bg-slate-50 p-5">
            {qrImage ? <img src={qrImage} alt="QR Code de acesso mobile" className="h-56 w-56" /> : <p className="text-sm text-slate-500">Sem link de rede disponivel.</p>}
          </div>
          <div className="mt-4 rounded-lg border border-slate-200 bg-white p-4">
            <p className="text-xs font-semibold uppercase text-slate-500">Link principal</p>
            <p className="mt-2 break-all text-sm font-medium text-slate-950">{mainLink || 'Nenhum IP local detectado'}</p>
          </div>
          <button type="button" onClick={createPairing} className="mt-4 w-full rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
            Gerar codigo de pareamento
          </button>
          {pairing && (
            <div className="mt-4 rounded-lg border border-blue-100 bg-blue-50 p-4 text-blue-950">
              <p className="text-sm">Codigo temporario</p>
              <p className="mt-1 text-3xl font-semibold tracking-widest">{pairing.pairingCode}</p>
              <p className="mt-2 text-xs">Expira em {new Date(pairing.expiresAt).toLocaleString('pt-BR')}</p>
            </div>
          )}
        </div>

        <div className="panel p-6">
          <h2 className="text-xl font-semibold text-slate-950">Servidor local</h2>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-slate-200 bg-white p-4">
              <p className="text-sm text-slate-500">Status</p>
              <p className="mt-2 text-2xl font-semibold text-emerald-700">{status?.server}</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-4">
              <p className="text-sm text-slate-500">IP local</p>
              <p className="mt-2 text-2xl font-semibold text-slate-950">{status?.ip || '-'}</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-4">
              <p className="text-sm text-slate-500">Porta</p>
              <p className="mt-2 text-2xl font-semibold text-slate-950">{status?.port}</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-4">
              <p className="text-sm text-slate-500">Celulares</p>
              <p className="mt-2 text-2xl font-semibold text-slate-950">{status?.mobileClients || 0}</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-4">
              <p className="text-sm text-slate-500">Maquina</p>
              <p className="mt-2 break-all text-lg font-semibold text-slate-950">{status?.hostName || '-'}</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-4">
              <p className="text-sm text-slate-500">Sockets totais</p>
              <p className="mt-2 text-2xl font-semibold text-slate-950">{status?.connectedSockets || 0}</p>
            </div>
          </div>

          <div className="mt-4 rounded-lg border border-slate-200 bg-white p-4">
            <p className="text-sm text-slate-500">URL Mobile</p>
            <p className="mt-2 break-all text-base font-semibold text-slate-950">{mainLink || 'Nenhum IP local detectado'}</p>
          </div>

          <div className="mt-6">
            <h3 className="font-semibold text-slate-950">Interfaces detectadas</h3>
            <div className="mt-3 space-y-2">
              {status?.addresses?.map((item) => (
                <div key={`${item.interface}-${item.address}`} className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white p-3">
                  <span className="text-sm text-slate-500">{item.interface}</span>
                  <span className="font-medium text-slate-950">{item.address}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6">
            <h3 className="font-semibold text-slate-950">Dispositivos pareados</h3>
            <div className="mt-3 space-y-2">
              {status?.sessions?.length ? status.sessions.map((session) => (
                <div key={session.id} className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white p-3">
                  <div className="flex items-center gap-2">
                    <Link2 size={16} className="text-slate-500" />
                    <span className="font-medium text-slate-950">{session.name || 'Dispositivo'}</span>
                  </div>
                  <span className="status-chip bg-slate-100 text-slate-700">{session.role}</span>
                </div>
              )) : <p className="text-sm text-slate-500">Nenhum dispositivo ativo.</p>}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
