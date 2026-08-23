import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../shared/services/api';
import LoadingSpinner from '../../shared/components/LoadingSpinner';

export default function BraceletsPage() {
  const navigate = useNavigate();
  const [bracelets, setBracelets] = useState([]);
  const [number, setNumber] = useState('');
  const [type, setType] = useState('QR');
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState('');

  const loadBracelets = async () => {
    setLoading(true);
    try {
      const response = await api.get('/bracelets');
      setBracelets(response.data.bracelets);
    } catch (err) {
      setFeedback(err.response?.data?.message || 'Erro ao carregar pulseiras');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBracelets();
  }, []);

  const handleCreate = async (event) => {
    event.preventDefault();
    setFeedback('');
    try {
      await api.post('/bracelets', { number, type });
      setNumber('');
      setType('QR');
      await loadBracelets();
      setFeedback('Pulseira criada com sucesso');
    } catch (err) {
      setFeedback(err.response?.data?.message || 'Erro ao criar pulseira');
    }
  };

  const startComanda = (braceletNumber) => {
    navigate('/comanda', { state: { braceletNumber } });
  };

  const closeComanda = async (comandaId) => {
    setFeedback('');
    try {
      await api.post(`/comandas/${comandaId}/close`);
      setFeedback('Comanda fechada com sucesso');
      await loadBracelets();
    } catch (err) {
      setFeedback(err.response?.data?.message || 'Erro ao fechar comanda');
    }
  };

  return (
    <div className="space-y-6">
      <div className="panel p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-white">Cadastrar pulseira</h2>
            <p className="text-slate-400">Crie e acompanhe pulseiras, abra e feche comandas.</p>
          </div>
          <div className="flex max-w-full flex-col gap-3 sm:flex-row">
            <input
              className="input-field min-w-[240px]"
              type="text"
              value={number}
              onChange={(e) => setNumber(e.target.value)}
              placeholder="Número único"
            />
            <select className="input-field sm:w-36" value={type} onChange={(e) => setType(e.target.value)}>
              <option value="QR">QR</option>
              <option value="RFID">RFID</option>
              <option value="NFC">NFC</option>
            </select>
            <button type="button" onClick={handleCreate} className="rounded-[1.5rem] bg-brand-600 px-6 py-3 text-white font-semibold transition hover:bg-brand-500">
              Criar pulseira
            </button>
          </div>
        </div>
        {feedback && <p className="mt-4 text-slate-300">{feedback}</p>}
      </div>

      <div className="panel p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold text-white">Pulseiras</h2>
            <p className="text-slate-400">Veja status, comandas abertas e valores dos itens.</p>
          </div>
          <span className="status-chip bg-slate-800 text-slate-300">Total: {bracelets.length}</span>
        </div>
        {loading ? (
          <div className="mt-6"><LoadingSpinner /></div>
        ) : bracelets.length === 0 ? (
          <div className="mt-6 rounded-[1.75rem] border border-dashed border-slate-700 bg-slate-950/90 p-8 text-center text-slate-400">
            Nenhuma pulseira cadastrada ainda. Crie uma pulseira acima.
          </div>
        ) : (
          <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {bracelets.map((bracelet) => {
              const comanda = bracelet.comandas?.[0];
              const totalValue = comanda?.pedidos?.reduce((sum, pedido) => sum + Number(pedido.subtotal), 0) || 0;

              return (
                <div key={bracelet.id} className="rounded-[1.75rem] border border-slate-800/90 bg-slate-950/95 p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-lg font-semibold text-white">#{bracelet.number}</p>
                      <p className="mt-1 text-slate-400 text-sm">Tipo: {bracelet.type || 'QR'}</p>
                      <p className="mt-1 text-slate-400 text-sm">Atualizado em {new Date(bracelet.updatedAt).toLocaleString()}</p>
                    </div>
                    <span className={`status-chip ${bracelet.status === 'livre' ? 'bg-emerald-500/15 text-emerald-300' : bracelet.status === 'em_uso' ? 'bg-amber-500/15 text-amber-300' : 'bg-rose-500/15 text-rose-300'}`}>
                      {bracelet.status}
                    </span>
                  </div>

                  {comanda ? (
                    <div className="mt-5 space-y-4">
                      <div className="rounded-[1.5rem] border border-slate-800/90 bg-slate-900/95 p-4">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-sm uppercase tracking-[0.3em] text-slate-500">Comanda aberta</p>
                            <p className="mt-2 text-white">Itens: {comanda.pedidos.length}</p>
                          </div>
                          <span className="rounded-full bg-amber-500/15 px-3 py-1 text-xs font-semibold text-amber-200">Total R$ {totalValue.toFixed(2)}</span>
                        </div>
                      </div>
                      <div className="space-y-3">
                        {comanda.pedidos.map((pedido) => (
                          <div key={pedido.id} className="rounded-[1.5rem] border border-slate-800/90 bg-slate-900/95 p-4">
                            <div className="flex items-center justify-between gap-3">
                              <div>
                                <p className="font-semibold text-white">{pedido.nome}</p>
                                <p className="mt-1 text-slate-400 text-sm">Qtd: {pedido.quantidade} × R$ {Number(pedido.valorUnitario).toFixed(2)}</p>
                              </div>
                              <p className="text-sm font-semibold text-white">R$ {Number(pedido.subtotal).toFixed(2)}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                      <button
                        type="button"
                        onClick={() => closeComanda(comanda.id)}
                        className="w-full rounded-[1.5rem] bg-rose-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-rose-500"
                      >
                        Fechar comanda
                      </button>
                    </div>
                  ) : (
                    <div className="mt-5 space-y-4">
                      <p className="text-slate-400">Nenhuma comanda aberta nesta pulseira.</p>
                      <button
                        type="button"
                        onClick={() => startComanda(bracelet.number)}
                        disabled={bracelet.status !== 'livre'}
                        className="w-full rounded-[1.5rem] bg-brand-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-500 disabled:cursor-not-allowed disabled:bg-slate-700"
                      >
                        Abrir comanda
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
