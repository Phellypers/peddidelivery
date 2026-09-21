import React, { useState, useEffect, useMemo, useCallback } from 'react';
import CartDrawer from '@/components/storefront/CartDrawer';
import ChatWidget from '@/components/storefront/ChatWidget';
import ProductCard from '@/components/storefront/ProductCard';
import { getCategoryCover } from '@/lib/categoryCovers';
import { hasRecentProduct } from '@/lib/productHighlights';
import PromoBannerCarousel from '@/components/storefront/PromoBannerCarousel';
import PromoHeaderBanner from '@/components/storefront/PromoHeaderBanner';
import MenuDrawer from '@/components/storefront/MenuDrawer';
import StoriesRing from '@/components/storefront/StoriesRing';
import SocialProofToast from '@/components/storefront/SocialProofToast';
import SignupPopup from '@/components/storefront/SignupPopup';
import OrderStatusNotifier from '@/components/storefront/OrderStatusNotifier';
import BirthdayPromoNotifier from '@/components/storefront/BirthdayPromoNotifier';
import AbandonedCartNotifier from '@/components/storefront/AbandonedCartNotifier';
import { Loader2, Search, AlignJustify, Heart, MapPin, MessageCircle, House, Bell } from 'lucide-react';
import NotificationBell from '@/components/storefront/NotificationBell';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { emitLiveEvent } from '@/lib/liveSession';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { loadPublicCatalog } from '@/services/api/peddiApi';
import BottomNav from '@/components/storefront/BottomNav';
import '@/components/storefront/Storefront.css';
import { getStoreTheme } from '@/lib/storeTheme';
import { getBannerProductIds } from '@/lib/bannerProducts';
import { isPublicDemo } from '@/lib/presentationDemo';
import { storefrontStoreRef, withStore } from '@/lib/storefrontTenant';

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
  const navigate = useNavigate();
  const location = useLocation();
  const storeRef = storefrontStoreRef(location.search);
  const { bannerId } = useParams();
  const [store, setStore] = useState(null);
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [chatOpen, setChatOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeBanner, setActiveBanner] = useState(null);

  const { user } = useAuth();
  const publicDemo = isPublicDemo();
  const demoAccountNotice = () => window.dispatchEvent(new CustomEvent('peddi-demo-action', { detail: 'Login, notificações e atendimento não gravam dados no modo demonstração.' }));

  const loadData = useCallback(() => {
    return loadPublicCatalog(storeRef).then(({ store: currentStore, categories: cats, products: prods }) => {
      setStore(currentStore);
      setCategories(cats);
      setProducts(prods.filter(p => !p.is_paused));
      setLoading(false);
    });
  }, [storeRef]);

  useEffect(() => {
    if (!store?.id || storeRef) return;
    const params = new URLSearchParams(location.search);
    params.set('store', store.id);
    navigate(`${location.pathname}?${params}`, { replace: true });
  }, [store?.id, storeRef, location.pathname, location.search, navigate]);

  useEffect(() => {
    loadData();
    emitLiveEvent('navegando');
  }, [loadData]);

  const { pullDistance, refreshing, bind } = usePullToRefresh(loadData);
  const campaignBanner = bannerId ? (store?.banners || []).find((banner, index) =>
    banner.is_active && String(banner.id || `index-${index}`) === bannerId) : null;

  const filteredProducts = useMemo(() => {
    let result = products;

    if (bannerId) {
      const linkedIds = new Set(getBannerProductIds(campaignBanner || {}));
      result = products.filter(product => linkedIds.has(product.id));
    } else if (activeCategory === '__most_ordered__') {
      result = products.filter(product => Number(product.orders_count || 0) > 0)
        .sort((a, b) => Number(b.orders_count || 0) - Number(a.orders_count || 0)).slice(0, 12);
    } else if (activeCategory === '__promotions__') {
      const campaignProducts = new Set((store?.banners || []).filter(banner => banner.is_active)
        .flatMap(getBannerProductIds));
      result = products.filter(p => (Number(p.promo_price) > 0 && Number(p.promo_price) < Number(p.price)) || campaignProducts.has(p.id));
    } else if (activeCategory === '__featured__') {
      result = products.filter(p => p.is_featured);
    } else if (activeBanner) {
      const linkedIds = new Set(getBannerProductIds(activeBanner));
      result = products.filter(product => linkedIds.has(product.id));
    } else if (activeCategory) {
      result = result.filter(p => p.category_ids?.includes(activeCategory));
    }

    if (searchQuery && !bannerId) {
      const q = searchQuery.toLowerCase();
      result = result.filter(p =>
        p.name?.toLowerCase().includes(q) ||
        p.description?.toLowerCase().includes(q) ||
        p.tags?.some(t => t.toLowerCase().includes(q))
      );
    }
    return result;
  }, [products, store, activeCategory, activeBanner, searchQuery, bannerId, campaignBanner]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const visibleCategories = categories.filter(c => c.is_active !== false).sort((a,b) => Number(Boolean(b.is_featured)) - Number(Boolean(a.is_featured)) || Number(a.sort_order || 0) - Number(b.sort_order || 0));
  const theme = getStoreTheme(store);

  const getSectionLabel = () => {
    if (activeBanner) return activeBanner.title || 'Campanha promocional';
    if (activeCategory && SPECIAL_SECTIONS[activeCategory]) return SPECIAL_SECTIONS[activeCategory];
    if (activeCategory) return categories.find(c => c.id === activeCategory)?.name || '';
    if (searchQuery) return `Resultados para "${searchQuery}"`;
    return 'Todos os Produtos';
  };

  const showBannerCampaign = banner => {
    const index = (store?.banners || []).indexOf(banner);
    navigate(withStore(`/loja/campanha/${encodeURIComponent(banner.id || `index-${index}`)}`, store?.id || storeRef));
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  const clearProductFilter = () => {
    setActiveBanner(null);
    setActiveCategory(null);
    setSearchQuery('');
  };
  const selectMenuCategory = category => {
    setActiveBanner(null);
    setSearchQuery('');
    setActiveCategory(category);
    window.requestAnimationFrame(() => document.getElementById('cardapio-produtos')?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  };

  if (bannerId) return (
    <div className="peddi-storefront min-h-screen bg-white pb-28" style={{ '--store-primary': theme.primary, '--store-on-primary': theme.onPrimary, '--primary': theme.primaryHsl, '--ring': theme.primaryHsl }}>
      <CartDrawer />
      <main className="mx-auto min-h-screen max-w-2xl bg-white">
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-gray-100 bg-white/95 px-4 py-3 backdrop-blur">
          <Link to={withStore('/loja', store?.id || storeRef)} aria-label="Voltar ao cardápio" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-gray-700 hover:bg-gray-100"><span aria-hidden="true">←</span></Link>
          <div className="min-w-0"><p className="text-xs text-gray-500">{store?.name}</p><h1 className="break-words font-heading text-lg font-bold text-gray-900">{campaignBanner?.title || 'Campanha promocional'}</h1></div>
        </header>
        {campaignBanner && <section aria-label={`Campanha ${campaignBanner.title || ''}`} className="px-4 pt-4">
          <div className="relative aspect-[2.4/1] overflow-hidden rounded-2xl bg-gray-100 shadow-sm">
            <img src={campaignBanner.image_url || campaignBanner.image} alt={campaignBanner.title || 'Banner da campanha'} className="h-full w-full object-cover" />
            {(campaignBanner.title || campaignBanner.subtitle || campaignBanner.badge) && <><div className="absolute inset-0 bg-gradient-to-r from-black/65 via-black/25 to-transparent"/><div className="absolute inset-y-0 left-0 flex max-w-[75%] flex-col justify-center p-4 text-white">
              {campaignBanner.badge&&<span className="mb-1 w-fit rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-bold text-gray-900">{campaignBanner.badge}</span>}
              {campaignBanner.title&&<h2 className="text-lg font-bold leading-tight sm:text-xl">{campaignBanner.title}</h2>}
              {campaignBanner.subtitle&&<p className="mt-1 line-clamp-2 text-xs text-white/90 sm:text-sm">{campaignBanner.subtitle}</p>}
            </div></>}
          </div>
        </section>}
        <p className="px-4 py-4 text-sm text-gray-500">{filteredProducts.length} produto{filteredProducts.length !== 1 ? 's' : ''} nesta campanha</p>
        {filteredProducts.length ? <div className="grid grid-cols-2 gap-3 px-4">{filteredProducts.map(product => <ProductCard key={product.id} product={product} />)}</div>
          : <p role="status" className="px-4 py-10 text-center text-sm text-gray-500">{campaignBanner ? 'Nenhum produto disponível vinculado a esta campanha.' : 'Esta campanha não está disponível.'}</p>}
      </main>
      <BottomNav />
    </div>
  );

  return (
    <div className="peddi-storefront min-h-screen pb-24" style={{
      '--store-primary': theme.primary,
      '--store-on-primary': theme.onPrimary,
      '--store-text': theme.text,
      '--store-background': theme.background,
      '--store-radius': theme.radius,
      '--primary': theme.primaryHsl,
      '--ring': theme.primaryHsl,
    }} {...bind}>
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
        store={store}
        categories={categories}
        activeCategory={activeCategory}
        onSelectCategory={selectMenuCategory}
      />

      <div className="peddi-store-shell max-w-2xl mx-auto bg-white min-h-screen">

        <header className="peddi-store-header">
          <div className="peddi-store-orange">
            <button type="button" aria-label="Abrir menu do cardápio" onClick={() => setMenuOpen(true)}><AlignJustify size={27} /></button>
            <div className="flex items-center gap-3">{publicDemo ? <><button type="button" aria-label="Chat indisponível na demonstração" onClick={demoAccountNotice} className="flex h-11 w-11 items-center justify-center"><MessageCircle size={27} /></button><button type="button" aria-label="Notificações indisponíveis na demonstração" onClick={demoAccountNotice} className="flex h-11 w-11 items-center justify-center"><Bell size={27} /></button></> : <>{user ? <button type="button" aria-label="Conversar com a loja" onClick={() => setChatOpen(true)}><MessageCircle size={27} /></button> : <Link to={`/login?store=${encodeURIComponent(store?.id || storeRef)}&returnTo=${encodeURIComponent(withStore('/loja', store?.id || storeRef))}`} aria-label="Entrar para conversar com a loja" className="flex h-11 w-11 items-center justify-center"><MessageCircle size={27} /></Link>}{user ? <NotificationBell /> : <Link to={`/login?store=${encodeURIComponent(store?.id || storeRef)}&returnTo=${encodeURIComponent(withStore('/loja', store?.id || storeRef))}`} aria-label="Entrar para ver notificações" className="flex h-11 w-11 items-center justify-center"><Bell size={27} /></Link>}</>}</div>
          </div>
          <div className="peddi-store-profile">
            <div className="peddi-store-logo"><StoriesRing store={store} isAdmin={false} onUpdateStore={setStore} /></div>
            <h1>{store?.name || 'Meu Restaurante'}</h1>
            {store?.opening_hours && <p className="peddi-store-hours"><span aria-hidden="true">●</span> {store.opening_hours}</p>}
            <p className="peddi-store-description">{store?.description || 'Seja bem-vindo! Confira nosso cardápio completo.'}</p>
            {store?.address && <p className="peddi-store-address"><MapPin size={16} />{store.address}{store.city ? `, ${store.city}` : ''}</p>}
          </div>
        </header>

        {/* ── Promo Header Banner ── */}
        <div className="peddi-store-categories overflow-x-auto scrollbar-hide">
          <div className="flex gap-3 px-4 py-4">
            <button type="button" aria-pressed={!activeCategory && !activeBanner} onClick={clearProductFilter} className={`peddi-store-category ${!activeCategory && !activeBanner ? 'active' : ''}`}>
              <span className="peddi-store-category-image"><House size={32} aria-hidden="true" /></span><span>Todos</span>
            </button>
            {visibleCategories.map(cat => <button type="button" key={cat.id} aria-pressed={activeCategory === cat.id} onClick={() => { setActiveBanner(null); setActiveCategory(activeCategory === cat.id ? null : cat.id); }} className={`peddi-store-category ${activeCategory === cat.id ? 'active' : ''} ${hasRecentProduct(cat.id, products) ? 'has-new-product' : ''}`}>
              <span className="peddi-store-category-image">{getCategoryCover(cat) ? <img src={getCategoryCover(cat)} alt="" /> : <span className="text-3xl">{cat.icon || <House size={28} />}</span>}</span>
              {hasRecentProduct(cat.id, products) && <span className="sr-only">Novos produtos nesta categoria</span>}
              {cat.badge_label && <span className={`peddi-store-category-badge ${CAT_BADGE_COLORS[cat.badge_color] || CAT_BADGE_COLORS.orange}`}>{cat.badge_label}</span>}
              <span>{cat.name}</span>
            </button>)}
          </div>
        </div>

        <div className="peddi-store-search px-4 pb-3">
          <div className="relative"><input type="search" aria-label="Buscar no cardápio" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Buscar no cardápio..." /><Search size={23} aria-hidden="true" /></div>
        </div>

        {/* ── Promo Banner Carousel ── */}
        {!searchQuery && !activeCategory && (
          <div className="px-0 pt-1 pb-0">
            <div className="min-w-0">
              <PromoBannerCarousel banners={store?.banners} onSelectBanner={showBannerCampaign} />
            </div>
          </div>
        )}

        {/* ── Section Label ── */}
        {!searchQuery && !activeCategory && <PromoHeaderBanner />}

        <div id="cardapio-produtos" className="flex items-center justify-between px-4 pt-4 pb-2">
          <h2 className="font-heading font-bold text-base text-gray-900">{getSectionLabel()}</h2>
          {(
            <button onClick={clearProductFilter} className="text-xs text-primary font-medium">
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
      <ChatWidget externalOpen={chatOpen} onExternalClose={() => setChatOpen(false)} hideLauncher />
      <BottomNav />
    </div>
  );
}
