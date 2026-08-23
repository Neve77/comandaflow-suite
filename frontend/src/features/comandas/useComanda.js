import { useState, useEffect, useCallback } from 'react';
import api, { socket } from '../../shared/services/api';

export const useComanda = () => {
  const [comanda, setComanda] = useState(null);
  const [openComandas, setOpenComandas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadComanda = useCallback(async (id) => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get(`/comandas/${id}`);
      setComanda(response.data.comanda);
      return response.data.comanda;
    } catch (err) {
      setError(err.response?.data?.message || 'Erro ao carregar comanda.');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const loadOpenComandas = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get('/comandas');
      setOpenComandas(response.data.comandas || []);
      return response.data.comandas;
    } catch (err) {
      setError(err.response?.data?.message || 'Erro ao carregar comandas abertas.');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const openComanda = async (openData) => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.post('/comandas/open', openData);
      const newComanda = response.data.comanda;
      await loadComanda(newComanda.id);
      await loadOpenComandas();
      return newComanda;
    } catch (err) {
      setError(err.response?.data?.message || 'Erro ao abrir comanda.');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const closeComanda = async (id, { formaPagamento = 'dinheiro', desconto = 0 } = {}) => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.post(`/comandas/${id}/close`, {
        id,
        formaPagamento,
        desconto: Number(desconto) || 0
      });
      setComanda(null);
      await loadOpenComandas();
      return response.data;
    } catch (err) {
      setError(err.response?.data?.message || 'Erro ao fechar comanda.');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const addPedido = async (pedidoData) => {
    if (!comanda) return;
    setLoading(true);
    setError(null);
    try {
      const response = await api.post('/pedidos', { comandaId: comanda.id, ...pedidoData });
      await loadComanda(comanda.id);
      await loadOpenComandas();
      return response.data.pedido;
    } catch (err) {
      setError(err.response?.data?.message || 'Erro ao adicionar pedido.');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const cancelPedido = async (pedidoId) => {
    if (!comanda) return;
    setLoading(true);
    setError(null);
    try {
      await api.patch(`/pedidos/${pedidoId}/cancel`);
      await loadComanda(comanda.id);
      await loadOpenComandas();
    } catch (err) {
      setError(err.response?.data?.message || 'Erro ao cancelar pedido.');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const handlePedidoAdded = (data) => {
      if (comanda && data.comandaId === comanda.id) {
        loadComanda(comanda.id).catch(() => {});
      }
    };
    const handlePedidoCancelled = () => {
      if (comanda) {
        loadComanda(comanda.id).catch(() => {});
      }
    };
    const handleComandaUpdate = () => {
      loadOpenComandas().catch(() => {});
    };

    socket.on('pedido-added', handlePedidoAdded);
    socket.on('pedido-cancelled', handlePedidoCancelled);
    socket.on('comanda-opened', handleComandaUpdate);
    socket.on('comanda-closed', handleComandaUpdate);

    return () => {
      socket.off('pedido-added', handlePedidoAdded);
      socket.off('pedido-cancelled', handlePedidoCancelled);
      socket.off('comanda-opened', handleComandaUpdate);
      socket.off('comanda-closed', handleComandaUpdate);
    };
  }, [comanda, loadComanda, loadOpenComandas]);

  useEffect(() => {
    loadOpenComandas().catch(() => {});
  }, [loadOpenComandas]);

  return {
    comanda,
    setComanda,
    openComandas,
    loading,
    error,
    loadComanda,
    loadOpenComandas,
    openComanda,
    closeComanda,
    addPedido,
    cancelPedido,
  };
};
