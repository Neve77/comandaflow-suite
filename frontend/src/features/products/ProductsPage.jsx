import { useEffect, useState } from 'react';
import {
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Package,
  Search,
  Tag
} from 'lucide-react';
import api from '../../shared/services/api';
import LoadingSpinner from '../../shared/components/LoadingSpinner';

export default function ProductsPage() {
  const [activeTab, setActiveTab] = useState('produtos');
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('success');
  const [productForm, setProductForm] = useState({
    nome: '',
    preco: '',
    categoria: 'Lanches',
    estoque: '20',
    estoqueMinimo: '5',
    descricao: '',
    ativo: true
  });
  const [editProductId, setEditProductId] = useState(null);
  const [deleteProductId, setDeleteProductId] = useState(null);
  const [categoryForm, setCategoryForm] = useState({ nome: '', ordem: '1' });
  const [editCategoryId, setEditCategoryId] = useState(null);
  const [deleteCategoryId, setDeleteCategoryId] = useState(null);
  const [filterCategory, setFilterCategory] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const showFeedback = (text, type = 'success') => {
    setMessage(text);
    setMessageType(type);
    setTimeout(() => setMessage(''), 4000);
  };

  const fetchData = async (showLoading = false) => {
    if (showLoading) setLoading(true);
    try {
      const [prodRes, catRes] = await Promise.all([
        api.get('/products'),
        api.get('/categories').catch(() => ({ data: { categories: [] } }))
      ]);
      setProducts(prodRes.data.products || []);
      setCategories(catRes.data.categories || []);
      if (catRes.data.categories?.length > 0 && !productForm.categoria) {
        setProductForm(f => ({ ...f, categoria: catRes.data.categories[0].nome }));
      }
    } catch (err) {
      showFeedback(err.response?.data?.message || 'Erro ao carregar dados.', 'error');
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(true);
  }, []);
  const handleProductSubmit = async (e) => {
    e.preventDefault();
    if (!productForm.nome.trim() || !productForm.preco) {
      showFeedback('Preencha o nome e preço do produto.', 'error');
      return;
    }

    try {
      if (editProductId) {
        await api.put(`/products/${editProductId}`, productForm);
        showFeedback('Produto atualizado com sucesso!');
      } else {
        await api.post('/products', productForm);
        showFeedback('Produto cadastrado no cardápio!');
      }
      setProductForm({
        nome: '',
        preco: '',
        categoria: categories[0]?.nome || 'Lanches',
        estoque: '20',
        estoqueMinimo: '5',
        descricao: '',
        ativo: true
      });
      setEditProductId(null);
      await fetchData();
    } catch (err) {
      showFeedback(err.response?.data?.message || 'Erro ao salvar produto.', 'error');
    }
  };
  const handleCategorySubmit = async (e) => {
    e.preventDefault();
    if (!categoryForm.nome.trim()) return;
    try {
      if (editCategoryId) {
        await api.put(`/categories/${editCategoryId}`, categoryForm);
        showFeedback('Categoria atualizada com sucesso!');
      } else {
        await api.post('/categories', categoryForm);
        showFeedback('Categoria criada com sucesso!');
      }
      setCategoryForm({ nome: '', ordem: '1' });
      setEditCategoryId(null);
      await fetchData();
    } catch (err) {
      showFeedback(err.response?.data?.message || 'Erro ao salvar categoria.', 'error');
    }
  };

  const handleEditProduct = (p) => {
    setEditProductId(p.id);
    setProductForm({
      nome: p.nome,
      preco: String(p.preco),
      categoria: p.categoria || 'Geral',
      estoque: String(p.estoque),
      estoqueMinimo: String(p.estoqueMinimo || 5),
      descricao: p.descricao || '',
      ativo: p.ativo
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteProduct = async () => {
    if (!deleteProductId) return;
    try {
      await api.delete(`/products/${deleteProductId}`);
      showFeedback('Produto excluído com sucesso.');
      setDeleteProductId(null);
      await fetchData();
    } catch (err) {
      showFeedback(err.response?.data?.message || 'Erro ao excluir produto.', 'error');
    }
  };

  const handleDeleteCategory = async () => {
    if (!deleteCategoryId) return;
    try {
      await api.delete(`/categories/${deleteCategoryId}`);
      showFeedback('Categoria excluída com sucesso.');
      setDeleteCategoryId(null);
      await fetchData();
    } catch (err) {
      showFeedback(err.response?.data?.message || 'Erro ao excluir categoria.', 'error');
    }
  };

  const toggleProductActive = async (p) => {
    try {
      await api.patch(`/products/${p.id}/active`, { id: p.id, ativo: !p.ativo });
      showFeedback(`Produto ${!p.ativo ? 'ativado' : 'desativado'}.`);
      await fetchData();
    } catch (err) {
      showFeedback(err.response?.data?.message || 'Erro ao alterar status.', 'error');
    }
  };

  const filteredProducts = products.filter((p) => {
    const matchesCategory = filterCategory ? p.categoria === filterCategory : true;
    const matchesSearch = searchTerm
      ? p.nome.toLowerCase().includes(searchTerm.toLowerCase())
      : true;
    return matchesCategory && matchesSearch;
  });

  const categoryNames = categories.map((c) => c.nome);
  const allCategories = [...new Set(['Lanches', 'Bebidas', 'Pizzas', 'Porções & Acompanhamentos', 'Sobremesas', 'Outros', ...categoryNames])];

  return (
    <div className="space-y-6">
      {message && (
        <div className={`toast ${messageType === 'error' ? 'toast-error' : 'toast-success'}`}>
          {messageType === 'error' ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
          <span>{message}</span>
        </div>
      )}
      <div className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-3 rounded-xl shadow-sm">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('produtos')}
            className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold uppercase tracking-wider transition ${
              activeTab === 'produtos'
                ? 'bg-slate-950 text-white'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Package size={15} />
            <span>Cardápio de Produtos</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('categorias')}
            className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold uppercase tracking-wider transition ${
              activeTab === 'categorias'
                ? 'bg-slate-950 text-white'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Tag size={15} />
            <span>Categorias ({categories.length})</span>
          </button>
        </div>
      </div>

      {activeTab === 'produtos' ? (
        <>
          <section className="panel p-6">
            <h2 className="text-base font-bold text-slate-950">
              {editProductId ? 'Editar Produto' : 'Cadastrar Novo Produto'}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Defina o nome, valor de venda, categoria e estoque.
            </p>

            <form onSubmit={handleProductSubmit} className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                  Nome do Produto *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: X-Salada Especial"
                  value={productForm.nome}
                  onChange={(e) => setProductForm({ ...productForm, nome: e.target.value })}
                  className="input-field mt-1"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                  Preço de Venda (R$) *
                </label>
                <input
                  type="number"
                  step="0.10"
                  min="0"
                  required
                  placeholder="Ex: 24.90"
                  value={productForm.preco}
                  onChange={(e) => setProductForm({ ...productForm, preco: e.target.value })}
                  className="input-field mt-1"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                  Categoria
                </label>
                <select
                  value={productForm.categoria}
                  onChange={(e) => setProductForm({ ...productForm, categoria: e.target.value })}
                  className="input-field mt-1"
                >
                  {allCategories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                  Estoque Atual
                </label>
                <input
                  type="number"
                  min="0"
                  placeholder="20"
                  value={productForm.estoque}
                  onChange={(e) => setProductForm({ ...productForm, estoque: e.target.value })}
                  className="input-field mt-1"
                />
              </div>

              <div className="sm:col-span-2 lg:col-span-4 flex items-center justify-end gap-2.5 pt-1">
                {editProductId && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditProductId(null);
                      setProductForm({
                        nome: '',
                        preco: '',
                        categoria: allCategories[0],
                        estoque: '20',
                        estoqueMinimo: '5',
                        descricao: '',
                        ativo: true
                      });
                    }}
                    className="btn-secondary btn-sm"
                  >
                    Cancelar Edição
                  </button>
                )}
                <button type="submit" className="btn-primary btn-sm">
                  <Plus size={15} />
                  <span>{editProductId ? 'Salvar Alterações' : 'Adicionar ao Cardápio'}</span>
                </button>
              </div>
            </form>
          </section>
          <section className="panel p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-base font-bold text-slate-950">Cardápio de Produtos</h2>
                <p className="text-xs text-slate-500">
                  {filteredProducts.length} produto(s) listado(s)
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2.5">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                  <input
                    type="text"
                    placeholder="Buscar produto..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="input-field pl-8 py-1.5 text-xs max-w-[180px]"
                  />
                </div>

                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="input-field py-1.5 text-xs max-w-[160px]"
                >
                  <option value="">Todas Categorias</option>
                  {allCategories.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>

            {loading ? (
              <LoadingSpinner />
            ) : filteredProducts.length === 0 ? (
              <div className="empty-state mt-6">
                Nenhum produto cadastrado nesta categoria.
              </div>
            ) : (
              <div className="mt-5 grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
                {filteredProducts.map((p) => (
                  <div
                    key={p.id}
                    className={`rounded-xl border p-4 transition ${
                      p.ativo
                        ? 'border-slate-200 bg-white hover:border-slate-400'
                        : 'border-slate-200 bg-slate-50 opacity-60'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                          {p.categoria}
                        </span>
                        <h3 className="text-sm font-bold text-slate-950 mt-0.5">
                          {p.nome}
                        </h3>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleEditProduct(p)}
                          className="btn-icon p-1 text-slate-500 hover:text-slate-950"
                          title="Editar"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteProductId(p.id)}
                          className="btn-icon p-1 text-slate-400 hover:text-red-600"
                          title="Excluir"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>

                    <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">
                      <div>
                        <p className="text-lg font-black text-slate-950">
                          R$ {Number(p.preco).toFixed(2)}
                        </p>
                        <p className={`text-[11px] font-semibold ${p.estoque < 5 ? 'text-red-600' : 'text-slate-400'}`}>
                          Estoque: {p.estoque} {p.estoque < 5 ? '(Baixo)' : ''}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => toggleProductActive(p)}
                        className={`status-chip cursor-pointer text-[10px] ${
                          p.ativo
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            : 'bg-slate-200 text-slate-700'
                        }`}
                      >
                        {p.ativo ? 'Disponível' : 'Indisponível'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      ) : (
        <section className="panel p-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-base font-bold text-slate-950">Categorias do Cardápio</h2>
              <p className="text-xs text-slate-500">Organize os grupos de produtos do seu restaurante</p>
            </div>
          </div>

          <form onSubmit={handleCategorySubmit} className="mt-4 flex flex-wrap gap-3 items-end">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                Nome da Categoria *
              </label>
              <input
                type="text"
                required
                placeholder="Ex: Sobremesas, Bebidas Especiais"
                value={categoryForm.nome}
                onChange={(e) => setCategoryForm({ ...categoryForm, nome: e.target.value })}
                className="input-field mt-1"
              />
            </div>

            <div className="w-24">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                Ordem
              </label>
              <input
                type="number"
                min="0"
                value={categoryForm.ordem}
                onChange={(e) => setCategoryForm({ ...categoryForm, ordem: e.target.value })}
                className="input-field mt-1"
              />
            </div>

            <button type="submit" className="btn-primary btn-sm h-10">
              <Plus size={15} />
              <span>{editCategoryId ? 'Salvar' : 'Adicionar Categoria'}</span>
            </button>
          </form>

          <div className="mt-6 divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden bg-white">
            {categories.map((c) => (
              <div key={c.id} className="flex items-center justify-between p-4 hover:bg-slate-50 transition">
                <div>
                  <h3 className="font-bold text-sm text-slate-950">{c.nome}</h3>
                  <p className="text-xs text-slate-400">Ordem de exibição: {c.ordem}</p>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      setEditCategoryId(c.id);
                      setCategoryForm({ nome: c.nome, ordem: String(c.ordem) });
                    }}
                    className="btn-icon p-1.5"
                    title="Editar"
                  >
                    <Edit2 size={15} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteCategoryId(c.id)}
                    className="btn-icon p-1.5 text-red-500 hover:text-red-700"
                    title="Excluir"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
      {deleteProductId && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2 className="text-base font-bold text-slate-950">Excluir Produto?</h2>
            <p className="mt-2 text-xs text-slate-600">
              Tem certeza que deseja excluir permanentemente este produto do cardápio?
            </p>

            <div className="mt-5 flex justify-end gap-2.5">
              <button onClick={() => setDeleteProductId(null)} className="btn-secondary btn-sm">
                Cancelar
              </button>
              <button onClick={handleDeleteProduct} className="btn-danger btn-sm">
                Confirmar Exclusão
              </button>
            </div>
          </div>
        </div>
      )}
      {deleteCategoryId && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2 className="text-base font-bold text-slate-950">Excluir Categoria?</h2>
            <p className="mt-2 text-xs text-slate-600">
              Tem certeza que deseja excluir esta categoria? Ela não pode ter produtos vinculados.
            </p>

            <div className="mt-5 flex justify-end gap-2.5">
              <button onClick={() => setDeleteCategoryId(null)} className="btn-secondary btn-sm">
                Cancelar
              </button>
              <button onClick={handleDeleteCategory} className="btn-danger btn-sm">
                Confirmar Exclusão
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
