import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useCart } from '@/lib/CartContext';
import { useToast } from '@/components/ui/use-toast';
import { Plus, Check } from 'lucide-react';
import ProductRating from '@/components/storefront/ProductRating';

export default function UpsellSection() {
  const [groups, setGroups] = useState([]);
  const [products, setProducts] = useState([]);
  const [added, setAdded] = useState({});
  const { addItem } = useCart();
  const { toast } = useToast();

  useEffect(() => {
    Promise.all([
      base44.entities.UpsellGroup.filter({ is_active: true }, 'sort_order'),
      base44.entities.Product.filter({ is_published: true }),
    ]).then(([gs, ps]) => {
      setGroups(gs);
      setProducts(ps);
    });
  }, []);

  if (groups.length === 0) return null;

  const getProduct = (id) => products.find(p => p.id === id);

  const handleAdd = (product) => {
    addItem(product);
    setAdded(prev => ({ ...prev, [product.id]: true }));
    toast({ title: 'Item adicionado ao carrinho', description: product.name });
    setTimeout(() => setAdded(prev => ({ ...prev, [product.id]: false })), 2000);
  };

  return (
    <div className="bg-card rounded-2xl border border-border/50 p-5 space-y-5">
      <div className="flex items-center gap-2">
        <span className="text-lg">⚡</span>
        <h3 className="font-heading font-semibold text-foreground">Complete seu pedido</h3>
      </div>

      {groups.map(group => {
        const groupProducts = (group.product_ids || []).map(getProduct).filter(Boolean);
        if (groupProducts.length === 0) return null;
        return (
          <div key={group.id}>
            <p className="text-xs font-bold text-muted-foreground uppercase mb-3">{group.title}</p>
            <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-1">
              {groupProducts.map(p => {
                const price = p.promo_price && p.promo_price < p.price ? p.promo_price : p.price;
                const isAdded = added[p.id];
                return (
                  <div key={p.id} className="flex-shrink-0 w-32 bg-muted/50 rounded-2xl overflow-hidden border border-border/30">
                    <div className="aspect-square overflow-hidden">
                      <img
                        src={p.images?.[0] || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=200'}
                        alt={p.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="p-2">
                      <p className="text-[11px] font-semibold text-foreground truncate leading-tight">{p.name}</p>
                      <ProductRating product={p} className="mt-1" />
                      <p className="text-[11px] font-bold text-primary mt-0.5">R$ {price?.toFixed(2)}</p>
                      <button
                        type="button"
                        onClick={() => handleAdd(p)}
                        className={`mt-1.5 w-full flex items-center justify-center gap-1 py-1.5 rounded-xl text-[11px] font-bold transition-all ${
                          isAdded ? 'bg-green-500 text-white' : 'bg-primary text-white hover:bg-primary/90'
                        }`}
                      >
                        {isAdded ? <><Check size={11} /> Ok!</> : <><Plus size={11} /> Add</>}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
