import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import CourierApplications from '@/components/admin/CourierApplications';
import { useAuth } from '@/lib/AuthContext';
import { Plus, Edit, Trash2, Loader2, User, Phone, Bike, MapPin, BarChart2, X, Send, CheckCircle2, Star } from 'lucide-react';

const VEHICLE_LABELS = { moto: '🏍️ Moto', bicicleta: '🚲 Bicicleta', carro: '🚗 Carro', a_pe: '🚶 A pé' };
const PAYMENT_LABELS = { per_delivery: 'Por entrega', per_km: 'Por KM', daily: 'Diária', manual: 'Manual' };
const FEE_TYPE_LABELS = { fixed: 'Taxa fixa', per_km: 'Por KM', custom: 'Personalizada' };

const inp = "w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30";
const lbl = "block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide";

// ─── Deliverer Form ───────────────────────────────────────────────────────────
function DelivererForm({ deliverer, cities, onClose, onSave }) {
  const [form, setForm] = useState(deliverer || {
    name: '', phone: '', cpf: '', email: '', vehicle: 'moto', is_active: true, notes: '',
    city_ids: [], payment_type: 'per_delivery', payment_value: 0
  });
  const [saving, setSaving] = useState(false);
  const set = (f, v) => setForm(p => ({ ...p, [f]: v }));

  const toggleCity = (id) => set('city_ids', (form.city_ids || []).includes(id)
    ? (form.city_ids || []).filter(x => x !== id)
    : [...(form.city_ids || []), id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    if (deliverer?.id) {
      await base44.entities.Deliverer.update(deliverer.id, form);
    } else {
      await base44.entities.Deliverer.create(form);
      if (form.email) {
        try { await base44.users.inviteUser(form.email, 'user'); } catch (_) {}
      }
    }
    onSave();
  };

  return (
    <div data-peddi-modal="" className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4 my-4">
        <h2 className="font-heading font-bold text-lg">{deliverer ? 'Editar Entregador' : 'Novo Entregador'}</h2>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className={lbl}>Nome *</label>
              <input required value={form.name} onChange={e => set('name', e.target.value)} className={inp} />
            </div>
            <div>
              <label className={lbl}>Telefone *</label>
              <input required value={form.phone} onChange={e => set('phone', e.target.value)} className={inp} placeholder="(11) 99999-9999" />
            </div>
            <div>
              <label className={lbl}>CPF</label>
              <input value={form.cpf} onChange={e => set('cpf', e.target.value)} className={inp} placeholder="000.000.000-00" />
            </div>
            <div className="col-span-2">
              <label className={lbl}>E-mail (para convite do motoboy)</label>
              <input type="email" value={form.email || ''} onChange={e => set('email', e.target.value)} className={inp} placeholder="motoboy@email.com" />
            </div>
          </div>

          <div>
            <label className={lbl}>Veículo</label>
            <select value={form.vehicle} onChange={e => set('vehicle', e.target.value)} className={inp}>
              {Object.entries(VEHICLE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>

          {/* Payment */}
          <div className="border-t border-gray-100 pt-3">
            <p className="text-xs font-bold text-gray-500 uppercase mb-2">Forma de pagamento</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={lbl}>Tipo</label>
                <select value={form.payment_type} onChange={e => set('payment_type', e.target.value)} className={inp}>
                  {Object.entries(PAYMENT_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div>
                <label className={lbl}>{form.payment_type === 'per_delivery' ? 'Valor/entrega (R$)' : form.payment_type === 'per_km' ? 'Valor/km (R$)' : form.payment_type === 'daily' ? 'Valor diário (R$)' : 'Valor (R$)'}</label>
                <input type="number" step="0.01" value={form.payment_value} onChange={e => set('payment_value', parseFloat(e.target.value))} className={inp} />
              </div>
            </div>
          </div>

          {/* Cities */}
          {cities.length > 0 && (
            <div className="border-t border-gray-100 pt-3">
              <p className="text-xs font-bold text-gray-500 uppercase mb-2">Cidades atendidas</p>
              <div className="flex flex-wrap gap-2">
                {cities.map(c => (
                  <button key={c.id} type="button" onClick={() => toggleCity(c.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${(form.city_ids || []).includes(c.id) ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                    {c.name}{c.state ? ` - ${c.state}` : ''}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className={lbl}>Observações</label>
            <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={2} className={inp + ' resize-none'} />
          </div>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={form.is_active} onChange={e => set('is_active', e.target.checked)} className="w-4 h-4 accent-primary" />
            Entregador ativo
          </label>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium hover:bg-gray-50">Cancelar</button>
            <button type="submit" disabled={saving} className="flex-1 py-2.5 rounded-xl bg-primary text-white text-sm font-bold disabled:opacity-50">
              {saving ? <Loader2 size={16} className="animate-spin mx-auto" /> : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── City Form ────────────────────────────────────────────────────────────────
function CityForm({ city, deliverers, onClose, onSave }) {
  const [form, setForm] = useState(city || {
    name: '', state: '', is_active: true, deliverer_ids: [],
    delivery_fee_type: 'fixed', delivery_fee_value: 0,
    delivery_fee_per_km: 0, custom_fee_description: '',
    min_order_value: 0, estimated_time_min: 30
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const set = (f, v) => setForm(p => ({ ...p, [f]: v }));

  const toggleDeliverer = (id) => set('deliverer_ids', (form.deliverer_ids || []).includes(id)
    ? (form.deliverer_ids || []).filter(x => x !== id)
    : [...(form.deliverer_ids || []), id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const start=String(form.zip_start||'').replace(/[\s.-]/g,''),end=String(form.zip_end||'').replace(/[\s.-]/g,'');
    if((start||end)&&(!/^\d{8}$/.test(start)||!/^\d{8}$/.test(end)||start>end)){setError('Informe os dois CEPs da faixa, com 8 números, em ordem crescente.');return;}
    setSaving(true);
    try {
      const data={...form,name:form.name.trim(),state:String(form.state||'').trim().toUpperCase(),zip_start:start,zip_end:end};
      if (city?.id) await base44.entities.City.update(city.id, data);
      else await base44.entities.City.create(data);
      onSave();
    }catch(err){setError(err.message||'Não foi possível salvar a região.');}finally{setSaving(false);}
  };

  return (
    <div data-peddi-modal="" className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4 my-4">
        <h2 className="font-heading font-bold text-lg">{city ? 'Editar Cidade' : 'Nova Cidade'}</h2>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl}>Cidade / Região *</label>
              <input required value={form.name} onChange={e => set('name', e.target.value)} className={inp} />
            </div>
            <div>
              <label className={lbl}>Estado (UF)</label>
              <input value={form.state} onChange={e => set('state', e.target.value)} maxLength={2} className={inp} placeholder="SP" />
            </div>
          </div>

          <div><label className={lbl}>Município (opcional)</label><input value={form.municipality||''} onChange={e=>set('municipality',e.target.value)} className={inp} placeholder="Ex.: Brasília"/><p className="mt-1 text-xs text-gray-500">Para uma região como Riacho Fundo II, informe aqui a cidade à qual ela pertence.</p></div>
          <div><label className={lbl}>Outros nomes / abreviações (opcional)</label><input value={Array.isArray(form.aliases)?form.aliases.join('; '):form.aliases||''} onChange={e=>set('aliases',e.target.value)} className={inp} placeholder="Ex.: RF II; Riacho Fundo 2"/><p className="mt-1 text-xs text-gray-500">Separe os nomes por ponto e vírgula. Acentos e maiúsculas são reconhecidos automaticamente.</p></div>
          <div className="grid grid-cols-2 gap-3"><div><label className={lbl}>CEP inicial (opcional)</label><input value={form.zip_start||''} onChange={e=>set('zip_start',e.target.value)} inputMode="numeric" maxLength={9} className={inp} placeholder="00000-000"/></div><div><label className={lbl}>CEP final (opcional)</label><input value={form.zip_end||''} onChange={e=>set('zip_end',e.target.value)} inputMode="numeric" maxLength={9} className={inp} placeholder="00000-000"/></div></div>
          <p className="text-xs text-gray-500">Preencha a faixa somente se conhecer os CEPs atendidos. Fora dessa faixa, a entrega será bloqueada.</p>

          {/* Delivery fee */}
          <div className="border-t border-gray-100 pt-3">
            <p className="text-xs font-bold text-gray-500 uppercase mb-2">Taxa de entrega ao cliente</p>
            <div className="mb-3">
              <label className={lbl}>Tipo de cobrança</label>
              <select value={form.delivery_fee_type} onChange={e => set('delivery_fee_type', e.target.value)} className={inp}>
                <option value="fixed">Fixa (R$)</option>
                <option value="per_km">Por KM</option>
                <option value="custom">Personalizada</option>
              </select>
            </div>
            {form.delivery_fee_type === 'fixed' && (
              <div>
                <label className={lbl}>Taxa fixa (R$)</label>
                <input type="number" step="0.01" value={form.delivery_fee_value} onChange={e => set('delivery_fee_value', parseFloat(e.target.value))} className={inp} />
              </div>
            )}
            {form.delivery_fee_type === 'per_km' && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={lbl}>Valor por KM (R$)</label>
                  <input type="number" step="0.01" value={form.delivery_fee_per_km} onChange={e => set('delivery_fee_per_km', parseFloat(e.target.value))} className={inp} />
                </div>
                <div>
                  <label className={lbl}>Mínimo (R$)</label>
                  <input type="number" step="0.01" value={form.delivery_fee_value} onChange={e => set('delivery_fee_value', parseFloat(e.target.value))} className={inp} />
                </div>
              </div>
            )}
            {form.delivery_fee_type === 'custom' && (
              <div>
                <label className={lbl}>Descrição para o cliente</label>
                <input value={form.custom_fee_description} onChange={e => set('custom_fee_description', e.target.value)} className={inp} placeholder="Ex: A combinar via WhatsApp" />
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl}>Pedido mínimo (R$)</label>
              <input type="number" step="0.01" value={form.min_order_value} onChange={e => set('min_order_value', parseFloat(e.target.value))} className={inp} />
            </div>
            <div>
              <label className={lbl}>Prazo estimado (min)</label>
              <input type="number" value={form.estimated_time_min} onChange={e => set('estimated_time_min', parseInt(e.target.value))} className={inp} />
            </div>
          </div>

          {/* Deliverers */}
          {deliverers.length > 0 && (
            <div className="border-t border-gray-100 pt-3">
              <p className="text-xs font-bold text-gray-500 uppercase mb-2">Entregadores vinculados</p>
              <div className="flex flex-wrap gap-2">
                {deliverers.map(d => (
                  <button key={d.id} type="button" onClick={() => toggleDeliverer(d.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${(form.deliverer_ids || []).includes(d.id) ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                    {d.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={form.is_active} onChange={e => set('is_active', e.target.checked)} className="w-4 h-4 accent-primary" />
            Cidade / Região ativa
          </label>
          {error&&<p role="alert" className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium hover:bg-gray-50">Cancelar</button>
            <button type="submit" disabled={saving} className="flex-1 py-2.5 rounded-xl bg-primary text-white text-sm font-bold disabled:opacity-50">
              {saving ? <Loader2 size={16} className="animate-spin mx-auto" /> : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Deliverer Detail (History + Report) ────────────────────────────────────
function DelivererDetail({ deliverer, cities, onClose }) {
  const [orders, setOrders] = useState([]);
  const [ratings, setRatings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('today'); // today | week | month | all
  const [registeringPayment, setRegisteringPayment] = useState(false);

  useEffect(() => {
    if (deliverer.user_id) {
      base44.entities.Order.filter({ deliverer_user_id: deliverer.user_id }, '-created_date', 200).then(all => {
        setOrders(all);
        setLoading(false);
      });
    } else {
      base44.entities.Order.filter({ status: 'delivered' }, '-created_date', 200).then(all => {
        setOrders(all.filter(o => o.tracking_code === deliverer.name));
        setLoading(false);
      });
    }
    base44.entities.DelivererRating.filter({ deliverer_id: deliverer.id }, '-created_date', 20).then(setRatings);
  }, [deliverer.id]);

  const now = new Date();
  const deliveredOnly = orders.filter(o => o.status === 'delivered');
  const filtered = deliveredOnly.filter(o => {
    if (period === 'all') return true;
    const d = new Date(o.created_date);
    if (period === 'today') { const t = new Date(now); t.setHours(0,0,0,0); return d >= t; }
    if (period === 'week') { const w = new Date(now); w.setDate(w.getDate() - 7); return d >= w; }
    if (period === 'month') { const m = new Date(now); m.setDate(1); m.setHours(0,0,0,0); return d >= m; }
    return true;
  });

  const totalDeliveries = filtered.length;
  const paymentValue = deliverer.payment_value || 0;
  const computeEarnings = (orderList) => {
    if (deliverer.payment_type === 'per_delivery' || deliverer.payment_type === 'per_km') return orderList.length * paymentValue;
    if (deliverer.payment_type === 'daily') {
      const days = new Set(orderList.map(o => new Date(o.created_date).toDateString())).size;
      return Math.max(days, orderList.length > 0 ? 1 : 0) * paymentValue;
    }
    return 0;
  };
  const periodEarnings = computeEarnings(filtered);
  const allTimeEarnings = computeEarnings(deliveredOnly);
  const paidAmount = deliverer.paid_amount || 0;
  const pendingAmount = Math.max(0, allTimeEarnings - paidAmount);

  const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);
  const weekAgo = new Date(now); weekAgo.setDate(weekAgo.getDate() - 7);
  const monthAgo = new Date(now); monthAgo.setMonth(monthAgo.getMonth() - 1);
  const todayCount = deliveredOnly.filter(o => new Date(o.created_date) >= todayStart).length;
  const weekCount = deliveredOnly.filter(o => new Date(o.created_date) >= weekAgo).length;
  const monthCount = deliveredOnly.filter(o => new Date(o.created_date) >= monthAgo).length;

  const delivererCities = (deliverer.city_ids || []).map(id => cities.find(c => c.id === id)).filter(Boolean);

  const handleRegisterPayment = async () => {
    if (pendingAmount <= 0) return;
    setRegisteringPayment(true);
    try {
      await base44.entities.Deliverer.update(deliverer.id, {
        paid_amount: (deliverer.paid_amount || 0) + pendingAmount,
        payment_history: [...(deliverer.payment_history || []), { amount: pendingAmount, date: new Date().toISOString(), note: 'Pagamento de entregas' }],
      });
    } catch (_) {}
    setRegisteringPayment(false);
  };

  return (
    <div data-peddi-modal="" className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
              {deliverer.photo_url ? <img src={deliverer.photo_url} className="w-full h-full rounded-full object-cover" alt="" /> : <User size={22} className="text-primary" />}
            </div>
            <div>
              <h2 className="font-heading font-bold text-lg">{deliverer.name}</h2>
              <p className="text-xs text-muted-foreground">{VEHICLE_LABELS[deliverer.vehicle]} · {PAYMENT_LABELS[deliverer.payment_type]}: R$ {(deliverer.payment_value || 0).toFixed(2)}</p>
              {deliverer.bio && <p className="text-xs text-gray-500 mt-1 italic">"{deliverer.bio}"</p>}
              {deliverer.rating_count > 0 && (
                <div className="flex items-center gap-1 mt-1">
                  {[1,2,3,4,5].map(s => (
                    <Star key={s} size={12} className={s <= Math.round(deliverer.rating_avg) ? 'fill-amber-400 text-amber-400' : 'text-gray-200'} />
                  ))}
                  <span className="text-xs font-semibold text-amber-600 ml-1">{deliverer.rating_avg?.toFixed(1)} ({deliverer.rating_count})</span>
                </div>
              )}
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl"><X size={20} /></button>
        </div>

        <div className="overflow-y-auto flex-1 p-5 space-y-5">
          {/* Cities */}
          {delivererCities.length > 0 && (
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase mb-2">Cidades</p>
              <div className="flex flex-wrap gap-2">
                {delivererCities.map(c => (
                  <span key={c.id} className="px-3 py-1 bg-blue-50 text-blue-700 text-xs font-medium rounded-full">{c.name}{c.state ? ` - ${c.state}` : ''}</span>
                ))}
              </div>
            </div>
          )}

          {/* Ratings */}
          {ratings.length > 0 && (
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase mb-3">Avaliações de clientes</p>
              <div className="space-y-2">
                {ratings.map(r => (
                  <div key={r.id} className="bg-white border border-gray-100 rounded-xl p-3">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-semibold">{r.customer_name || 'Cliente'}</p>
                      <div className="flex items-center gap-0.5">
                        {[1,2,3,4,5].map(s => (
                          <Star key={s} size={11} className={s <= r.rating ? 'fill-amber-400 text-amber-400' : 'text-gray-200'} />
                        ))}
                      </div>
                    </div>
                    {r.comment && <p className="text-xs text-gray-500 italic">"{r.comment}"</p>}
                    <p className="text-[10px] text-gray-400 mt-1">Pedido #{r.order_number}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Period filter + stats */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-bold text-gray-500 uppercase">Relatório de pagamento</p>
              <div className="flex gap-1 bg-gray-100 p-1 rounded-xl text-xs">
                {[['today', 'Hoje'], ['week', 'Semana'], ['month', 'Mês'], ['all', 'Tudo']].map(([v, l]) => (
                  <button key={v} onClick={() => setPeriod(v)} className={`px-3 py-1 rounded-lg font-medium transition-colors ${period === v ? 'bg-white shadow-sm text-foreground' : 'text-muted-foreground'}`}>{l}</button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-blue-50 rounded-2xl p-4 text-center">
                <p className="text-2xl font-bold text-blue-700">{totalDeliveries}</p>
                <p className="text-xs text-blue-600 mt-0.5">Entregas ({period === 'today' ? 'hoje' : period === 'week' ? '7 dias' : period === 'month' ? 'mês' : 'total'})</p>
              </div>
              <div className="bg-orange-50 rounded-2xl p-4 text-center">
                <p className="text-2xl font-bold text-orange-700">R$ {paymentValue.toFixed(2)}</p>
                <p className="text-xs text-orange-600 mt-0.5">Valor por entrega</p>
              </div>
              <div className="bg-green-50 rounded-2xl p-4 text-center">
                <p className="text-2xl font-bold text-green-700">R$ {allTimeEarnings.toFixed(2)}</p>
                <p className="text-xs text-green-600 mt-0.5">Total gerado</p>
              </div>
              <div className="bg-cyan-50 rounded-2xl p-4 text-center">
                <p className="text-2xl font-bold text-cyan-700">R$ {paidAmount.toFixed(2)}</p>
                <p className="text-xs text-cyan-600 mt-0.5">Já pago</p>
              </div>
            </div>
            <div className={`rounded-2xl p-4 text-center ${pendingAmount > 0 ? 'bg-red-50' : 'bg-gray-50'}`}>
              <p className={`text-2xl font-bold ${pendingAmount > 0 ? 'text-red-700' : 'text-gray-500'}`}>R$ {pendingAmount.toFixed(2)}</p>
              <p className={`text-xs mt-0.5 ${pendingAmount > 0 ? 'text-red-600' : 'text-gray-400'}`}>Pendente a pagar</p>
            </div>
            {pendingAmount > 0 && (
              <button onClick={handleRegisterPayment} disabled={registeringPayment}
                className="w-full py-2.5 bg-primary text-white rounded-xl text-sm font-bold disabled:opacity-50 flex items-center justify-center gap-2">
                {registeringPayment ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
                {registeringPayment ? 'Registrando...' : `Registrar pagamento (R$ ${pendingAmount.toFixed(2)})`}
              </button>
            )}
            <div className="grid grid-cols-3 gap-3 mt-2">
              <div className="bg-purple-50 rounded-xl p-3 text-center">
                <p className="text-lg font-bold text-purple-700">{todayCount}</p>
                <p className="text-[10px] text-purple-600">Hoje</p>
              </div>
              <div className="bg-purple-50 rounded-xl p-3 text-center">
                <p className="text-lg font-bold text-purple-700">{weekCount}</p>
                <p className="text-[10px] text-purple-600">7 dias</p>
              </div>
              <div className="bg-purple-50 rounded-xl p-3 text-center">
                <p className="text-lg font-bold text-purple-700">{monthCount}</p>
                <p className="text-[10px] text-purple-600">30 dias</p>
              </div>
            </div>
          </div>

          {/* History */}
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase mb-3">Histórico de entregas</p>
            {loading ? (
              <div className="flex justify-center py-8"><Loader2 className="animate-spin text-primary" size={24} /></div>
            ) : filtered.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-6">Nenhuma entrega no período</p>
            ) : (
              <div className="space-y-2">
                {filtered.map(o => (
                  <div key={o.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl text-sm">
                    <div>
                      <p className="font-medium text-foreground">#{o.order_number} · {o.customer_name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {o.delivery_city || '—'} · {new Date(o.created_date).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-foreground">R$ {(o.total || 0).toFixed(2)}</p>
                      <p className="text-[10px] text-green-600 font-bold">Entregue</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Invite Modal ─────────────────────────────────────────────────────────────
function InviteModal({ onClose, onSent }) {
  const { user }=useAuth();
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const inviteUrl=`${window.location.origin}/entregador/cadastro?email=${encodeURIComponent(email)}${user?.storeId?`&store=${encodeURIComponent(user.storeId)}`:''}`;

  const handleSend = async (e) => {
    e.preventDefault();
    setSending(true);
    try {
      await base44.entities.Deliverer.create({ name: 'Aguardando cadastro', email, phone: '', is_active: true, vehicle: 'moto' });
    } catch (_) {}
    try { await base44.users.inviteUser(email, 'user'); } catch (_) {}
    try {
      await base44.integrations.Core.SendEmail({
        to: email,
        subject: 'Convite — Seja um entregador',
        body: `Olá!\n\nVocê foi convidado para ser entregador.\n\nEnvie seu cadastro pelo link:\n${inviteUrl}\n\nO acesso às entregas será liberado após a aprovação do gestor.`,
      });
    } catch (_) {}
    setSending(false);
    setSent(true);
  };

  return (
    <div data-peddi-modal="" className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
        {sent ? (
          <div className="text-center py-6">
            <CheckCircle2 size={48} className="mx-auto mb-3 text-green-500" />
            <h3 className="font-heading font-bold text-lg">Convite preparado!</h3>
            <p className="text-sm text-muted-foreground mt-1">Compartilhe o link com o entregador. Ele enviará o cadastro para sua aprovação.</p>
            <input readOnly aria-label="Link de convite" value={inviteUrl} onFocus={event=>event.target.select()} className={`${inp} mt-4`}/>
            <button onClick={onSent} className="mt-4 min-h-11 rounded-xl bg-primary px-5 font-semibold text-white">Concluir</button>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <h2 className="font-heading font-bold text-lg">Convidar entregador</h2>
              <button onClick={onClose}><X size={20} className="text-gray-400" /></button>
            </div>
            <p className="text-sm text-muted-foreground">Gere um link para o entregador preencher seus dados e solicitar acesso à sua loja.</p>
            <form onSubmit={handleSend} className="space-y-3">
              <div>
                <label className={lbl}>E-mail do motoboy *</label>
                <input type="email" required value={email} onChange={e => setEmail(e.target.value)} className={inp} placeholder="motoboy@email.com" />
              </div>
              <button type="submit" disabled={sending || !email} className="w-full py-3 rounded-xl bg-primary text-white text-sm font-bold disabled:opacity-50 flex items-center justify-center gap-2">
                {sending ? <Loader2 size={16} className="animate-spin" /> : <><Send size={16} /> Gerar convite</>}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
const TABS = [
  { id: 'deliverers', label: 'Entregadores', icon: Bike },
  { id: 'cities', label: 'Cidades', icon: MapPin },
];

export default function Deliverers() {
  const [tab, setTab] = useState('deliverers');
  const [deliverers, setDeliverers] = useState([]);
  const [cities, setCities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [detail, setDetail] = useState(null);
  const [showInvite, setShowInvite] = useState(false);

  const load = async () => {
    const [ds, cs] = await Promise.all([
      base44.entities.Deliverer.list('name'),
      base44.entities.City.list('name'),
    ]);
    setDeliverers(ds.filter(row=>!['pending','rejected'].includes(row.application_status)));
    setCities(cs);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const removeDeliverer = async (id) => { if (!confirm('Excluir este entregador?')) return; await base44.entities.Deliverer.delete(id); load(); };
  const removeCity = async (id) => { if (!confirm('Excluir esta cidade?')) return; await base44.entities.City.delete(id); load(); };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading font-bold text-2xl text-foreground">Entregadores & Cidades</h1>
          <p className="text-sm text-muted-foreground mt-1">{deliverers.length} entregadores · {cities.length} cidades</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {tab === 'deliverers' && (
            <button
              onClick={() => setShowInvite(true)}
              className="flex items-center gap-2 bg-white border border-primary text-primary px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-primary/5 transition-colors"
            >
              <Send size={18} /> Convidar
            </button>
          )}
          <button
            onClick={() => { setEditing(null); setShowForm(true); }}
            className="flex items-center gap-2 bg-primary text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <Plus size={18} /> {tab === 'deliverers' ? 'Novo Entregador' : 'Nova Cidade'}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <CourierApplications onChange={load}/>
      <div className="flex gap-1 bg-muted p-1 rounded-2xl w-fit">
        {TABS.map(t => {
          const Icon = t.icon;
          return (
            <button key={t.id} onClick={() => { setTab(t.id); setShowForm(false); setEditing(null); }}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${tab === t.id ? 'bg-white text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
              <Icon size={15} /> {t.label}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="animate-spin text-primary" size={32} /></div>
      ) : tab === 'deliverers' ? (
        <div className="grid gap-3">
          {deliverers.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground"><Bike size={40} className="mx-auto mb-3 opacity-30" /><p>Nenhum entregador cadastrado ainda</p></div>
          ) : deliverers.map(d => {
            const dCities = (d.city_ids || []).map(id => cities.find(c => c.id === id)).filter(Boolean);
            return (
              <div key={d.id} className="bg-card rounded-2xl border border-border/50 p-4 flex items-center gap-4">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                  {d.photo_url ? <img src={d.photo_url} alt={d.name} className="w-full h-full rounded-full object-cover" /> : <User size={22} className="text-primary" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-foreground">{d.name}</p>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${d.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{d.is_active ? 'Ativo' : 'Inativo'}</span>
                    {!d.user_id && d.email && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">Aguardando cadastro</span>
                    )}
                    {d.rating_count > 0 && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 flex items-center gap-0.5">
                        <Star size={9} className="fill-amber-400 text-amber-400" /> {d.rating_avg?.toFixed(1)} ({d.rating_count})
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground flex-wrap">
                    <span><Phone size={10} className="inline mr-1" />{d.phone}</span>
                    <span>{VEHICLE_LABELS[d.vehicle]}</span>
                    <span className="text-primary font-medium">{PAYMENT_LABELS[d.payment_type]}: R$ {(d.payment_value || 0).toFixed(2)}</span>
                  </div>
                  {dCities.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {dCities.map(c => <span key={c.id} className="text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">{c.name}</span>)}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => setDetail(d)} className="p-2 hover:bg-accent rounded-lg transition-colors" title="Ver relatório">
                    <BarChart2 size={16} className="text-muted-foreground" />
                  </button>
                  <button onClick={() => { setEditing(d); setShowForm(true); }} className="p-2 hover:bg-accent rounded-lg transition-colors">
                    <Edit size={16} className="text-muted-foreground" />
                  </button>
                  <button onClick={() => removeDeliverer(d.id)} className="p-2 hover:bg-red-50 rounded-lg transition-colors">
                    <Trash2 size={16} className="text-red-400" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="grid gap-3">
          {cities.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground"><MapPin size={40} className="mx-auto mb-3 opacity-30" /><p>Nenhuma cidade cadastrada ainda</p></div>
          ) : cities.map(c => {
            const cDeliverers = (c.deliverer_ids || []).map(id => deliverers.find(d => d.id === id)).filter(Boolean);
            const feeLabel = c.delivery_fee_type === 'fixed' ? `R$ ${(c.delivery_fee_value || 0).toFixed(2)}` : c.delivery_fee_type === 'per_km' ? `R$ ${(c.delivery_fee_per_km || 0).toFixed(2)}/km` : (c.custom_fee_description || 'Personalizada');
            return (
              <div key={c.id} className="bg-card rounded-2xl border border-border/50 p-4 flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center flex-shrink-0">
                  <MapPin size={22} className="text-blue-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-foreground">{c.name}{c.state ? ` - ${c.state}` : ''}</p>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${c.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{c.is_active ? 'Ativa' : 'Inativa'}</span>
                  </div>
                  <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
                    <span>🚚 Taxa: {feeLabel} ({FEE_TYPE_LABELS[c.delivery_fee_type]})</span>
                    {c.estimated_time_min && <span>⏱ {c.estimated_time_min} min</span>}
                  </div>
                  {cDeliverers.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {cDeliverers.map(d => <span key={d.id} className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full">{d.name}</span>)}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => { setEditing(c); setShowForm(true); }} className="p-2 hover:bg-accent rounded-lg transition-colors">
                    <Edit size={16} className="text-muted-foreground" />
                  </button>
                  <button onClick={() => removeCity(c.id)} className="p-2 hover:bg-red-50 rounded-lg transition-colors">
                    <Trash2 size={16} className="text-red-400" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Forms */}
      {showForm && tab === 'deliverers' && (
        <DelivererForm deliverer={editing} cities={cities} onClose={() => setShowForm(false)} onSave={() => { setShowForm(false); load(); }} />
      )}
      {showForm && tab === 'cities' && (
        <CityForm city={editing} deliverers={deliverers} onClose={() => setShowForm(false)} onSave={() => { setShowForm(false); load(); }} />
      )}
      {detail && (
        <DelivererDetail deliverer={detail} cities={cities} onClose={() => setDetail(null)} />
      )}
      {showInvite && (
        <InviteModal onClose={() => setShowInvite(false)} onSent={() => { setShowInvite(false); load(); }} />
      )}
    </div>
  );
}
