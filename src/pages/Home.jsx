import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import CartDrawer from '@/components/storefront/CartDrawer';
import ChatWidget from '@/components/storefront/ChatWidget';
import ProductCard from '@/components/storefront/ProductCard';
import PromoBannerCarousel from '@/components/storefront/PromoBannerCarousel';
import PromoHeaderBanner from '@/components/storefront/PromoHeaderBanner';
import MenuDrawer from '@/components/storefront/MenuDrawer';
import StoriesRing from '@/components/storefront/StoriesRing';
import SocialProofToast from '@/components/storefront/SocialProofToast';
import SignupPopup from '@/components/storefront/SignupPopup';
import OrderStatusNotifier from '@/components/storefront/OrderStatusNotifier';
import BirthdayPromoNotifier from '@/components/storefront/BirthdayPromoNotifier';
import AbandonedCartNotifier from '@/components/storefront/AbandonedCartNotifier';
import { Loader2, Search, AlignJustify, ShoppingCart, User, Heart } from 'lucide-react';
import NotificationBell from '@/components/storefront/NotificationBell';
import { Link } from 'react-router-dom';
import { useCart } from '@/lib/CartContext';
import { useAuth } from '@/lib/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { emitLiveEvent } from '@/lib/liveSession';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { loadPublicCatalog } from '@/services/api/peddiApi';

const CAT_BADGE_COLORS = {
  red: 'bg-red-500', green: 'bg-green-500', orange: 'bg-orange-500',
  blue: 'bg-blue-500', purple: 'bg-purple-500', pink: 'bg-pink-500',
};

const SPECIAL_SECTIONS = {
  __most_ordered__: 'Mais Pedidos',
  __promotions__: 'Promoções do Dia',
  __featured__: 'Destaques',
};

export default function Home() {
  const [store, setStore] = useState(null);
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const { totalItems, setIsOpen } = useCart();
  const { user } = useAuth();
  const isAdmin = ['admin','manager','peddi_admin'].includes(user?.role);

  const loadData = useCallback(() => {
    return loadPublicCatalog(base44).then(({ store: currentStore, categories: cats, products: prods }) => {
      setStore(currentStore);
      setCategories(cats);
      setProducts(prods.filter(p => !p.is_paused));
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    loadData();
    emitLiveEvent('navegando');
  }, [loadData]);

  const { pullDistance, refreshing, bind } = usePullToRefresh(loadData);

  const filteredProducts = useMemo(() => {
    let result = products;

    if (activeCategory === '__most_ordered__') {
      result = [...products].sort((a, b) => (b.views || 0) - (a.views || 0)).slice(0, 12);
    } else if (activeCategory === '__promotions__') {
      result = products.filter(p => p.promo_price && p.promo_price < p.price);
    } else if (activeCategory === '__featured__') {
      result = products.filter(p => p.is_featured);
    } else if (activeCategory) {
      result = result.filter(p => p.category_ids?.includes(activeCategory));
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(p =>
        p.name?.toLowerCase().includes(q) ||
        p.description?.toLowerCase().includes(q) ||
        p.tags?.some(t => t.toLowerCase().includes(q))
      );
    }
    return result;
  }, [products, activeCategory, searchQuery]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const featuredCats = categories.filter(c => c.is_featured && c.is_active);

  const getSectionLabel = () => {
    if (activeCategory && SPECIAL_SECTIONS[activeCategory]) return SPECIAL_SECTIONS[activeCategory];
    if (activeCategory) return categories.find(c => c.id === activeCategory)?.name || '';
    if (searchQuery) return `Resultados para "${searchQuery}"`;
    return 'Todos os Produtos';
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20" {...bind}>
      {/* Pull-to-refresh indicator */}
      {(pullDistance > 0 || refreshing) && (
        <div className="flex items-center justify-center overflow-hidden" style={{ height: refreshing ? 40 : pullDistance }}>
          <Loader2 size={24} className={`text-primary ${refreshing ? 'animate-spin' : ''}`} />
        </div>
      )}
      <CartDrawer />
      <MenuDrawer
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        categories={categories}
        activeCategory={activeCategory}
        onSelectCategory={setActiveCategory}
        isAdmin={isAdmin}
      />

      <div className="max-w-lg mx-auto bg-white min-h-screen">

        {/* ── Store Profile Header ── */}
        <div className="px-5 pt-6 pb-4 text-center border-b border-gray-100">
          <div className="flex justify-center mb-3">
            <StoriesRing store={store} isAdmin={isAdmin} onUpdateStore={setStore} />
          </div>
          <h1 className="font-heading font-extrabold text-xl text-gray-900">{store?.name || 'Meu Restaurante'}</h1>
          {store?.opening_hours && (
            <p className="text-xs text-green-600 font-medium mt-0.5">🟢 {store.opening_hours}</p>
          )}
          <p className="text-sm text-gray-500 mt-1 leading-relaxed max-w-xs mx-auto">
            {store?.description || 'Seja bem-vindo! Confira nosso cardápio completo.'}
          </p>
          {store?.address && (
            <p className="text-xs text-gray-400 mt-1">📍 {store.address}{store.city ? `, ${store.city}` : ''}</p>
          )}
          {isAdmin && (
            <Link to="/admin" className="inline-flex items-center gap-1 mt-2 text-xs text-orange-600 font-semibold bg-orange-50 px-3 py-1 rounded-full hover:bg-orange-100 transition-colors">
              ⚙️ Painel do Gestor
            </Link>
          )}
        </div>

        {/* ── Promo Header Banner ── */}
        <PromoHeaderBanner />

        {/* ── Category Circles ── */}
        <div className="overflow-x-auto scrollbar-hide border-b border-gray-100">
          <div className="flex gap-4 px-5 py-4">
            <button onClick={() => setActiveCategory(null)} className="flex flex-col items-center gap-1.5 flex-shrink-0">
              <div className={`w-16 h-16 rounded-full overflow-hidden border-2 transition-all ${!activeCategory ? 'border-primary shadow-md shadow-primary/20' : 'border-gray-200'}`}>
                <div className="w-full h-full bg-gray-100 flex items-center justify-center text-2xl">🏠</div>
              </div>
              <span className={`text-[11px] font-semibold ${!activeCategory ? 'text-primary' : 'text-gray-500'}`}>Todos</span>
            </button>

            {featuredCats.map((cat, idx) => {
            const isActive = activeCategory === cat.id;
            const fallbackImgs = [
              'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=120&h=120&fit=crop',
              'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=120&h=120&fit=crop',
              'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=120&h=120&fit=crop',
              'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=120&h=120&fit=crop',
            ];
            const catImg = cat.image_url || fallbackImgs[idx % fallbackImgs.length];
            const catBadgeColor = CAT_BADGE_COLORS[cat.badge_color] || CAT_BADGE_COLORS.orange;
            return (
              <button key={cat.id} onClick={() => setActiveCategory(isActive ? null : cat.id)} className="flex flex-col items-center gap-1.5 flex-shrink-0 relative">
                <div className={`w-16 h-16 rounded-full overflow-hidden border-2 transition-all ${isActive ? 'border-primary shadow-lg shadow-primary/30' : 'border-gray-200'}`}>
                  <img src={catImg} alt={cat.name} className="w-full h-full object-cover" />
                </div>
                {cat.badge_label && (
                  <span className={`absolute -top-1 left-1/2 -translate-x-1/2 ${catBadgeColor} text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full whitespace-nowrap shadow-sm`}>
                    {cat.badge_label}
                  </span>
                )}
                <span className={`text-[11px] font-semibold text-center leading-tight line-clamp-2 max-w-[72px] ${isActive ? 'text-primary' : 'text-gray-600'}`}>{cat.name}</span>
              </button>
            );
            })}
          </div>
        </div>

        {/* ── Action Bar (sticky) ── */}
        <div className="flex items-center justify-around border-b border-gray-200 bg-white sticky top-0 z-30 h-12">
          {/* Menu hamburguer → abre MenuDrawer */}
          <button
            onClick={() => setMenuOpen(true)}
            className="flex items-center justify-center w-12 h-12 text-gray-700 hover:text-primary transition-colors"
          >
            <AlignJustify size={22} />
          </button>

          {/* Busca */}
          <button
            onClick={() => setSearchOpen(v => !v)}
            className={`flex items-center justify-center w-12 h-12 transition-colors ${searchOpen ? 'text-primary' : 'text-gray-700 hover:text-primary'}`}
          >
            <Search size={22} />
          </button>

          {/* Perfil */}
          <Link to="/perfil" className="flex items-center justify-center w-12 h-12 text-gray-700 hover:text-primary transition-colors relative">
            <User size={22} />
            {isAdmin && (
              <span className="absolute top-2 right-2 w-2 h-2 bg-orange-500 rounded-full" />
            )}
          </Link>

          {/* Notificações */}
          <NotificationBell />

          {/* Carrinho */}
          <button
            onClick={() => setIsOpen(true)}
            className="flex items-center justify-center w-12 h-12 text-gray-700 hover:text-primary transition-colors relative"
          >
            <ShoppingCart size={22} />
            {totalItems > 0 && (
              <span className="absolute top-2 right-2 bg-red-500 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold leading-none">
                {totalItems}
              </span>
            )}
          </button>
        </div>

        {/* ── Search Bar (dropdown) ── */}
        <AnimatePresence>
          {searchOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden border-b border-gray-100"
            >
              <div className="px-4 py-2.5">
                <div className="relative">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    autoFocus
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Buscar no cardápio..."
                    className="w-full pl-9 pr-4 py-2 bg-gray-100 rounded-lg text-sm border-0 focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Promo Banner Carousel ── */}
        {!searchQuery && !activeCategory && (
          <div className="border-b border-gray-100 px-3 py-3">
            <div className="rounded-2xl overflow-hidden">
              <PromoBannerCarousel banners={store?.banners} />
            </div>
          </div>
        )}

        {/* ── Section Label ── */}
        <div className="flex items-center justify-between px-4 pt-4 pb-2">
          <h2 className="font-heading font-bold text-base text-gray-900">{getSectionLabel()}</h2>
          {(activeCategory || searchQuery) && (
            <button onClick={() => { setActiveCategory(null); setSearchQuery(''); }} className="text-xs text-primary font-medium">
              Ver todos
            </button>
          )}
        </div>

        {/* ── Product Grid 2 cols ── */}
        <div className="px-3 pb-6">
          {filteredProducts.length === 0 ? (
            <div className="text-center py-16 text-gray-400 text-sm">Nenhum produto encontrado</div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {filteredProducts.map(p => <ProductCard key={p.id} product={p} />)}
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="px-4 py-6 text-center border-t border-gray-100">
          <p className="text-xs text-gray-400">{store?.name} · {store?.opening_hours}</p>
          <p className="text-[10px] text-gray-300 mt-1">© {new Date().getFullYear()} {store?.name}</p>
          <Link to="/gestor" className="inline-block text-[10px] text-gray-400 hover:text-primary transition-colors mt-3">Área do Gestor</Link>
          <div className="flex items-center justify-center gap-1 mt-3">
            <Heart size={10} className="text-primary/60 fill-primary/40" />
            <span className="text-[10px] text-gray-400">feito com</span>
            <span className="text-[10px] font-extrabold tracking-wider text-primary">PEDDI</span>
          </div>
        </div>
      </div>

      <SocialProofToast products={products} />
      <SignupPopup store={store} user={user} />
      <OrderStatusNotifier customerEmail={user?.email} />
      <BirthdayPromoNotifier user={user} />
      <AbandonedCartNotifier user={user} />
      <ChatWidget />
    </div>
  );
}
