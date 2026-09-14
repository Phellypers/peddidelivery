import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useCart } from '@/lib/CartContext';
import { useAuth } from '@/lib/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, CreditCard, Truck, Store, Tag, CheckCircle2, Loader2, AlertCircle, MessageCircle, Gift, Check } from 'lucide-react';
import { motion } from 'framer-motion';
import UpsellSection from '@/components/checkout/UpsellSection';
import { emitLiveEvent } from '@/lib/liveSession';

const paymentMethods = [
  { id: 'pix', label: 'Pix', icon: '💠', discount: true },
  { id: 'credit_card', label: 'Cartão de crédito', icon: '💳' },
  { id: 'debit_card', label: 'Cartão de débito', icon: '💳' },
  { id: 'cash', label: 'Dinheiro na entrega', icon: '💵' },
];

export default function Checkout() {
  const { items, subtotal, clearCart } = useCart();
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [store, setStore] = useState(null);
  const [cities, setCities] = useState([]);
  const [step, setStep] = useState('form');
  const [loading, setLoading] = useState(false);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [profileId, setProfileId] = useState(null);

  const [form, setForm] = useState({
    name: '', phone: '', email: '',
    deliveryMethod: 'delivery',
    address: '', city: '', zip: '',
    deliveryNotes: '',
    paymentMethod: 'pix',
    couponCode: '', orderNotes: '',
    cpfOnReceipt: false, cpf: '',
    splitPayment: false,
    splitAmounts: {},
    changeFor: 0,
  });
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [couponError, setCouponError] = useState('');
  const [couponApplied, setCouponApplied] = useState(false);
  const [cityFee, setCityFee] = useState(null);
  const [cityNotFound, setCityNotFound] = useState(false);
  const [saveProfilePrompt, setSaveProfilePrompt] = useState(false);
  const [profileChanged, setProfileChanged] = useState(false);
  const [campaigns, setCampaigns] = useState([]);
  const [userOrderCount, setUserOrderCount] = useState(0);

  useEffect(() => {
    base44.entities.Store.list().then(stores => setStore(stores[0]));
    base44.entities.City.filter({ is_active: true }, 'name').then(setCities);
    base44.entities.Campaign.filter({ is_active: true }).then(setCampaigns);
    emitLiveEvent('checkout', {
      cart_count: items.reduce((s, i) => s + i.quantity, 0),
      cart_items: items.map(i => i.product_name),
    });
  }, []);

  // Fetch user's past order count for order_count campaigns
  useEffect(() => {
    if (!user?.email) return;
    base44.entities.Order.filter({ customer_email: user.email }).then(orders => {
      setUserOrderCount(orders.filter(o => o.status !== 'cancelled').length);
    });
  }, [user]);

  // Auto-fill from profile
  useEffect(() => {
    if (!user?.id || profileLoaded) return;
    base44.entities.CustomerProfile.filter({ user_id: user.id }).then(res => {
      const p = res[0];
      if (p) {
        setProfileId(p.id);
        setForm(prev => ({
          ...prev,
          name: p.name || user.full_name || prev.name,
          phone: p.phone || prev.phone,
          email: p.email || user.email || prev.email,
          address: p.address || prev.address,
          city: p.city || prev.city,
          zip: p.zip || prev.zip,
          deliveryNotes: p.delivery_notes || prev.deliveryNotes,
        }));
      }
      setProfileLoaded(true);
    });
  }, [user, profileLoaded]);

  // Detect city fee
  useEffect(() => {
    if (!form.city || form.deliveryMethod !== 'delivery') { setCityFee(null); setCityNotFound(false); return; }
    const match = cities.find(c => c.name.toLowerCase() === form.city.toLowerCase().trim());
    if (match) {
      setCityFee(match.delivery_fee_type === 'fixed' ? match.delivery_fee_value : match.delivery_fee_type === 'custom' ? null : null);
      setCityNotFound(false);
    } else if (form.city.length > 2) {
      setCityFee(null);
      setCityNotFound(cities.length > 0);
    } else {
      setCityFee(null);
      setCityNotFound(false);
    }
  }, [form.city, cities, form.deliveryMethod]);

  const deliveryFee = form.deliveryMethod === 'delivery'
    ? (cityFee !== null ? cityFee : (store?.free_shipping_above && subtotal >= store.free_shipping_above ? 0 : (store?.flat_delivery_fee || 6.90)))
    : 0;

  const pixDiscount = (!form.splitPayment && form.paymentMethod === 'pix') ? (subtotal * (store?.pix_discount_percent || 5) / 100) : 0;

  // ─── Campaign discounts ───
  const activeCampaigns = campaigns.filter(c => c.is_active);
  const totalItemQty = items.reduce((s, i) => s + i.quantity, 0);

  const cartValueCampaign = activeCampaigns
    .filter(c => c.type === 'cart_value' && subtotal >= (c.min_cart_value || 0))
    .sort((a, b) => {
      const da = a.discount_type === 'percentage' ? subtotal * a.discount_value / 100 : a.discount_value;
      const db = b.discount_type === 'percentage' ? subtotal * b.discount_value / 100 : b.discount_value;
      return db - da;
    })[0];
  const cartValueDiscount = cartValueCampaign
    ? (cartValueCampaign.discount_type === 'percentage' ? subtotal * cartValueCampaign.discount_value / 100 : cartValueCampaign.discount_value)
    : 0;

  const orderCountCampaign = activeCampaigns
    .filter(c => c.type === 'order_count' && userOrderCount >= (c.min_order_count || 0))
    .sort((a, b) => {
      const da = a.discount_type === 'percentage' ? subtotal * a.discount_value / 100 : a.discount_value;
      const db = b.discount_type === 'percentage' ? subtotal * b.discount_value / 100 : b.discount_value;
      return db - da;
    })[0];
  const orderCountDiscount = orderCountCampaign
    ? (orderCountCampaign.discount_type === 'percentage' ? subtotal * orderCountCampaign.discount_value / 100 : orderCountCampaign.discount_value)
    : 0;

  const campaignDiscount = Math.max(cartValueDiscount, orderCountDiscount);
  const appliedCampaign = cartValueDiscount >= orderCountDiscount ? cartValueCampaign : orderCountCampaign;

  const buyGetCampaign = activeCampaigns.find(c => c.type === 'buy_x_get_y' && totalItemQty >= (c.buy_quantity || 0));
  const campaignGifts = [];
  if (buyGetCampaign && items.length > 0) {
    const giftQty = Math.floor(totalItemQty / (buyGetCampaign.buy_quantity || 1)) * (buyGetCampaign.get_quantity || 1);
    const cheapest = [...items].sort((a, b) => (a.unit_price + (a.addon_total || 0)) - (b.unit_price + (b.addon_total || 0)))[0];
    campaignGifts.push({
      product_id: cheapest.product_id,
      product_name: `${cheapest.product_name} (BRINDE)`,
      product_image: cheapest.product_image,
      quantity: giftQty,
      unit_price: 0,
      notes: `Brinde: compre ${buyGetCampaign.buy_quantity} ganhe ${buyGetCampaign.get_quantity}`,
    });
  }

  const total = subtotal - couponDiscount - pixDiscount - campaignDiscount + deliveryFee;

  const updateForm = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (['name', 'phone', 'email', 'address', 'city', 'zip', 'deliveryNotes'].includes(field)) {
      setProfileChanged(true);
    }
  };

  const applyCoupon = async () => {
    setCouponError('');
    if (!form.couponCode.trim()) return;
    const coupons = await base44.entities.Coupon.filter({ code: form.couponCode.toUpperCase(), is_active: true });
    const coupon = coupons[0];
    if (!coupon) { setCouponError('Cupom inválido'); return; }
    if (coupon.min_order_value && subtotal < coupon.min_order_value) { setCouponError(`Pedido mínimo: R$ ${coupon.min_order_value.toFixed(2)}`); return; }
    if (coupon.max_uses && coupon.uses_count >= coupon.max_uses) { setCouponError('Cupom esgotado'); return; }
    const discount = coupon.type === 'percentage' ? subtotal * coupon.value / 100 : coupon.value;
    setCouponDiscount(discount);
    setCouponApplied(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
    const orderNum = String(Date.now()).slice(-6);
    await base44.entities.Order.create({
      order_number: orderNum,
      customer_name: form.name,
      customer_phone: form.phone,
      customer_email: user?.email || form.email,
      customer_cpf: form.cpfOnReceipt ? form.cpf : '',
      status: 'pending',
      items: [
        ...items.map(i => ({
          product_id: i.product_id,
          product_name: i.product_name,
          product_image: i.product_image,
          quantity: i.quantity,
          unit_price: i.unit_price,
          variation: i.variation,
          custom_fields: i.custom_fields || {},
          addons: i.addons?.map(a => a.name) || [],
          notes: i.notes
        })),
        ...campaignGifts,
      ],
      subtotal,
      discount: couponDiscount + pixDiscount + campaignDiscount,
      delivery_fee: deliveryFee,
      total,
      coupon_code: couponApplied ? form.couponCode : '',
      payment_method: form.splitPayment ? 'split' : form.paymentMethod,
      payment_status: 'pending',
      change_for: form.paymentMethod === 'cash' && !form.splitPayment ? (form.changeFor || 0) : 0,
      delivery_method: form.deliveryMethod,
      delivery_address: form.address,
      delivery_city: form.city,
      delivery_zip: form.zip,
      delivery_notes: form.deliveryNotes,
      order_notes: form.orderNotes,
      sale_origin: 'catalog'
    });
    emitLiveEvent('concluida');
    clearCart();
    // Prompt to save profile if user is logged in and changed data
    if (isAuthenticated && user && profileChanged) {
      setSaveProfilePrompt(true);
    } else {
      setStep('success');
    }
    } catch (error) { console.error(error); }
    finally { setLoading(false); }
  };

  const saveProfile = async () => {
    const data = {
      user_id: user.id,
      name: form.name,
      phone: form.phone,
      email: form.email,
      address: form.address,
      city: form.city,
      zip: form.zip,
      delivery_notes: form.deliveryNotes,
    };
    if (profileId) await base44.entities.CustomerProfile.update(profileId, data);
    else await base44.entities.CustomerProfile.create(data);
    setSaveProfilePrompt(false);
    setStep('success');
  };

  if (items.length === 0 && step !== 'success' && !saveProfilePrompt) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4">
        <p className="text-muted-foreground mb-4">Seu carrinho está vazio</p>
        <Link to="/loja" className="text-primary font-medium">Voltar ao cardápio</Link>
      </div>
    );
  }

  // Save profile prompt
  if (saveProfilePrompt) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-card rounded-2xl border border-border p-6 max-w-sm w-full text-center space-y-4">
          <div className="text-4xl">💾</div>
          <h2 className="font-heading font-bold text-lg text-foreground">Salvar seus dados?</h2>
          <p className="text-sm text-muted-foreground">Deseja salvar nome, WhatsApp, e-mail e endereço no seu perfil para preencher automaticamente nas próximas compras?</p>
          <div className="flex gap-3">
            <button onClick={() => { setSaveProfilePrompt(false); setStep('success'); }} className="flex-1 py-2.5 rounded-xl border border-border text-sm font-medium hover:bg-muted transition-colors">Não, obrigado</button>
            <button onClick={saveProfile} className="flex-1 py-2.5 rounded-xl bg-primary text-white text-sm font-bold hover:bg-primary/90 transition-colors">Salvar</button>
          </div>
        </motion.div>
      </div>
    );
  }

  if (step === 'success') {
    const whatsapp = store?.whatsapp?.replace(/\D/g, '');
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4 text-center">
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="mb-6">
          <CheckCircle2 size={72} className="text-green-500 mx-auto" />
        </motion.div>
        <h1 className="font-heading font-bold text-2xl text-foreground mb-2">Pedido realizado! 🎉</h1>
        <p className="text-muted-foreground mb-6">Você receberá a confirmação em breve.</p>
        <div className="flex flex-col gap-3 w-full max-w-xs">
          <Link to="/loja" className="bg-primary text-primary-foreground px-6 py-3 rounded-xl font-heading font-bold text-sm hover:bg-primary/90 transition-colors text-center">
            Voltar ao cardápio
          </Link>
          {whatsapp && (
            <a href={`https://wa.me/55${whatsapp}?text=Preciso+de+ajuda+com+meu+pedido`} target="_blank" rel="noreferrer"
              className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl border border-border text-sm font-medium hover:bg-muted transition-colors">
              <MessageCircle size={16} className="text-green-600" /> Precisa de ajuda? Fale conosco
            </a>
          )}
        </div>
      </div>
    );
  }

  const whatsapp = store?.whatsapp?.replace(/\D/g, '');

  return (
    <div className="min-h-screen bg-background pb-8">
      <div className="sticky top-0 z-30 bg-card/95 backdrop-blur-md border-b border-border">
        <div className="max-w-2xl mx-auto px-4 flex items-center h-14">
          <Link to="/loja" className="p-2 -ml-2 hover:bg-accent rounded-full transition-colors">
            <ArrowLeft size={20} />
          </Link>
          <h1 className="font-heading font-bold text-lg ml-2">Finalizar Pedido</h1>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="max-w-2xl mx-auto px-4 mt-6 space-y-6">
        {/* Dados do cliente */}
        <Section title="Seus dados" icon={<span className="text-lg">👤</span>}>
          <Input label="Nome completo" value={form.name} onChange={v => updateForm('name', v)} required />
          <Input label="WhatsApp" value={form.phone} onChange={v => updateForm('phone', v)} placeholder="(11) 99999-9999" required />
          <Input label="E-mail (opcional)" value={form.email} onChange={v => updateForm('email', v)} type="email" />

          {/* CPF na nota */}
          <div>
            <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
              <input type="checkbox" checked={form.cpfOnReceipt} onChange={e => updateForm('cpfOnReceipt', e.target.checked)} className="w-4 h-4 accent-primary" />
              <span className="font-medium text-foreground">Desejo CPF na nota</span>
            </label>
            {form.cpfOnReceipt && (
              <input
                value={form.cpf}
                onChange={e => updateForm('cpf', e.target.value)}
                placeholder="000.000.000-00"
                className="mt-2 w-full px-4 py-2.5 bg-muted rounded-xl text-sm border-0 focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            )}
          </div>
        </Section>

        {/* Entrega */}
        <Section title="Entrega" icon={<Truck size={20} className="text-primary" />}>
          <div className="grid grid-cols-2 gap-2 mb-4">
            {[
              { id: 'delivery', label: 'Entrega', icon: <Truck size={18} /> },
              { id: 'pickup', label: 'Retirada', icon: <Store size={18} /> }
            ].map(opt => (
              <button key={opt.id} type="button" onClick={() => updateForm('deliveryMethod', opt.id)}
                className={`flex items-center justify-center gap-2 p-3 rounded-xl text-sm font-medium transition-all ${form.deliveryMethod === opt.id ? 'bg-primary text-primary-foreground shadow-sm' : 'bg-muted text-foreground'}`}>
                {opt.icon} {opt.label}
              </button>
            ))}
          </div>
          {form.deliveryMethod === 'delivery' && (
            <>
              <Input label="Endereço completo" value={form.address} onChange={v => updateForm('address', v)} required />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Cidade *</label>
                  <input
                    list="cities-list"
                    value={form.city}
                    onChange={e => updateForm('city', e.target.value)}
                    placeholder="Sua cidade"
                    className="w-full px-4 py-2.5 bg-muted rounded-xl text-sm border-0 focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                  <datalist id="cities-list">
                    {cities.map(c => <option key={c.id} value={c.name} />)}
                  </datalist>
                </div>
                <Input label="CEP" value={form.zip} onChange={v => updateForm('zip', v)} />
              </div>
              <Input label="Complemento / Referência" value={form.deliveryNotes} onChange={v => updateForm('deliveryNotes', v)} />

              {/* City not found warning */}
              {cityNotFound && (
                <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
                  <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
                  <span>No momento não entregamos para essa região.</span>
                </div>
              )}

              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-xl text-sm">
                <span className="text-muted-foreground">Taxa de entrega</span>
                <span className="font-bold">{deliveryFee === 0 ? <span className="text-green-600">Grátis!</span> : `R$ ${deliveryFee.toFixed(2)}`}</span>
              </div>
            </>
          )}
          {form.deliveryMethod === 'pickup' && (
            <p className="text-sm text-muted-foreground p-3 bg-muted/50 rounded-xl">
              📍 Retire em: {store?.address || 'Endereço da loja'}
            </p>
          )}
        </Section>

        {/* Pagamento */}
        <Section title="Pagamento" icon={<CreditCard size={20} className="text-primary" />}>
          {/* Split toggle */}
          <label className="flex items-center gap-2 text-sm cursor-pointer select-none mb-3">
            <input type="checkbox" checked={form.splitPayment} onChange={e => updateForm('splitPayment', e.target.checked)} className="w-4 h-4 accent-primary" />
            <span className="font-medium">Dividir pagamento entre formas</span>
          </label>

          {!form.splitPayment ? (
            <div className="space-y-2">
              {paymentMethods.map(method => (
                <button key={method.id} type="button" onClick={() => updateForm('paymentMethod', method.id)}
                  className={`flex items-center justify-between w-full px-4 py-3 rounded-xl text-sm transition-all ${form.paymentMethod === method.id ? 'bg-primary/10 border-2 border-primary' : 'bg-muted border-2 border-transparent'}`}>
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{method.icon}</span>
                    <span className="font-medium">{method.label}</span>
                  </div>
                  {method.discount && store?.pix_discount_percent > 0 && (
                    <span className="text-xs text-green-600 font-bold">-{store.pix_discount_percent}%</span>
                  )}
                  </button>
                  ))}
                  {form.paymentMethod === 'cash' && (
                  <div className="flex items-center gap-2 p-3 bg-amber-50 rounded-xl">
                  <span className="text-sm text-amber-700 font-medium whitespace-nowrap">💵 Troco para:</span>
                  <input
                    type="number"
                    step="0.01"
                    value={form.changeFor || ''}
                    onChange={e => updateForm('changeFor', parseFloat(e.target.value) || 0)}
                    placeholder="R$ 0,00"
                    className="flex-1 px-3 py-1.5 bg-white rounded-lg text-sm border-0 focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                  </div>
                  )}
                  </div>
                  ) : (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">Total: R$ {total.toFixed(2)}. Informe o valor em cada forma:</p>
              {paymentMethods.map(method => (
                <div key={method.id} className="flex items-center gap-3">
                  <span className="text-base w-6">{method.icon}</span>
                  <span className="text-sm flex-1">{method.label}</span>
                  <div className="flex items-center gap-1 bg-muted rounded-xl px-2">
                    <span className="text-xs text-muted-foreground">R$</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={form.splitAmounts[method.id] || ''}
                      onChange={e => updateForm('splitAmounts', { ...form.splitAmounts, [method.id]: parseFloat(e.target.value) || 0 })}
                      className="w-20 py-2 bg-transparent text-sm border-0 focus:outline-none text-right"
                      placeholder="0,00"
                    />
                  </div>
                </div>
              ))}
              {(() => {
                const splitTotal = Object.values(form.splitAmounts).reduce((s, v) => s + (v || 0), 0);
                const diff = total - splitTotal;
                return diff !== 0 ? (
                  <p className={`text-xs font-medium ${diff > 0 ? 'text-amber-600' : 'text-red-500'}`}>
                    {diff > 0 ? `Faltam R$ ${diff.toFixed(2)}` : `Excedeu R$ ${Math.abs(diff).toFixed(2)}`}
                  </p>
                ) : <p className="text-xs text-green-600 font-medium">✓ Valores conferem</p>;
              })()}
            </div>
          )}
        </Section>

        {/* Cupom */}
        <Section title="Cupom de desconto" icon={<Tag size={20} className="text-primary" />}>
          <div className="flex gap-2">
            <input
              value={form.couponCode}
              onChange={e => { updateForm('couponCode', e.target.value.toUpperCase()); setCouponError(''); setCouponApplied(false); setCouponDiscount(0); }}
              placeholder="Digite o código"
              className="flex-1 px-4 py-2.5 bg-muted rounded-xl text-sm border-0 focus:outline-none focus:ring-2 focus:ring-primary/20 uppercase"
              disabled={couponApplied}
            />
            <button type="button" onClick={applyCoupon} disabled={couponApplied} className="px-4 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-medium disabled:opacity-50">
              {couponApplied ? '✓' : 'Aplicar'}
            </button>
          </div>
          {couponError && <p className="text-xs text-destructive mt-1 flex items-center gap-1"><AlertCircle size={12} /> {couponError}</p>}
          {couponApplied && <p className="text-xs text-green-600 mt-1">Cupom aplicado! Desconto de R$ {couponDiscount.toFixed(2)}</p>}
        </Section>

        <UpsellSection />

        {/* Observações */}
        <div className="mb-4">
          <label className="text-sm font-medium text-foreground mb-1 block">Observações do pedido</label>
          <textarea
            value={form.orderNotes}
            onChange={e => updateForm('orderNotes', e.target.value)}
            placeholder="Alguma observação?"
            className="w-full px-4 py-3 bg-muted rounded-xl text-sm border-0 focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
            rows={2}
          />
        </div>

        {/* Benefícios aplicados — apenas campanhas que se aplicam ao pedido atual */}
        {(() => {
          const applicable = activeCampaigns.filter(c =>
            (c.type === 'cart_value' && subtotal >= (c.min_cart_value || 0))
            || (c.type === 'order_count' && userOrderCount >= (c.min_order_count || 0))
            || (c.type === 'buy_x_get_y' && totalItemQty >= (c.buy_quantity || 0))
          );
          if (applicable.length === 0) return null;
          return (
            <div className="bg-green-50 border border-green-200 rounded-2xl p-4 space-y-2">
              <p className="text-xs font-bold text-green-700 uppercase tracking-wide flex items-center gap-1">
                <Gift size={14} /> Benefícios aplicados
              </p>
              {applicable.map(c => (
                <div key={c.id} className="text-xs flex items-center justify-between text-green-700 font-medium">
                  <span>{c.name}</span>
                  <Check size={14} />
                </div>
              ))}
            </div>
          );
        })()}

        {/* Resumo */}
        <div className="bg-card rounded-2xl border border-border p-5 space-y-3">
          <h3 className="font-heading font-bold text-foreground">Resumo do pedido</h3>
          <div className="space-y-2 text-sm">
            {items.map(item => (
              <div key={item.key} className="flex justify-between">
                <span className="text-muted-foreground">{item.quantity}x {item.product_name}</span>
                <span>R$ {((item.unit_price + item.addon_total) * item.quantity).toFixed(2)}</span>
              </div>
            ))}
            {campaignGifts.map((g, i) => (
              <div key={`gift-${i}`} className="flex justify-between text-green-600 font-medium">
                <span>🎁 {g.quantity}x {g.product_name}</span>
                <span>Grátis</span>
              </div>
            ))}
          </div>
          <div className="border-t border-border pt-3 space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>R$ {subtotal.toFixed(2)}</span></div>
            {couponDiscount > 0 && <div className="flex justify-between text-green-600"><span>Cupom</span><span>-R$ {couponDiscount.toFixed(2)}</span></div>}
            {pixDiscount > 0 && <div className="flex justify-between text-green-600"><span>Desconto Pix</span><span>-R$ {pixDiscount.toFixed(2)}</span></div>}
            {campaignDiscount > 0 && <div className="flex justify-between text-green-600"><span>Campanha{appliedCampaign ? `: ${appliedCampaign.name}` : ''}</span><span>-R$ {campaignDiscount.toFixed(2)}</span></div>}
            {form.deliveryMethod === 'delivery' && <div className="flex justify-between"><span className="text-muted-foreground">Entrega</span><span>{deliveryFee === 0 ? 'Grátis' : `R$ ${deliveryFee.toFixed(2)}`}</span></div>}
            <div className="flex justify-between font-heading font-bold text-lg pt-2 border-t border-border">
              <span>Total</span>
              <span className="text-primary">R$ {total.toFixed(2)}</span>
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading || !form.name || !form.phone || cityNotFound}
          className="w-full bg-primary text-primary-foreground py-4 rounded-2xl font-heading font-bold text-base hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {loading ? <Loader2 className="animate-spin" size={20} /> : 'Finalizar Pedido'}
        </button>

        {/* Botão de suporte */}
        {whatsapp && (
          <a href={`https://wa.me/55${whatsapp}?text=Preciso+de+ajuda+com+meu+pedido`} target="_blank" rel="noreferrer"
            className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border border-border text-sm font-medium text-muted-foreground hover:bg-muted transition-colors">
            <MessageCircle size={16} className="text-green-600" /> Precisa de ajuda? Fale com o atendente
          </a>
        )}
      </form>
    </div>
  );
}

function Section({ title, icon, children }) {
  return (
    <div className="bg-card rounded-2xl border border-border/50 p-5">
      <div className="flex items-center gap-2 mb-4">
        {icon}
        <h2 className="font-heading font-semibold text-foreground">{title}</h2>
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function Input({ label, value, onChange, type = 'text', placeholder, required }) {
  return (
    <div>
      <label className="text-xs font-medium text-muted-foreground mb-1 block">{label}{required && ' *'}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder || label}
        required={required}
        className="w-full px-4 py-2.5 bg-muted rounded-xl text-sm border-0 focus:outline-none focus:ring-2 focus:ring-primary/20"
      />
    </div>
  );
}
