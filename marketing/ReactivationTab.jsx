import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { sendWhatsAppMessage, isWhatsAppConfigured } from '@/lib/whatsappDispatch';
import { UserCheck, Send, Loader2, Plus, Trash2, Edit2, Save, X, Users, Clock, Bell, Smartphone, Check, AlertCircle } from 'lucide-react';

const INACTIVE_PRESETS = [15, 30, 60, 90];
const CHANNELS = [
  { id: 'app', label: '🔔 Notificação no app', icon: Bell },
  { id: 'whatsapp', label: '📱 WhatsApp', icon: Smartphone },
  { id: 'push', label: '📲 Push (celular)', icon: Smartphone },
];

export default function ReactivationTab() {
  const [profiles, setProfiles] = useState([]);
  const [orders, setOrders] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editCampaign, setEditCampaign] = useState(null);
  const [saving, setSaving] = useState(false);
  const [dispatching, setDispatching] = useState(null);
  const [dispatchResult, setDispatchResult] = useState(null);
  const [filterDays, setFilterDays] = useState(30);
  const [customDays, setCustomDays] = useState('');

  const [form, setForm] = useState({
    name: '', title: 'Sentimos sua falta! 👋', message: '',
    coupon_code: '', inactive_days: 30, channels: ['app', 'push'], is_active: true,
  });

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  useEffect(() => {
    Promise.all([
      base44.entities.CustomerProfile.list('-total_orders'),
      base44.entities.Order.list('-created_date', 500),
      base44.entities.ReactivationCampaign.list('-created_date'),
      base44.entities.Coupon.filter({ is_active: true }, 'code'),
    ]).then(([p, o, c, cups]) => {
      setProfiles(p);
      setOrders(o);
      setCampaigns(c);
      setCoupons(cups);
      setLoading(false);
    });
  }, []);

  const getInactiveCustomers = (days) => {
    const threshold = Date.now() - days * 24 * 60 * 60 * 1000;
    return profiles.filter(p => {
      const custOrders = orders.filter(o => o.customer_email === p.email);
      if (custOrders.length === 0) return false;
      const lastOrder = new Date(custOrders[0].created_date);
      return lastOrder < threshold;
    });
  };

  const activeFilterDays = customDays ? parseInt(customDays) : filterDays;
  const inactiveCustomers = getInactiveCustomers(activeFilterDays);

  const toggleChannel = (ch) => {
    set('channels', (form.channels || []).includes(ch)
      ? (form.channels || []).filter(x => x !== ch)
      : [...(form.channels || []), ch]);
  };

  const saveCampaign = async () => {
    setSaving(true);
    const data = { ...form, inactive_days: parseInt(form.inactive_days) || 30 };
    if (editCampaign) await base44.entities.ReactivationCampaign.update(editCampaign.id, data);
    else await base44.entities.ReactivationCampaign.create(data);
    setSaving(false);
    setShowForm(false);
    setEditCampaign(null);
    setForm({ name: '', title: 'Sentimos sua falta! 👋', message: '', coupon_code: '', inactive_days: 30, channels: ['app', 'push'], is_active: true });
    base44.entities.ReactivationCampaign.list('-created_date').then(setCampaigns);
  };

  const startEdit = (c) => {
    setEditCampaign(c);
    setForm({
      name: c.name, title: c.title || '', message: c.message, coupon_code: c.coupon_code || '',
      inactive_days: c.inactive_days || 30, channels: c.channels || ['app'], is_active: c.is_active !== false,
    });
    setShowForm(true);
  };

  const dispatchCampaign = async (campaign) => {
    setDispatching(campaign.id);
    const targets = getInactiveCustomers(campaign.inactive_days || 30);
    let sentApp = 0;
    let sentWhatsapp = 0;
    let sentPush = 0;

    for (const p of targets) {
      try {
        let message = campaign.message || '';
        if (p.name) message = message.replace(/{nome}/g, p.name.split(' ')[0]);
        if (campaign.coupon_code) message += `\nCupom: ${campaign.coupon_code}`;

        const channels = campaign.channels || ['app'];

        if (channels.includes('app') && p.user_id && !p.user_id.startsWith('manual_')) {
          await base44.entities.Notification.create({
            user_id: p.user_id,
            type: 'order_status',
            title: campaign.title || 'Campanha de reativação',
            message,
            is_read: false,
          });
          sentApp++;
        }

        if (channels.includes('whatsapp') && p.phone) {
          const res = await sendWhatsAppMessage(p.phone, message);
          if (res?.success) sentWhatsapp++;
        }

        // Push notification structure — requires a backend function (asServiceRole)
        // to call SendPushNotification server-side. When a backend function is added,
        // uncomment the call below to send native push to mobile app users.
        // if (channels.includes('push') && p.user_id && !p.user_id.startsWith('manual_')) {
        //   await base44.asServiceRole.integrations.Core.SendPushNotification({
        //     user_id: p.user_id, title: campaign.title, content: message,
        //     action_url: '/loja', action_label: 'Ver cardápio'
        //   });
        //   sentPush++;
        // }
      } catch (_) {}
    }

    await base44.entities.ReactivationCampaign.update(campaign.id, {
      last_sent_at: new Date().toISOString(),
      target_count: sentApp + sentWhatsapp + sentPush,
    });
    setDispatching(null);
    setDispatchResult({ campaignId: campaign.id, sentApp, sentWhatsapp, sentPush, total: targets.length });
    base44.entities.ReactivationCampaign.list('-created_date').then(setCampaigns);
    setTimeout(() => setDispatchResult(null), 5000);
  };

  const inp = "w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30";
  const lbl = "block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide";

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="animate-spin text-primary" size={32} /></div>;

  return (
    <div className="space-y-6">
      {/* Inactive customers overview */}
      <div className="bg-card rounded-2xl border border-border/50 p-5 space-y-4">
        <div className="flex items-center gap-2">
          <UserCheck size={18} className="text-primary" />
          <h2 className="font-heading font-semibold text-sm">Clientes Inativos</h2>
        </div>

        <div className="flex flex-wrap gap-2">
          {INACTIVE_PRESETS.map(d => (
            <button key={d} onClick={() => { setFilterDays(d); setCustomDays(''); }}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${!customDays && filterDays === d ? 'bg-primary text-white' : 'bg-muted text-muted-foreground hover:bg-accent'}`}>
              {d} dias
            </button>
          ))}
          <div className="flex items-center gap-1">
            <input type="number" min="1" value={customDays} onChange={e => setCustomDays(e.target.value)} placeholder="Personalizado" className="w-24 px-2 py-1.5 bg-muted rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-primary/20" />
            <span className="text-xs text-muted-foreground">dias</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-orange-50 rounded-xl p-4 text-center">
            <p className="font-heading font-bold text-2xl text-orange-700">{inactiveCustomers.length}</p>
            <p className="text-xs text-orange-600 mt-0.5">sem comprar há {activeFilterDays}+ dias</p>
          </div>
          <div className="bg-blue-50 rounded-xl p-4 text-center">
            <p className="font-heading font-bold text-2xl text-blue-700">{inactiveCustomers.filter(c => c.user_id && !c.user_id.startsWith('manual_')).length}</p>
            <p className="text-xs text-blue-600 mt-0.5">com app (notificáveis)</p>
          </div>
        </div>

        {inactiveCustomers.length > 0 && (
          <div className="max-h-40 overflow-y-auto space-y-1">
            {inactiveCustomers.slice(0, 20).map(c => {
              const custOrders = orders.filter(o => o.customer_email === c.email);
              const lastOrder = custOrders[0]?.created_date ? new Date(custOrders[0].created_date) : null;
              const daysAgo = lastOrder ? Math.floor((Date.now() - lastOrder) / (24 * 60 * 60 * 1000)) : '—';
              return (
                <div key={c.id} className="flex items-center justify-between px-3 py-2 bg-muted/40 rounded-lg text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary">{(c.name || '?')[0]}</div>
                    <span className="font-medium">{c.name || c.email}</span>
                  </div>
                  <span className="text-muted-foreground flex items-center gap-1"><Clock size={10} /> {daysAgo}d</span>
                </div>
              );
            })}
            {inactiveCustomers.length > 20 && <p className="text-center text-[10px] text-muted-foreground py-1">+{inactiveCustomers.length - 20} outros</p>}
          </div>
        )}
      </div>

      {/* Push notification info */}
      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex items-start gap-3">
        <AlertCircle size={18} className="text-blue-600 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-blue-800">Notificações Push no celular</p>
          <p className="text-xs text-blue-700 mt-0.5 leading-relaxed">
            O disparo push (quando o app está fechado) exige uma função backend (asServiceRole) para chamar a integração SendPushNotification. A estrutura já está pronta no código — basta adicionar a função backend quando o plano permitir.
          </p>
        </div>
      </div>

      {/* Campaign creation */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{campaigns.length} campanha(s) de reativação</p>
        <button onClick={() => { setShowForm(v => !v); setEditCampaign(null); setForm({ name: '', title: 'Sentimos sua falta! 👋', message: '', coupon_code: '', inactive_days: 30, channels: ['app', 'push'], is_active: true }); }}
          className="flex items-center gap-1.5 px-3 py-2 bg-primary text-white rounded-xl text-sm font-bold">
          <Plus size={15} /> Nova campanha
        </button>
      </div>

      {showForm && (
        <div className="bg-muted/50 rounded-2xl p-5 space-y-3 border border-border">
          <input value={form.name} onChange={e => set('name', e.target.value)} placeholder="Nome da campanha *" className={inp} />
          <input value={form.title} onChange={e => set('title', e.target.value)} placeholder="Título da notificação" className={inp} />
          <textarea value={form.message} onChange={e => set('message', e.target.value)} rows={3} placeholder="Mensagem para o cliente... Use {nome} para personalizar" className={inp + ' resize-none'} />

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl}>Inatividade (dias)</label>
              <select value={form.inactive_days} onChange={e => set('inactive_days', e.target.value)} className={inp}>
                {INACTIVE_PRESETS.map(d => <option key={d} value={d}>{d} dias</option>)}
                <option value={customDays || 45}>Personalizado ({customDays || 45})</option>
              </select>
            </div>
            <div>
              <label className={lbl}>Cupom (opcional)</label>
              <select value={form.coupon_code} onChange={e => set('coupon_code', e.target.value)} className={inp}>
                <option value="">— Nenhum —</option>
                {coupons.map(c => <option key={c.id} value={c.code}>{c.code}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className={lbl}>Canais de disparo</label>
            <div className="flex flex-wrap gap-2">
              {CHANNELS.map(ch => (
                <button key={ch.id} type="button" onClick={() => toggleChannel(ch.id)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border-2 transition-all ${(form.channels || []).includes(ch.id) ? 'bg-primary/10 border-primary text-primary' : 'border-gray-200 text-gray-600'}`}>
                  {ch.label}
                </button>
              ))}
            </div>
            {(form.channels || []).includes('whatsapp') && !isWhatsAppConfigured() && (
              <p className="text-[10px] text-amber-600 mt-1">🚧 WhatsApp: estrutura pronta, aguardando conexão da API</p>
            )}
          </div>

          <div className="flex gap-2 pt-1">
            <button onClick={saveCampaign} disabled={saving || !form.name || !form.message} className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-primary text-white rounded-xl text-sm font-bold disabled:opacity-50">
              {saving ? <Loader2 size={15} className="animate-spin" /> : <><Save size={15} /> Salvar</>}
            </button>
            <button onClick={() => { setShowForm(false); setEditCampaign(null); }} className="px-4 py-2.5 bg-muted rounded-xl text-sm"><X size={15} /></button>
          </div>
        </div>
      )}

      {/* Campaign list */}
      <div className="space-y-3">
        {campaigns.map(c => {
          const targetCount = getInactiveCustomers(c.inactive_days || 30).length;
          const isDispatching = dispatching === c.id;
          const result = dispatchResult?.campaignId === c.id;
          return (
            <div key={c.id} className="bg-card rounded-2xl border border-border/50 p-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-foreground">{c.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">{c.message}</p>
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    <span className="text-[10px] bg-orange-50 text-orange-600 px-2 py-0.5 rounded-full font-medium">{c.inactive_days || 30}+ dias</span>
                    {(c.channels || []).map(ch => (
                      <span key={ch} className="text-[10px] bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                        {ch === 'app' ? '🔔 App' : ch === 'whatsapp' ? '📱 WhatsApp' : '📲 Push'}
                      </span>
                    ))}
                    {c.coupon_code && <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-mono font-bold">{c.coupon_code}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button onClick={() => startEdit(c)} className="p-1.5 hover:bg-accent rounded-lg"><Edit2 size={15} className="text-muted-foreground" /></button>
                  <button onClick={() => base44.entities.ReactivationCampaign.delete(c.id).then(() => base44.entities.ReactivationCampaign.list('-created_date').then(setCampaigns))} className="p-1.5 hover:bg-destructive/10 rounded-lg"><Trash2 size={15} className="text-destructive" /></button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="text-xs text-muted-foreground">
                  {c.last_sent_at ? (
                    <span>Último disparo: {new Date(c.last_sent_at).toLocaleDateString('pt-BR')} · {c.target_count || 0} enviados</span>
                  ) : (
                    <span>Nunca disparada</span>
                  )}
                </div>
                <button onClick={() => dispatchCampaign(c)} disabled={isDispatching || targetCount === 0}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white rounded-xl text-xs font-bold disabled:opacity-50">
                  {isDispatching ? <Loader2 size={12} className="animate-spin" /> : result ? <Check size={12} /> : <Send size={12} />}
                  {isDispatching ? 'Enviando...' : result ? 'Enviado!' : `Disparar (${targetCount})`}
                </button>
              </div>
            </div>
          );
        })}
        {campaigns.length === 0 && !showForm && (
          <div className="text-center py-12 text-muted-foreground text-sm">
            <UserCheck size={32} className="mx-auto mb-3 opacity-30" />
            Nenhuma campanha de reativação criada ainda
          </div>
        )}
      </div>
    </div>
  );
}