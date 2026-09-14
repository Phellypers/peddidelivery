import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Gift, ShoppingCart, Save, Loader2, ToggleLeft, ToggleRight, Radio } from 'lucide-react';

export default function AutomationTab() {
  const [store, setStore] = useState(null);
  const [birthday, setBirthday] = useState({ enabled: false, days_before: 3, title: '', message: '', discount_text: '' });
  const [abandoned, setAbandoned] = useState({ enabled: false, timeout_minutes: 30, message: 'Você deixou um item no carrinho. Finalize seu pedido antes que acabe.' });
  const [funnel, setFunnel] = useState({
    abandoned_cart_title: 'Carrinho abandonado 🛒',
    abandoned_cart_message: 'Olá {nome}! Notamos que você deixou itens no carrinho. Finalize seu pedido e aproveite!',
    auto_dispatch_enabled: false,
    dispatch_channels: ['app'],
    dispatch_before_expiry_hours: 20,
    whatsapp_template: '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    base44.entities.Store.list().then(stores => {
      const s = stores[0];
      setStore(s);
      if (s?.birthday_promo) setBirthday(prev => ({ ...prev, ...s.birthday_promo }));
      if (s?.abandoned_cart) setAbandoned(prev => ({ ...prev, ...s.abandoned_cart }));
      if (s?.funnel_automation) setFunnel(prev => ({ ...prev, ...s.funnel_automation }));
    });
  }, []);

  const save = async () => {
    setSaving(true);
    await base44.entities.Store.update(store.id, { birthday_promo: birthday, abandoned_cart: abandoned, funnel_automation: funnel });
    setSaving(false);
  };

  const inp = "w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30";
  const lbl = "block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide";

  return (
    <div className="space-y-6">
      <div className="bg-card rounded-2xl border border-border/50 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Gift size={18} className="text-pink-500" />
            <h2 className="font-heading font-semibold text-sm">Promoção de aniversário</h2>
          </div>
          <button onClick={() => setBirthday(p => ({ ...p, enabled: !p.enabled }))}>
            {birthday.enabled ? <ToggleRight size={26} className="text-green-500" /> : <ToggleLeft size={26} className="text-gray-300" />}
          </button>
        </div>
        {birthday.enabled && (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">O cliente recebe a notificação alguns dias antes do aniversário, se tiver a data cadastrada no perfil.</p>
            <div>
              <label className={lbl}>Dias antes do aniversário</label>
              <input type="number" min="0" max="30" value={birthday.days_before} onChange={e => setBirthday(p => ({ ...p, days_before: parseInt(e.target.value) || 0 }))} className={inp} />
            </div>
            <div>
              <label className={lbl}>Título da notificação</label>
              <input value={birthday.title} onChange={e => setBirthday(p => ({ ...p, title: e.target.value }))} placeholder="🎁 Oferta especial de aniversário!" className={inp} />
            </div>
            <div>
              <label className={lbl}>Mensagem</label>
              <textarea value={birthday.message} onChange={e => setBirthday(p => ({ ...p, message: e.target.value }))} rows={2} placeholder="Estamos quase no seu aniversário! Ganhe 15% OFF em todo o cardápio." className={inp + ' resize-none'} />
            </div>
          </div>
        )}
      </div>

      <div className="bg-card rounded-2xl border border-border/50 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingCart size={18} className="text-orange-500" />
            <h2 className="font-heading font-semibold text-sm">Carrinho abandonado</h2>
          </div>
          <button onClick={() => setAbandoned(p => ({ ...p, enabled: !p.enabled }))}>
            {abandoned.enabled ? <ToggleRight size={26} className="text-green-500" /> : <ToggleLeft size={26} className="text-gray-300" />}
          </button>
        </div>
        {abandoned.enabled && (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">Cliente logado com itens no carrinho recebe notificação automática após o tempo definido sem finalizar a compra.</p>
            <div>
              <label className={lbl}>Tempo para notificar</label>
              <select value={abandoned.timeout_minutes} onChange={e => setAbandoned(p => ({ ...p, timeout_minutes: parseInt(e.target.value) }))} className={inp}>
                <option value={30}>30 minutos</option>
                <option value={60}>1 hora</option>
                <option value={1440}>24 horas</option>
              </select>
            </div>
            <div>
              <label className={lbl}>Mensagem da notificação automática</label>
              <textarea value={abandoned.message} onChange={e => setAbandoned(p => ({ ...p, message: e.target.value }))} rows={2} className={inp + ' resize-none'} />
            </div>
          </div>
        )}
      </div>

      {/* Automação do Funil */}
      <div className="bg-card rounded-2xl border border-border/50 p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Radio size={18} className="text-primary" />
          <h2 className="font-heading font-semibold text-sm">Automação do Funil</h2>
        </div>
        <p className="text-xs text-muted-foreground">Modelos de mensagem usados quando o gestor envia uma recuperação manualmente pelo Funil de Vendas ao Vivo (Dashboard).</p>
        <div className="space-y-3">
          <div>
            <label className={lbl}>Título — Abandono de carrinho</label>
            <input value={funnel.abandoned_cart_title} onChange={e => setFunnel(p => ({ ...p, abandoned_cart_title: e.target.value }))} placeholder="Carrinho abandonado 🛒" className={inp} />
          </div>
          <div>
            <label className={lbl}>Mensagem — Abandono de carrinho</label>
            <textarea value={funnel.abandoned_cart_message} onChange={e => setFunnel(p => ({ ...p, abandoned_cart_message: e.target.value }))} rows={3} placeholder="Olá {nome}! Notamos que você deixou itens no carrinho..." className={inp + ' resize-none'} />
            <p className="text-[10px] text-gray-400 mt-1">Use <code className="bg-gray-100 px-1 rounded">{`{nome}`}</code> para personalizar com o primeiro nome do cliente.</p>
          </div>

          {/* Auto-dispatch config */}
          <div className="border-t border-border/50 pt-3 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-foreground">Disparo automático multicanal</p>
                <p className="text-xs text-muted-foreground">Envia a mensagem automaticamente antes do registro expirar do funil</p>
              </div>
              <button onClick={() => setFunnel(p => ({ ...p, auto_dispatch_enabled: !p.auto_dispatch_enabled }))}>
                {funnel.auto_dispatch_enabled ? <ToggleRight size={26} className="text-green-500" /> : <ToggleLeft size={26} className="text-gray-300" />}
              </button>
            </div>
            {funnel.auto_dispatch_enabled && (
              <div className="space-y-3">
                <div>
                  <label className={lbl}>Disparar antes de expirar (horas)</label>
                  <input type="number" min="1" max="23" value={funnel.dispatch_before_expiry_hours} onChange={e => setFunnel(p => ({ ...p, dispatch_before_expiry_hours: parseInt(e.target.value) || 20 }))} className={inp} />
                  <p className="text-[10px] text-gray-400 mt-1">O registro fica no funil por 24h. O disparo ocorre X horas antes de expirar.</p>
                </div>
                <div>
                  <label className={lbl}>Canais de disparo</label>
                  <div className="flex gap-2">
                    {[
                      { id: 'app', label: '🔔 Notificação no app' },
                      { id: 'whatsapp', label: '📱 WhatsApp' },
                    ].map(ch => (
                      <button key={ch.id} type="button" onClick={() => {
                        const channels = funnel.dispatch_channels || [];
                        setFunnel(p => ({ ...p, dispatch_channels: channels.includes(ch.id) ? channels.filter(x => x !== ch.id) : [...channels, ch.id] }));
                      }} className={`flex-1 py-2.5 rounded-xl text-xs font-semibold border-2 transition-all ${(funnel.dispatch_channels || []).includes(ch.id) ? 'bg-primary/10 border-primary text-primary' : 'border-gray-200 text-gray-600'}`}>
                        {ch.label}
                      </button>
                    ))}
                  </div>
                </div>
                {(funnel.dispatch_channels || []).includes('whatsapp') && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                    <p className="text-xs text-amber-700 leading-relaxed">🚧 A integração com a API do WhatsApp será conectada futuramente. A estrutura do disparo multicanal já está pronta — basta conectar o gateway para ativar o envio automático sem refazer a automação.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <button onClick={save} disabled={saving || !store} className="w-full flex items-center justify-center gap-2 py-3 bg-primary text-white rounded-xl font-bold text-sm hover:bg-primary/90 transition-colors disabled:opacity-50">
        {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
        {saving ? 'Salvando...' : 'Salvar automações'}
      </button>
    </div>
  );
}