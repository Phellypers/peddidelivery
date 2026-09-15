import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Search as SearchIcon } from 'lucide-react';
import ProductCard from '@/components/storefront/ProductCard';
import CartDrawer from '@/components/storefront/CartDrawer';
import BottomNav from '@/components/storefront/BottomNav';

export default function Search() {
  const location = useLocation();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [products, setProducts] = useState([]);
  const [allProducts, setAllProducts] = useState([]);

  useEffect(() => {
    base44.entities.Product.filter({ is_published: true }).then(setAllProducts);
  }, []);

  useEffect(() => {
    if (!query.trim()) { setProducts([]); return; }
    const q = query.toLowerCase();
    setProducts(allProducts.filter(p =>
      p.name?.toLowerCase().includes(q) ||
      p.description?.toLowerCase().includes(q) ||
      p.tags?.some(t => t.toLowerCase().includes(q))
    ));
  }, [query, allProducts]);

  const goBackToStore = () => {
    if (location.state?.from === '/loja') navigate(-1);
    else navigate('/loja', { replace: true });
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <CartDrawer />
      <div className="sticky top-0 z-30 bg-card/95 backdrop-blur-md border-b border-border">
        <div className="max-w-5xl mx-auto px-4 flex items-center h-14 gap-3">
          <button type="button" aria-label="Voltar ao cardápio" onClick={goBackToStore} className="p-2 -ml-2 hover:bg-accent rounded-full transition-colors">
            <ArrowLeft size={20} />
          </button>
          <div className="relative flex-1">
            <SearchIcon size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              autoFocus
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Buscar pratos, bebidas..."
              className="w-full pl-10 pr-4 py-2.5 bg-muted rounded-xl text-sm border-0 focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
        </div>
      </div>
      <div className="max-w-5xl mx-auto px-4 mt-6">
        {query && products.length === 0 ? (
          <p className="text-center text-muted-foreground py-12">Nenhum resultado para "{query}"</p>
        ) : products.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {products.map(p => <ProductCard key={p.id} product={p} />)}
          </div>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            <p>O que você está procurando?</p>
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  );
}
