import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useCart } from '@/lib/CartContext';
import { useAuth } from '@/lib/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, CreditCard, Truck, Store, Tag, CheckCircle2, Loader2, AlertCircle, MessageCircle, Gift, Check } from 'lucide-react';
import { motion } from 'framer-motion';
import UpsellSection from '@/components/checkout/UpsellSection';
import { emitLiveEvent } from '@/lib/liveSession';
import SafeBackButton from '@/components/navigation/SafeBackButton';
import { simulateExternalAction } from '@/lib/presentationDemo';
import { getSplitPaymentStatus } from '@/lib/splitPayment';
import { findDeliveryArea, normalizePostalCode, validateDeliveryAddress } from '@/lib/deliveryArea';
import { isPresentationDemo } from '@/lib/presentationDemo';

const paymentMethods = [
  { id: 'pix', label: 'Pix', icon: '💠', discount: true },
  { id: 'credit_card', label: 'Cartão de crédito', icon: '💳' },
  { id: 'debit_card', label: 'Cartão de débito', icon: '💳' },
  { id: 'cash', label: 'Dinheiro na entrega', icon: '💵' },
];
const formatMoney = value => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

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
    address: '', city: '', neighborhood: '', state: '', zip: '',
    deliveryNotes: '',
    paymentMethod: 'pix',
    couponCode: '', orderNotes: '',
    cpfOnReceipt: false, cpf: '',
    splitPayment: false,
    splitAmounts: {},
    changeFor: 0,
  });
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [couponError, setCouponError] = useState('');
  const [couponApplied, setCouponApplied] = useState(false);
  useEffect(() => {
    if (appliedCoupon && subtotal < Number(appliedCoupon.min_order_value || 0)) {
      setAppliedCoupon(null);
      setCouponApplied(false);
      setCouponError(`Cupom removido: pedido mínimo de ${formatMoney(appliedCoupon.min_order_value)}.`);
    }
  }, [subtotal, appliedCoupon]);
  const [areasLoading, setAreasLoading] = useState(true);
  const [areasError, setAreasError] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [createdOrder, setCreatedOrder] = useState(null);
  const [zipNotice, setZipNotice] = useState('');
  const [zipNotFound, setZipNotFound] = useState(false);
  const zipRequest = useRef(0);
  const [saveProfilePrompt, setSaveProfilePrompt] = useState(false);
  const [profileChanged, setProfileChanged] = useState(false);
  const [campaigns, setCampaigns] = useState([]);
  const [userOrderCount, setUserOrderCount] = useState(0);

  useEffect(() => {
    Promise.all([base44.entities.Store.list(), base44.entities.City.list('name')])
      .then(([stores, regions]) => {setStore(stores[0]);setCities(regions);})
      .catch(() => setAreasError('Não foi possível carregar as áreas de entrega. Atualize a página para tentar novamente.'))
      .finally(() => setAreasLoading(false));
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
          neighborhood: p.neighborhood || prev.neighborhood,
          state: p.state || prev.state,
          zip: p.zip || prev.zip,
          deliveryNotes: p.delivery_notes || prev.deliveryNotes,
        }));
      }
      setProfileLoaded(true);
    });
  }, [user, profileLoaded]);

  const addressValidation = validateDeliveryAddress(cities, form, {hasConfiguredAreas:store?.delivery_areas_configured,subtotal});
  const deliveryArea = findDeliveryArea(cities, form, store?.delivery_areas_configured).area;
  const cityNotFound = addressValidation.reason === 'outside_area';
  const cityFee = deliveryArea?.delivery_fee_type === 'fixed' ? Number(deliveryArea.delivery_fee_value||0) : null;

  const regularDeliveryFee = form.deliveryMethod === 'delivery' ? (cityFee !== null ? cityFee : Number(store?.flat_delivery_fee || 6.90)) : 0;
  const freeShippingDiscount = form.deliveryMethod === 'delivery' && cityFee === null && Number(store?.free_shipping_above||0)>0 && subtotal >= Number(store.free_shipping_above)
    ? regularDeliveryFee : 0;
  const deliveryFee = Math.max(0,regularDeliveryFee-freeShippingDiscount);
  const couponEligible = appliedCoupon && subtotal >= Number(appliedCoupon.min_order_value || 0);
  const couponFreeShipping = couponEligible && appliedCoupon.discount_type === 'free_shipping';
  const couponDiscount = couponEligible && !couponFreeShipping
    ? Number(appliedCoupon.type === 'percentage' ? subtotal * appliedCoupon.value / 100 : appliedCoupon.value)
    : 0;
  const couponShippingDiscount = couponFreeShipping ? deliveryFee : 0;

  const pixDiscount = (!form.splitPayment && form.paymentMethod === 'pix') ? (subtotal * (store?.pix_discount_percent || 5) / 100) : 0;

  // ─── Campaign discounts ───
  const activeCampaigns = campaigns.filter(c => c.is_active);
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

  const discountBreakdown = [
    couponDiscount>0&&{key:'coupon',label:`Cupom ${appliedCoupon?.code||form.couponCode.toUpperCase()}`,value:couponDiscount},
    couponShippingDiscount>0&&{key:'coupon-shipping',label:`Cupom ${appliedCoupon?.code||form.couponCode.toUpperCase()} — frete grátis`,value:couponShippingDiscount},
    pixDiscount>0&&{key:'pix',label:'Desconto Pix',value:pixDiscount},
    campaignDiscount>0&&{key:'campaign',label:appliedCampaign?.name||'Promoção aplicada',value:campaignDiscount},
    freeShippingDiscount>0&&{key:'shipping',label:'Frete grátis',value:freeShippingDiscount},
  ].filter(Boolean);
  const originalTotal = subtotal + regularDeliveryFee;
  const discountsApplied = discountBreakdown.reduce((sum,benefit)=>sum+benefit.value,0);
  const total = Math.max(0, Math.round((originalTotal - discountsApplied) * 100) / 100);
  const savings = Math.round(discountsApplied*100)/100;
  const splitPaymentStatus = getSplitPaymentStatus(total, form.splitAmounts);
  const paymentIsValid = !form.splitPayment || splitPaymentStatus.isValid;

  const updateForm = (field, value) => {
    setSubmitError('');
    if(field==='zip'){zipRequest.current++;setZipNotice('');setZipNotFound(false);}
    setForm(prev => ({ ...prev, [field]: value }));
    if (['name', 'phone', 'email', 'address', 'city', 'neighborhood', 'state', 'zip', 'deliveryNotes'].includes(field)) {
      setProfileChanged(true);
    }
  };
  const lookupZip = async () => {
    const zip=normalizePostalCode(form.zip);
    if(!/^\d{8}$/.test(zip)){setZipNotice('Informe um CEP válido com 8 números.');return;}
    const requestId=++zipRequest.current;
    setZipNotice('Consultando CEP...');
    try {
      const response=await fetch(`https://viacep.com.br/ws/${zip}/json/`,{signal:AbortSignal.timeout(6000)});
      if(!response.ok)throw new Error('Consulta indisponível');
      const data=await response.json();
      if(requestId!==zipRequest.current)return;
      if(data.erro){setZipNotFound(true);setZipNotice('CEP não encontrado. Confira os números informados.');return;}
      setZipNotFound(false);
      setForm(previous=>normalizePostalCode(previous.zip)!==zip?previous:{...previous,city:previous.city||data.localidade||'',neighborhood:previous.neighborhood||data.bairro||'',state:previous.state||data.uf||'',address:previous.address||data.logradouro||''});
      setZipNotice('Confira a cidade, o bairro e complete o endereço com o número.');
    }catch {
      if(requestId===zipRequest.current)setZipNotice('Consulta de CEP indisponível. Preencha cidade, bairro e endereço manualmente; a área será validada pelo cadastro da loja.');
    }
  };

  const applyCoupon = async () => {
    setCouponError('');
    if (!form.couponCode.trim()) return;
    const coupons = await base44.entities.Coupon.filter({ code: form.couponCode.toUpperCase(), is_active: true });
    const coupon = coupons[0];
    if (!coupon) { setCouponError('Cupom inválido'); return; }
    if (coupon.min_order_value && subtotal < coupon.min_order_value) { setCouponError(`Pedido mínimo: R$ ${coupon.min_order_value.toFixed(2)}`); return; }
    const totalLimit=coupon.limit_total===false?0:Number(coupon.total_usage_limit||coupon.max_uses||0);
    if (totalLimit && Number(coupon.uses_count||0) >= totalLimit) { setCouponError('Limite atingido'); return; }
    const customerLimit=coupon.limit_per_customer===false?0:Number(coupon.per_customer_limit||0);
    const customerKey=user?.id?`user:${user.id}`:(user?.email||form.email)?`email:${String(user?.email||form.email).trim().toLowerCase()}`:'';
    if (customerLimit&&customerKey&&Number(coupon.usage_by_customer?.[customerKey]||0)>=customerLimit) { setCouponError('Você já atingiu o limite de uso desta promoção.'); return; }
    if(coupon.allow_stacking===false&&campaignDiscount>0){setCouponError('Esta promoção não pode ser usada junto com outra promoção.');return;}
    setAppliedCoupon(coupon);
    setCouponApplied(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;
    if (areasLoading||areasError){setSubmitError(areasError||'Aguarde o carregamento das áreas de entrega.');return;}
    if (!addressValidation.valid || (zipNotFound&&form.deliveryMethod==='delivery')) {setSubmitError(zipNotFound?'Confira o CEP informado.':addressValidation.error);return;}
    if (!paymentIsValid) {setSubmitError('Confira a divisão dos valores do pagamento.');return;}
    setSubmitError('');
    setLoading(true);
    try {
    if(appliedCoupon){
      const current=(await base44.entities.Coupon.filter({code:appliedCoupon.code,is_active:true}))[0];
      const totalLimit=current?.limit_total===false?0:Number(current?.total_usage_limit||current?.max_uses||0);
      const customerLimit=current?.limit_per_customer===false?0:Number(current?.per_customer_limit||0);
      const customerKey=user?.id?`user:${user.id}`:(user?.email||form.email)?`email:${String(user?.email||form.email).trim().toLowerCase()}`:'';
      if(!current)throw new Error('Esta promoção não está disponível.');
      if(totalLimit&&Number(current.uses_count||0)>=totalLimit)throw new Error('Limite atingido');
      if(customerLimit&&customerKey&&Number(current.usage_by_customer?.[customerKey]||0)>=customerLimit)throw new Error('Você já atingiu o limite de uso desta promoção.');
    }
    const orderNum = String(Date.now()).slice(-6);
    const savedOrder=await base44.entities.Order.create({
      order_number: orderNum,
      customer_name: form.name,
      customer_phone: form.phone,
      customer_email: user?.email || form.email,
      customer_cpf: form.cpfOnReceipt ? form.cpf : '',
      status: 'pending',
      items: items.map(i => ({
          product_id: i.product_id,
          quantity: i.quantity,
          variation: i.variation,
          custom_fields: i.custom_fields || {},
          addons: i.addons?.map(a => a.name) || [],
          notes: i.notes
        })),
      coupon_code: couponApplied ? form.couponCode : '',
      payment_method: form.splitPayment ? 'split' : form.paymentMethod,
      split_payments: form.splitPayment ? form.splitAmounts : {},
      payment_status: 'pending',
      change_for: form.paymentMethod === 'cash' && !form.splitPayment ? (form.changeFor || 0) : 0,
      delivery_method: form.deliveryMethod,
      delivery_address: form.address,
      delivery_city: form.city,
      delivery_neighborhood: form.neighborhood,
      delivery_state: form.state,
      delivery_area_id: deliveryArea?.id||null,
      delivery_zip: form.zip,
      delivery_notes: form.deliveryNotes,
      order_notes: form.orderNotes,
      sale_origin: 'catalog'
    });
    setCreatedOrder(savedOrder);
    setStep('success');
    emitLiveEvent('concluida');
    clearCart();
    } catch (error) { setSubmitError(error.message||'Não foi possível concluir o pedido. Seu carrinho foi mantido.'); }
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
      neighborhood: form.neighborhood,
      state: form.state,
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
      <div className="peddi-store-page min-h-screen flex flex-col items-center justify-center bg-background px-4">
        <p className="text-muted-foreground mb-4">Seu carrinho está vazio</p>
        <SafeBackButton fallback="/loja" aria-label="Voltar ao cardápio" className="text-primary font-medium">Voltar ao cardápio</SafeBackButton>
      </div>
    );
  }

  // Save profile prompt
  if (saveProfilePrompt) {
    return (
      <div className="peddi-store-page min-h-screen flex items-center justify-center bg-background px-4">
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
      <div className="peddi-store-page min-h-screen flex flex-col items-center justify-center bg-background px-4 text-center">
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="mb-6">
          <CheckCircle2 size={72} className="text-green-500 mx-auto" />
        </motion.div>
        <h1 className="font-heading font-bold text-2xl text-foreground mb-2">Pedido concluído com sucesso! 🎉</h1>
        <p className="text-muted-foreground mb-2">Pedido #{createdOrder?.order_number} · pagamento pendente.</p>
        <p className="text-muted-foreground mb-6">{createdOrder?.is_test_order||isPresentationDemo()?'Pedido de teste, sem cobrança online.':'Você receberá a confirmação em breve.'}</p>
        <div className="flex flex-col gap-3 w-full max-w-xs">
          <Link to={`/meus-pedidos?order=${createdOrder?.id||''}`} className="border border-primary text-primary px-6 py-3 rounded-xl font-semibold text-sm">Ver em Meus Pedidos</Link>
          {isAuthenticated&&user&&profileChanged&&<button onClick={()=>setSaveProfilePrompt(true)} className="px-6 py-3 rounded-xl border border-border text-sm">Salvar dados no meu perfil</button>}
          <Link to="/loja" className="bg-primary text-primary-foreground px-6 py-3 rounded-xl font-heading font-bold text-sm hover:bg-primary/90 transition-colors text-center">
            Voltar ao cardápio
          </Link>
          {whatsapp && (
            <a href={`https://wa.me/55${whatsapp}?text=Preciso+de+ajuda+com+meu+pedido`} target="_blank" rel="noreferrer" onClick={event => { if (simulateExternalAction('Contato por WhatsApp simulado. Nenhuma conversa externa foi aberta.')) event.preventDefault(); }}
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
    <div className="peddi-store-page min-h-screen bg-background pb-8">
      <div className="sticky top-0 z-30 bg-card/95 backdrop-blur-md border-b border-border">
        <div className="max-w-2xl mx-auto px-4 flex items-center h-14">
          <SafeBackButton fallback="/loja" aria-label="Voltar ao cardápio" className="p-2 -ml-2 hover:bg-accent rounded-full transition-colors">
            <ArrowLeft size={20} />
          </SafeBackButton>
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
                  <input required
                    list="cities-list"
                    value={form.city}
                    onChange={e => updateForm('city', e.target.value)}
                    placeholder="Sua cidade"
                    className="w-full px-4 py-2.5 bg-muted rounded-xl text-sm border-0 focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                  <datalist id="cities-list">
                    {cities.filter(c=>c.is_active!==false).map(c => <option key={c.id} value={c.name} />)}
                  </datalist>
                </div>
                <Input label="CEP" value={form.zip} onChange={v => updateForm('zip', v)} onBlur={lookupZip} inputMode="numeric" maxLength={9} required />
              </div>
              <div className="grid grid-cols-[minmax(0,1fr)_80px] gap-3"><Input label="Bairro / Região" value={form.neighborhood} onChange={v=>updateForm('neighborhood',v)} placeholder="Ex.: Riacho Fundo II"/><Input label="UF" value={form.state} onChange={v=>updateForm('state',v.toUpperCase())} maxLength={2}/></div>
              {zipNotice&&<p role="status" className={`text-xs ${zipNotFound?'text-red-600':'text-muted-foreground'}`}>{zipNotice}</p>}
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
              {!splitPaymentStatus.isValid ? (
                  <p className={`text-xs font-medium ${splitPaymentStatus.differenceCents > 0 ? 'text-amber-600' : 'text-red-500'}`}>
                    {splitPaymentStatus.differenceCents > 0
                      ? `Faltam R$ ${splitPaymentStatus.difference.toFixed(2)}`
                      : `Excedeu R$ ${Math.abs(splitPaymentStatus.difference).toFixed(2)}`}
                  </p>
                ) : <p className="text-xs text-green-600 font-medium">✓ Saldo R$ 0,00 — valores conferem</p>}
            </div>
          )}
        </Section>

        {/* Cupom */}
        <Section title="Cupom de desconto" icon={<Tag size={20} className="text-primary" />}>
          <div className="flex gap-2">
            <input
              value={form.couponCode}
              onChange={e => { updateForm('couponCode', e.target.value.toUpperCase()); setCouponError(''); setCouponApplied(false); setAppliedCoupon(null); }}
              placeholder="Digite o código"
              className="min-w-0 flex-1 px-4 py-2.5 bg-muted rounded-xl text-sm border-0 focus:outline-none focus:ring-2 focus:ring-primary/20 uppercase"
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
                <span className="min-w-0 pr-3 text-muted-foreground break-words">{item.quantity}x {item.product_name}</span>
                <span className="shrink-0 tabular-nums">{formatMoney((item.unit_price + item.addon_total) * item.quantity)}</span>
              </div>
            ))}
          </div>
          <div className="border-t border-border pt-3 space-y-2 text-sm">
            <div className="flex justify-between gap-3"><span className="text-muted-foreground">Subtotal dos produtos</span><span className="shrink-0 tabular-nums">{formatMoney(subtotal)}</span></div>
            {discountBreakdown.map(benefit=><div key={benefit.key} className="flex justify-between gap-3 text-green-600"><span className="min-w-0 break-words">{benefit.label}</span><span className="shrink-0 tabular-nums">- {formatMoney(benefit.value)}</span></div>)}
            {form.deliveryMethod === 'delivery' && <div className="flex justify-between"><span className="text-muted-foreground">Taxa de entrega</span><span className="tabular-nums">{deliveryFee === 0 ? 'Grátis' : formatMoney(deliveryFee)}</span></div>}
            {savings > 0 && <div className="flex justify-between gap-3 text-muted-foreground"><span>Total antes dos descontos</span><span className="shrink-0 tabular-nums line-through">{formatMoney(originalTotal)}</span></div>}
            <div aria-live="polite" aria-atomic="true" className="flex justify-between gap-3 font-heading font-bold text-lg pt-2 border-t border-border">
              <span>Total final a pagar</span>
              <span className="shrink-0 tabular-nums text-primary">{formatMoney(total)}</span>
            </div>
            {savings > 0 && <p className="text-xs font-medium text-green-600">Você economizou {formatMoney(savings)} nesta compra.</p>}
          </div>
        </div>

        {areasError&&<p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-600">{areasError}</p>}
        {submitError&&<p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-600">{submitError}</p>}
        {form.deliveryMethod==='delivery'&&addressValidation.reason==='minimum'&&<p role="alert" className="text-sm text-red-600">{addressValidation.error}</p>}
        <button
          type="submit"
          disabled={loading || areasLoading || Boolean(areasError) || !form.name || !form.phone || !addressValidation.valid || (zipNotFound&&form.deliveryMethod==='delivery') || !paymentIsValid}
          className="w-full bg-primary text-primary-foreground py-4 rounded-2xl font-heading font-bold text-base hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {loading ? <Loader2 className="animate-spin" size={20} /> : 'Finalizar Pedido'}
        </button>

        {/* Botão de suporte */}
        {whatsapp && (
          <a href={`https://wa.me/55${whatsapp}?text=Preciso+de+ajuda+com+meu+pedido`} target="_blank" rel="noreferrer" onClick={event => { if (simulateExternalAction('Contato por WhatsApp simulado. Nenhuma conversa externa foi aberta.')) event.preventDefault(); }}
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

function Input({ label, value, onChange, type = 'text', placeholder, required, onBlur, inputMode, maxLength }) {
  return (
    <div>
      <label className="text-xs font-medium text-muted-foreground mb-1 block">{label}{required && ' *'}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder || label}
        required={required}
        onBlur={onBlur}
        inputMode={inputMode}
        maxLength={maxLength}
        className="w-full px-4 py-2.5 bg-muted rounded-xl text-sm border-0 focus:outline-none focus:ring-2 focus:ring-primary/20"
      />
    </div>
  );
}
