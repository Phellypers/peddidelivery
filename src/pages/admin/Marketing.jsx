import React, { useState, useEffect, useMemo, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Megaphone, Gift, ShoppingBag, ToggleLeft, ToggleRight, Plus, Trash2, Edit2, Save, X, Loader2, ChevronDown, ChevronUp, Send, Check, Award, Zap, UserCheck, Search, CalendarDays, Clock3, Copy, GripVertical } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import MarketingDispatch from '@/components/admin/MarketingDispatch';
import FidelityTab from '@/components/admin/marketing/FidelityTab';
import AutomationTab from '@/components/admin/marketing/AutomationTab';
import ReactivationTab from '@/components/admin/marketing/ReactivationTab';

// ─── Tab: Campanhas ───────────────────────────────────────────────────────────
const TYPE_LABEL = { cart_value: 'Desconto por valor do carrinho', order_count: 'Desconto por quantidade de produtos', buy_x_get_y: 'Compre X e ganhe Y' };
const formatDate=value=>value?new Date(`${value}T12:00:00`).toLocaleDateString('pt-BR'):'';
function MarketingToggle({active,onClick}){return <button type="button" onClick={onClick} className={`relative h-7 w-24 rounded-xl text-[11px] font-bold ${active?'bg-emerald-500 text-emerald-900':'bg-red-100 text-red-500'}`}><i className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow ${active?'left-[72px]':'left-1'}`}/><span className={active?'pr-5':'pl-5'}>{active?'Ativo':'Inativo'}</span></button>}
function CampaignRow({ campaign, position, onToggle, onDelete, onEdit, onDuplicate, onDragStart, onDrop }) {
  const rule=campaign.type==='cart_value'?`Carrinho ≥ R$ ${Number(campaign.min_cart_value||0).toFixed(2).replace('.',',')}`:campaign.type==='order_count'?`${campaign.min_order_count||0} ou mais produtos`:`Compre ${campaign.buy_quantity||0} produtos selecionados`;
  const benefit=campaign.type==='buy_x_get_y'?`Ganhe ${campaign.get_quantity||1} produto`:campaign.discount_type==='percentage'?`${campaign.discount_value||0}% OFF`:`R$ ${Number(campaign.discount_value||0).toFixed(2).replace('.',',')} OFF`;
  return (
    <tr draggable onDragStart={onDragStart} onDragOver={event=>event.preventDefault()} onDrop={onDrop} className="border-t border-slate-100 text-sm"><td className="pl-3"><GripVertical size={18} className="cursor-grab text-slate-400"/></td><td className="p-3"><div className="flex items-center gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-500"><Gift size={21}/></span><span><b className="block text-slate-950">{campaign.name}</b><small className="text-slate-500">{campaign.description||'Campanha promocional'}</small></span></div></td><td className="p-3"><span className="inline-flex max-w-48 rounded-lg bg-blue-50 px-3 py-2 text-xs font-medium text-blue-600">{TYPE_LABEL[campaign.type]}</span></td><td className="p-3 text-slate-700">{rule}</td><td className="p-3 font-bold text-emerald-500">{benefit}</td><td className="p-3 text-slate-600"><span className="flex gap-1.5"><CalendarDays size={14}/>{campaign.start_date||campaign.end_date?`${formatDate(campaign.start_date)||'Início imediato'} - ${formatDate(campaign.end_date)||'sem data final'}`:'Início imediato'}</span><span className="mt-1 flex gap-1.5 text-xs"><Clock3 size={14}/>{campaign.end_date?'Tempo integral':'sem data final'}</span></td><td className="p-3"><MarketingToggle active={campaign.is_active!==false} onClick={()=>onToggle(campaign)}/></td><td className="p-3"><div className="flex justify-end"><button title="Editar" onClick={()=>onEdit(campaign)} className="p-2"><Edit2 size={17}/></button><button title="Duplicar" onClick={()=>onDuplicate(campaign)} className="p-2"><Copy size={17}/></button><button title="Excluir" onClick={()=>onDelete(campaign.id)} className="p-2 text-red-500"><Trash2 size={17}/></button></div></td><td className="sr-only">{position}</td></tr>
  );
}

function CampaignForm({ initial, onSave, onCancel, saving }) {
  const [form, setForm] = useState(initial || { name: '', type: 'cart_value', is_active: true, discount_type: 'percentage', discount_value: 10, min_cart_value: 50, min_order_count: 10, buy_quantity: 10, get_quantity: 1, description: '', start_date: '', end_date: '' });
  const u = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const invalidPeriod = Boolean(form.start_date && form.end_date && form.end_date < form.start_date);
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

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Início da exibição</label>
          <input type="date" value={form.start_date || ''} max={form.end_date || undefined} onChange={e => u('start_date', e.target.value)} className="w-full px-3 py-2.5 bg-white rounded-xl text-sm border border-border/50 focus:outline-none focus:ring-2 focus:ring-primary/20" />
          <p className="mt-1 text-[10px] text-muted-foreground">Vazio: início imediato</p>
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Fim da exibição</label>
          <input type="date" value={form.end_date || ''} min={form.start_date || undefined} onChange={e => u('end_date', e.target.value)} className={`w-full px-3 py-2.5 bg-white rounded-xl text-sm border focus:outline-none focus:ring-2 ${invalidPeriod ? 'border-red-400 focus:ring-red-200' : 'border-border/50 focus:ring-primary/20'}`} />
          <p className={`mt-1 text-[10px] ${invalidPeriod ? 'text-red-500' : 'text-muted-foreground'}`}>{invalidPeriod ? 'A data final deve ser posterior à inicial.' : 'Vazio: sem data final'}</p>
        </div>
      </div>

      <input value={form.description} onChange={e => u('description', e.target.value)} placeholder="Descrição interna (opcional)" className="w-full px-3 py-2.5 bg-white rounded-xl text-sm border border-border/50 focus:outline-none focus:ring-2 focus:ring-primary/20" />

      <div className="flex gap-2 pt-1">
        <button onClick={() => onSave(form)} disabled={saving || !form.name || invalidPeriod} className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-primary text-white rounded-xl text-sm font-bold disabled:opacity-50">
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

// ─── Main Marketing Page ──────────────────────────────────────────────────────
const TABS = [
  { id: 'campaigns', label: 'Campanhas', icon: Gift },
  { id: 'dispatch', label: 'Disparos', icon: Send },
  { id: 'reactivation', label: 'Reativação', icon: UserCheck },
  { id: 'upsell', label: 'Upsell/Cross-sell', icon: ShoppingBag },
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
  const [campaignQuery, setCampaignQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [campaignSort, setCampaignSort] = useState('recent');
  const dragCampaign = useRef(null);

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
  const duplicateCampaign = async campaign => { const {id,created_date,updated_date,...copy}=campaign; await base44.entities.Campaign.create({...copy,name:`${campaign.name} - cópia`,is_active:false});load(); };
  const visibleCampaigns = useMemo(() => campaigns.filter(c => c.name?.toLowerCase().includes(campaignQuery.toLowerCase()) && (typeFilter==='all'||c.type===typeFilter) && (statusFilter==='all'||(statusFilter==='active')===(c.is_active!==false))).sort((a,b)=>campaignSort==='name'?a.name.localeCompare(b.name):campaignSort==='position'?Number(a.sort_order||0)-Number(b.sort_order||0):String(b.created_date||'').localeCompare(String(a.created_date||''))), [campaigns,campaignQuery,typeFilter,statusFilter,campaignSort]);
  const reorderCampaigns = async (fromId,toId) => { if(!fromId||fromId===toId)return;const next=[...campaigns],from=next.findIndex(c=>c.id===fromId),to=next.findIndex(c=>c.id===toId),item=next.splice(from,1)[0];next.splice(to,0,item);setCampaigns(next);await Promise.all(next.map((campaign,index)=>base44.entities.Campaign.update(campaign.id,{sort_order:index})));load(); };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading font-bold text-2xl text-foreground">Marketing</h1>
        <p className="text-sm text-muted-foreground mt-1">Campanhas, upsell e automações de vendas</p>
      </div>

      {/* Tabs */}
      <div className="flex max-w-full gap-1 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-1 scrollbar-hide">
        {TABS.map(t => {
          const Icon = t.icon;
          return (
            <button key={t.id} onClick={() => setTab(t.id)} className={`flex min-h-10 shrink-0 items-center gap-2 rounded-xl px-5 text-sm font-semibold transition-colors ${tab === t.id ? 'bg-emerald-100 text-slate-950' : 'text-slate-500 hover:text-slate-900'}`}>
              <Icon size={15} /> {t.label}
            </button>
          );
        })}
      </div>

      {/* Campaigns Tab */}
      {tab === 'campaigns' && (
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <div className="flex flex-wrap items-start justify-between gap-3 p-5"><div className="flex items-start gap-3"><Gift size={28} className="text-emerald-500"/><div><h2 className="text-lg font-bold text-slate-950">Campanhas do checkout</h2><p className="text-sm text-slate-500">Crie regras promocionais aplicadas automaticamente ao carrinho.</p></div></div>
            <button onClick={() => { setShowForm(true); setEditCampaign(null); }} className="flex min-h-11 items-center gap-2 rounded-xl bg-emerald-500 px-5 text-sm font-bold text-white">
              <Plus size={15} /> Nova campanha
            </button>
          </div>

          <div className="grid gap-3 border-y border-slate-100 p-4 md:grid-cols-[1.2fr_1fr_1fr_.8fr]"><label className="relative"><Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/><input value={campaignQuery} onChange={e=>setCampaignQuery(e.target.value)} placeholder="Buscar campanha por nome..." className="h-11 w-full rounded-lg border border-slate-200 pl-10 pr-3 text-sm"/></label><select value={typeFilter} onChange={e=>setTypeFilter(e.target.value)} className="h-11 rounded-lg border border-slate-200 px-3 text-sm"><option value="all">Todos os tipos</option><option value="cart_value">Valor do carrinho</option><option value="order_count">Quantidade de produtos</option><option value="buy_x_get_y">Compre X e ganhe Y</option></select><select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)} className="h-11 rounded-lg border border-slate-200 px-3 text-sm"><option value="all">Todos os status</option><option value="active">Ativos</option><option value="inactive">Inativos</option></select><select value={campaignSort} onChange={e=>setCampaignSort(e.target.value)} className="h-11 rounded-lg border border-slate-200 px-3 text-sm"><option value="recent">Mais recentes</option><option value="position">Posição</option><option value="name">Nome</option></select></div>

          {showForm && (
            <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4" onClick={()=>{setShowForm(false);setEditCampaign(null)}}><div className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-t-3xl bg-white p-5 sm:rounded-2xl" onClick={e=>e.stopPropagation()}><CampaignForm
              initial={editCampaign}
              onSave={saveCampaign}
              onCancel={() => { setShowForm(false); setEditCampaign(null); }}
              saving={saving}
            /></div></div>
          )}

          <div className="overflow-x-auto"><table className="w-full min-w-[1200px] text-left"><thead className="bg-slate-50 text-xs text-slate-500"><tr><th/><th className="p-3">Nome da campanha</th><th className="p-3">Tipo</th><th className="p-3">Regra / Condição</th><th className="p-3">Desconto / Benefício</th><th className="p-3">Período de exibição</th><th className="p-3">Status</th><th className="p-3 text-right">Ações</th></tr></thead><tbody>{visibleCampaigns.map((c,index)=><CampaignRow key={c.id} campaign={c} position={index} onToggle={toggleCampaign} onDelete={deleteCampaign} onEdit={startEdit} onDuplicate={duplicateCampaign} onDragStart={()=>{dragCampaign.current=c.id}} onDrop={()=>reorderCampaigns(dragCampaign.current,c.id)}/>)}</tbody></table>{!visibleCampaigns.length&&<p className="py-12 text-center text-sm text-slate-400">Nenhuma campanha encontrada.</p>}</div><footer className="border-t p-4 text-sm text-slate-500">Mostrando {visibleCampaigns.length} de {campaigns.length} campanhas</footer>
        </section>
      )}

      {tab === 'dispatch' && <MarketingDispatch />}
      {tab === 'upsell' && <UpsellTab products={products} />}
      {tab === 'fidelity' && <FidelityTab products={products} />}
      {tab === 'automation' && <AutomationTab />}
      {tab === 'reactivation' && <ReactivationTab />}
      {tab === 'whatsapp' && <WhatsAppTab />}
    </div>
  );
}
