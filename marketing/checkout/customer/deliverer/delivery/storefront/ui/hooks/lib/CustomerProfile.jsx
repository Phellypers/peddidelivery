import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { Link } from 'react-router-dom';
import { ShoppingBag, Heart, Settings, ChevronRight, LogIn, Star, Edit, LogOut, Camera, RefreshCw, Loader2, X, Check, FileText, ArrowLeft } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { motion, AnimatePresence } from 'framer-motion';
import FinancialReportModal from '@/components/customer/FinancialReportModal';
import BottomSheetSelect from '@/components/ui/BottomSheetSelect';
import { Trash2, AlertTriangle } from 'lucide-react';

const MONTHS = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

function EditProfileModal({ profile, user, onClose, onSaved }) {
  const [form, setForm] = useState({
    name: profile?.name || user?.full_name || '',
    username: profile?.username || '',
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
    <div className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center" onClick={onClose}>
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
    <div className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center" onClick={loading ? undefined : onClose}>
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
  const [profile, setProfile] = useState(null);
  const [recentOrders, setRecentOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [editOpen, setEditOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    if (!user?.id) { setLoading(false); return; }
    try {
      const [profs, ords, prods] = await Promise.all([
        base44.entities.CustomerProfile.filter({ user_id: user.id }),
        base44.entities.Order.filter({ customer_email: user.email }, '-created_date', 100),
        base44.entities.Product.filter({ is_published: true }, '-created_date', 20),
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
      setProducts([...prods].sort(() => Math.random() - 0.5).slice(0, 6));
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
  const orderAgainItems = [];
  const seen = new Set();
  for (const order of recentOrders) {
    for (const item of (order.items || [])) {
      if (!seen.has(item.product_id) && item.product_id) {
        seen.add(item.product_id);
        orderAgainItems.push(item);
      }
    }
  }

  const birthText = profile?.birth_month && profile?.birth_year
    ? `🎂 ${MONTHS[(profile.birth_month || 1) - 1]}/${profile.birth_year}`
    : null;

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
            <Link to="/" className="text-sm text-primary font-medium">← Voltar ao cardápio</Link>
          </div>
        ) : (
          <>
            {/* ── Profile Header ── */}
            <div className="relative">
              {/* Cover with optional banner + back arrow */}
              <div className="relative h-28 overflow-hidden">
                {profile?.cover_url
                  ? <img src={profile.cover_url} alt="" className="w-full h-full object-cover" />
                  : <div className="w-full h-full bg-gradient-to-br from-primary to-emerald-400" />
                }
                <Link to="/" className="absolute top-3 left-3 w-9 h-9 bg-black/30 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-black/40 transition-colors z-10">
                  <ArrowLeft size={18} />
                </Link>
                <button onClick={() => setEditOpen(true)} className="absolute top-3 right-3 w-9 h-9 bg-black/30 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-black/40 transition-colors z-10">
                  <Camera size={16} />
                </button>
              </div>

              {/* Avatar */}
              <div className="px-5 pb-4">
                <div className="flex items-end justify-between -mt-12 mb-3">
                  <div className="relative">
                    <div className="w-24 h-24 rounded-full border-4 border-white bg-gray-100 overflow-hidden shadow-md">
                      {profile?.photo_url
                        ? <img src={profile.photo_url} alt="" className="w-full h-full object-cover" />
                        : <div className="w-full h-full flex items-center justify-center text-3xl font-bold text-gray-400">
                            {(profile?.name || user.full_name || '?')[0]?.toUpperCase()}
                          </div>
                      }
                    </div>
                  </div>
                  <button onClick={() => setEditOpen(true)}
                    className="flex items-center gap-1.5 px-4 py-2 border-2 border-gray-200 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors">
                    <Edit size={14} /> Editar
                  </button>
                </div>

                <div>
                  <h1 className="font-heading font-bold text-xl text-gray-900">
                    {profile?.name || user.full_name || 'Olá!'}
                  </h1>
                  {profile?.username && (
                    <p className="text-sm text-gray-400 mt-0.5">@{profile.username}</p>
                  )}
                  {birthText && <p className="text-xs text-gray-400 mt-1">{birthText}</p>}
                </div>

                {/* Stats row */}
                {(() => {
                  const delivered = recentOrders.filter(o => o.status === 'delivered').length;
                  const cancelled = recentOrders.filter(o => o.status === 'cancelled').length;
                  return (
                    <div className="flex gap-3 mt-4 pt-4 border-t border-gray-100 overflow-x-auto scrollbar-hide">
                      <div className="text-center flex-shrink-0">
                        <p className="font-heading font-bold text-lg text-gray-900">{delivered}</p>
                        <p className="text-xs text-gray-400">Concluídos</p>
                      </div>
                      <div className="w-px bg-gray-100 flex-shrink-0" />
                      <div className="text-center flex-shrink-0">
                        <p className="font-heading font-bold text-lg text-red-400">{cancelled}</p>
                        <p className="text-xs text-gray-400">Cancelados</p>
                      </div>
                      <div className="w-px bg-gray-100 flex-shrink-0" />
                      <div className="text-center flex-shrink-0">
                        <p className="font-heading font-bold text-lg text-gray-900">
                          R$ {(profile?.total_spent || 0).toFixed(0)}
                        </p>
                        <p className="text-xs text-gray-400">Gasto total</p>
                      </div>
                      <div className="w-px bg-gray-100 flex-shrink-0" />
                      <div className="text-center flex-shrink-0">
                        <div className="flex items-center gap-1 justify-center">
                          <Star size={14} className="fill-amber-400 text-amber-400" />
                          <p className="font-heading font-bold text-lg text-gray-900">
                            {(profile?.internal_rating || 5).toFixed(1)}
                          </p>
                        </div>
                        <p className="text-xs text-gray-400">Avaliação</p>
                      </div>
                      {(profile?.cashback_balance || 0) > 0 && (
                        <>
                          <div className="w-px bg-gray-100 flex-shrink-0" />
                          <div className="text-center flex-shrink-0">
                            <p className="font-heading font-bold text-lg text-green-600">
                              R$ {(profile.cashback_balance).toFixed(2)}
                            </p>
                            <p className="text-xs text-gray-400">Cashback</p>
                          </div>
                        </>
                      )}
                    </div>
                  );
                })()}

                <button onClick={() => setReportOpen(true)}
                  className="w-full flex items-center justify-center gap-2 mt-3 py-2.5 border-2 border-dashed border-primary/40 rounded-xl text-primary text-sm font-semibold hover:bg-primary/5 transition-colors">
                  <FileText size={15} /> Relatório financeiro
                </button>
              </div>
            </div>

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

              {user?.role === 'admin' && (
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

            {/* ── Peça de novo ── */}
            {orderAgainItems.length > 0 && (
              <div className="px-4 py-4 border-t border-gray-100">
                <div className="flex items-center gap-2 mb-3">
                  <RefreshCw size={16} className="text-primary" />
                  <h2 className="font-heading font-semibold text-gray-800 text-sm">Peça de novo</h2>
                </div>
                <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-1">
                  {orderAgainItems.slice(0, 6).map((item, i) => (
                    <Link key={i} to={`/item/${item.product_id}`} className="flex-shrink-0 w-24 text-center group">
                      <div className="w-24 h-24 rounded-2xl bg-gray-100 overflow-hidden mb-1.5 group-hover:shadow-md transition-shadow">
                        {item.product_image
                          ? <img src={item.product_image} alt={item.product_name} className="w-full h-full object-cover" />
                          : <div className="w-full h-full flex items-center justify-center text-2xl">🍽️</div>
                        }
                      </div>
                      <p className="text-xs text-gray-600 font-medium truncate">{item.product_name}</p>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* ── Você também pode gostar ── */}
            {products.length > 0 && (
              <div className="px-4 py-4 border-t border-gray-100">
                <div className="flex items-center gap-2 mb-3">
                  <Star size={16} className="text-amber-400" />
                  <h2 className="font-heading font-semibold text-gray-800 text-sm">Você também pode gostar</h2>
                </div>
                <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-1">
                  {products.map(p => (
                    <Link key={p.id} to={`/item/${p.id}`} className="flex-shrink-0 w-28 group">
                      <div className="w-28 h-28 rounded-2xl bg-gray-100 overflow-hidden mb-1.5 group-hover:shadow-md transition-shadow">
                        {p.images?.[0]
                          ? <img src={p.images[0]} alt={p.name} className="w-full h-full object-cover" />
                          : <div className="w-full h-full flex items-center justify-center text-2xl">🍽️</div>
                        }
                      </div>
                      <p className="text-xs text-gray-700 font-semibold truncate">{p.name}</p>
                      <p className="text-xs text-primary font-bold">R$ {(p.promo_price || p.price)?.toFixed(2)}</p>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            <div className="pb-20 text-center">
              <Link to="/" className="text-sm text-primary font-medium">← Voltar ao cardápio</Link>
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