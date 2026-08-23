import { useState, useEffect, useMemo } from 'react';
import api from '../../shared/services/api';

export const useProducts = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchProducts = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get('/products');
      setProducts(response.data.products);
    } catch (err) {
      setError(err.response?.data?.message || 'Erro ao carregar produtos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const activeProducts = useMemo(() => products.filter((product) => product.ativo), [products]);

  return {
    products: activeProducts,
    allProducts: products,
    loading,
    error,
    refetch: fetchProducts,
  };
};
