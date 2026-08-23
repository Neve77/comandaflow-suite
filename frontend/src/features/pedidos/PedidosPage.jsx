import { useEffect, useState } from 'react';
import { Clock, CheckCircle, ChefHat, Play, CheckCheck, RefreshCw, AlertCircle } from 'lucide-react';
import api, { socket } from '../../shared/services/api';
import LoadingSpinner from '../../shared/components/LoadingSpinner';

export default function PedidosPage() {
  const [pedidos, setPedidos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchPedidos = async (showLoading = false) => {
    if (showLoading) setLoading(true);
    setError('');
    try {
      const response = await api.get('/pedidos/active');
      setPedidos(response.data.pedidos || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Erro ao carregar pedidos.');
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    fetchPedidos(true);

    const handleUpdate = () => {
      fetchPedidos();
    };

    socket.on('pedido-added', handleUpdate);
    socket.on('pedido-status-updated', handleUpdate);
    socket.on('pedido-cancelled', handleUpdate);
    socket.on('comanda-closed', handleUpdate);

    return () => {
      socket.off('pedido-added', handleUpdate);
      socket.off('pedido-status-updated', handleUpdate);
      socket.off('pedido-cancelled', handleUpdate);
      socket.off('comanda-closed', handleUpdate);
    };
  }, []);

  const handleUpdateStatus = async (pedidoId, newStatus) => {
    try {
      await api.patch(`/pedidos/${pedidoId}/status`, { status: newStatus });
      await fetchPedidos();
    } catch (err) {
      setError(err.response?.data?.message || 'Erro ao atualizar status do pedido.');
    }
  };

  const novos = pedidos.filter((p) => p.status === 'pendente');
  const emPreparo = pedidos.filter((p) => p.status === 'em_preparo');
  const prontos = pedidos.filter((p) => p.status === 'pronto');

  const getElapsedTime = (dateString) => {
    const diff = Math.floor((Date.now() - new Date(dateString).getTime()) / 60000);
    if (diff < 1) return 'Agora';
    if (diff === 1) return '1 min';
    return `${diff} min`;
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <section className="panel p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="section-title flex items-center gap-2">
              <ChefHat className="text-blue-600" size={28} />
              Acompanhamento de Pedidos (Cozinha / Bar)
            </h1>
            <p className="section-subtitle">
              Controle visual dos pedidos em tempo real. Toque nos botões para avançar o estado.
            </p>
          </div>
          <button
            type="button"
            onClick={() => fetchPedidos(true)}
            className="btn-secondary btn-sm self-start"
          >
            <RefreshCw size={18} />
            <span>Atualizar</span>
          </button>
        </div>
      </section>

      {error && (
        <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertCircle size={20} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <div className="flex flex-col rounded-2xl border border-amber-200 bg-amber-50/50 p-4">
          <div className="flex items-center justify-between border-b border-amber-200/80 pb-3">
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-amber-500" />
              <h2 className="text-base font-bold uppercase tracking-wide text-amber-900">
                Novos Pedidos
              </h2>
            </div>
            <span className="rounded-full bg-amber-200 px-2.5 py-0.5 text-xs font-bold text-amber-900">
              {novos.length}
            </span>
          </div>

          <div className="mt-4 flex-1 space-y-3">
            {novos.length === 0 ? (
              <p className="py-8 text-center text-sm text-slate-400">
                Nenhum pedido aguardando.
              </p>
            ) : (
              novos.map((pedido) => (
                <div
                  key={pedido.id}
                  className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="rounded-md bg-blue-100 px-2 py-1 text-xs font-bold text-blue-900">
                      MESA {pedido.comanda?.mesa?.numero || '00'}
                    </span>
                    <span className="flex items-center gap-1 text-xs text-slate-400">
                      <Clock size={12} />
                      {getElapsedTime(pedido.createdAt)}
                    </span>
                  </div>

                  <div className="mt-3">
                    <p className="text-base font-bold text-slate-900">
                      {pedido.quantidade}x {pedido.nome}
                    </p>
                    {pedido.observacao && (
                      <p className="mt-1 rounded-md bg-amber-50 p-2 text-xs font-semibold text-amber-800">
                        Obs: {pedido.observacao}
                      </p>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => handleUpdateStatus(pedido.id, 'em_preparo')}
                    className="btn-primary btn-sm mt-4 w-full"
                  >
                    <Play size={16} />
                    <span>Iniciar Preparo</span>
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
        <div className="flex flex-col rounded-2xl border border-blue-200 bg-blue-50/50 p-4">
          <div className="flex items-center justify-between border-b border-blue-200/80 pb-3">
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-blue-500" />
              <h2 className="text-base font-bold uppercase tracking-wide text-blue-900">
                Em Preparo
              </h2>
            </div>
            <span className="rounded-full bg-blue-200 px-2.5 py-0.5 text-xs font-bold text-blue-900">
              {emPreparo.length}
            </span>
          </div>

          <div className="mt-4 flex-1 space-y-3">
            {emPreparo.length === 0 ? (
              <p className="py-8 text-center text-sm text-slate-400">
                Nenhum pedido em preparo.
              </p>
            ) : (
              emPreparo.map((pedido) => (
                <div
                  key={pedido.id}
                  className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="rounded-md bg-blue-100 px-2 py-1 text-xs font-bold text-blue-900">
                      MESA {pedido.comanda?.mesa?.numero || '00'}
                    </span>
                    <span className="flex items-center gap-1 text-xs font-medium text-blue-600">
                      <Clock size={12} />
                      {getElapsedTime(pedido.createdAt)}
                    </span>
                  </div>

                  <div className="mt-3">
                    <p className="text-base font-bold text-slate-900">
                      {pedido.quantidade}x {pedido.nome}
                    </p>
                    {pedido.observacao && (
                      <p className="mt-1 rounded-md bg-amber-50 p-2 text-xs font-semibold text-amber-800">
                        Obs: {pedido.observacao}
                      </p>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => handleUpdateStatus(pedido.id, 'pronto')}
                    className="btn-success btn-sm mt-4 w-full"
                  >
                    <CheckCircle size={16} />
                    <span>Marcar Pronto</span>
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
        <div className="flex flex-col rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4">
          <div className="flex items-center justify-between border-b border-emerald-200/80 pb-3">
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-emerald-500" />
              <h2 className="text-base font-bold uppercase tracking-wide text-emerald-900">
                Prontos (Entregar)
              </h2>
            </div>
            <span className="rounded-full bg-emerald-200 px-2.5 py-0.5 text-xs font-bold text-emerald-900">
              {prontos.length}
            </span>
          </div>

          <div className="mt-4 flex-1 space-y-3">
            {prontos.length === 0 ? (
              <p className="py-8 text-center text-sm text-slate-400">
                Nenhum pedido pronto para entregar.
              </p>
            ) : (
              prontos.map((pedido) => (
                <div
                  key={pedido.id}
                  className="rounded-xl border border-emerald-300 bg-white p-4 shadow-md"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="rounded-md bg-emerald-600 px-2.5 py-1 text-xs font-extrabold text-white">
                      MESA {pedido.comanda?.mesa?.numero || '00'}
                    </span>
                    <span className="text-xs font-bold text-emerald-700">
                      PRONTO!
                    </span>
                  </div>

                  <div className="mt-3">
                    <p className="text-base font-bold text-slate-900">
                      {pedido.quantidade}x {pedido.nome}
                    </p>
                    {pedido.observacao && (
                      <p className="mt-1 rounded-md bg-amber-50 p-2 text-xs font-semibold text-amber-800">
                        Obs: {pedido.observacao}
                      </p>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => handleUpdateStatus(pedido.id, 'entregue')}
                    className="btn-primary btn-sm mt-4 w-full bg-emerald-600 hover:bg-emerald-700"
                  >
                    <CheckCheck size={16} />
                    <span>Confirmar Entrega</span>
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
