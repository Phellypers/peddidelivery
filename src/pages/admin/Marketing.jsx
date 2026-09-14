import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Megaphone, Gift, ShoppingBag, ToggleLeft, ToggleRight, Plus, Trash2, Edit2, Save, X, Loader2, ChevronDown, ChevronUp, Send, Check, Award, Zap, UserCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import MarketingDispatch from '@/components/admin/MarketingDispatch';
import FidelityTab from '@/components/admin/marketing/FidelityTab';
import AutomationTab from '@/components/admin/marketing/AutomationTab';
import ReactivationTab from '@/components/admin/marketing/ReactivationTab';

// ─── Tab: Campanhas ───────────────────────────────────────────────────────────
function CampaignRow({ campaign, onToggle, onDelete, onEdit }) {
  const typeLabel = { cart_value: '🛒 Por valor de carrinho', order_count: '📦 Por qtd. de pedidos', buy_x_get_y: '🎁 Compre X e ganhe Y' };
  return (
    <div className="flex items-center gap-3 p-4 bg-card rounded-2xl border border-border/50">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-semibold text-sm text-foreground">{campaign.name}</p>
          <span className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{typeLabel[campaign.type]}</span>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">
          {campaign.type === 'cart_value' && `Carrinho ≥ R$ ${campaign.min_cart_value?.toFixed(2)} → ${campaign.discount_type === 'percentage' ? campaign.discount_value + '%' : 'R$ ' + campaign.discount_value?.toFixed(2)} off`}
          {campaign.type === 'order_count' && `A partir do ${campaign.min_order_count}º pedido → ${campaign.discount_type === 'percentage' ? campaign.discount_value + '%' : 'R$ ' + campaign.discount_value?.toFixed(2)} off`}
          {campaign.type === 'buy_x_get_y' && `Compre ${campaign.buy_quantity} ganhe ${campaign.get_quantity}`}
        </p>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <button onClick={() => onToggle(campaign)} title={campaign.is_active ? 'Desativar' : 'Ativar'}>
          {campaign.is_active
            ? <ToggleRight size={26} className="text-green-500" />
            : <ToggleLeft size={26} className="text-gray-300" />}
        </button>
        <button onClick={() => onEdit(campaign)} className="p-1.5 hover:bg-accent rounded-lg transition-colors"><Edit2 size={15} className="text-muted-foreground" /></button>
        <button onClick={() => onDelete(campaign.id)} className="p-1.5 hover:bg-destructive/10 rounded-lg transition-colors"><Trash2 size={15} className="text-destructive" /></button>
      </div>
    </div>
  );
}

function CampaignForm({ initial, onSave, onCancel, saving }) {
  const [form, setForm] = useState(initial || { name: '', type: 'cart_value', is_active: true, discount_type: 'percentage', discount_value: 10, min_cart_value: 50, min_order_count: 10, buy_quantity: 10, get_quantity: 1, description: '' });
  const u = (k, v) => setForm(p => ({ ...p, [k]: v }));
  return (
    <div className="bg-muted/50 rounded-2xl p-5 space-y-3 border border-border">
      <input value={form.name} onChange={e => u('name', e.target.value)} placeholder="Nome da campanha *" className="w-full px-3 py-2.5 bg-white rounded-xl text-sm border border-border/50 focus:outline-none focus:ring-2 focus:ring-primary/20" />
      <select value={form.type} onChange={e => u('type', e.target.value)} className="w-full px-3 py-2.5 bg-white rounded-xl text-sm border border-border/50 focus:outline-none focus:ring-2 focus:ring-primary/20">
        <option value="cart_value">🛒 Desconto por valor de carrinho</option>
        <option value="order_count">📦 Desconto por qtd. de pedidos</option>
        <option value="buy_x_get_y">🎁 Compre X e ganhe Y</option>
      </select>

      {form.type !== 'buy_x_get_y' && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Tipo de desconto</label>
            <select value={form.discount_type} onChange={e => u('discount_type', e.target.value)} className="w-full px-3 py-2.5 bg-white rounded-xl text-sm border border-border/50 focus:outline-none focus:ring-2 focus:ring-primary/20">
              <option value="percentage">Percentual (%)</option>
              <option value="fixed">Fixo (R$)</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Valor do desconto</label>
            <input type="number" value={form.discount_value} onChange={e => u('discount_value', parseFloat(e.target.value))} className="w-full px-3 py-2.5 bg-white rounded-xl text-sm border border-border/50 focus:outline-none focus:ring-2 focus:ring-primary/20" />
          </div>
        </div>
      )}

      {form.type === 'cart_value' && (
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Valor mínimo do carrinho (R$)</label>
          <input type="number" value={form.min_cart_value} onChange={e => u('min_cart_value', parseFloat(e.target.value))} className="w-full px-3 py-2.5 bg-white rounded-xl text-sm border border-border/50 focus:outline-none focus:ring-2 focus:ring-primary/20" />
        </div>
      )}
      {form.type === 'order_count' && (
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">A partir do Nº de pedido</label>
          <input type="number" value={form.min_order_count} onChange={e => u('min_order_count', parseInt(e.target.value))} className="w-full px-3 py-2.5 bg-white rounded-xl text-sm border border-border/50 focus:outline-none focus:ring-2 focus:ring-primary/20" />
        </div>
      )}
      {form.type === 'buy_x_get_y' && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Compre (qtd.)</label>
            <input type="number" value={form.buy_quantity} onChange={e => u('buy_quantity', parseInt(e.target.value))} className="w-full px-3 py-2.5 bg-white rounded-xl text-sm border border-border/50 focus:outline-none focus:ring-2 focus:ring-primary/20" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Ganhe (qtd.)</label>
            <input type="number" value={form.get_quantity} onChange={e => u('get_quantity', parseInt(e.target.value))} className="w-full px-3 py-2.5 bg-white rounded-xl text-sm border border-border/50 focus:outline-none focus:ring-2 focus:ring-primary/20" />
          </div>
        </div>
      )}

      <input value={form.description} onChange={e => u('description', e.target.value)} placeholder="Descrição interna (opcional)" className="w-full px-3 py-2.5 bg-white rounded-xl text-sm border border-border/50 focus:outline-none focus:ring-2 focus:ring-primary/20" />

      <div className="flex gap-2 pt-1">
        <button onClick={() => onSave(form)} disabled={saving || !form.name} className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-primary text-white rounded-xl text-sm font-bold disabled:opacity-50">
          {saving ? <Loader2 size={15} className="animate-spin" /> : <><Save size={15} /> Salvar</>}
        </button>
        <button onClick={onCancel} className="px-4 py-2.5 bg-muted rounded-xl text-sm font-medium"><X size={15} /></button>
      </div>
    </div>
  );
}

// ─── Tab: Upsell ──────────────────────────────────────────────────────────────
function UpsellTab({ products }) {
  const [groups, setGroups] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editGroup, setEditGroup] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ title: '', is_active: true, product_ids: [] });

  const load = () => base44.entities.UpsellGroup.list('sort_order').then(setGroups);
  useEffect(() => { load(); }, []);

  const save = async () => {
    setSaving(true);
    if (editGroup) await base44.entities.UpsellGroup.update(editGroup.id, form);
    else await base44.entities.UpsellGroup.create(form);
    setSaving(false); setShowForm(false); setEditGroup(null);
    setForm({ title: '', is_active: true, product_ids: [] });
    load();
  };

  const toggleProduct = (pid) => setForm(p => ({
    ...p,
    product_ids: p.product_ids.includes(pid) ? p.product_ids.filter(x => x !== pid) : [...p.product_ids, pid]
  }));

  const startEdit = (g) => { setEditGroup(g); setForm({ title: g.title, is_active: g.is_active, product_ids: g.product_ids || [] }); setShowForm(true); };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Grupos de produtos sugeridos no checkout</p>
        <button onClick={() => { setShowForm(true); setEditGroup(null); setForm({ title: '', is_active: true, product_ids: [] }); }} className="flex items-center gap-1.5 px-3 py-2 bg-primary text-white rounded-xl text-sm font-bold">
          <Plus size={15} /> Novo grupo
        </button>
      </div>

      {showForm && (
        <div className="bg-muted/50 rounded-2xl p-5 space-y-3 border border-border">
          <input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder='Título ex: "Adicione uma bebida 🍹"' className="w-full px-3 py-2.5 bg-white rounded-xl text-sm border border-border/50 focus:outline-none focus:ring-2 focus:ring-primary/20" />
          <div>
            <label className="text-xs text-muted-foreground mb-2 block">Selecione os produtos</label>
            <div className="grid grid-cols-1 gap-1.5 max-h-48 overflow-y-auto">
              {products.map(p => (
                <div key={p.id} onClick={() => toggleProduct(p.id)} className={`flex items-center gap-2 px-3 py-2 rounded-xl cursor-pointer text-sm transition-colors ${form.product_ids.includes(p.id) ? 'bg-primary/10 border border-primary' : 'bg-white border border-border/50 hover:bg-accent/50'}`}>
                  <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 ${form.product_ids.includes(p.id) ? 'bg-primary border-primary' : 'border-gray-300'}`}>
                    {form.product_ids.includes(p.id) && <Check size={12} className="text-white" />}
                  </div>
                  {p.images?.[0] && <img src={p.images[0]} className="w-8 h-8 rounded-lg object-cover flex-shrink-0" alt="" />}
                  <span className="truncate font-medium">{p.name}</span>
                  <span className="ml-auto text-muted-foreground text-xs flex-shrink-0">R$ {(p.promo_price || p.price)?.toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={save} disabled={saving || !form.title || form.product_ids.length === 0} className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-primary text-white rounded-xl text-sm font-bold disabled:opacity-50">
              {saving ? <Loader2 size={15} className="animate-spin" /> : <><Save size={15} /> Salvar</>}
            </button>
            <button onClick={() => { setShowForm(false); setEditGroup(null); }} className="px-4 py-2.5 bg-muted rounded-xl text-sm"><X size={15} /></button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {groups.map(g => (
          <div key={g.id} className="bg-card rounded-2xl border border-border/50 p-4 flex items-center gap-3">
            <div className="flex-1">
              <p className="font-semibold text-sm">{g.title}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{g.product_ids?.length || 0} produto(s)</p>
            </div>
            <button onClick={() => base44.entities.UpsellGroup.update(g.id, { is_active: !g.is_active }).then(load)}>
              {g.is_active ? <ToggleRight size={26} className="text-green-500" /> : <ToggleLeft size={26} className="text-gray-300" />}
            </button>
            <button onClick={() => startEdit(g)} className="p-1.5 hover:bg-accent rounded-lg"><Edit2 size={15} className="text-muted-foreground" /></button>
            <button onClick={() => base44.entities.UpsellGroup.delete(g.id).then(load)} className="p-1.5 hover:bg-destructive/10 rounded-lg"><Trash2 size={15} className="text-destructive" /></button>
          </div>
        ))}
        {groups.length === 0 && !showForm && (
          <p className="text-center text-sm text-muted-foreground py-8">Nenhum grupo criado ainda</p>
        )}
      </div>
    </div>
  );
}

// ─── Tab: WhatsApp ────────────────────────────────────────────────────────────
function WhatsAppTab() {
  const statuses = [
    { key: 'pending', label: '⏳ Pedido recebido', example: 'Olá {nome}! Recebemos seu pedido #{numero}. Em breve confirmaremos.' },
    { key: 'confirmed', label: '✅ Pedido confirmado', example: 'Olá {nome}! Seu pedido #{numero} foi confirmado e está sendo preparado.' },
    { key: 'preparing', label: '👨‍🍳 Em preparo', example: 'Boa notícia, {nome}! Seu pedido #{numero} está sendo preparado.' },
    { key: 'shipped', label: '🛵 Saiu para entrega', example: 'Seu pedido #{numero} saiu para entrega! Aguarde em {endereco}.' },
    { key: 'delivered', label: '🎉 Entregue', example: 'Pedido #{numero} entregue! Obrigado pela preferência, {nome}.' },
    { key: 'cancelled', label: '❌ Cancelado', example: 'Seu pedido #{numero} foi cancelado. Entre em contato conosco.' },
  ];
  const [expanded, setExpanded] = useState(null);

  return (
    <div className="space-y-4">
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
        <p className="text-sm font-bold text-amber-800 mb-1">🚧 Integração futura</p>
        <p className="text-xs text-amber-700 leading-relaxed">
          O disparo automático de WhatsApp por status de pedido está planejado. Quando disponível, cada mensagem abaixo será enviada automaticamente ao número do cliente.
          <br /><br />
          Enquanto isso, use o <strong>número de WhatsApp da loja</strong> nas configurações para que o botão flutuante redirecione clientes.
        </p>
      </div>

      <div className="space-y-2">
        {statuses.map(s => (
          <div key={s.key} className="bg-card rounded-2xl border border-border/50 overflow-hidden">
            <button onClick={() => setExpanded(expanded === s.key ? null : s.key)} className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-accent/30 transition-colors">
              <span className="text-sm font-medium">{s.label}</span>
              {expanded === s.key ? <ChevronUp size={16} className="text-muted-foreground" /> : <ChevronDown size={16} className="text-muted-foreground" />}
            </button>
            <AnimatePresence>
              {expanded === s.key && (
                <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
                  <div className="px-4 pb-4 border-t border-border/50 pt-3">
                    <p className="text-xs text-muted-foreground mb-2">Mensagem modelo (editável quando a integração estiver ativa):</p>
                    <div className="bg-green-50 border border-green-200 rounded-xl p-3">
                      <p className="text-xs text-green-800 font-mono leading-relaxed">{s.example}</p>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-2">Variáveis: {'{nome}'}, {'{numero}'}, {'{endereco}'}, {'{total}'}</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Tab: Banner Header ──────────────────────────────────────────────────────────
function PromoBannerTab() {
  const [messages, setMessages] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editMsg, setEditMsg] = useState(null);
  const [form, setForm] = useState({ text: '', is_active: true, start_date: '', end_date: '', sort_order: 0 });

  const load = () => base44.entities.PromoMessage.list('sort_order').then(setMessages);
  useEffect(() => { load(); }, []);

  const save = async () => {
    if (editMsg) await base44.entities.PromoMessage.update(editMsg.id, form);
    else await base44.entities.PromoMessage.create(form);
    setShowForm(false); setEditMsg(null);
    setForm({ text: '', is_active: true, start_date: '', end_date: '', sort_order: 0 });
    load();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Mensagens rotativas no topo do cardápio</p>
        <button onClick={() => { setShowForm(true); setEditMsg(null); setForm({ text: '', is_active: true, start_date: '', end_date: '', sort_order: 0 }); }} className="flex items-center gap-1.5 px-3 py-2 bg-primary text-white rounded-xl text-sm font-bold">
          <Plus size={15} /> Nova mensagem
        </button>
      </div>

      {showForm && (
        <div className="bg-muted/50 rounded-2xl p-5 space-y-3 border border-border">
          <textarea value={form.text} onChange={e => setForm(p => ({ ...p, text: e.target.value }))} placeholder="Texto da mensagem promocional *" rows={2} className="w-full px-3 py-2.5 bg-white rounded-xl text-sm border border-border/50 focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none" />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Início (opcional)</label>
              <input type="date" value={form.start_date || ''} onChange={e => setForm(p => ({ ...p, start_date: e.target.value }))} className="w-full px-3 py-2.5 bg-white rounded-xl text-sm border border-border/50 focus:outline-none focus:ring-2 focus:ring-primary/20" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Fim (opcional)</label>
              <input type="date" value={form.end_date || ''} onChange={e => setForm(p => ({ ...p, end_date: e.target.value }))} className="w-full px-3 py-2.5 bg-white rounded-xl text-sm border border-border/50 focus:outline-none focus:ring-2 focus:ring-primary/20" />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={save} disabled={!form.text} className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-primary text-white rounded-xl text-sm font-bold disabled:opacity-50">
              <Save size={15} /> Salvar
            </button>
            <button onClick={() => { setShowForm(false); setEditMsg(null); }} className="px-4 py-2.5 bg-muted rounded-xl text-sm"><X size={15} /></button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {messages.map(m => (
          <div key={m.id} className="bg-card rounded-2xl border border-border/50 p-4 flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{m.text}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {m.start_date && `De ${new Date(m.start_date).toLocaleDateString('pt-BR')}`}
                {m.start_date && m.end_date && ' '}
                {m.end_date && `até ${new Date(m.end_date).toLocaleDateString('pt-BR')}`}
                {!m.start_date && !m.end_date && 'Sem prazo definido'}
              </p>
            </div>
            <button onClick={() => base44.entities.PromoMessage.update(m.id, { is_active: !m.is_active }).then(load)}>
              {m.is_active ? <ToggleRight size={26} className="text-green-500" /> : <ToggleLeft size={26} className="text-gray-300" />}
            </button>
            <button onClick={() => { setEditMsg(m); setForm({ text: m.text, is_active: m.is_active, start_date: m.start_date || '', end_date: m.end_date || '', sort_order: m.sort_order || 0 }); setShowForm(true); }} className="p-1.5 hover:bg-accent rounded-lg">
              <Edit2 size={15} className="text-muted-foreground" />
            </button>
            <button onClick={() => base44.entities.PromoMessage.delete(m.id).then(load)} className="p-1.5 hover:bg-destructive/10 rounded-lg">
              <Trash2 size={15} className="text-destructive" />
            </button>
          </div>
        ))}
        {messages.length === 0 && !showForm && (
          <p className="text-center text-sm text-muted-foreground py-8">Nenhuma mensagem criada ainda</p>
        )}
      </div>
    </div>
  );
}

// ─── Main Marketing Page ──────────────────────────────────────────────────────
const TABS = [
  { id: 'campaigns', label: 'Campanhas', icon: Gift },
  { id: 'dispatch', label: 'Disparos', icon: Send },
  { id: 'reactivation', label: 'Reativação', icon: UserCheck },
  { id: 'upsell', label: 'Upsell/Cross-sell', icon: ShoppingBag },
  { id: 'banners', label: 'Banner Header', icon: Megaphone },
  { id: 'fidelity', label: 'Fidelidade', icon: Award },
  { id: 'automation', label: 'Automações', icon: Zap },
  { id: 'whatsapp', label: 'WhatsApp', icon: Megaphone },
];

export default function Marketing() {
  const [tab, setTab] = useState('campaigns');
  const [campaigns, setCampaigns] = useState([]);
  const [products, setProducts] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editCampaign, setEditCampaign] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = () => {
    base44.entities.Campaign.list().then(setCampaigns);
    base44.entities.Product.filter({ is_published: true }, 'name').then(setProducts);
  };
  useEffect(() => { load(); }, []);

  const saveCampaign = async (form) => {
    setSaving(true);
    if (editCampaign) await base44.entities.Campaign.update(editCampaign.id, form);
    else await base44.entities.Campaign.create(form);
    setSaving(false); setShowForm(false); setEditCampaign(null);
    load();
  };

  const toggleCampaign = (c) => base44.entities.Campaign.update(c.id, { is_active: !c.is_active }).then(load);
  const deleteCampaign = (id) => base44.entities.Campaign.delete(id).then(load);
  const startEdit = (c) => { setEditCampaign(c); setShowForm(true); };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading font-bold text-2xl text-foreground">Marketing</h1>
        <p className="text-sm text-muted-foreground mt-1">Campanhas, upsell e automações de vendas</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-muted p-1 rounded-2xl w-fit">
        {TABS.map(t => {
          const Icon = t.icon;
          return (
            <button key={t.id} onClick={() => setTab(t.id)} className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${tab === t.id ? 'bg-white text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
              <Icon size={15} /> {t.label}
            </button>
          );
        })}
      </div>

      {/* Campaigns Tab */}
      {tab === 'campaigns' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">{campaigns.length} campanhas criadas</p>
            <button onClick={() => { setShowForm(true); setEditCampaign(null); }} className="flex items-center gap-1.5 px-3 py-2 bg-primary text-white rounded-xl text-sm font-bold">
              <Plus size={15} /> Nova campanha
            </button>
          </div>

          {showForm && (
            <CampaignForm
              initial={editCampaign}
              onSave={saveCampaign}
              onCancel={() => { setShowForm(false); setEditCampaign(null); }}
              saving={saving}
            />
          )}

          <div className="space-y-3">
            {campaigns.map(c => (
              <CampaignRow key={c.id} campaign={c} onToggle={toggleCampaign} onDelete={deleteCampaign} onEdit={startEdit} />
            ))}
            {campaigns.length === 0 && !showForm && (
              <div className="text-center py-12 text-muted-foreground text-sm">
                <Gift size={32} className="mx-auto mb-3 opacity-30" />
                Nenhuma campanha criada ainda
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'dispatch' && <MarketingDispatch />}
      {tab === 'upsell' && <UpsellTab products={products} />}
      {tab === 'banners' && <PromoBannerTab />}
      {tab === 'fidelity' && <FidelityTab products={products} />}
      {tab === 'automation' && <AutomationTab />}
      {tab === 'reactivation' && <ReactivationTab />}
      {tab === 'whatsapp' && <WhatsAppTab />}
    </div>
  );
}