import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { Link } from 'react-router-dom';
import { ShoppingBag, Heart, Settings, ChevronRight, LogIn, Star, Edit, LogOut, Camera, RefreshCw, Loader2, X, Check, FileText, ArrowLeft } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { motion, AnimatePresence } from 'framer-motion';
import FinancialReportModal from '@/components/customer/FinancialReportModal';
import BottomSheetSelect from '@/components/ui/BottomSheetSelect';
import { Trash2, AlertTriangle } from 'lucide-react';
import { useWishlist } from '@/lib/WishlistContext';
import SafeBackButton from '@/components/navigation/SafeBackButton';
import { isProductAvailable } from '@/lib/productAvailability';
import ProductRating from '@/components/storefront/ProductRating';
import { getPriceDropBadge } from '@/lib/productHighlights';

const MONTHS = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

const formatPrice = value => Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

function CatalogRecommendationCard({ product }) {
  const price = Number(product.price || 0);
  const promoPrice = Number(product.promo_price || 0);
  const hasPromotion = promoPrice > 0 && promoPrice < price;
  const currentPrice = hasPromotion ? promoPrice : price;
  const discount = hasPromotion && price > 0 ? Math.round((1 - promoPrice / price) * 100) : 0;
  const available = product.is_published !== false
    && !product.is_paused
    && Number(product.stock ?? 999) > 0
    && isProductAvailable(product);
  const image = product.images?.[0];
  const priceDropBadge = getPriceDropBadge(product);

  return (
    <Link data-catalog-product-id={product.id} to={`/item/${product.id}`} className="w-36 flex-shrink-0 overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition-transform active:scale-[0.98]">
      {image && (
        <div className="relative h-28 w-full overflow-hidden bg-gray-50">
          <img src={image} alt={product.name} className="h-full w-full object-cover" loading="lazy" />
          {priceDropBadge
            ? <span className="absolute left-2 top-2 rounded-full bg-emerald-600 px-2 py-1 text-[10px] font-bold text-white">{priceDropBadge}</span>
            : discount > 0 && <span className="absolute left-2 top-2 rounded-full bg-red-500 px-2 py-1 text-[10px] font-bold text-white">-{discount}%</span>}
        </div>
      )}
      <div className="p-2.5">
        {!image && priceDropBadge && <span className="mb-2 inline-flex rounded-full bg-emerald-600 px-2 py-1 text-[10px] font-bold text-white">{priceDropBadge}</span>}
        <p className="line-clamp-2 min-h-8 text-xs font-bold leading-4 text-gray-900">{product.name}</p>
        <ProductRating product={product} showNew className="mt-1" />
        <div className="mt-1.5 flex min-h-8 flex-col justify-end">
          {hasPromotion && <span className="text-[10px] text-gray-400 line-through">{formatPrice(price)}</span>}
          {currentPrice > 0 && <span className="text-xs font-bold text-primary">{formatPrice(currentPrice)}</span>}
        </div>
        <span className={`mt-2 inline-flex rounded-full px-2 py-1 text-[10px] font-semibold ${available ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
          {available ? 'Disponível' : 'Indisponível'}
        </span>
      </div>
    </Link>
  );
}

function EditProfileModal({ profile, user, onClose, onSaved }) {
  const [form, setForm] = useState({
    name: profile?.name || user?.full_name || '',
    username: profile?.username || '',
    bio: profile?.bio || '',
    phone: profile?.phone || '',
    birth_month: profile?.birth_month || '',
    birth_year: profile?.birth_year || '',
    photo_url: profile?.photo_url || '',
    cover_url: profile?.cover_url || '',
  });
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handlePhoto = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    set('photo_url', file_url);
    setUploading(false);
  };

  const handleCover = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    set('cover_url', file_url);
    setUploading(false);
  };

  const handleSave = async () => {
    setSaving(true);
    const data = { ...form, birth_month: form.birth_month ? parseInt(form.birth_month) : null, birth_year: form.birth_year ? parseInt(form.birth_year) : null };
    if (profile?.id) {
      await base44.entities.CustomerProfile.update(profile.id, data);
    } else {
      await base44.entities.CustomerProfile.create({ ...data, user_id: user.id, email: user.email });
    }
    setSaving(false);
    onSaved();
  };

  return (
    <div data-peddi-modal="" className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center" onClick={onClose}>
      <motion.div
        initial={{ y: 80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 80, opacity: 0 }}
        className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-md p-6 space-y-4 max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="font-heading font-bold text-lg">Editar perfil</h3>
          <button onClick={onClose}><X size={20} className="text-gray-400" /></button>
        </div>

        {/* Cover banner */}
        <div>
          <label className="block cursor-pointer">
            <div className="w-full h-20 rounded-xl overflow-hidden border border-gray-200 relative">
              {form.cover_url
                ? <img src={form.cover_url} alt="" className="w-full h-full object-cover" />
                : <div className="w-full h-full bg-gradient-to-br from-primary/30 to-emerald-200 flex items-center justify-center">
                    <Camera size={20} className="text-primary/60" />
                  </div>
              }
              <div className="absolute bottom-1 right-1 w-7 h-7 bg-primary rounded-full flex items-center justify-center shadow-sm">
                {uploading ? <Loader2 size={12} className="text-white animate-spin" /> : <Camera size={12} className="text-white" />}
              </div>
            </div>
            <input type="file" accept="image/*" className="hidden" onChange={handleCover} disabled={uploading} />
          </label>
          <input value={form.cover_url} onChange={e => set('cover_url', e.target.value)} placeholder="ou cole a URL de uma imagem" className="w-full mt-1 px-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30" />
        </div>

        {/* Avatar */}
        <div className="flex justify-center">
          <label className="relative cursor-pointer group">
            <div className="w-24 h-24 rounded-full bg-gray-100 overflow-hidden border-4 border-white shadow-md">
              {form.photo_url
                ? <img src={form.photo_url} alt="" className="w-full h-full object-cover" />
                : <div className="w-full h-full flex items-center justify-center text-3xl font-bold text-gray-400">
                    {(form.name || '?')[0]?.toUpperCase()}
                  </div>
              }
            </div>
            <div className="absolute bottom-0 right-0 w-8 h-8 bg-primary rounded-full flex items-center justify-center shadow-sm">
              {uploading ? <Loader2 size={14} className="text-white animate-spin" /> : <Camera size={14} className="text-white" />}
            </div>
            <input type="file" accept="image/*" className="hidden" onChange={handlePhoto} disabled={uploading} />
          </label>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Nome completo</label>
            <input value={form.name} onChange={e => set('name', e.target.value)}
              className="w-full mt-1 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Nome de usuário</label>
            <div className="relative mt-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">@</span>
              <input value={form.username} onChange={e => set('username', e.target.value.toLowerCase().replace(/\s/g,''))}
                placeholder="seunome" className="w-full pl-7 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Bio</label>
            <textarea value={form.bio} onChange={e => set('bio', e.target.value)} rows={2} maxLength={120}
              placeholder="Conte um pouco sobre você" className="w-full mt-1 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30" />
            <p className="mt-1 text-right text-[10px] text-gray-400">{form.bio.length}/120</p>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">WhatsApp</label>
            <input value={form.phone} onChange={e => set('phone', e.target.value)}
              placeholder="(11) 99999-9999" className="w-full mt-1 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Aniversário</label>
            <div className="grid grid-cols-2 gap-2 mt-1">
              <BottomSheetSelect
                value={form.birth_month}
                onChange={v => set('birth_month', v)}
                placeholder="Mês"
                label="Mês de aniversário"
                options={[{ value: '', label: 'Não informar' }, ...MONTHS.map((m, i) => ({ value: i + 1, label: m }))]}
              />
              <input type="number" value={form.birth_year} onChange={e => set('birth_year', e.target.value)}
                placeholder="Ano" min="1940" max="2015"
                className="px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
          </div>
        </div>

        <button onClick={handleSave} disabled={saving}
          className="w-full py-3 bg-primary text-white rounded-2xl font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50">
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
          {saving ? 'Salvando...' : 'Salvar perfil'}
        </button>
      </motion.div>
    </div>
  );
}

function DeleteAccountModal({ user, profile, loading, onClose, onConfirm }) {
  const [confirmText, setConfirmText] = useState('');
  const canConfirm = confirmText.toUpperCase() === 'EXCLUIR';
  return (
    <div data-peddi-modal="" className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center" onClick={loading ? undefined : onClose}>
      <motion.div
        initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 80, opacity: 0 }}
        className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-md p-6 space-y-4"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="font-heading font-bold text-lg text-red-600">Excluir Conta</h3>
          <button onClick={onClose} disabled={loading}><X size={20} className="text-gray-400" /></button>
        </div>
        <div className="flex items-start gap-3 p-3 bg-red-50 rounded-xl">
          <AlertTriangle size={20} className="text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700 leading-relaxed">
            Esta ação é permanente e não pode ser desfeita. Todos os seus dados (perfil, favoritos e histórico) serão removidos.
          </p>
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
            Digite <span className="text-red-600 font-bold">EXCLUIR</span> para confirmar
          </label>
          <input value={confirmText} onChange={e => setConfirmText(e.target.value)} disabled={loading}
            className="w-full mt-1 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-300" />
        </div>
        <button onClick={onConfirm} disabled={!canConfirm || loading}
          className="w-full py-3 bg-red-600 text-white rounded-2xl font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-40">
          {loading ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
          {loading ? 'Excluindo...' : 'Excluir minha conta'}
        </button>
      </motion.div>
    </div>
  );
}

export default function CustomerProfile() {
  const { user, isAuthenticated, logout, navigateToLogin } = useAuth();
  const { wishlist } = useWishlist();
  const [profile, setProfile] = useState(null);
  const [recentOrders, setRecentOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [editOpen, setEditOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeHighlight, setActiveHighlight] = useState('recommended');

  const loadData = async () => {
    if (!user?.id) { setLoading(false); return; }
    try {
      const [profs, ords, prods] = await Promise.all([
        base44.entities.CustomerProfile.filter({ user_id: user.id }),
        base44.entities.Order.filter({ customer_email: user.email }, '-created_date', 100),
        base44.entities.Product.filter({ is_published: true }, '-created_date'),
      ]);
      if (profs[0]) {
        setProfile(profs[0]);
      } else {
        const p = await base44.entities.CustomerProfile.create({
          user_id: user.id, name: user.full_name || '', email: user.email || '', internal_rating: 5.0, rating_count: 0,
        });
        setProfile(p);
      }
      setRecentOrders(ords);
      setProducts(prods.filter(product => !product.is_paused));
    } catch (_) {}
    setLoading(false);
  };

  useEffect(() => { loadData(); }, [user]);

  const menuItems = [
    { icon: ShoppingBag, label: 'Meus Pedidos', path: '/meus-pedidos', desc: `${recentOrders.length} pedidos` },
    { icon: Heart, label: 'Favoritos', path: '/favoritos', desc: 'Itens salvos' },
    { icon: Edit, label: 'Meus Dados', path: '/meus-dados', desc: 'Endereço e contato' },
  ];

  // "Order again" — unique products from recent orders
  const orderAgainProductIds = useMemo(() => {
    const ids = [];
    const seen = new Set();
    for (const order of recentOrders) {
      for (const item of (order.items || [])) {
        if (item.product_id && !seen.has(item.product_id)) {
          seen.add(item.product_id);
          ids.push(item.product_id);
        }
      }
    }
    return ids;
  }, [recentOrders]);

  const birthText = profile?.birth_month && profile?.birth_year
    ? `🎂 ${MONTHS[(profile.birth_month || 1) - 1]}/${profile.birth_year}`
    : null;

  const purchasedIds = useMemo(() => new Set(recentOrders.flatMap(order => (order.items || []).map(item => item.product_id).filter(Boolean))), [recentOrders]);
  const recommendedProducts = useMemo(() => {
    const purchasedProducts = products.filter(product => purchasedIds.has(product.id));
    const categoryAffinity = new Set(purchasedProducts.flatMap(product => product.category_ids || []));
    const tagAffinity = new Set(purchasedProducts.flatMap(product => product.tags || []));
    const score = product => (product.category_ids || []).filter(id => categoryAffinity.has(id)).length * 3
      + (product.tags || []).filter(tag => tagAffinity.has(tag)).length * 2;
    const candidates = products.filter(product => !purchasedIds.has(product.id));
    const base = candidates.length ? candidates : products;
    return [...base].sort((a, b) => purchasedProducts.length
      ? score(b) - score(a) || (b.views || 0) - (a.views || 0)
      : (b.views || 0) - (a.views || 0)).slice(0, 8);
  }, [products, purchasedIds]);
  const orderAgainProducts = useMemo(() => {
    const catalogById = new Map(products.map(product => [product.id, product]));
    return orderAgainProductIds.map(productId => catalogById.get(productId)).filter(Boolean);
  }, [orderAgainProductIds, products]);
  const promotionProducts = useMemo(() => products.filter(product => product.promo_price && product.promo_price < product.price), [products]);
  const favoriteProducts = useMemo(() => products.filter(product => wishlist.includes(product.id)), [products, wishlist]);
  const highlightProducts = {
    recommended: recommendedProducts,
    reorder: orderAgainProducts,
    promotions: promotionProducts,
    favorites: favoriteProducts,
  }[activeHighlight];
  const highlightTitle = {
    recommended: 'Recomendados para você', reorder: 'Peça de novo', promotions: 'Promoções', favorites: 'Seus favoritos',
  }[activeHighlight];
  const highlights = [
    { id: 'recommended', label: 'Recomendados', icon: Star },
    { id: 'reorder', label: 'Peça de novo', icon: RefreshCw },
    { id: 'promotions', label: 'Promoções', icon: FileText },
    { id: 'favorites', label: 'Favoritos', icon: Heart },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-lg mx-auto bg-white min-h-screen">

        {!isAuthenticated || !user ? (
          <div className="flex flex-col items-center justify-center min-h-screen p-8 text-center space-y-5">
            <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center">
              <ShoppingBag size={40} className="text-primary" />
            </div>
            <div>
              <h2 className="font-heading font-bold text-xl">Entre na sua conta</h2>
              <p className="text-gray-500 text-sm mt-1">Acompanhe pedidos e salve favoritos</p>
            </div>
            <button onClick={() => navigateToLogin()}
              className="w-full flex items-center justify-center gap-2 py-3.5 bg-primary text-white rounded-2xl font-bold text-sm hover:bg-primary/90 transition-colors">
              <LogIn size={18} /> Entrar / Cadastrar
            </button>
            <Link to="/loja" className="text-sm text-primary font-medium">← Voltar ao cardápio</Link>
          </div>
        ) : (
          <>
            {/* ── Profile Header ── */}
            <section className="relative bg-white">
              <div className="relative h-40 overflow-hidden bg-gray-100">
                {profile?.cover_url
                  ? <img src={profile.cover_url} alt="" className="w-full h-full object-cover" />
                  : <div className="w-full h-full bg-gradient-to-br from-emerald-900 via-primary to-emerald-400" />
                }
                <div className="absolute inset-0 bg-gradient-to-t from-black/25 to-transparent" />
                <SafeBackButton fallback="/loja" aria-label="Voltar ao cardápio" className="absolute left-4 top-[max(1rem,env(safe-area-inset-top))] z-10 flex h-11 w-11 items-center justify-center rounded-full bg-black/35 text-white backdrop-blur-md transition-colors hover:bg-black/50">
                  <ArrowLeft size={21} />
                </SafeBackButton>
                <button aria-label="Alterar foto de capa" onClick={() => setEditOpen(true)} className="absolute right-4 top-[max(1rem,env(safe-area-inset-top))] z-10 flex h-11 w-11 items-center justify-center rounded-full bg-black/35 text-white backdrop-blur-md transition-colors hover:bg-black/50">
                  <Camera size={19} />
                </button>
              </div>

              <div className="px-4 pb-4 sm:px-5">
                <div className="-mt-12 flex items-end justify-between gap-3">
                  <div className="relative flex-shrink-0">
                    <div className="h-28 w-28 overflow-hidden rounded-full border-4 border-white bg-gray-100 shadow-sm">
                      {profile?.photo_url
                        ? <img src={profile.photo_url} alt="" className="w-full h-full object-cover" />
                        : <div className="w-full h-full flex items-center justify-center text-3xl font-bold text-gray-400">
                            {(profile?.name || user.full_name || '?')[0]?.toUpperCase()}
                          </div>
                      }
                    </div>
                    <button type="button" aria-label="Alterar foto do perfil" onClick={() => setEditOpen(true)} className="absolute bottom-1 right-0 flex h-9 w-9 items-center justify-center rounded-full border-2 border-white bg-primary text-white shadow-sm"><Camera size={16} /></button>
                  </div>
                  <button onClick={() => setEditOpen(true)}
                    className="mb-1 flex min-h-10 items-center gap-1.5 rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50">
                    <Edit size={14} /> Editar perfil
                  </button>
                </div>

                <div className="mt-3">
                  <h1 className="font-heading text-xl font-bold text-gray-900">
                    {profile?.name || user.full_name || 'Olá!'}
                  </h1>
                  <p className="mt-0.5 text-sm text-gray-500">{profile?.username ? `@${profile.username}` : 'Cliente PEDDI'}</p>
                  {profile?.bio && <p className="mt-2 text-sm leading-relaxed text-gray-800">{profile.bio}</p>}
                  {birthText && <p className="mt-1 text-xs text-gray-400">{birthText}</p>}
                </div>

                <div aria-label="Resumo do perfil" className="mt-5 grid grid-cols-4 gap-1 text-center">
                  <div><p className="font-heading text-base font-bold text-gray-900">{recentOrders.length}</p><p className="text-[11px] text-gray-500">Pedidos</p></div>
                  <div><p className="font-heading text-base font-bold text-gray-900">{wishlist.length}</p><p className="text-[11px] text-gray-500">Favoritos</p></div>
                  <div><p className="font-heading text-sm font-bold text-gray-900">R$ {Number(profile?.total_spent || 0).toFixed(0)}</p><p className="text-[11px] text-gray-500">Gasto total</p></div>
                  <div><p className="flex items-center justify-center gap-1 font-heading text-base font-bold text-gray-900"><Star size={13} className="fill-amber-400 text-amber-400" />{Number(profile?.internal_rating || 5).toFixed(1)}</p><p className="text-[11px] text-gray-500">Avaliação</p></div>
                </div>

                {(profile?.cashback_balance || 0) > 0 && <p className="mt-3 text-center text-xs font-semibold text-green-700">Cashback disponível: R$ {Number(profile.cashback_balance).toFixed(2).replace('.', ',')}</p>}

                <button onClick={() => setReportOpen(true)}
                  className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-gray-50 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-100">
                  <FileText size={15} /> Relatório financeiro
                </button>
              </div>
            </section>

            {/* ── Highlights ── */}
            <section className="border-t border-gray-100 bg-white px-3 py-4">
              <div className="flex justify-between gap-2 overflow-x-auto scrollbar-hide">
                {highlights.map(item => {
                  const Icon = item.icon;
                  const active = activeHighlight === item.id;
                  return (
                    <button key={item.id} type="button" aria-pressed={active} onClick={() => setActiveHighlight(item.id)} className="group flex min-w-[74px] flex-col items-center gap-2 text-center">
                      <span className={`flex h-16 w-16 items-center justify-center rounded-full border-2 transition-colors ${active ? 'border-primary bg-primary/10 text-primary' : 'border-gray-200 bg-gray-50 text-gray-500 group-hover:border-primary/40'}`}><Icon size={25} className={item.id === 'favorites' && active ? 'fill-current' : ''} /></span>
                      <span className={`text-[11px] font-medium ${active ? 'text-primary' : 'text-gray-700'}`}>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </section>

            <section data-profile-recommendations="" className="border-t border-gray-100 bg-white px-4 py-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <h2 className="font-heading text-base font-bold text-gray-900">{highlightTitle}</h2>
                <Link to={activeHighlight === 'favorites' ? '/favoritos' : activeHighlight === 'reorder' ? '/meus-pedidos' : '/loja'} className="flex-shrink-0 text-xs font-semibold text-primary">Ver todos</Link>
              </div>
              {highlightProducts.length > 0 ? (
                <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide">
                  {highlightProducts.map(product => <CatalogRecommendationCard key={product.id} product={product} />)}
                </div>
              ) : <p className="rounded-2xl bg-gray-50 px-4 py-6 text-center text-sm text-gray-500">Nenhum item disponível nesta seção.</p>}
            </section>

            {/* ── Menu items ── */}
            <div className="px-4 py-4 border-t border-gray-100 space-y-2">
              <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden divide-y divide-gray-50">
                {menuItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link key={item.path} to={item.path}
                      className="flex items-center gap-3 px-4 py-4 hover:bg-gray-50 transition-colors">
                      <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
                        <Icon size={18} className="text-primary" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-gray-800">{item.label}</p>
                        <p className="text-xs text-gray-400">{item.desc}</p>
                      </div>
                      <ChevronRight size={16} className="text-gray-300" />
                    </Link>
                  );
                })}
              </div>

              {['admin','manager','peddi_admin'].includes(user?.role) && (
                <div className="bg-orange-50 rounded-2xl border border-orange-100 overflow-hidden">
                  <Link to="/admin" className="flex items-center gap-3 px-4 py-4 hover:bg-orange-100 transition-colors">
                    <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center">
                      <Settings size={18} className="text-orange-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-orange-800">Painel do Gestor</p>
                      <p className="text-xs text-orange-500">Produtos, pedidos e promoções</p>
                    </div>
                    <ChevronRight size={16} className="text-orange-300" />
                  </Link>
                </div>
              )}

              <button onClick={() => logout()}
                className="w-full flex items-center gap-3 px-4 py-4 bg-white rounded-2xl border border-gray-100 text-red-500 hover:bg-red-50 transition-colors">
                <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center">
                  <LogOut size={18} className="text-red-500" />
                </div>
                <span className="text-sm font-semibold">Sair da conta</span>
              </button>

              {/* ── Excluir Conta ── */}
              <button onClick={() => setDeleteOpen(true)}
                className="w-full flex items-center gap-3 px-4 py-4 bg-red-50/50 rounded-2xl border border-red-100 text-red-600 hover:bg-red-50 transition-colors">
                <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
                  <Trash2 size={18} className="text-red-600" />
                </div>
                <span className="text-sm font-semibold">Excluir Conta</span>
              </button>
            </div>

            <div className="pb-20 text-center">
              <Link to="/loja" className="text-sm text-primary font-medium">← Voltar ao cardápio</Link>
            </div>
          </>
        )}
      </div>

      <AnimatePresence>
        {deleteOpen && (
          <DeleteAccountModal
            user={user}
            profile={profile}
            loading={deleting}
            onClose={() => setDeleteOpen(false)}
            onConfirm={async () => {
              setDeleting(true);
              try {
                // Best-effort account deletion via base44 SDK.
                // Removes the customer profile (user-owned) and attempts user record deletion.
                if (profile?.id) {
                  await base44.entities.CustomerProfile.delete(profile.id);
                }
                try { await base44.entities.User.delete(user.id); } catch (_) {}
                await logout('/');
              } catch (e) {
                setDeleting(false);
                alert('Não foi possível excluir a conta agora. Tente novamente ou contate o suporte.');
              }
            }}
          />
        )}
        {editOpen && (
          <EditProfileModal
            profile={profile}
            user={user}
            onClose={() => setEditOpen(false)}
            onSaved={() => { setEditOpen(false); loadData(); }}
          />
        )}
        {reportOpen && (
          <FinancialReportModal
            user={user}
            clientName={profile?.name || user?.full_name || ''}
            onClose={() => setReportOpen(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
