import { useEffect, useState } from 'react';
import api from '../../shared/services/api';
import LoadingSpinner from '../../shared/components/LoadingSpinner';

const LOW_STOCK_THRESHOLD = 5;

export default function InventoryPage() {
  const [products, setProducts] = useState([]);
  const [stockChanges, setStockChanges] = useState({});
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  const fetchProducts = async () => {
    setLoading(true);
    setMessage('');
    try {
      const response = await api.get('/products');
      setProducts(response.data.products);
    } catch (err) {
      setMessage(err.response?.data?.message || 'Erro ao carregar estoque');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleStockChange = (id, value) => {
    setStockChanges((prev) => ({ ...prev, [id]: value }));
  };

  const handleSaveStock = async (product) => {
    const estoque = Number(stockChanges[product.id] ?? product.estoque);
    if (Number.isNaN(estoque) || estoque < 0) {
      setMessage('Informe um valor de estoque válido');
      return;
    }

    try {
      await api.post('/inventory/adjustments', {
        produtoId: product.id,
        type: 'inventario',
        quantity: estoque,
        reason: 'Ajuste pela tela de estoque'
      });
      setMessage('Estoque atualizado com sucesso');
      setStockChanges((prev) => ({ ...prev, [product.id]: '' }));
      await fetchProducts();
    } catch (err) {
      setMessage(err.response?.data?.message || 'Erro ao atualizar estoque');
    }
  };

  const lowStockProducts = products.filter((product) => product.estoque <= LOW_STOCK_THRESHOLD);
  const totalStock = products.reduce((sum, product) => sum + product.estoque, 0);

  return (
    <div className="space-y-6">
      <div className="panel p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-slate-500">Estoque</p>
            <h1 className="mt-2 text-3xl font-semibold text-white">Gerenciamento de estoque</h1>
            <p className="mt-2 text-slate-400">Visualize produtos em estoque, receba alertas de baixo estoque e atualize quantidades rapidamente.</p>
          </div>
          <div className="space-y-2 rounded-[1.75rem] border border-slate-800/80 bg-slate-950/90 p-4 text-right">
            <p className="text-sm text-slate-400">Itens críticos: {lowStockProducts.length}</p>
            <p className="text-sm text-slate-400">Quantidade total: {totalStock}</p>
          </div>
        </div>
      </div>

      <div className="panel p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-white">Resumo do estoque</h2>
            <p className="text-slate-400">Atualize quantidades e monitore alertas de produtos com estoque baixo.</p>
          </div>
        </div>

        {message && <div className="mt-4 rounded-full bg-slate-800 px-4 py-2 text-sm text-slate-200">{message}</div>}

        {loading ? (
          <div className="mt-6"><LoadingSpinner /></div>
        ) : products.length === 0 ? (
          <div className="mt-6 rounded-[1.75rem] border border-dashed border-slate-700 bg-slate-950/90 p-8 text-center text-slate-400">
            Nenhum produto encontrado. Cadastre produtos na área de produtos antes de ajustar o estoque.
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            <div className="grid gap-4 xl:grid-cols-[1fr_1fr_1fr]">
              <div className="rounded-[1.75rem] border border-slate-800/90 bg-slate-950/95 p-5">
                <p className="text-sm uppercase tracking-[0.3em] text-slate-500">Produtos</p>
                <p className="mt-3 text-3xl font-semibold text-white">{products.length}</p>
              </div>
              <div className="rounded-[1.75rem] border border-slate-800/90 bg-slate-950/95 p-5">
                <p className="text-sm uppercase tracking-[0.3em] text-slate-500">Estoque total</p>
                <p className="mt-3 text-3xl font-semibold text-white">{totalStock}</p>
              </div>
              <div className="rounded-[1.75rem] border border-slate-800/90 bg-slate-950/95 p-5">
                <p className="text-sm uppercase tracking-[0.3em] text-slate-500">Baixo estoque</p>
                <p className="mt-3 text-3xl font-semibold text-rose-400">{lowStockProducts.length}</p>
              </div>
            </div>

            <div className="grid gap-4">
              {products.map((product) => {
                const stockValue = stockChanges[product.id] ?? product.estoque;
                const lowStock = product.estoque <= LOW_STOCK_THRESHOLD;
                return (
                  <div key={product.id} className="rounded-[1.75rem] border border-slate-800/90 bg-slate-950/95 p-5 sm:flex sm:items-center sm:justify-between">
                    <div className="space-y-3 sm:max-w-xl">
                      <div className="flex items-center gap-3">
                        <p className="text-lg font-semibold text-white">{product.nome}</p>
                        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${lowStock ? 'bg-rose-500 text-white' : 'bg-slate-800 text-slate-300'}`}>
                          {lowStock ? 'Baixo estoque' : 'Estável'}
                        </span>
                      </div>
                      <p className="text-slate-400">{product.categoria} · R$ {Number(product.preco).toFixed(2)}</p>
                      <div className="flex flex-wrap items-center gap-3">
                        <label className="text-sm text-slate-400">Quantidade</label>
                        <input
                          className="input-field w-28"
                          type="number"
                          min="0"
                          value={stockValue}
                          onChange={(event) => handleStockChange(product.id, event.target.value)}
                        />
                        <button
                          type="button"
                          onClick={() => handleSaveStock(product)}
                          className="rounded-full bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-500"
                        >
                          Salvar
                        </button>
                      </div>
                    </div>
                    <div className="mt-4 flex flex-col gap-2 sm:mt-0 sm:text-right">
                      <span className="text-sm uppercase tracking-[0.3em] text-slate-500">Estoque atual</span>
                      <span className="text-3xl font-semibold text-white">{product.estoque}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
