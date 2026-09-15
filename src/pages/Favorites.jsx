import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useWishlist } from '@/lib/WishlistContext';
import { Link } from 'react-router-dom';
import { ArrowLeft, Heart } from 'lucide-react';
import ProductCard from '@/components/storefront/ProductCard';
import CartDrawer from '@/components/storefront/CartDrawer';
import BottomNav from '@/components/storefront/BottomNav';
import SafeBackButton from '@/components/navigation/SafeBackButton';

export default function Favorites() {
  const { wishlist } = useWishlist();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (wishlist.length === 0) { setLoading(false); return; }
    base44.entities.Product.filter({ is_published: true }).then(prods => {
      setProducts(prods.filter(p => wishlist.includes(p.id)));
      setLoading(false);
    });
  }, [wishlist]);

  return (
    <div className="min-h-screen bg-background pb-20">
      <CartDrawer />
      <div className="sticky top-0 z-30 bg-card/95 backdrop-blur-md border-b border-border">
        <div className="max-w-5xl mx-auto px-4 flex items-center h-14">
          <SafeBackButton fallback="/loja" aria-label="Voltar ao cardápio" className="p-2 -ml-2 hover:bg-accent rounded-full transition-colors">
            <ArrowLeft size={20} />
          </SafeBackButton>
          <h1 className="font-heading font-bold text-lg ml-2">Favoritos</h1>
        </div>
      </div>
      <div className="max-w-5xl mx-auto px-4 mt-6">
        {products.length === 0 && !loading ? (
          <div className="text-center py-16">
            <Heart size={48} className="text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-muted-foreground">Nenhum favorito ainda</p>
            <Link to="/loja" className="text-primary text-sm font-medium mt-2 inline-block">Explorar cardápio</Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {products.map(p => <ProductCard key={p.id} product={p} />)}
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  );
}
