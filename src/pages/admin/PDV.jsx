import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Search, Plus, Minus, Trash2, X, Check, Loader2, UserPlus, Truck, Store, UtensilsCrossed, ShoppingCart, User } from 'lucide-react';

const PAYMENT_OPTIONS = [
  { id: 'cash', label: 'Dinheiro' },
  { id: 'pix', label: 'PIX' },
  { id: 'credit_card', label: 'Cartão' },
  { id: 'to_arrange', label: 'A combinar' },
];

const MONTHS = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

export default function PDV() {
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  const [customerSearch, setCustomerSearch] = useState('');
  const [showCustomerResults, setShowCustomerResults] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [showNewCustomer, setShowNewCustomer] = useState(false);

  const [customerForm, setCustomerForm] = useState({
    name: '', phone: '', email: '', zip: '', city: '', neighborhood: '',
    street: '', number: '', apt: '', condo: '', birth_day: '', birth_month: '', birth_year: '',
  });

  const [productSearch, setProductSearch] = useState('');
  const [cart, setCart] = useState([]);

  const [orderType, setOrderType] = useState('dine_in');
  const [tableNumber, setTableNumber] = useState('');
  const [payments, setPayments] = useState([{ method: 'cash', amount: '' }]);
  const [deliveryFee, setDeliveryFee] = useState(0);
  const [orderNotes, setOrderNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(null);
  const [tables, setTables] = useState([]);
  const [selectedTableId, setSelectedTableId] = useState('');
  const [editingOrder, setEditingOrder] = useState(null);
  const [successMode, setSuccessMode] = useState('create');

  useEffect(() => {
    Promise.all([
      base44.entities.CustomerProfile.list('-total_orders'),
      base44.entities.Product.list('-created_date'),
      base44.entities.Table.list('sort_order'),
    ]).then(async ([custs, prods, tbls]) => {
      setCustomers(custs);
      setProducts(prods);
      setTables(tbls);
      const urlParams = new URLSearchParams(window.location.search);
      const tableParam = urlParams.get('table');
      const orderParam = urlParams.get('order');
      if (orderParam) {
        try {
          const order = await base44.entities.Order.get(orderParam);
          setCart(order.items?.map(i => ({ product_id: i.product_id, product_name: i.product_name, product_image: i.product_image, quantity: i.quantity, unit_price: i.unit_price, notes: i.notes || '' })) || []);
          setEditingOrder({ id: order.id, order_number: order.order_number });
          if (order.customer_name && order.customer_name !== 'Venda avulsa') {
            setCustomerForm(p => ({ ...p, name: order.customer_name, phone: order.customer_phone || '', email: order.customer_email || '' }));
          }
          const table = tbls.find(t => t.current_order_id === order.id);
          if (table) setSelectedTableId(table.id);
          setOrderType('dine_in');
        } catch (_) {}
      } else if (tableParam) {
        const table = tbls.find(t => t.id === tableParam);
        if (table) {
          setSelectedTableId(table.id);
          setOrderType('dine_in');
        }
      }
      setLoading(false);
    });
  }, []);

  const set = (k, v) => setCustomerForm(p => ({ ...p, [k]: v }));

  const filteredCustomers = customers.filter(c =>
    !customerSearch || c.name?.toLowerCase().includes(customerSearch.toLowerCase()) || c.phone?.includes(customerSearch) || c.email?.toLowerCase().includes(customerSearch.toLowerCase())
  );

  const selectCustomer = (c) => {
    setSelectedCustomer(c);
    setCustomerForm({
      name: c.name || '', phone: c.phone || '', email: c.email || '',
      zip: c.zip || '', city: c.city || '', neighborhood: c.delivery_notes || '',
      street: c.address || '', number: '', apt: '', condo: '',
      birth_day: '', birth_month: c.birth_month || '', birth_year: c.birth_year || '',
    });
    setCustomerSearch('');
    setShowCustomerResults(false);
    setShowNewCustomer(false);
  };

  const newCustomer = () => {
    setSelectedCustomer(null);
    setShowNewCustomer(true);
    setShowCustomerResults(false);
    setCustomerForm({ name: '', phone: '', email: '', zip: '', city: '', neighborhood: '', street: '', number: '', apt: '', condo: '', birth_day: '', birth_month: '', birth_year: '' });
  };

  const filteredProducts = products.filter(p =>
    !productSearch || p.name?.toLowerCase().includes(productSearch.toLowerCase())
  );

  const addToCart = (product) => {
    setCart(prev => {
      const existing = prev.find(i => i.product_id === product.id);
      if (existing) return prev.map(i => i.product_id === product.id ? { ...i, quantity: i.quantity + 1 } : i);
      return [...prev, { product_id: product.id, product_name: product.name, product_image: product.images?.[0], quantity: 1, unit_price: product.promo_price || product.price, notes: '' }];
    });
  };

  const updateQty = (id, delta) => setCart(prev => prev.map(i => i.product_id === id ? { ...i, quantity: Math.max(1, i.quantity + delta) } : i));
  const removeFromCart = (id) => setCart(prev => prev.filter(i => i.product_id !== id));
  const setItemNote = (id, note) => setCart(prev => prev.map(i => i.product_id === id ? { ...i, notes: note } : i));

  const subtotal = cart.reduce((s, i) => s + i.unit_price * i.quantity, 0);
  const total = subtotal + (orderType === 'delivery' ? parseFloat(deliveryFee) || 0 : 0);
  const paidAmount = payments.reduce((s, p) => s + (parseFloat(p.amount) || 0), 0);
  const remaining = Math.round((total - paidAmount) * 100) / 100;
  const selectedTable = tables.find(t => t.id === selectedTableId);
  const tableLabel = selectedTableId === 'balcao' ? 'Balcão' : selectedTable?.name || '';

  const updatePayment = (idx, key, value) => setPayments(prev => prev.map((p, k) => k === idx ? { ...p, [key]: value } : p));
  const removePayment = (idx) => setPayments(prev => prev.filter((_, k) => k !== idx));

  const handleLaunchOnTable = async () => {
    if (cart.length === 0 || !selectedTableId || selectedTableId === 'balcao') return;
    setSaving(true);
    try {
      const table = tables.find(t => t.id === selectedTableId);
      const customerName = customerForm.name || 'Venda avulsa';
      if (table?.current_order_id) {
        const existing = await base44.entities.Order.get(table.current_order_id);
        const merged = [...(existing.items || [])];
        cart.forEach(cartItem => {
          const ex = merged.find(i => i.product_id === cartItem.product_id && !i.notes);
          if (ex) ex.quantity += cartItem.quantity;
          else merged.push({ ...cartItem });
        });
        const newSub = merged.reduce((s, i) => s + i.unit_price * i.quantity, 0);
        await base44.entities.Order.update(existing.id, { items: merged, subtotal: newSub, total: newSub });
        setSuccess(existing.order_number);
      } else {
        const orderNum = String(Date.now()).slice(-6);
        const order = await base44.entities.Order.create({
          order_number: orderNum,
          customer_name: customerName,
          customer_phone: customerForm.phone || '',
          customer_email: customerForm.email || '',
          status: 'pending',
          items: cart.map(i => ({ product_id: i.product_id, product_name: i.product_name, product_image: i.product_image, quantity: i.quantity, unit_price: i.unit_price, notes: i.notes })),
          subtotal, total,
          payment_method: 'to_arrange',
          payment_status: 'pending',
          delivery_method: 'dine_in',
          table_number: tableLabel,
          sale_origin: 'pdv_table',
          created_via_pdv: true,
        });
        await base44.entities.Table.update(selectedTableId, { status: 'open', current_order_id: order.id, current_order_number: order.order_number });
        setSuccess(order.order_number);
      }
      setSuccessMode('launch');
      setCart([]);
      setSelectedTableId('');
    } catch (_) {}
    setSaving(false);
  };

  const handleSubmit = async () => {
    if (cart.length === 0 || remaining !== 0) return;
    setSaving(true);
    try {
      if (editingOrder) {
        await base44.entities.Order.update(editingOrder.id, {
          items: cart.map(i => ({ product_id: i.product_id, product_name: i.product_name, product_image: i.product_image, quantity: i.quantity, unit_price: i.unit_price, notes: i.notes })),
          subtotal, total,
          payment_method: payments[0]?.method || 'cash',
          payment_status: (payments[0]?.method === 'cash' || payments[0]?.method === 'to_arrange') ? 'pending' : 'paid',
          status: 'confirmed',
          order_notes: orderNotes + (payments.length > 1 ? `\nPagamento dividido: ${payments.map(p => `${PAYMENT_OPTIONS.find(o => o.id === p.method)?.label || p.method} R$ ${(parseFloat(p.amount) || 0).toFixed(2)}`).join(' + ')}` : ''),
        });
        if (selectedTableId && selectedTableId !== 'balcao') {
          await base44.entities.Table.update(selectedTableId, { status: 'free', current_order_id: '', current_order_number: '' });
        }
        setSuccessMode('finalize');
        setSuccess(editingOrder.order_number);
        setEditingOrder(null);
        setCart([]);
        setPayments([{ method: 'cash', amount: '' }]);
        setSelectedTableId('');
        setSaving(false);
        return;
      }
      const customerName = customerForm.name || 'Venda avulsa';
      const customerEmail = customerForm.email || selectedCustomer?.email || '';
      let profileId = selectedCustomer?.id;
      if (!selectedCustomer && customerForm.email && customerForm.name) {
        const prof = await base44.entities.CustomerProfile.create({
          name: customerForm.name, phone: customerForm.phone, email: customerForm.email,
          zip: customerForm.zip, city: customerForm.city,
          address: customerForm.street + (customerForm.number ? ', ' + customerForm.number : '') + (customerForm.apt ? ' - ' + customerForm.apt : ''),
          delivery_notes: customerForm.neighborhood,
          user_id: 'pdv_' + Date.now(),
          birth_month: customerForm.birth_month ? parseInt(customerForm.birth_month) : null,
          birth_year: customerForm.birth_year ? parseInt(customerForm.birth_year) : null,
          internal_rating: 5.0, rating_count: 0, total_orders: 0, total_spent: 0,
        });
        profileId = prof.id;
      } else if (selectedCustomer) {
        await base44.entities.CustomerProfile.update(selectedCustomer.id, {
          name: customerForm.name, phone: customerForm.phone, email: customerForm.email,
          zip: customerForm.zip, city: customerForm.city,
          address: customerForm.street + (customerForm.number ? ', ' + customerForm.number : '') + (customerForm.apt ? ' - ' + customerForm.apt : ''),
          delivery_notes: customerForm.neighborhood,
          birth_month: customerForm.birth_month ? parseInt(customerForm.birth_month) : null,
          birth_year: customerForm.birth_year ? parseInt(customerForm.birth_year) : null,
        });
      }

      const saleOrigin = orderType === 'delivery' ? 'pdv_delivery' : orderType === 'pickup' ? 'pdv_pickup' : selectedTableId === 'balcao' ? 'pdv_balcao' : selectedTableId ? 'pdv_table' : 'pdv_quick';
      const orderNum = String(Date.now()).slice(-6);
      const order = await base44.entities.Order.create({
        order_number: orderNum,
        customer_name: customerName,
        customer_phone: customerForm.phone,
        customer_email: customerEmail,
        status: 'confirmed',
        items: cart.map(i => ({ product_id: i.product_id, product_name: i.product_name, product_image: i.product_image, quantity: i.quantity, unit_price: i.unit_price, notes: i.notes })),
        subtotal,
        delivery_fee: orderType === 'delivery' ? parseFloat(deliveryFee) || 0 : 0,
        total,
        payment_method: payments[0]?.method || 'cash',
        payment_status: (payments[0]?.method === 'cash' || payments[0]?.method === 'to_arrange') ? 'pending' : 'paid',
        delivery_method: orderType,
        delivery_address: orderType === 'delivery' ? `${customerForm.street}, ${customerForm.number}${customerForm.apt ? ' - ' + customerForm.apt : ''}${customerForm.condo ? ' (' + customerForm.condo + ')' : ''}` : '',
        delivery_city: customerForm.city,
        delivery_zip: customerForm.zip,
        delivery_neighborhood: customerForm.neighborhood,
        table_number: orderType === 'dine_in' ? tableLabel : '',
        sale_origin: saleOrigin,
        order_notes: orderNotes + (payments.length > 1 ? `\nPagamento dividido: ${payments.map(p => `${PAYMENT_OPTIONS.find(o => o.id === p.method)?.label || p.method} R$ ${(parseFloat(p.amount) || 0).toFixed(2)}`).join(' + ')}` : ''),
        created_via_pdv: true,
      });

      if (selectedTableId && selectedTableId !== 'balcao') {
        await base44.entities.Table.update(selectedTableId, { status: 'open', current_order_id: order.id, current_order_number: order.order_number });
      }
      setSuccessMode('create');
      setSuccess(order.order_number);
      setCart([]);
      setSelectedCustomer(null);
      setShowNewCustomer(false);
      setPayments([{ method: 'cash', amount: '' }]);
      setSelectedTableId('');
      setEditingOrder(null);
    } catch (_) {}
    setSaving(false);
  };

  if (success) {
    const title = successMode === 'launch' ? 'Itens lançados na comanda!' : successMode === 'finalize' ? 'Comanda finalizada!' : 'Pedido lançado!';
    const msg = successMode === 'launch' ? `Itens adicionados à comanda #${success}` : successMode === 'finalize' ? `Comanda #${success} fechada com sucesso` : `Pedido #${success} criado com sucesso`;
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <div className={`w-16 h-16 rounded-full flex items-center justify-center ${successMode === 'launch' ? 'bg-orange-100' : 'bg-green-100'}`}>
          <Check size={32} className={successMode === 'launch' ? 'text-orange-600' : 'text-green-600'} />
        </div>
        <h2 className="font-heading font-bold text-xl">{title}</h2>
        <p className="text-sm text-muted-foreground">{msg}</p>
        <button onClick={() => { setSuccess(null); setSuccessMode('create'); }} className="px-6 py-2.5 bg-primary text-white rounded-xl text-sm font-bold hover:bg-primary/90 transition-colors">
          Novo pedido
        </button>
      </div>
    );
  }

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-primary" size={32} /></div>;

  const inp = "w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30";
  const lbl = "block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading font-bold text-2xl text-foreground">PDV — Ponto de Venda</h1>
        <p className="text-sm text-muted-foreground mt-1">Lance pedidos manualmente para delivery, retirada ou consumo no local</p>
      </div>

      {editingOrder && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 flex items-center gap-2">
          <UtensilsCrossed size={18} className="text-orange-600 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-orange-800">Editando comanda #{editingOrder.order_number} — {tableLabel}</p>
            <p className="text-xs text-orange-600">Ajuste itens ou pagamento e finalize a comanda</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Customer + Products */}
        <div className="space-y-4">
          {/* Customer section */}
          <div className="bg-card rounded-2xl border border-border/50 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-heading font-semibold text-sm">Cliente <span className="text-xs font-normal text-gray-400">(opcional)</span></h2>
              <button onClick={newCustomer} className="flex items-center gap-1 text-xs text-primary font-medium hover:underline">
                <UserPlus size={12} /> Novo cliente
              </button>
            </div>

            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input value={customerSearch} onChange={e => { setCustomerSearch(e.target.value); setShowCustomerResults(true); }} onFocus={() => setShowCustomerResults(true)} placeholder="Buscar cliente por nome, telefone ou e-mail..." className={inp + ' pl-9'} />
              {showCustomerResults && customerSearch && (
                <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                  {filteredCustomers.slice(0, 5).map(c => (
                    <button key={c.id} onClick={() => selectCustomer(c)} className="flex items-center gap-2 w-full px-3 py-2 hover:bg-gray-50 transition-colors text-left">
                      <User size={14} className="text-gray-400" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{c.name}</p>
                        <p className="text-xs text-gray-400">{c.phone || c.email}</p>
                      </div>
                    </button>
                  ))}
                  {filteredCustomers.length === 0 && <p className="px-3 py-2 text-sm text-gray-400">Nenhum cliente encontrado</p>}
                </div>
              )}
            </div>

            {selectedCustomer && (
              <div className="flex items-center gap-2 bg-green-50 rounded-xl p-2">
                <User size={16} className="text-green-600" />
                <span className="text-sm font-medium text-green-800 flex-1">{selectedCustomer.name}</span>
                <button onClick={() => setSelectedCustomer(null)} className="text-gray-400 hover:text-gray-600"><X size={14} /></button>
              </div>
            )}

            {(showNewCustomer || selectedCustomer) && (
              <div className="space-y-2 border-t border-gray-100 pt-3">
                <div className="grid grid-cols-2 gap-2">
                  <div className="col-span-2"><label className={lbl}>Nome *</label><input value={customerForm.name} onChange={e => set('name', e.target.value)} className={inp} placeholder="Nome do cliente" /></div>
                  <div><label className={lbl}>Telefone</label><input value={customerForm.phone} onChange={e => set('phone', e.target.value)} className={inp} placeholder="(11) 99999-9999" /></div>
                  <div><label className={lbl}>E-mail</label><input value={customerForm.email} onChange={e => set('email', e.target.value)} className={inp} placeholder="email@exemplo.com" /></div>
                </div>

                {orderType === 'delivery' && (
                  <div className="grid grid-cols-2 gap-2">
                    <div><label className={lbl}>CEP</label><input value={customerForm.zip} onChange={e => set('zip', e.target.value)} className={inp} /></div>
                    <div><label className={lbl}>Cidade</label><input value={customerForm.city} onChange={e => set('city', e.target.value)} className={inp} /></div>
                    <div className="col-span-2"><label className={lbl}>Bairro</label><input value={customerForm.neighborhood} onChange={e => set('neighborhood', e.target.value)} className={inp} /></div>
                    <div className="col-span-2"><label className={lbl}>Condomínio (se necessário)</label><input value={customerForm.condo} onChange={e => set('condo', e.target.value)} className={inp} /></div>
                    <div><label className={lbl}>Rua</label><input value={customerForm.street} onChange={e => set('street', e.target.value)} className={inp} /></div>
                    <div><label className={lbl}>Número</label><input value={customerForm.number} onChange={e => set('number', e.target.value)} className={inp} /></div>
                    <div className="col-span-2"><label className={lbl}>Apartamento</label><input value={customerForm.apt} onChange={e => set('apt', e.target.value)} className={inp} /></div>
                  </div>
                )}

                <div className="grid grid-cols-3 gap-2">
                  <div><label className={lbl}>Aniv. (dia)</label><input type="number" min="1" max="31" value={customerForm.birth_day} onChange={e => set('birth_day', e.target.value)} className={inp} placeholder="DD" /></div>
                  <div><label className={lbl}>Mês</label><select value={customerForm.birth_month} onChange={e => set('birth_month', e.target.value)} className={inp}><option value="">—</option>{MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}</select></div>
                  <div><label className={lbl}>Ano</label><input type="number" value={customerForm.birth_year} onChange={e => set('birth_year', e.target.value)} className={inp} placeholder="AAAA" /></div>
                </div>
              </div>
            )}
          </div>

          {/* Product search + list */}
          <div className="bg-card rounded-2xl border border-border/50 p-4 space-y-3">
            <h2 className="font-heading font-semibold text-sm">Adicionar produtos</h2>
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input value={productSearch} onChange={e => setProductSearch(e.target.value)} placeholder="Buscar produto..." className={inp + ' pl-9'} />
            </div>
            <div className="max-h-64 overflow-y-auto space-y-1">
              {filteredProducts.map(p => (
                <button key={p.id} onClick={() => addToCart(p)} className="flex items-center gap-2 w-full p-2 rounded-xl hover:bg-gray-50 transition-colors text-left">
                  <img src={p.images?.[0] || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=60'} alt="" className="w-9 h-9 rounded-lg object-cover flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{p.name}</p>
                    <p className="text-xs text-primary font-bold">R$ {(p.promo_price || p.price)?.toFixed(2)}</p>
                  </div>
                  <Plus size={16} className="text-primary flex-shrink-0" />
                </button>
              ))}
              {filteredProducts.length === 0 && <p className="text-sm text-gray-400 text-center py-4">Nenhum produto encontrado</p>}
            </div>
          </div>
        </div>

        {/* Right: Order settings + Cart */}
        <div className="space-y-4">
          <div className="bg-card rounded-2xl border border-border/50 p-4 space-y-3">
            <h2 className="font-heading font-semibold text-sm">Tipo de pedido</h2>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'dine_in', label: 'No local', icon: UtensilsCrossed },
                { id: 'pickup', label: 'Retirada', icon: Store },
                { id: 'delivery', label: 'Entrega', icon: Truck },
              ].map(opt => {
                const Icon = opt.icon;
                return (
                  <button key={opt.id} onClick={() => setOrderType(opt.id)} className={`flex flex-col items-center gap-1 p-3 rounded-xl text-xs font-semibold transition-all ${orderType === opt.id ? 'bg-primary text-white' : 'bg-gray-50 text-gray-600'}`}>
                    <Icon size={18} />{opt.label}
                  </button>
                );
              })}
            </div>
            {orderType === 'dine_in' && (
              <select value={selectedTableId} onChange={e => setSelectedTableId(e.target.value)} className={inp}>
                <option value="">Venda rápida (sem mesa)</option>
                <option value="balcao">Balcão</option>
                {tables.map(t => <option key={t.id} value={t.id}>{t.name}{t.status === 'open' ? ' — ocupada' : ''}</option>)}
              </select>
            )}
          </div>

          <div className="bg-card rounded-2xl border border-border/50 p-4 space-y-3">
            <h2 className="font-heading font-semibold text-sm flex items-center gap-2">
              <ShoppingCart size={16} /> Itens do pedido
              {cart.length > 0 && <span className="text-xs text-gray-400">({cart.length})</span>}
            </h2>
            {cart.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">Nenhum item adicionado</p>
            ) : (
              <div className="space-y-2">
                {cart.map(item => (
                  <div key={item.product_id} className="flex items-start gap-2 p-2 bg-gray-50 rounded-xl">
                    <img src={item.product_image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=60'} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
                    <div className="flex-1 min-w-0 space-y-1">
                      <p className="text-sm font-medium truncate">{item.product_name}</p>
                      <div className="flex items-center gap-2">
                        <button onClick={() => updateQty(item.product_id, -1)} className="w-6 h-6 rounded-lg bg-white border border-gray-200 flex items-center justify-center"><Minus size={12} /></button>
                        <span className="text-sm font-bold w-6 text-center">{item.quantity}</span>
                        <button onClick={() => updateQty(item.product_id, 1)} className="w-6 h-6 rounded-lg bg-white border border-gray-200 flex items-center justify-center"><Plus size={12} /></button>
                        <span className="text-xs font-bold text-primary ml-auto">R$ {(item.unit_price * item.quantity).toFixed(2)}</span>
                      </div>
                      <input value={item.notes} onChange={e => setItemNote(item.product_id, e.target.value)} placeholder="Obs. (ex: sem cebola)" className="w-full px-2 py-1 text-xs bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary/30" />
                    </div>
                    <button onClick={() => removeFromCart(item.product_id)} className="text-red-400 hover:text-red-600 p-1"><Trash2 size={14} /></button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-card rounded-2xl border border-border/50 p-4 space-y-3">
            <h2 className="font-heading font-semibold text-sm">Pagamento</h2>
            {payments.map((pay, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <select value={pay.method} onChange={e => updatePayment(idx, 'method', e.target.value)} className={inp + ' flex-1'}>
                  {PAYMENT_OPTIONS.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
                </select>
                <input type="number" step="0.01" placeholder="0,00" value={pay.amount} onChange={e => updatePayment(idx, 'amount', e.target.value)} className={inp + ' w-24'} />
                {payments.length > 1 && (
                  <button onClick={() => removePayment(idx)} className="text-red-400 p-2 flex-shrink-0"><Trash2 size={14} /></button>
                )}
              </div>
            ))}
            <button onClick={() => setPayments([...payments, { method: 'cash', amount: '' }])} className="flex items-center gap-1 text-xs text-primary font-medium hover:underline">
              <Plus size={12} /> Adicionar forma de pagamento
            </button>
            {remaining !== 0 ? (
              <div className={`text-xs font-semibold px-3 py-2 rounded-xl ${remaining > 0 ? 'bg-orange-50 text-orange-600' : 'bg-red-50 text-red-600'}`}>
                {remaining > 0 ? `Falta pagar: R$ ${remaining.toFixed(2)}` : `Excedido: R$ ${Math.abs(remaining).toFixed(2)}`}
              </div>
            ) : (
              <div className="text-xs font-semibold px-3 py-2 rounded-xl bg-green-50 text-green-600">
                ✓ Pagamento completo (R$ {total.toFixed(2)})
              </div>
            )}

            {orderType === 'delivery' && (
              <div><label className={lbl}>Taxa de entrega (R$)</label><input type="number" step="0.01" value={deliveryFee} onChange={e => setDeliveryFee(e.target.value)} className={inp} placeholder="0,00" /></div>
            )}

            <div><label className={lbl}>Observações do pedido</label><textarea value={orderNotes} onChange={e => setOrderNotes(e.target.value)} rows={2} className={inp + ' resize-none'} placeholder="Observações gerais..." /></div>

            <div className="border-t border-gray-100 pt-3 space-y-1 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">Subtotal</span><span>R$ {subtotal.toFixed(2)}</span></div>
              {orderType === 'delivery' && <div className="flex justify-between"><span className="text-gray-500">Entrega</span><span>R$ {(parseFloat(deliveryFee) || 0).toFixed(2)}</span></div>}
              <div className="flex justify-between font-heading font-bold text-base pt-1"><span>Total</span><span className="text-primary">R$ {total.toFixed(2)}</span></div>
            </div>

            {editingOrder ? (
              <button onClick={handleSubmit} disabled={saving || cart.length === 0 || remaining !== 0} className="w-full py-3 bg-green-600 text-white rounded-xl font-bold text-sm hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                {saving ? 'Finalizando...' : 'Finalizar comanda'}
              </button>
            ) : (
              <div className="space-y-2">
                {orderType === 'dine_in' && selectedTableId && selectedTableId !== 'balcao' && cart.length > 0 && (
                  <button onClick={handleLaunchOnTable} disabled={saving} className="w-full py-2.5 bg-orange-500 text-white rounded-xl font-bold text-sm hover:bg-orange-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                    {saving ? <Loader2 size={15} className="animate-spin" /> : <UtensilsCrossed size={15} />}
                    {saving ? 'Lançando...' : 'Lançar na mesa'}
                  </button>
                )}
                <button onClick={handleSubmit} disabled={saving || cart.length === 0 || remaining !== 0} className="w-full py-3 bg-primary text-white rounded-xl font-bold text-sm hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                  {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                  {saving ? 'Lançando...' : 'Lançar pedido'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}