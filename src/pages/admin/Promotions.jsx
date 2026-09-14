import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Plus, Edit, Trash2, Loader2, X, Tag } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function Promotions() {
  const [coupons, setCoupons] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);

  const load = async () => {
    const [c, p] = await Promise.all([
      base44.entities.Coupon.list('-created_date'),
      base44.entities.Product.filter({ is_published: true })
    ]);
    setCoupons(c);
    setProducts(p);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const toggleActive = async (coupon) => {
    await base44.entities.Coupon.update(coupon.id, { is_active: !coupon.is_active });
    load();
  };

  const deleteCoupon = async (id) => {
    if (!confirm('Excluir este cupom?')) return;
    await base44.entities.Coupon.delete(id);
    load();
  };

  // Also manage promo_price on products directly
  const promoProducts = products.filter(p => p.promo_price && p.promo_price < p.price);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-heading font-bold text-2xl text-foreground">Promoções</h1>
        <p className="text-sm text-muted-foreground mt-1">Gerencie cupons de desconto e preços promocionais</p>
      </div>

      {/* Promo Prices from Products */}
      <div>
        <h2 className="font-heading font-semibold text-base text-foreground mb-3">Produtos em Promoção</h2>
        {promoProducts.length === 0 ? (
          <div className="bg-card rounded-2xl border border-border/50 p-6 text-center text-muted-foreground text-sm">
            Nenhum produto com preço promocional. Edite um produto no Catálogo e defina um "Preço promocional".
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {promoProducts.map(p => {
              const discount = Math.round((1 - p.promo_price / p.price) * 100);
              return (
                <div key={p.id} className="bg-card rounded-2xl border border-border/50 p-4 flex items-center gap-3">
                  <img
                    src={p.images?.[0] || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=80'}
                    alt={p.name}
                    className="w-14 h-14 rounded-xl object-cover flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{p.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-muted-foreground line-through">R$ {p.price?.toFixed(2)}</span>
                      <span className="text-sm font-bold text-primary">R$ {p.promo_price?.toFixed(2)}</span>
                    </div>
                  </div>
                  <span className="bg-red-50 text-red-600 text-xs font-bold px-2 py-1 rounded-full flex-shrink-0">-{discount}%</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Coupons */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-heading font-semibold text-base text-foreground">Cupons de Desconto</h2>
          <button
            onClick={() => { setEditing(null); setShowForm(true); }}
            className="flex items-center gap-2 bg-primary text-white px-4 py-2.5 rounded-xl font-medium text-sm hover:bg-primary/90 transition-colors"
          >
            <Plus size={18} /> Novo Cupom
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="animate-spin text-primary" size={32} /></div>
        ) : coupons.length === 0 ? (
          <div className="bg-card rounded-2xl border border-border/50 p-8 text-center text-muted-foreground">
            <Tag size={36} className="mx-auto mb-3 opacity-30" />
            <p>Nenhum cupom cadastrado</p>
          </div>
        ) : (
          <div className="bg-card rounded-2xl border border-border/50 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase">Código</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase">Desconto</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase hidden sm:table-cell">Pedido Mín.</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase hidden md:table-cell">Usos</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase hidden md:table-cell">Validade</th>
                    <th className="text-center py-3 px-4 text-xs font-semibold text-muted-foreground uppercase">Status</th>
                    <th className="text-right py-3 px-4 text-xs font-semibold text-muted-foreground uppercase">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {coupons.map(coupon => (
                    <tr key={coupon.id} className="border-b border-border/30 hover:bg-accent/30 transition-colors">
                      <td className="py-3 px-4">
                        <span className="font-mono font-bold text-sm bg-muted px-2 py-1 rounded-lg">{coupon.code}</span>
                      </td>
                      <td className="py-3 px-4 font-medium text-primary">
                        {coupon.type === 'percentage' ? `${coupon.value}%` : `R$ ${coupon.value?.toFixed(2)}`}
                      </td>
                      <td className="py-3 px-4 hidden sm:table-cell text-muted-foreground">
                        {coupon.min_order_value > 0 ? `R$ ${coupon.min_order_value?.toFixed(2)}` : '—'}
                      </td>
                      <td className="py-3 px-4 hidden md:table-cell text-muted-foreground">
                        {coupon.uses_count || 0} / {coupon.max_uses || '∞'}
                      </td>
                      <td className="py-3 px-4 hidden md:table-cell text-muted-foreground">
                        {coupon.expires_at ? new Date(coupon.expires_at).toLocaleDateString('pt-BR') : '—'}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button onClick={() => toggleActive(coupon)}>
                          {coupon.is_active
                            ? <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-green-50 text-green-700">Ativo</span>
                            : <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-muted text-muted-foreground">Inativo</span>
                          }
                        </button>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => { setEditing(coupon); setShowForm(true); }} className="p-1.5 hover:bg-accent rounded-lg transition-colors">
                            <Edit size={14} />
                          </button>
                          <button onClick={() => deleteCoupon(coupon.id)} className="p-1.5 hover:bg-red-50 text-muted-foreground hover:text-red-500 rounded-lg transition-colors">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <AnimatePresence>
        {showForm && (
          <CouponForm
            coupon={editing}
            onClose={() => { setShowForm(false); setEditing(null); }}
            onSave={() => { setShowForm(false); setEditing(null); load(); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function CouponForm({ coupon, onClose, onSave }) {
  const [form, setForm] = useState({
    code: coupon?.code || '',
    type: coupon?.type || 'percentage',
    value: coupon?.value || '',
    min_order_value: coupon?.min_order_value || 0,
    max_uses: coupon?.max_uses || 100,
    expires_at: coupon?.expires_at || '',
    is_active: coupon?.is_active ?? true,
  });
  const [saving, setSaving] = useState(false);

  const set = (f, v) => setForm(p => ({ ...p, [f]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    const data = {
      ...form,
      value: parseFloat(form.value) || 0,
      min_order_value: parseFloat(form.min_order_value) || 0,
      max_uses: parseInt(form.max_uses) || 100,
    };
    if (coupon) {
      await base44.entities.Coupon.update(coupon.id, data);
    } else {
      await base44.entities.Coupon.create(data);
    }
    onSave();
  };

  const inp = "w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30";
  const lbl = "block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide";

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
    >
      <motion.div
        initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20, opacity: 0 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="font-heading font-bold text-lg">{coupon ? 'Editar Cupom' : 'Novo Cupom'}</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full"><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className={lbl}>Código do cupom *</label>
            <input
              value={form.code}
              onChange={e => set('code', e.target.value.toUpperCase())}
              required className={inp}
              placeholder="Ex: PROMO10"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl}>Tipo</label>
              <select value={form.type} onChange={e => set('type', e.target.value)} className={inp}>
                <option value="percentage">Porcentagem (%)</option>
                <option value="fixed">Valor fixo (R$)</option>
              </select>
            </div>
            <div>
              <label className={lbl}>Valor *</label>
              <input type="number" step="0.01" min="0" value={form.value} onChange={e => set('value', e.target.value)} required className={inp} placeholder={form.type === 'percentage' ? '10' : '5,00'} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl}>Pedido mínimo (R$)</label>
              <input type="number" step="0.01" min="0" value={form.min_order_value} onChange={e => set('min_order_value', e.target.value)} className={inp} placeholder="0,00" />
            </div>
            <div>
              <label className={lbl}>Limite de usos</label>
              <input type="number" min="1" value={form.max_uses} onChange={e => set('max_uses', e.target.value)} className={inp} placeholder="100" />
            </div>
          </div>
          <div>
            <label className={lbl}>Válido até</label>
            <input type="date" value={form.expires_at} onChange={e => set('expires_at', e.target.value)} className={inp} />
          </div>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={form.is_active} onChange={e => set('is_active', e.target.checked)} className="w-4 h-4 rounded accent-primary" />
            Cupom ativo
          </label>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors">Cancelar</button>
            <button type="submit" disabled={saving} className="flex-1 py-2.5 rounded-xl text-sm font-bold bg-primary text-white hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
              {saving && <Loader2 size={15} className="animate-spin" />}
              {saving ? 'Salvando...' : coupon ? 'Salvar' : 'Criar Cupom'}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}