import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { toast } from '@/components/ui/use-toast';
import { getStockDeduction } from '@/lib/recipeCost';
import { Search, Loader2, LayoutList, Columns, Check, X, Plus, Minus, Trash2, ShoppingCart, Send, Inbox, Clock, ChefHat, Truck, CheckCircle2 } from 'lucide-react';
import { OrderCards as ListView, OrderKanbanCard as KanbanCard, OrderDetails } from '@/components/admin/OrdersPresentation';
import '@/components/admin/orders-presentation.css';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { simulateExternalAction, isPresentationDemo } from '@/lib/presentationDemo';

const ORIGIN_SHORT = {
  catalog: 'Catálogo',
  pdv_balcao: 'Balcão',
  pdv_quick: 'Venda rápida',
  pdv_table: 'Mesa',
  pdv_pickup: 'Retirada PDV',
  pdv_delivery: 'Delivery PDV',
};

const paymentLabels = {
  pix: 'PIX', credit_card: 'Cartão', cash: 'Dinheiro',
  whatsapp: 'WhatsApp', bank_transfer: 'Transferência', to_arrange: 'A combinar'
};

// Format date correctly in pt-BR timezone
const formatDate = (dateStr) => {
  if (!dateStr) return '';
  try {
    return new Date(dateStr).toLocaleString('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  } catch {
    return new Date(dateStr).toLocaleString('pt-BR');
  }
};

const statusMessages = {
  pending: 'Seu pedido foi recebido e está aguardando confirmação! 🎉',
  confirmed: 'Seu pedido foi aceito e logo estará em preparo! ✅',
  preparing: 'Seu pedido está sendo preparado com carinho! 👨‍🍳',
  shipped: 'Seu pedido saiu para entrega! Fique atento à sua porta. 🛵',
  delivered: 'Pedido entregue! Bom apetite! 😊',
  cancelled: 'Seu pedido foi cancelado. Entre em contato para mais informações.',
};

const statusLabels = {
  pending: 'Recebido',
  confirmed: 'Aceito',
  preparing: 'Em preparo',
  shipped: 'Saiu p/ entrega',
  delivered: 'Entregue',
  cancelled: 'Cancelado'
};
const statusColors = {
  pending: 'bg-amber-100 text-amber-700 border-amber-200',
  confirmed: 'bg-blue-100 text-blue-700 border-blue-200',
  preparing: 'bg-purple-100 text-purple-700 border-purple-200',
  shipped: 'bg-cyan-100 text-cyan-700 border-cyan-200',
  delivered: 'bg-green-100 text-green-700 border-green-200',
  cancelled: 'bg-red-100 text-red-700 border-red-200'
};
const kanbanColumns = ['pending', 'confirmed', 'preparing', 'shipped', 'delivered'];
const statusFlow = ['pending', 'confirmed', 'preparing', 'shipped', 'delivered'];

const MESSAGE_TEMPLATES = [
  { key: 'pending', label: '⏳ Pedido recebido', template: 'Olá {nome}! Recebemos seu pedido #{numero}. Em breve confirmaremos.' },
  { key: 'confirmed', label: '✅ Pedido confirmado', template: 'Olá {nome}! Seu pedido #{numero} foi confirmado e está sendo preparado.' },
  { key: 'preparing', label: '👨‍🍳 Em preparo', template: 'Boa notícia, {nome}! Seu pedido #{numero} está sendo preparado.' },
  { key: 'shipped', label: '🛵 Saiu para entrega', template: 'Seu pedido #{numero} saiu para entrega! Aguarde em {endereco}.' },
  { key: 'delivered', label: '🎉 Entregue', template: 'Pedido #{numero} entregue! Obrigado pela preferência, {nome}.' },
  { key: 'cancelled', label: '❌ Cancelado', template: 'Seu pedido #{numero} foi cancelado. Entre em contato conosco.' },
];

function SendMessageButton({ order }) {
  const [open, setOpen] = useState(false);
  const phone = order.customer_phone?.replace(/\D/g, '');
  if (!phone) return null;
  const fill = (t) => t
    .replace(/{nome}/g, order.customer_name || '')
    .replace(/{numero}/g, order.order_number || '')
    .replace(/{endereco}/g, order.delivery_address || '')
    .replace(/{total}/g, `R$ ${order.total?.toFixed(2) || '0,00'}`);
  const send = (template) => {
    if (simulateExternalAction('Mensagem de WhatsApp simulada. Nada foi enviado ao cliente.')) { setOpen(false); return; }
    window.open(`https://wa.me/55${phone}?text=${encodeURIComponent(fill(template))}`, '_blank');
    setOpen(false);
  };
  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-center gap-2 py-2.5 border-2 border-dashed border-blue-400/40 rounded-xl text-blue-600 text-sm font-semibold hover:bg-blue-50 transition-colors">
        <Send size={14} /> Enviar mensagem
      </button>
      {open && (
        <div className="absolute bottom-full mb-2 left-0 right-0 bg-white rounded-2xl shadow-xl border border-border p-2 space-y-1 z-10">
          {MESSAGE_TEMPLATES.map(t => (
            <button key={t.key} onClick={() => send(t.template)}
              className="w-full text-left px-3 py-2 rounded-xl hover:bg-accent transition-colors text-sm">
              <p className="font-medium">{t.label}</p>
              <p className="text-xs text-muted-foreground truncate">{t.template}</p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Kanban Card ──────────────────────────────────────────────────────────────
function KanbanView({ orders, deliverers, onStatusChange, onAssign, onOpen }) {
  const onDragEnd = (result) => {
    if (!result.destination) return;
    const orderId = result.draggableId;
    const newStatus = result.destination.droppableId;
    const order = orders.find(o => o.id === orderId);
    if (order && order.status !== newStatus) {
      onStatusChange(orderId, newStatus);
    }
  };

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="orders-kanban">
        {kanbanColumns.map(col => {
          const colOrders = orders.filter(o => o.status === col);
          const Icon = {pending:Inbox,confirmed:Clock,preparing:ChefHat,shipped:Truck,delivered:CheckCircle2}[col];
          const colColors = {
            pending: 'border-gray-200 bg-gray-50',
            confirmed: 'border-amber-200 bg-amber-50',
            preparing: 'border-blue-200 bg-blue-50',
            shipped: 'border-purple-200 bg-purple-50',
            delivered: 'border-green-300 bg-green-50',
          };
          return (
            <Droppable droppableId={col} key={col}>
              {(provided, snapshot) => (
                <div ref={provided.innerRef} {...provided.droppableProps}
                  className={`orders-kanban-column flex-shrink-0 rounded-2xl border ${colColors[col]} p-3 space-y-2 min-h-[100px] ${snapshot.isDraggingOver ? 'orders-drop-target ring-2 ring-primary/40' : ''}`}>
                  <div className="flex items-center justify-between mb-2">
                    <p className="flex items-center gap-2 text-sm font-bold text-foreground"><Icon size={22}/>{col === 'confirmed' ? 'Pendente' : statusLabels[col]}</p>
                    <span className="text-xs font-bold bg-white/80 rounded-full px-2 py-0.5">{colOrders.length}</span>
                  </div>
                  {colOrders.map((order, index) => (
                    <Draggable draggableId={order.id} index={index} key={order.id} disableInteractiveElementBlocking>
                      {(provided, snapshot) => (
                        <div ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps} className={`orders-draggable ${snapshot.isDragging ? 'orders-is-dragging' : ''}`}>
                          <KanbanCard order={order} onStatusChange={onStatusChange} onOpen={onOpen} />
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {colOrders.length === 0 && <p className="text-[11px] text-muted-foreground text-center py-3 opacity-60">Vazio</p>}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          );
        })}
      </div>
    </DragDropContext>
  );
}

// ─── Edit Order Modal ─────────────────────────────────────────────────────────
function EditOrderModal({ order, onClose, onSave }) {
  const [items, setItems] = useState(order.items ? order.items.map(i => ({ ...i })) : []);
  const [products, setProducts] = useState([]);
  const [productSearch, setProductSearch] = useState('');
  const [showProductSearch, setShowProductSearch] = useState(false);
  const [form, setForm] = useState({
    payment_method: order.payment_method || '',
    delivery_fee: order.delivery_fee ?? 0,
    discount: order.discount ?? 0,
    admin_notes: order.admin_notes || '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    base44.entities.Product.list().then(setProducts);
  }, []);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const subtotal = items.reduce((s, i) => s + (i.unit_price * i.quantity), 0);
  const total = Math.max(0, subtotal - (parseFloat(form.discount) || 0) + (parseFloat(form.delivery_fee) || 0));

  const addProduct = (product) => {
    setItems(prev => {
      const existing = prev.find(i => i.product_id === product.id && !i.variation);
      if (existing) return prev.map(i => (i.product_id === product.id && !i.variation) ? { ...i, quantity: i.quantity + 1 } : i);
      return [...prev, { product_id: product.id, product_name: product.name, product_image: product.images?.[0], quantity: 1, unit_price: product.promo_price || product.price }];
    });
    setShowProductSearch(false);
    setProductSearch('');
  };

  const updateQty = (idx, delta) => {
    setItems(prev => prev.map((i, k) => k === idx ? { ...i, quantity: Math.max(1, i.quantity + delta) } : i));
  };

  const removeItem = (idx) => {
    setItems(prev => prev.filter((_, k) => k !== idx));
  };

  const filteredProducts = products.filter(p => !productSearch || p.name?.toLowerCase().includes(productSearch.toLowerCase()));

  const handleSave = async () => {
    setSaving(true);
    await base44.entities.Order.update(order.id, {
      items,
      subtotal,
      total,
      payment_method: form.payment_method,
      delivery_fee: parseFloat(form.delivery_fee) || 0,
      discount: parseFloat(form.discount) || 0,
      admin_notes: form.admin_notes,
    });
    setSaving(false);
    onSave();
  };

  const inp = "w-full px-3 py-2 bg-muted rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20";

  return (
    <div data-peddi-modal="" className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-md p-5 space-y-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="font-heading font-bold text-base">Editar Pedido #{order.order_number}</h3>
          <button onClick={onClose}><X size={18} className="text-gray-400" /></button>
        </div>

        {/* Items management */}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Itens do pedido</p>
          {items.map((item, idx) => (
            <div key={idx} className="flex items-center gap-2 p-2 bg-muted/50 rounded-xl">
              <img src={item.product_image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=60'} alt="" className="w-9 h-9 rounded-lg object-cover flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{item.product_name}</p>
                <p className="text-xs text-primary font-bold">R$ {item.unit_price?.toFixed(2)}</p>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <button onClick={() => updateQty(idx, -1)} className="w-6 h-6 rounded-lg bg-white border border-border flex items-center justify-center"><Minus size={12} /></button>
                <span className="text-sm font-bold w-6 text-center">{item.quantity}</span>
                <button onClick={() => updateQty(idx, 1)} className="w-6 h-6 rounded-lg bg-white border border-border flex items-center justify-center"><Plus size={12} /></button>
              </div>
              <button onClick={() => removeItem(idx)} className="text-red-400 hover:text-red-600 p-1 flex-shrink-0"><Trash2 size={14} /></button>
            </div>
          ))}

          {showProductSearch ? (
            <div className="space-y-2">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input value={productSearch} onChange={e => setProductSearch(e.target.value)} autoFocus placeholder="Buscar produto..." className={inp + ' pl-8'} />
              </div>
              <div className="max-h-32 overflow-y-auto space-y-1">
                {filteredProducts.slice(0, 8).map(p => (
                  <button key={p.id} onClick={() => addProduct(p)} className="flex items-center gap-2 w-full p-2 rounded-xl hover:bg-accent transition-colors text-left">
                    <img src={p.images?.[0] || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=40'} alt="" className="w-7 h-7 rounded-lg object-cover flex-shrink-0" />
                    <span className="text-sm flex-1 truncate">{p.name}</span>
                    <span className="text-xs text-primary font-bold">R$ {(p.promo_price || p.price)?.toFixed(2)}</span>
                    <Plus size={14} className="text-primary" />
                  </button>
                ))}
              </div>
              <button onClick={() => { setShowProductSearch(false); setProductSearch(''); }} className="text-xs text-muted-foreground">Cancelar</button>
            </div>
          ) : (
            <button onClick={() => setShowProductSearch(true)} className="w-full flex items-center justify-center gap-2 py-2 border-2 border-dashed border-primary/40 rounded-xl text-primary text-sm font-semibold hover:bg-primary/5 transition-colors">
              <Plus size={14} /> Adicionar item
            </button>
          )}
        </div>

        {/* Summary */}
        <div className="border-t border-border pt-3 space-y-1 text-sm">
          <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>R$ {subtotal.toFixed(2)}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Desconto</span><span>- R$ {(parseFloat(form.discount) || 0).toFixed(2)}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Frete</span><span>+ R$ {(parseFloat(form.delivery_fee) || 0).toFixed(2)}</span></div>
          <div className="flex justify-between font-heading font-bold pt-1"><span>Total</span><span className="text-primary">R$ {total.toFixed(2)}</span></div>
        </div>

        {/* Payment + other fields */}
        <div className="space-y-3 border-t border-border pt-3">
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Forma de pagamento</p>
            <select value={form.payment_method} onChange={e => set('payment_method', e.target.value)} className={inp}>
              {Object.entries(paymentLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Desconto (R$)</p>
              <input type="number" step="0.01" value={form.discount} onChange={e => set('discount', e.target.value)} className={inp} />
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Taxa entrega (R$)</p>
              <input type="number" step="0.01" value={form.delivery_fee} onChange={e => set('delivery_fee', e.target.value)} className={inp} />
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Observações internas</p>
            <textarea rows={2} value={form.admin_notes} onChange={e => set('admin_notes', e.target.value)} placeholder="Ajuste combinado com o cliente..." className={inp + ' resize-none'} />
          </div>
        </div>

        <button onClick={handleSave} disabled={saving}
          className="w-full py-3 bg-primary text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50">
          {saving ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
          {saving ? 'Salvando...' : 'Salvar alterações'}
        </button>
      </div>
    </div>
  );
}

// ─── List View ────────────────────────────────────────────────────────────────
export default function Orders() {
  const urlParams = new URLSearchParams(window.location.search);
  const focusOrderId = urlParams.get('order');
  const focusDelivererId = urlParams.get('deliverer');
  const [orders, setOrders] = useState([]);
  const [deliverers, setDeliverers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [selectedOrderId, setSelectedOrderId] = useState(focusOrderId || null);
  const [sortOrder, setSortOrder] = useState('recent');
  const [viewMode, setViewMode] = useState('list'); // list | kanban
  const [editingOrder, setEditingOrder] = useState(null);
  const [dateFilter, setDateFilter] = useState(focusOrderId ? 'all' : 'today');
  const [customDate, setCustomDate] = useState('');
  const [customDateStart, setCustomDateStart] = useState('');
  const [customDateEnd, setCustomDateEnd] = useState('');

  const loadOrders = async () => {
    try {
    const [data, dels] = await Promise.all([
      base44.entities.Order.list('-created_date'),
      base44.entities.Deliverer.filter({ is_active: true }, 'name'),
    ]);
    setOrders(data);
    setDeliverers(dels);
    } catch (error) { console.error(error); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    loadOrders();
    // Real-time subscription
    const unsub = base44.entities.Order.subscribe((event) => {
      if (event.type === 'create') {
        setOrders(prev => [event.data, ...prev]);
      } else if (event.type === 'update') {
        setOrders(prev => prev.map(o => o.id === event.id ? { ...o, ...event.data } : o));
      } else if (event.type === 'delete') {
        setOrders(prev => prev.filter(o => o.id !== event.id));
      }
    });
    return () => unsub();
  }, []);

  const updateStatus = async (orderId, newStatus) => {
    const order = orders.find(o => o.id === orderId);
    const prevStatus = order?.status;
    if (!order || prevStatus === newStatus) return;
    setOrders(previous => previous.map(item => item.id === orderId ? { ...item, status: newStatus, edited_by_customer: false } : item));
    try {
      await base44.entities.Order.update(orderId, { status: newStatus, edited_by_customer: false });
    } catch {
      setOrders(previous => previous.map(item => item.id === orderId ? { ...item, status: prevStatus, edited_by_customer: order.edited_by_customer } : item));
      toast({ title: 'Não foi possível salvar o status.', description: 'O pedido voltou à coluna anterior. Tente novamente.', variant: 'destructive' });
      return;
    }

    // Send notification + update customer profile metrics
    if (order) {
      try {
        const profiles = await base44.entities.CustomerProfile.filter({ email: order.customer_email });
        const profile = profiles[0];

        // Notification
        if (isPresentationDemo() && prevStatus !== newStatus && statusMessages[newStatus] && profile?.user_id && !profile.user_id.startsWith('manual_')) {
          await base44.entities.Notification.create({
            user_id: profile.user_id,
            type: 'order_status',
            title: `Pedido #${order.order_number} — ${statusLabels[newStatus]}`,
            message: statusMessages[newStatus],
            is_read: false,
            reference_id: orderId,
            reference_type: 'order',
          });
        }

        // Update customer metrics when order is delivered or cancelled
        if (profile) {
          const wasDelivered = prevStatus === 'delivered';
          const isCancelled = newStatus === 'cancelled';
          const isDelivered = newStatus === 'delivered';
          const orderTotal = order.total || 0;

          if (isDelivered && !wasDelivered) {
            // Auto-deduct stock from ingredients (ficha técnica)
            try {
              const allIngredients = await base44.entities.Ingredient.list();
              const allProducts = await base44.entities.Product.list();
              const ingMap = {};
              allIngredients.forEach(i => { ingMap[i.id] = i; });
              const prodMap = {};
              allProducts.forEach(p => { prodMap[p.id] = p; });

              for (const item of order.items || []) {
                const product = prodMap[item.product_id];
                if (!product?.recipe) continue;
                for (const recipeItem of product.recipe) {
                  const ing = ingMap[recipeItem.ingredient_id];
                  if (!ing) continue;
                  const deduction = getStockDeduction(recipeItem, ing) * (item.quantity || 1);
                  const newStock = (ing.current_stock || 0) - deduction;
                  await base44.entities.Ingredient.update(ing.id, {
                    current_stock: newStock,
                    movements: [...(ing.movements || []), { type: 'exit', quantity: deduction, date: new Date().toISOString(), reason: `Pedido #${order.order_number} - ${product.name}` }],
                  });
                }
              }
            } catch (_) {}

            // Compute product cashback
            let cashbackEarned = 0;
            try {
              const rules = await base44.entities.CashbackRule.filter({ is_active: true });
              const ruleMap = {};
              rules.forEach(r => { ruleMap[r.product_id] = r.cashback_amount; });
              order.items?.forEach(item => {
                const rule = ruleMap[item.product_id];
                if (rule) cashbackEarned += rule * (item.quantity || 0);
              });
            } catch (_) {}

            const updateData = {
              total_orders: (profile.total_orders || 0) + 1,
              total_spent: (profile.total_spent || 0) + orderTotal,
              last_order_date: new Date().toISOString().split('T')[0],
            };
            if (cashbackEarned > 0) {
              updateData.cashback_balance = Math.round(((profile.cashback_balance || 0) + cashbackEarned) * 100) / 100;
              updateData.cashback_history = [...(profile.cashback_history || []), { type: 'add', amount: cashbackEarned, reason: 'Cashback por produto', date: new Date().toISOString() }];
            }
            await base44.entities.CustomerProfile.update(profile.id, updateData);
          } else if (isCancelled && wasDelivered) {
            // Reverse the metrics if reverting from delivered
            await base44.entities.CustomerProfile.update(profile.id, {
              total_orders: Math.max(0, (profile.total_orders || 0) - 1),
              total_spent: Math.max(0, (profile.total_spent || 0) - orderTotal),
            });
          }
        }
      } catch (_) {}
    }

    loadOrders();
  };

  const assignDeliverer = async (orderId, delivererId) => {
    const d = deliverers.find(d => d.id === delivererId);
    const order = orders.find(o => o.id === orderId);
    await base44.entities.Order.update(orderId, {
      tracking_code: delivererId ? d?.name : '',
      deliverer_user_id: delivererId ? (d?.user_id || '') : '',
      deliverer_accepted: false,
      delivery_action_event: null,
    });
    toast({ title: !delivererId ? 'Entregador removido do pedido.' : order?.deliverer_user_id ? 'Entregador alterado com sucesso.' : 'Entregador atribuído com sucesso.' });
    if (delivererId && d && order) {
      // Notify deliverer in-app
      if (d.user_id) {
        try {
          await base44.entities.Notification.create({
            user_id: d.user_id,
            type: 'deliverer_assigned',
            title: 'Nova entrega atribuída',
            message: `Pedido #${order.order_number} — ${order.customer_name}`,
            is_read: false, reference_id: orderId, reference_type: 'order',
          });
        } catch (_) {}
      }
      // Send email if deliverer has email notifications enabled
      if (d.email_notifications !== false && d.email) {
        try {
          await base44.integrations.Core.SendEmail({
            to: d.email,
            subject: `Nova entrega — Pedido #${order.order_number}`,
            body: `Olá ${d.name}!\n\nVocê recebeu uma nova entrega:\nPedido #${order.order_number}\nCliente: ${order.customer_name}\nEndereço: ${order.delivery_address || 'Retirada no balcão'}\n\nAbra o pedido direto no app:\n${window.location.origin}/entregador?order=${orderId}`,
          });
        } catch (_) {}
      }
      // Notify customer that a deliverer was assigned
      if (order.customer_email) {
        try {
          const profiles = await base44.entities.CustomerProfile.filter({ email: order.customer_email });
          if (profiles[0]?.user_id) {
            await base44.entities.Notification.create({
              user_id: profiles[0].user_id,
              type: 'deliverer_assigned',
              title: 'Entregador atribuído',
              message: `Seu pedido foi atribuído ao entregador ${d.name} e sairá para entrega em breve.`,
              is_read: false, reference_id: orderId, reference_type: 'order',
            });
          }
        } catch (_) {}
      }
    }
    loadOrders();
  };

  const filtered = orders.filter(o => {
    const matchSearch = !search || o.customer_name?.toLowerCase().includes(search.toLowerCase()) || o.order_number?.includes(search);
    const matchStatus = !filterStatus || o.status === filterStatus;
    const matchDeliverer = !focusDelivererId || o.deliverer_user_id === focusDelivererId;
    let matchDate = true;
    if (dateFilter !== 'all') {
      const od = new Date(o.created_date);
      const now = new Date();
      if (dateFilter === 'today') {
        const start = new Date(now); start.setHours(0, 0, 0, 0);
        matchDate = od >= start;
      } else if (dateFilter === 'yesterday') {
        const start = new Date(now); start.setDate(start.getDate() - 1); start.setHours(0, 0, 0, 0);
        const end = new Date(now); end.setHours(0, 0, 0, 0);
        matchDate = od >= start && od < end;
      } else if (dateFilter === 'custom' && customDate) {
        const start = new Date(customDate + 'T00:00:00');
        const end = new Date(customDate + 'T23:59:59');
        matchDate = od >= start && od <= end;
      } else if (dateFilter === 'period' && customDateStart && customDateEnd) {
        const start = new Date(customDateStart + 'T00:00:00');
        const end = new Date(customDateEnd + 'T23:59:59');
        matchDate = od >= start && od <= end;
      }
    }
    return matchSearch && matchStatus && matchDeliverer && matchDate;
  }).sort((a,b) => sortOrder === 'oldest' ? Date.parse(a.created_date)-Date.parse(b.created_date) : sortOrder === 'highest' ? Number(b.total)-Number(a.total) : Date.parse(b.created_date)-Date.parse(a.created_date));
  const selectedOrder = orders.find(order => order.id === selectedOrderId);
  const openOrder = order => { setSelectedOrderId(order.id); if (!order.viewed_by_admin) base44.entities.Order.update(order.id, {viewed_by_admin:true}); window.scrollTo({top:0}); };

  return (
    <div className="peddi-orders space-y-6">
      {selectedOrder ? <OrderDetails order={selectedOrder} deliverers={deliverers} onBack={() => setSelectedOrderId(null)} onStatusChange={updateStatus} onAssign={assignDeliverer} onEdit={setEditingOrder} messageAction={<SendMessageButton order={selectedOrder}/>} /> : <>
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="font-heading font-bold text-2xl text-foreground">Pedidos</h1>
          <p className="text-sm text-muted-foreground mt-1">Gerencie e acompanhe seus pedidos em tempo real.</p>
        </div>
        {/* View mode toggle */}
        <div className="flex gap-1 bg-muted p-1 rounded-xl">
          <button onClick={() => setViewMode('list')} className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${viewMode === 'list' ? 'bg-green-600 text-white' : 'text-muted-foreground hover:text-foreground'}`} title="Lista">
            <LayoutList size={18} /> Lista
          </button>
          <button onClick={() => setViewMode('kanban')} className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${viewMode === 'kanban' ? 'bg-green-600 text-white' : 'text-muted-foreground hover:text-foreground'}`} title="Kanban">
            <Columns size={18} /> Kanban
          </button>
        </div>
      </div>

      {/* Filtro de período */}
      <div className="flex items-center gap-2 flex-wrap">
        {[
          { key: 'today', label: 'Hoje' },
          { key: 'yesterday', label: 'Ontem' },
          { key: 'custom', label: 'Data específica' },
          { key: 'period', label: 'Intervalo' },
          { key: 'all', label: 'Tudo' },
        ].map(opt => (
          <button key={opt.key} onClick={() => setDateFilter(opt.key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${dateFilter === opt.key ? 'bg-primary text-white' : 'bg-muted text-muted-foreground hover:text-foreground'}`}>
            {opt.label}
          </button>
        ))}
        {dateFilter === 'custom' && (
          <input type="date" value={customDate} onChange={e => setCustomDate(e.target.value)}
            className="px-3 py-1.5 bg-muted rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-primary/20" />
        )}
        {dateFilter === 'period' && (
          <div className="flex items-center gap-2">
            <input type="date" value={customDateStart} onChange={e => setCustomDateStart(e.target.value)}
              className="px-3 py-1.5 bg-muted rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-primary/20" />
            <span className="text-xs text-muted-foreground">até</span>
            <input type="date" value={customDateEnd} onChange={e => setCustomDateEnd(e.target.value)}
              className="px-3 py-1.5 bg-muted rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-primary/20" />
          </div>
        )}
      </div>

      {viewMode === 'list' && <div className="orders-summary">{[{label:'Total de pedidos',value:filtered.length,tone:'green'},{label:'Pendentes',value:filtered.filter(o=>['pending','confirmed'].includes(o.status)).length,tone:'amber'},{label:'Em preparo',value:filtered.filter(o=>o.status==='preparing').length,tone:'blue'},{label:'Entregues',value:filtered.filter(o=>o.status==='delivered').length,tone:'green'}].map(item=>{const Icon=item.label==='Total de pedidos'?ShoppingCart:{green:CheckCircle2,amber:Clock,blue:ChefHat}[item.tone];return <div key={item.label} className={`orders-stat ${item.tone}`}><Icon size={28}/><div><p>{item.label}</p><strong>{item.value}</strong><small>No período selecionado</small></div></div>;})}</div>}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por nome ou número..." className="w-full pl-10 pr-4 py-2.5 bg-muted rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
        </div>
        {viewMode === 'list' && (
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="px-4 py-2.5 bg-muted rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20">
            <option value="">Todos status</option>
            {Object.entries(statusLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        )}
      </div>

      <div className="flex items-center justify-between flex-wrap gap-3">{viewMode === 'list' && <div><h2 className="font-heading font-bold text-xl">{dateFilter==='today'?'Pedidos de hoje':'Pedidos do período'}</h2><p className="text-xs text-muted-foreground">{filtered.length} pedidos encontrados</p></div>}<select aria-label="Ordenar pedidos" value={sortOrder} onChange={e=>setSortOrder(e.target.value)} className="rounded-xl border border-border bg-white px-3 py-2 text-sm"><option value="recent">Mais recentes</option><option value="oldest">Mais antigos</option><option value="highest">Maior valor</option></select></div>
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="animate-spin text-primary" size={32} /></div>
      ) : viewMode === 'kanban' ? (
        <KanbanView orders={filtered} deliverers={deliverers} onStatusChange={updateStatus} onAssign={assignDeliverer} onOpen={openOrder} />
      ) : (
        <ListView orders={filtered} onOpen={openOrder} focusOrderId={focusOrderId} />
      )}

      </>}
      {editingOrder && (
        <EditOrderModal
          order={editingOrder}
          onClose={() => setEditingOrder(null)}
          onSave={() => { setEditingOrder(null); loadOrders(); }}
        />
      )}
    </div>
  );
}
