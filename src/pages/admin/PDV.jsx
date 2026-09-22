import React, { useState, useEffect, useRef, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Search, Plus, Minus, Trash2, X, Check, Loader2, UserPlus, Truck, Store, UtensilsCrossed, ShoppingCart, User, Printer, Keyboard, BarChart3 } from 'lucide-react';
import { printOrder } from '@/components/admin/OrdersPresentation';

const PAYMENT_OPTIONS = [
  { id: 'cash', label: 'Dinheiro' },
  { id: 'pix', label: 'PIX' },
  { id: 'credit_card', label: 'Cartão de crédito' },
  { id: 'debit_card', label: 'Cartão de débito' },
  { id: 'voucher', label: 'Voucher' },
  { id: 'to_arrange', label: 'A combinar' },
];

const MONTHS = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
const toCents = value => Math.max(0, Math.round((Number(value) || 0) * 100));
const fromCents = value => value / 100;

export default function PDV() {
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [categoryFilter, setCategoryFilter] = useState('');
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
  const [existingAdjustment, setExistingAdjustment] = useState(0);
  const submittingRef = useRef(false);

  useEffect(() => {
    Promise.all([
      base44.entities.CustomerProfile.list('-total_orders'),
      base44.entities.Product.list('-created_date'),
      base44.entities.Table.list('sort_order'),
      base44.entities.Category.filter({is_active:true},'sort_order'),
    ]).then(async ([custs, prods, tbls, cats]) => {
      setCustomers(custs);
      setProducts(prods);
      setTables(tbls);
      setCategories(cats);
      const urlParams = new URLSearchParams(window.location.search);
      const tableParam = urlParams.get('table');
      const orderParam = urlParams.get('order');
      if (orderParam) {
        try {
          const order = await base44.entities.Order.get(orderParam);
          setCart(order.items?.map(i => ({ product_id: i.product_id, product_name: i.product_name, product_image: i.product_image, quantity: i.quantity, unit_price: i.unit_price, notes: i.notes || '' })) || []);
          const itemSubtotal = (order.items || []).reduce((sum, item) => sum + Number(item.unit_price || 0) * Number(item.quantity || 0), 0);
          setExistingAdjustment(Number(order.total || 0) - itemSubtotal);
          setPayments([{ method: order.payment_method === 'to_arrange' ? 'cash' : order.payment_method || 'cash', amount: Number(order.total || 0).toFixed(2) }]);
          setEditingOrder({ ...order });
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
    (!productSearch || p.name?.toLowerCase().includes(productSearch.toLowerCase())) && (!categoryFilter || p.category_ids?.includes(categoryFilter))
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
  const total = subtotal + (orderType === 'delivery' ? parseFloat(deliveryFee) || 0 : 0) + (editingOrder ? existingAdjustment : 0);
  const totalCents = toCents(total);
  const paidCents = payments.reduce((sum, payment) => sum + toCents(payment.amount), 0);
  const hasCashPayment = payments.some(payment => payment.method === 'cash' && toCents(payment.amount) > 0);
  const remainingCents = Math.max(0, totalCents - paidCents);
  const changeCents = hasCashPayment ? Math.max(0, paidCents - totalCents) : 0;
  const invalidExcessCents = hasCashPayment ? 0 : Math.max(0, paidCents - totalCents);
  const paidAmount = fromCents(paidCents);
  const remaining = fromCents(remainingCents);
  const change = fromCents(changeCents);
  const paymentComplete = totalCents > 0 && remainingCents === 0 && invalidExcessCents === 0;
  const selectedTable = tables.find(t => t.id === selectedTableId);
  const tableLabel = selectedTableId === 'balcao' ? 'Balcão' : selectedTable?.name || '';

  const updatePayment = (idx, key, value) => setPayments(prev => prev.map((p, k) => k === idx ? { ...p, [key]: value } : p));
  const removePayment = (idx) => setPayments(prev => prev.filter((_, k) => k !== idx));
  const addPayment = useCallback(() => setPayments(prev => [...prev, { method: 'cash', amount: '' }]), []);

  const getPaymentData = () => {
    let changeLeft = changeCents;
    const splitPayments = {};
    const effectivePayments = payments.filter(payment => toCents(payment.amount) > 0);
    effectivePayments.forEach(payment => {
      let cents = toCents(payment.amount);
      if (payment.method === 'cash' && changeLeft > 0) {
        const deduction = Math.min(cents, changeLeft);
        cents -= deduction;
        changeLeft -= deduction;
      }
      if (cents > 0) splitPayments[payment.method] = fromCents((toCents(splitPayments[payment.method]) || 0) + cents);
    });
    const cashReceived = fromCents(payments.filter(p => p.method === 'cash').reduce((sum, p) => sum + toCents(p.amount), 0));
    return {
      payment_method: effectivePayments.length > 1 ? 'split' : effectivePayments[0]?.method || 'cash',
      payment_status: 'paid',
      split_payments: effectivePayments.length > 1 ? splitPayments : undefined,
      cash_received: cashReceived || undefined,
      change_for: change > 0 ? cashReceived : undefined,
      change_amount: change || 0,
    };
  };

  const ensureFinancialEntry = async order => {
    const existing = await base44.entities.Account.filter({ order_id: order.id }).catch(() => []);
    if (existing.length) return existing[0];
    const today = new Date().toISOString().slice(0, 10);
    return base44.entities.Account.create({
      description: `Venda PDV • Pedido #${order.order_number}`,
      type: 'receivable', amount: Number(order.total) || 0, due_date: today,
      status: 'received', paid_date: today, category: 'Receita',
      notes: 'Lançamento automático do PDV. O valor informado não inclui troco.',
      source: 'pdv', order_id: order.id, is_recurring: false,
    });
  };

  const handleLaunchOnTable = async () => {
    if (submittingRef.current || cart.length === 0 || !selectedTableId || selectedTableId === 'balcao') return;
    submittingRef.current = true;
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
        const updated = await base44.entities.Order.update(existing.id, { items: merged, subtotal: newSub, total: newSub, table_additions_count: Number(existing.table_additions_count || 1) + 1 });
        setSuccess({ ...existing, ...updated, items: merged, subtotal: newSub, total: newSub });
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
        await base44.entities.Table.update(selectedTableId, { status: 'open', current_order_id: order.id, current_order_number: order.order_number, opened_at: new Date().toISOString() });
        setSuccess(order);
      }
      setSuccessMode('launch');
      setCart([]);
      setSelectedTableId('');
    } catch (_) { submittingRef.current = false; }
    setSaving(false);
  };

  const handleSubmit = async () => {
    if (submittingRef.current || cart.length === 0 || !paymentComplete) return;
    submittingRef.current = true;
    setSaving(true);
    try {
      const paymentData = getPaymentData();
      if (editingOrder) {
        const updated = await base44.entities.Order.update(editingOrder.id, {
          items: cart.map(i => ({ product_id: i.product_id, product_name: i.product_name, product_image: i.product_image, quantity: i.quantity, unit_price: i.unit_price, notes: i.notes })),
          subtotal, total,
          ...paymentData,
          status: 'delivered',
          closed_at: new Date().toISOString(),
          closed_by: 'admin',
          closed_via: 'pdv',
          order_notes: orderNotes + (payments.length > 1 ? `\nPagamento dividido: ${payments.map(p => `${PAYMENT_OPTIONS.find(o => o.id === p.method)?.label || p.method} R$ ${(parseFloat(p.amount) || 0).toFixed(2)}`).join(' + ')}` : ''),
        });
        if (selectedTableId && selectedTableId !== 'balcao') {
          await base44.entities.Table.update(selectedTableId, { status: 'free', current_order_id: '', current_order_number: '', opened_at: '', closing_started_at: '', closing_started_by: '' });
        }
        setSuccessMode('finalize');
        const completedOrder = { ...editingOrder, ...updated, total, subtotal, ...paymentData };
        await ensureFinancialEntry(completedOrder);
        setSuccess(completedOrder);
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
        ...paymentData,
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

      await ensureFinancialEntry(order);

      if (selectedTableId && selectedTableId !== 'balcao') {
        await base44.entities.Table.update(selectedTableId, { status: 'open', current_order_id: order.id, current_order_number: order.order_number, opened_at: new Date().toISOString() });
      }
      setSuccessMode('create');
      setSuccess(order);
      setCart([]);
      setSelectedCustomer(null);
      setShowNewCustomer(false);
      setPayments([{ method: 'cash', amount: '' }]);
      setSelectedTableId('');
      setEditingOrder(null);
    } catch (_) { submittingRef.current = false; }
    setSaving(false);
  };

  const closeSuccess = useCallback(() => {
    setSuccess(null);
    setSuccessMode('create');
    submittingRef.current = false;
  }, []);

  const confirmPrint = useCallback(async () => {
    if (!success) return;
    await printOrder(success);
    closeSuccess();
  }, [success, closeSuccess]);

  const cancelCurrentAction = useCallback(() => {
    if (success) return closeSuccess();
    if (showNewCustomer || showCustomerResults) {
      setShowNewCustomer(false);
      setShowCustomerResults(false);
      return;
    }
    if (cart.length && window.confirm('Deseja cancelar o pedido atual e limpar o carrinho?')) {
      setCart([]);
      setPayments([{ method: 'cash', amount: '' }]);
      setOrderNotes('');
    }
  }, [success, closeSuccess, showNewCustomer, showCustomerResults, cart.length]);

  useEffect(() => {
    const onKeyDown = event => {
      if (event.key === 'F4') { event.preventDefault(); addPayment(); return; }
      if (event.key === 'F9') { event.preventDefault(); handleSubmit(); return; }
      if (event.key === 'Escape') { event.preventDefault(); cancelCurrentAction(); return; }
      if (event.key === 'Enter' && success) { event.preventDefault(); confirmPrint(); }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  });

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

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.08fr)_minmax(420px,.92fr)]">
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
            <h2 className="font-heading font-semibold text-sm">Produtos</h2>
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input value={productSearch} onChange={e => setProductSearch(e.target.value)} placeholder="Buscar produto..." className={inp + ' pl-9'} />
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1"><button onClick={()=>setCategoryFilter('')} className={`rounded-full px-4 py-2 text-xs font-semibold ${!categoryFilter?'bg-primary text-white':'bg-gray-100 text-gray-600'}`}>Todos</button>{categories.map(category=><button key={category.id} onClick={()=>setCategoryFilter(category.id)} className={`whitespace-nowrap rounded-full px-4 py-2 text-xs font-semibold ${categoryFilter===category.id?'bg-primary text-white':'bg-gray-100 text-gray-600'}`}>{category.name}</button>)}</div>
            <div className="grid max-h-[520px] grid-cols-1 gap-3 overflow-y-auto md:grid-cols-2">
              {filteredProducts.map(p => (
                <button key={p.id} onClick={() => addToCart(p)} className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-3 text-left transition hover:border-primary/40 hover:shadow-sm">
                  <img src={p.images?.[0] || '/vite.svg'} alt="" className="h-16 w-16 flex-shrink-0 rounded-xl bg-gray-50 object-cover" />
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm font-bold">{p.name}</p><p className="mt-1 line-clamp-2 text-xs leading-5 text-gray-500">{p.description}</p>
                    <p className="mt-1 text-sm text-primary font-bold">R$ {(p.promo_price || p.price)?.toFixed(2)}</p>
                  </div>
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-white"><Plus size={17}/></span>
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
              <div key={idx} className="space-y-2 rounded-xl border border-gray-100 p-2.5">
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(170px,1fr)_minmax(120px,160px)_auto] sm:items-end">
                  <label className="min-w-0">
                    <span className="mb-1.5 block text-[11px] font-semibold text-gray-500">Forma de pagamento</span>
                    <select aria-label={`Forma de pagamento ${idx + 1}`} value={pay.method} onChange={e => updatePayment(idx, 'method', e.target.value)} className={inp + ' min-w-0'}>
                      {PAYMENT_OPTIONS.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
                    </select>
                  </label>
                  <label className="min-w-0">
                    <span className="mb-1.5 block text-[11px] font-semibold text-gray-500">{pay.method === 'cash' ? 'Valor recebido' : 'Valor pago'}</span>
                    <input aria-label={pay.method === 'cash' ? 'Valor recebido' : 'Valor pago'} type="number" min="0" step="0.01" placeholder="0,00" value={pay.amount} onChange={e => updatePayment(idx, 'amount', e.target.value)} className={inp + ' min-w-0'} />
                  </label>
                  {payments.length > 1 && <button type="button" aria-label="Remover pagamento" onClick={() => removePayment(idx)} className="flex h-10 w-10 items-center justify-center rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600"><Trash2 size={14} /></button>}
                </div>
                {pay.method === 'cash' && <div><div className="grid grid-cols-3 gap-2">
                  <button type="button" onClick={() => updatePayment(idx, 'amount', fromCents(Math.max(0, totalCents - (paidCents - toCents(pay.amount)))).toFixed(2))} className="px-2 py-2 rounded-lg bg-gray-50 border border-gray-200 text-xs font-semibold hover:border-primary hover:text-primary">Valor exato</button>
                  <button type="button" onClick={() => updatePayment(idx, 'amount', '50.00')} className="px-2 py-2 rounded-lg bg-gray-50 border border-gray-200 text-xs font-semibold hover:border-primary hover:text-primary">R$ 50</button>
                  <button type="button" onClick={() => updatePayment(idx, 'amount', '100.00')} className="px-2 py-2 rounded-lg bg-gray-50 border border-gray-200 text-xs font-semibold hover:border-primary hover:text-primary">R$ 100</button>
                </div></div>}
              </div>
            ))}
            <button type="button" onClick={addPayment} className="flex items-center gap-1 text-xs text-primary font-semibold hover:underline"><Plus size={12} /> Adicionar forma de pagamento <kbd className="ml-auto rounded bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-500">F4</kbd></button>
            {changeCents > 0 && <div className="text-sm font-bold px-3 py-2.5 rounded-xl bg-green-50 text-green-700">Troco: R$ {change.toFixed(2)}</div>}
            {remainingCents > 0 && <div className="text-xs font-semibold px-3 py-2 rounded-xl bg-orange-50 text-orange-700">Falta pagar: R$ {remaining.toFixed(2)}</div>}
            {invalidExcessCents > 0 && <div className="text-xs font-semibold px-3 py-2 rounded-xl bg-red-50 text-red-700">Valor excedido: R$ {fromCents(invalidExcessCents).toFixed(2)}. Troco apenas para Dinheiro.</div>}
            {paymentComplete && <div className="text-xs font-semibold px-3 py-2 rounded-xl bg-green-50 text-green-700">Pagamento completo</div>}

            {orderType === 'delivery' && (
              <div><label className={lbl}>Taxa de entrega (R$)</label><input type="number" step="0.01" value={deliveryFee} onChange={e => setDeliveryFee(e.target.value)} className={inp} placeholder="0,00" /></div>
            )}

            <div><label className={lbl}>Observações do pedido</label><textarea value={orderNotes} onChange={e => setOrderNotes(e.target.value)} rows={2} className={inp + ' resize-none'} placeholder="Observações gerais..." /></div>

            <div className="border-t border-gray-100 pt-3 space-y-1 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">Subtotal</span><span>R$ {subtotal.toFixed(2)}</span></div>
              {orderType === 'delivery' && <div className="flex justify-between"><span className="text-gray-500">Entrega</span><span>R$ {(parseFloat(deliveryFee) || 0).toFixed(2)}</span></div>}
              {editingOrder && existingAdjustment !== 0 && <div className="flex justify-between"><span className="text-gray-500">Taxas e descontos da comanda</span><span>{existingAdjustment >= 0 ? '+' : '-'} R$ {Math.abs(existingAdjustment).toFixed(2)}</span></div>}
              <div className="flex justify-between font-heading font-bold text-base pt-1"><span>Total</span><span className="text-primary">R$ {total.toFixed(2)}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Valor pago</span><span>R$ {paidAmount.toFixed(2)}</span></div>
              <div className="flex justify-between font-semibold"><span>Restante</span><span className={remainingCents ? 'text-orange-600' : 'text-green-600'}>R$ {remaining.toFixed(2)}</span></div>
            </div>

            <div className="flex items-center gap-2 rounded-xl bg-green-50 px-3 py-2 text-[11px] font-medium text-green-700"><BarChart3 size={14} />Esta venda será registrada automaticamente em Financeiro → Lançamentos.</div>

            {editingOrder ? (
              <button onClick={handleSubmit} disabled={saving || cart.length === 0 || !paymentComplete} className="w-full py-3 bg-green-600 text-white rounded-xl font-bold text-sm hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
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
                <button onClick={handleSubmit} disabled={saving || cart.length === 0 || !paymentComplete} className="w-full py-3 bg-primary text-white rounded-xl font-bold text-sm hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                  {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                  {saving ? 'Lançando...' : 'Lançar pedido'}
                </button>
              </div>
            )}
            <div className="rounded-xl border border-gray-200 bg-gray-50/70 p-3">
              <div className="mb-2 flex items-center gap-2 text-xs font-semibold"><Keyboard size={14} />Atalhos do teclado</div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <button type="button" onClick={addPayment} className="rounded-lg px-2 py-1.5 text-left text-[10px] hover:bg-white"><kbd className="font-bold">F4</kbd> Adicionar pagamento</button>
                <button type="button" onClick={handleSubmit} disabled={!paymentComplete || saving} className="rounded-lg px-2 py-1.5 text-left text-[10px] hover:bg-white disabled:opacity-50"><kbd className="font-bold">F9</kbd> Lançar pedido</button>
                <button type="button" onClick={success ? confirmPrint : handleSubmit} disabled={!success && (!paymentComplete || saving)} className="rounded-lg px-2 py-1.5 text-left text-[10px] hover:bg-white disabled:opacity-50"><kbd className="font-bold">Enter</kbd> Confirmar</button>
                <button type="button" onClick={cancelCurrentAction} className="rounded-lg px-2 py-1.5 text-left text-[10px] hover:bg-white"><kbd className="font-bold">Esc</kbd> Cancelar/fechar</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {success && <div data-peddi-modal="" className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/45 p-4" onClick={closeSuccess}>
        <div role="dialog" aria-modal="true" aria-labelledby="pdv-success-title" className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl sm:p-7" onClick={event => event.stopPropagation()}>
          <button type="button" aria-label="Fechar" onClick={closeSuccess} className="ml-auto flex h-9 w-9 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100"><X size={20} /></button>
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-green-100 text-green-600"><Check size={40} /></div>
          <div className="mt-4 text-center"><h2 id="pdv-success-title" className="font-heading text-xl font-bold">{successMode === 'launch' ? 'Itens lançados com sucesso!' : 'Pedido lançado com sucesso!'}</h2><p className="mt-1 text-sm text-gray-500">Pedido #{success.order_number} salvo com sucesso.</p></div>
          <div className="my-5 border-t border-gray-100 pt-5 text-center text-sm font-semibold">Deseja imprimir a etiqueta deste pedido?</div>
          <div className="grid grid-cols-2 gap-3"><button type="button" onClick={closeSuccess} className="rounded-xl border border-gray-300 px-4 py-3 text-sm font-bold hover:bg-gray-50">Não</button><button type="button" onClick={confirmPrint} className="flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-bold text-white hover:bg-primary/90"><Printer size={17} />Sim</button></div>
          <p className="mt-3 text-center text-[11px] text-gray-400">Enter para imprimir • Esc para fechar</p>
        </div>
      </div>}
    </div>
  );
}
