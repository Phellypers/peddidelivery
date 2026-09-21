import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Send, Users, Tag, Bell, Loader2, Check } from 'lucide-react';

const DISPATCH_TYPES = [
  { id: 'notification', label: '🔔 Notificação no app', icon: Bell },
  { id: 'coupon', label: '🎟️ Cupom personalizado', icon: Tag },
];

const AUDIENCE_TYPES = [
  { id: 'all', label: 'Todos os clientes' },
  { id: 'vip', label: 'Clientes VIP (5+ pedidos)' },
  { id: 'inactive', label: 'Clientes inativos (60+ dias)' },
  { id: 'specific', label: 'Selecionar clientes' },
];

export default function MarketingDispatch() {
  const [profiles, setProfiles] = useState([]);
  const [orders, setOrders] = useState([]);
  const [coupons, setCoupons] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const [form, setForm] = useState({
    type: 'notification',
    audience: 'all',
    selected_users: [],
    title: '',
    message: '',
    coupon_code: '',
  });

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  useEffect(() => {
    Promise.all([
      base44.entities.CustomerProfile.list('-total_orders'),
      base44.entities.Order.list('-created_date', 200),
      base44.entities.Coupon.filter({ is_active: true }, 'code'),
    ]).then(([profs, ords, cups]) => {
      setProfiles(profs);
      setOrders(ords);
      setCoupons(cups.filter(coupon => !coupon.promotion_type || coupon.promotion_type === 'coupon'));
      setLoading(false);
    });
    // Load history from localStorage
    try {
      const h = JSON.parse(localStorage.getItem('dispatch_history') || '[]');
      setHistory(h);
    } catch (_) {}
  }, []);

  const getTargetProfiles = () => {
    if (form.audience === 'all') return profiles;
    if (form.audience === 'specific') return profiles.filter(p => form.selected_users.includes(p.id));
    if (form.audience === 'vip') {
      return profiles.filter(p => {
        const count = orders.filter(o => o.customer_email === p.email).length;
        return count >= 5;
      });
    }
    if (form.audience === 'inactive') {
      return profiles.filter(p => {
        const custOrders = orders.filter(o => o.customer_email === p.email);
        if (custOrders.length === 0) return false;
        const last = new Date(custOrders[0].created_date);
        return (Date.now() - last) / (1000 * 60 * 60 * 24) > 60;
      });
    }
    return [];
  };

  const toggleUser = (id) => {
    set('selected_users', form.selected_users.includes(id)
      ? form.selected_users.filter(x => x !== id)
      : [...form.selected_users, id]);
  };

  const handleSend = async () => {
    if (!form.title || !form.message) return;
    setSending(true);
    const targets = getTargetProfiles();

    // Create a Notification record for each target user that has a user_id
    const notifs = targets
      .filter(p => p.user_id && !p.user_id.startsWith('manual_'))
      .map(p => base44.entities.Notification.create({
        user_id: p.user_id,
        type: 'order_status',
        title: form.title,
        message: form.message + (form.type === 'coupon' && form.coupon_code ? `\nCupom: ${form.coupon_code}` : ''),
        is_read: false,
      }));

    await Promise.all(notifs);

    // Save to history
    const entry = {
      id: Date.now(),
      date: new Date().toISOString(),
      type: form.type,
      audience: form.audience,
      title: form.title,
      message: form.message,
      coupon_code: form.coupon_code,
      count: targets.length,
    };
    const newHistory = [entry, ...history].slice(0, 20);
    setHistory(newHistory);
    localStorage.setItem('dispatch_history', JSON.stringify(newHistory));

    setSending(false);
    setSent(true);
    setForm({ type: 'notification', audience: 'all', selected_users: [], title: '', message: '', coupon_code: '' });
    setTimeout(() => setSent(false), 3000);
  };

  const targetCount = getTargetProfiles().length;
  const inp = "w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30";

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="animate-spin text-primary" size={32} /></div>;

  return (
    <div className="space-y-6">
      {/* Compose */}
      <div className="bg-white rounded-2xl border border-border/50 p-5 space-y-4">
        <h3 className="font-heading font-semibold text-foreground">Nova mensagem</h3>

        {/* Type */}
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Tipo de disparo</p>
          <div className="flex gap-2">
            {DISPATCH_TYPES.map(t => (
              <button key={t.id} type="button" onClick={() => set('type', t.id)}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold border-2 transition-all ${
                  form.type === t.id ? 'bg-primary/10 border-primary text-primary' : 'border-gray-200 text-gray-600 hover:border-primary/30'
                }`}>
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Audience */}
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Público alvo</p>
          <select value={form.audience} onChange={e => set('audience', e.target.value)} className={inp}>
            {AUDIENCE_TYPES.map(a => <option key={a.id} value={a.id}>{a.label}</option>)}
          </select>
          {form.audience !== 'specific' && targetCount > 0 && (
            <p className="text-xs text-primary mt-1 font-medium flex items-center gap-1">
              <Users size={12} /> {targetCount} cliente(s) serão notificados
            </p>
          )}
        </div>

        {/* Specific user selection */}
        {form.audience === 'specific' && (
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Selecionar clientes ({form.selected_users.length} selecionado(s))
            </p>
            <div className="max-h-48 overflow-y-auto space-y-1 border border-gray-200 rounded-xl p-2">
              {profiles.map(p => (
                <label key={p.id} className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                  form.selected_users.includes(p.id) ? 'bg-primary/10' : 'hover:bg-gray-50'
                }`}>
                  <input type="checkbox" checked={form.selected_users.includes(p.id)} onChange={() => toggleUser(p.id)} className="accent-primary" />
                  <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary flex-shrink-0">
                    {p.photo_url ? <img src={p.photo_url} className="w-full h-full rounded-full object-cover" alt="" /> : (p.name || '?')[0]}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{p.name || 'Cliente'}</p>
                    <p className="text-xs text-gray-400 truncate">{p.email || p.phone}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Title */}
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Título</p>
          <input value={form.title} onChange={e => set('title', e.target.value)}
            placeholder="Ex: Oferta especial para você! 🎉" className={inp} />
        </div>

        {/* Message */}
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Mensagem</p>
          <textarea value={form.message} onChange={e => set('message', e.target.value)} rows={3}
            placeholder="Descreva a promoção, aviso ou cupom..."
            className={inp + ' resize-none'} />
        </div>

        {/* Coupon */}
        {form.type === 'coupon' && (
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Código do cupom</p>
            <select value={form.coupon_code} onChange={e => set('coupon_code', e.target.value)} className={inp}>
              <option value="">— Selecionar cupom existente —</option>
              {coupons.map(c => <option key={c.id} value={c.code}>{c.code} — {c.type === 'percentage' ? c.value + '% off' : 'R$ ' + c.value + ' off'}</option>)}
            </select>
            {coupons.length === 0 && (
              <p className="text-xs text-gray-400 mt-1">Crie cupons na aba "Promoções" primeiro</p>
            )}
          </div>
        )}

        <button onClick={handleSend} disabled={sending || !form.title || !form.message || (form.audience === 'specific' && form.selected_users.length === 0)}
          className={`w-full flex items-center justify-center gap-2 py-3 rounded-2xl font-bold text-sm transition-all disabled:opacity-40 ${
            sent ? 'bg-green-500 text-white' : 'bg-primary text-white hover:bg-primary/90'
          }`}>
          {sending ? <Loader2 size={16} className="animate-spin" /> : sent ? <Check size={16} /> : <Send size={16} />}
          {sending ? 'Enviando...' : sent ? `Enviado para ${targetCount} cliente(s)!` : `Enviar para ${targetCount} cliente(s)`}
        </button>
      </div>

      {/* History */}
      {history.length > 0 && (
        <div className="bg-white rounded-2xl border border-border/50 p-5 space-y-3">
          <h3 className="font-heading font-semibold text-foreground">Histórico de disparos</h3>
          <div className="space-y-2">
            {history.map(h => (
              <div key={h.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
                <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                  {h.type === 'coupon' ? <Tag size={14} className="text-primary" /> : <Bell size={14} className="text-primary" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800">{h.title}</p>
                  <p className="text-xs text-gray-500 truncate">{h.message}</p>
                  {h.coupon_code && <span className="text-xs text-primary font-mono font-bold">{h.coupon_code}</span>}
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-xs font-bold text-gray-700">{h.count} enviados</p>
                  <p className="text-[10px] text-gray-400">{new Date(h.date).toLocaleDateString('pt-BR')}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
