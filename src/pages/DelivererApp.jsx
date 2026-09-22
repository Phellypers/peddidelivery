import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { Loader2, Bike, MapPin, Navigation, Package, Check, ArrowLeft, Power, Camera, Mail, X, Save, User as UserIcon, Phone, Star, CheckCircle2, XCircle, BarChart2, ChevronDown, ChevronUp, DollarSign, MessageCircle } from 'lucide-react';
import DelivererChatTab from '@/components/deliverer/DelivererChatTab';
import DeliveryChat from '@/components/delivery/DeliveryChat';
import { motion, AnimatePresence } from 'framer-motion';
import { startLocationTracking, stopLocationTracking, isTracking } from '@/lib/delivererLocation';
import DelivererRegister from './DelivererRegister';
import { peddiApi } from '@/services/api/peddiApi';

const VEHICLE_OPTIONS = [
  { value: 'moto', label: '🏍️ Moto' },
  { value: 'bicicleta', label: '🚲 Bicicleta' },
  { value: 'carro', label: '🚗 Carro' },
  { value: 'a_pe', label: '🚶 A pé' },
];

const PAYMENT_LABELS = {
  pix: 'PIX', credit_card: 'Cartão de crédito', cash: 'Dinheiro',
  whatsapp: 'WhatsApp', bank_transfer: 'Transferência', to_arrange: 'A combinar',
};

export default function DelivererApp() {
  const { user, isAuthenticated, logout } = useAuth();
  const [deliverer, setDeliverer] = useState(null);
  const [orders, setOrders] = useState([]);
  const [completedOrders, setCompletedOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [watching, setWatching] = useState(false);
  const [locationError, setLocationError] = useState('');
  const [startingLocation, setStartingLocation] = useState(false);
  const [tab, setTab] = useState('deliveries');
  const [actionLoading, setActionLoading] = useState(null);
  const [profileForm, setProfileForm] = useState(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [popup, setPopup] = useState(null);
  const [highlightedOrder, setHighlightedOrder] = useState(null);
  const [expandedOrder, setExpandedOrder] = useState(null);
  const [reportPeriod, setReportPeriod] = useState('all');
  const [chatOrder, setChatOrder] = useState(null);
  const orderParam = new URLSearchParams(window.location.search).get('order');
  const watchIdRef = useRef(null);

  useEffect(() => {
    if (!user?.id || user.role !== 'courier') { setDeliverer(null); setLoading(false); return; }
    setLoading(true);
    (async () => {
      let dels = await base44.entities.Deliverer.filter({ user_id: user.id });
      if (!dels[0] && user.email) {
        dels = await base44.entities.Deliverer.filter({ email: user.email });
      }
      if (dels[0]) {
        if (dels[0].is_active === false || ['pending', 'rejected'].includes(dels[0].application_status)) { setLoading(false); return; }
        setDeliverer(dels[0]);
        setProfileForm({
          name: dels[0].name || '', phone: dels[0].phone || '', vehicle: dels[0].vehicle || 'moto',
          bio: dels[0].bio || '', email_notifications: dels[0].email_notifications !== false,
          photo_url: dels[0].photo_url || '',
        });
        const ords = await base44.entities.Order.filter({ deliverer_user_id: user.id }, '-created_date', 100);
        setOrders(ords.filter(o => o.status !== 'delivered' && o.status !== 'cancelled'));
        setCompletedOrders(ords.filter(o => o.status === 'delivered'));
        if (isTracking()) setWatching(true);
        if (orderParam) setHighlightedOrder(orderParam);
      }
      setLoading(false);
    })().catch(() => { setDeliverer(null); setLoading(false); });
  }, [user]);

  useEffect(() => {
    const updateLocation = event => {
      setLocationError('');
      setDeliverer(previous => previous ? { ...previous, ...event.detail } : previous);
    };
    const showLocationError = event => { setLocationError(event.detail); setWatching(false); };
    window.addEventListener('peddi-deliverer-location', updateLocation);
    window.addEventListener('peddi-location-error', showLocationError);
    return () => {
      window.removeEventListener('peddi-deliverer-location', updateLocation);
      window.removeEventListener('peddi-location-error', showLocationError);
    };
  }, []);

  useEffect(() => {
    if (user?.role!=='courier') return;
    const check=()=>peddiApi.me(localStorage.getItem('peddi_access_token')).catch(error=>{
      if ([401,403].includes(error.status)) { stopLocationTracking(); setDeliverer(null); setOrders([]); logout(false); }
    });
    const timer=setInterval(check,15000);
    const checkOnFocus=()=>{void check();};
    window.addEventListener('focus',checkOnFocus);
    return()=>{clearInterval(timer);window.removeEventListener('focus',checkOnFocus);stopLocationTracking();};
  },[user?.id]);

  // Real-time subscription
  useEffect(() => {
    if (!user?.id || user.role !== 'courier') return;
    const unsub = base44.entities.Order.subscribe((event) => {
      if (event.type === 'create' || event.type === 'update') {
        const o = event.data;
        if (o.deliverer_user_id !== user.id) { setOrders(previous => previous.filter(item => item.id !== event.id)); return; }
        if (o.status === 'delivered') {
          setOrders(prev => prev.filter(p => p.id !== event.id));
          setCompletedOrders(prev => {
            if (prev.find(p => p.id === event.id)) return prev.map(p => p.id === event.id ? { ...p, ...o, id: event.id } : p);
            return [{ ...o, id: event.id }, ...prev];
          });
        } else if (o.status !== 'cancelled') {
          setOrders(prev => {
            const exists = prev.find(p => p.id === event.id);
            if (exists) return prev.map(p => p.id === event.id ? { ...p, ...o, id: event.id } : p);
            setPopup({ order: o, kind: 'new_assignment' });
            setTimeout(() => setPopup(null), 6000);
            return [{ ...o, id: event.id }, ...prev];
          });
          setCompletedOrders(prev => prev.filter(p => p.id !== event.id));
        } else {
          setOrders(prev => prev.filter(p => p.id !== event.id));
          setCompletedOrders(prev => prev.filter(p => p.id !== event.id));
        }
      } else if (event.type === 'delete') { setOrders(previous => previous.filter(item => item.id !== event.id)); }
    });
    return () => unsub();
  }, [user?.id]);

  const startWatching = async () => {
    if (!deliverer) return;
    setStartingLocation(true);
    setLocationError('');
    try {
      await startLocationTracking(deliverer.id);
      setWatching(true);
    } catch (error) {
      setWatching(false);
      setLocationError(error.message || 'Não foi possível iniciar a localização.');
    } finally {
      setStartingLocation(false);
    }
  };

  const stopWatching = () => {
    stopLocationTracking(deliverer?.id);
    setWatching(false);
  };

  useEffect(() => {
    if (highlightedOrder) {
      setTimeout(() => {
        document.getElementById(`order-${highlightedOrder}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 500);
    }
  }, [highlightedOrder]);

  // ── Deliverer actions ──
  const acceptOrder = async (orderId) => {
    setActionLoading(orderId);
    await base44.entities.Order.update(orderId, { deliverer_accepted: true });
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, deliverer_accepted: true } : o));
    if (!isTracking() && deliverer) await startWatching();
    setActionLoading(null);
  };

  const refuseOrder = async (orderId) => {
    setActionLoading(orderId);
    await base44.entities.Order.update(orderId, { deliverer_user_id: '', tracking_code: '', deliverer_accepted: false });
    setOrders(prev => prev.filter(o => o.id !== orderId));
    setActionLoading(null);
  };

  const pickUpOrder = async (orderId) => {
    setActionLoading(orderId);
    await base44.entities.Order.update(orderId, { status: 'shipped' });
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: 'shipped' } : o));
    setActionLoading(null);
  };

  const deliverOrder = async (orderId) => {
    setActionLoading(orderId);
    const order = orders.find(o => o.id === orderId);
    await base44.entities.Order.update(orderId, { status: 'delivered' });
    if (order?.customer_email) {
      try {
        const profiles = await base44.entities.CustomerProfile.filter({ email: order.customer_email });
        if (profiles[0]?.user_id) {
          await base44.entities.Notification.create({
            user_id: profiles[0].user_id, type: 'deliverer_rating_request',
            title: 'Avalie seu entregador', message: `Como foi sua entrega do pedido #${order.order_number}?`,
            is_read: false, reference_id: order.id, reference_type: 'deliverer_rating',
          });
        }
      } catch (_) {}
    }
    setOrders(prev => prev.filter(o => o.id !== orderId));
    if (orders.filter(o => o.id !== orderId).length === 0) { stopLocationTracking(deliverer?.id); setWatching(false); }
    setActionLoading(null);
  };

  const saveProfile = async () => {
    setSavingProfile(true);
    await base44.entities.Deliverer.update(deliverer.id, profileForm);
    setDeliverer({ ...deliverer, ...profileForm });
    setSavingProfile(false);
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPhoto(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setProfileForm(prev => ({ ...prev, photo_url: file_url }));
    } catch (_) {}
    setUploadingPhoto(false);
  };

  // ── Report calculations ──
  const now = new Date();
  const weekAgo = new Date(now); weekAgo.setDate(weekAgo.getDate() - 7);
  const monthAgo = new Date(now); monthAgo.setMonth(monthAgo.getMonth() - 1);
  const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);

  const todayDeliveries = completedOrders.filter(o => new Date(o.created_date) >= todayStart).length;
  const weekDeliveries = completedOrders.filter(o => new Date(o.created_date) >= weekAgo).length;
  const monthDeliveries = completedOrders.filter(o => new Date(o.created_date) >= monthAgo).length;

  const totalCompleted = completedOrders.length;
  const inProgress = orders.length;
  const allTotal = totalCompleted + inProgress;

  const totalEarnings = (() => {
    if (deliverer?.payment_type === 'per_delivery') return totalCompleted * (deliverer.payment_value || 0);
    if (deliverer?.payment_type === 'per_km') return totalCompleted * (deliverer.payment_value || 0);
    if (deliverer?.payment_type === 'daily') {
      const days = new Set(completedOrders.map(o => new Date(o.created_date).toDateString())).size;
      return Math.max(days, totalCompleted > 0 ? 1 : 0) * (deliverer.payment_value || 0);
    }
    return 0;
  })();

  const filteredCompleted = reportPeriod === 'all' ? completedOrders
    : reportPeriod === 'week' ? completedOrders.filter(o => new Date(o.created_date) >= weekAgo)
    : reportPeriod === 'month' ? completedOrders.filter(o => new Date(o.created_date) >= monthAgo)
    : completedOrders;

  // ── Not authenticated ──
  if (!isAuthenticated || !user || user.role !== 'courier') return <DelivererRegister/>;

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-primary" size={32} /></div>;
  }

  if (!deliverer) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4 text-center space-y-4">
        <div className="w-20 h-20 bg-orange-50 rounded-full flex items-center justify-center">
          <Bike size={36} className="text-orange-500" />
        </div>
        <div>
          <h1 className="font-heading font-bold text-xl">Acesso às entregas indisponível</h1>
          <p className="text-gray-500 text-sm mt-1">Seu cadastro precisa estar aprovado e ativo. Consulte o gestor da loja.</p>
        </div>
        <button onClick={() => logout(false)} className="text-sm text-primary">Sair da conta</button>
      </div>
    );
  }

  // ── Order details card renderer ──
  const renderOrderCard = (o, showActions = true) => (
    <div key={o.id} id={`order-${o.id}`} className={`bg-white rounded-2xl border p-4 transition-all ${highlightedOrder === o.id ? 'border-primary border-2 ring-2 ring-primary/20' : 'border-gray-100'}`}>
      <div className="cursor-pointer" onClick={() => setExpandedOrder(expandedOrder === o.id ? null : o.id)}>
        <div className="flex items-center justify-between mb-2">
          <p className="font-bold text-sm">#{o.order_number}</p>
          <div className="flex items-center gap-2">
            {showActions && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-50 text-cyan-600">{o.status === 'shipped' ? 'A CAMINHO' : 'PENDENTE'}</span>}
            {!showActions && <span className="text-[10px] text-gray-400">{new Date(o.created_date).toLocaleDateString('pt-BR')}</span>}
            {expandedOrder === o.id ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
          </div>
        </div>
        <p className="text-sm font-medium text-gray-800">{o.customer_name}</p>
        <p className="text-xs text-gray-500 mt-1 flex items-start gap-1"><MapPin size={12} className="mt-0.5 flex-shrink-0" /> {o.delivery_address}{o.delivery_city ? `, ${o.delivery_city}` : ''}</p>
        {o.customer_phone && <p className="text-xs text-gray-500 mt-1 flex items-center gap-1"><Phone size={11} /> {o.customer_phone}</p>}
      </div>

      {/* Expandable details */}
      {expandedOrder === o.id && (
        <div className="mt-3 pt-3 border-t border-gray-100 space-y-3 text-xs">
          {/* Address details */}
          {(o.delivery_neighborhood || o.delivery_zip || o.delivery_notes) && (
            <div className="space-y-0.5">
              <p className="font-semibold text-gray-700 mb-1">Endereço completo:</p>
              {o.delivery_neighborhood && <p className="text-gray-600">Bairro: {o.delivery_neighborhood}</p>}
              {o.delivery_zip && <p className="text-gray-600">CEP: {o.delivery_zip}</p>}
              {o.delivery_notes && <p className="text-gray-600">Complemento/Referência: {o.delivery_notes}</p>}
            </div>
          )}

          {/* Items */}
          <div className="space-y-1.5">
            <p className="font-semibold text-gray-700 mb-1">Itens do pedido:</p>
            {o.items?.map((item, i) => (
              <div key={i} className="pl-2 border-l-2 border-gray-100">
                <p className="font-medium text-gray-800">{item.quantity}x {item.product_name}</p>
                {item.variation && <p className="text-gray-500 pl-2">· {item.variation}</p>}
                {item.addons?.length > 0 && <p className="text-gray-500 pl-2">+ {item.addons.join(', ')}</p>}
                {item.notes && <p className="text-orange-600 pl-2 italic">"{item.notes}"</p>}
              </div>
            ))}
          </div>

          {/* Payment + total */}
          <div className="pt-2 border-t border-gray-100 space-y-1">
            <div className="flex justify-between">
              <span className="text-gray-500">Pagamento</span>
              <span className="font-medium">{PAYMENT_LABELS[o.payment_method] || o.payment_method}</span>
            </div>
            {o.payment_method === 'cash' && <p className="text-[11px] text-amber-600 bg-amber-50 rounded-lg px-2 py-1">💵 Levar troco para troco</p>}
            {o.order_notes && <p className="text-orange-600 italic">Obs: {o.order_notes}</p>}
            <div className="flex justify-between font-bold pt-1">
              <span>Total</span>
              <span className="text-primary">R$ {o.total?.toFixed(2)}</span>
            </div>
          </div>
        </div>
      )}

      {/* Action buttons */}
      {showActions && (
        <div className="mt-3 pt-3 border-t border-gray-50 space-y-2">
          {!o.deliverer_accepted && o.status !== 'shipped' && (
            <div className="flex gap-2">
              <button onClick={() => acceptOrder(o.id)} disabled={actionLoading === o.id}
                className="flex-1 py-2.5 bg-green-500 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 disabled:opacity-50">
                <Check size={14} /> Aceitar
              </button>
              <button onClick={() => refuseOrder(o.id)} disabled={actionLoading === o.id}
                className="flex-1 py-2.5 bg-red-50 text-red-500 border border-red-200 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 disabled:opacity-50">
                <XCircle size={14} /> Recusar
              </button>
            </div>
          )}
          {o.deliverer_accepted && o.status !== 'shipped' && (
            <button onClick={() => pickUpOrder(o.id)} disabled={actionLoading === o.id}
              className="w-full py-2.5 bg-blue-500 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50">
              <Package size={16} /> Retirar para entrega
            </button>
          )}
          {o.status === 'shipped' && (
            <button onClick={() => deliverOrder(o.id)} disabled={actionLoading === o.id}
              className="w-full py-2.5 bg-green-500 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50">
              <CheckCircle2 size={16} /> Finalizar entrega
            </button>
          )}
          <button onClick={() => setChatOrder(o)} className="w-full py-2 bg-blue-50 text-blue-600 border border-blue-200 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5">
            <MessageCircle size={14} /> Chat com cliente
          </button>
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="max-w-lg mx-auto bg-white min-h-screen">
        {/* Header */}
        <div className="bg-gradient-to-br from-primary to-emerald-400 p-5 text-white">
          <div className="flex items-center justify-between mb-3">
            <button onClick={() => logout(false)} aria-label="Sair da área do entregador" className="w-9 h-9 bg-black/20 rounded-full flex items-center justify-center">
              <ArrowLeft size={18} />
            </button>
            <span className="text-xs font-bold bg-white/20 px-3 py-1 rounded-full">Área do Entregador</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-full bg-white/20 overflow-hidden flex items-center justify-center flex-shrink-0">
              {deliverer.photo_url ? <img src={deliverer.photo_url} alt="" className="w-full h-full object-cover" /> : <Bike size={28} />}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="font-heading font-bold text-lg">{deliverer.name}</h1>
              <p className="text-xs text-white/80">{deliverer.phone} · {VEHICLE_OPTIONS.find(v => v.value === deliverer.vehicle)?.label}</p>
              {deliverer.rating_count > 0 && (
                <p className="text-xs text-white/90 flex items-center gap-1 mt-0.5">
                  <Star size={11} className="fill-amber-300 text-amber-300" /> {deliverer.rating_avg?.toFixed(1)} ({deliverer.rating_count} avaliações)
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Tab switcher — 4 tabs */}
        <div className="flex border-b border-gray-100">
          <button onClick={() => setTab('deliveries')} className={`flex-1 py-3 text-xs font-bold flex flex-col items-center gap-0.5 ${tab === 'deliveries' ? 'text-primary border-b-2 border-primary' : 'text-gray-400'}`}>
            <Package size={16} /> Entregas
          </button>
          <button onClick={() => setTab('completed')} className={`flex-1 py-3 text-xs font-bold flex flex-col items-center gap-0.5 ${tab === 'completed' ? 'text-primary border-b-2 border-primary' : 'text-gray-400'}`}>
            <Check size={16} /> Realizadas
          </button>
          <button onClick={() => setTab('report')} className={`flex-1 py-3 text-xs font-bold flex flex-col items-center gap-0.5 ${tab === 'report' ? 'text-primary border-b-2 border-primary' : 'text-gray-400'}`}>
            <BarChart2 size={16} /> Relatório
          </button>
          <button onClick={() => setTab('profile')} className={`flex-1 py-3 text-xs font-bold flex flex-col items-center gap-0.5 ${tab === 'profile' ? 'text-primary border-b-2 border-primary' : 'text-gray-400'}`}>
            <UserIcon size={16} /> Perfil
          </button>
          <button onClick={() => setTab('chat')} className={`flex-1 py-3 text-xs font-bold flex flex-col items-center gap-0.5 ${tab === 'chat' ? 'text-primary border-b-2 border-primary' : 'text-gray-400'}`}>
            <MessageCircle size={16} /> Chat
          </button>
        </div>

        {/* ── Entregas tab ── */}
        {tab === 'deliveries' && (
          <>
            {/* GPS sharing */}
            <div className="p-4 border-b border-gray-100">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Navigation size={18} className="text-primary" />
                  <h2 className="font-heading font-semibold text-sm">Localização</h2>
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${watching ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                  {watching ? 'ATIVO' : 'INATIVO'}
                </span>
              </div>
              {deliverer.lat && deliverer.lng && (
                <p className="text-xs text-gray-400 mb-2 flex items-center gap-1">
                  <MapPin size={12} /> {deliverer.lat.toFixed(4)}, {deliverer.lng.toFixed(4)}
                  {deliverer.location_updated_at && ` · ${new Date(deliverer.location_updated_at).toLocaleTimeString('pt-BR')}`}
                </p>
              )}
              {locationError && <p className="mb-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{locationError}</p>}
              {watching ? (
                <button onClick={stopWatching} className="w-full py-3 bg-red-500 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2">
                  <Power size={16} /> Parar compartilhamento
                </button>
              ) : (
                <button onClick={startWatching} disabled={startingLocation} className="w-full py-3 bg-primary text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-60">
                  {startingLocation ? <Loader2 size={16} className="animate-spin" /> : <Navigation size={16} />} {startingLocation ? 'Obtendo GPS...' : 'Iniciar compartilhamento'}
                </button>
              )}
              <p className="text-[10px] text-gray-400 mt-2 text-center">A localização continua ativa em segundo plano após aceitar uma entrega.</p>
            </div>

            {/* Active orders */}
            <div className="p-4">
              <h2 className="font-heading font-semibold text-sm mb-3">Entregas em andamento ({orders.length})</h2>
              {orders.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <Package size={32} className="mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Nenhuma entrega atribuída no momento</p>
                </div>
              ) : (
                <div className="space-y-3">{orders.map(o => renderOrderCard(o, true))}</div>
              )}
            </div>
          </>
        )}

        {/* ── Realizadas tab ── */}
        {tab === 'completed' && (
          <div className="p-4">
            <h2 className="font-heading font-semibold text-sm mb-3">Entregas realizadas ({completedOrders.length})</h2>
            {completedOrders.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <CheckCircle2 size={32} className="mx-auto mb-2 opacity-30" />
                <p className="text-sm">Nenhuma entrega realizada ainda</p>
              </div>
            ) : (
              <div className="space-y-3">{completedOrders.map(o => renderOrderCard(o, false))}</div>
            )}
          </div>
        )}

        {/* ── Relatório tab ── */}
        {tab === 'report' && (
          <div className="p-4 space-y-4">
            {/* Stats cards */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-blue-50 rounded-2xl p-4 text-center">
                <p className="text-2xl font-bold text-blue-700">{totalCompleted}</p>
                <p className="text-xs text-blue-600 mt-0.5">Entregas realizadas</p>
              </div>
              <div className="bg-cyan-50 rounded-2xl p-4 text-center">
                <p className="text-2xl font-bold text-cyan-700">{inProgress}</p>
                <p className="text-xs text-cyan-600 mt-0.5">Em andamento</p>
              </div>
              <div className="bg-green-50 rounded-2xl p-4 text-center">
                <p className="text-2xl font-bold text-green-700">R$ {totalEarnings.toFixed(2)}</p>
                <p className="text-xs text-green-600 mt-0.5">Total a receber</p>
              </div>
              <div className="bg-orange-50 rounded-2xl p-4 text-center">
                <p className="text-2xl font-bold text-orange-700">{allTotal}</p>
                <p className="text-xs text-orange-600 mt-0.5">Total de entregas</p>
              </div>
            </div>

            {/* Averages */}
            <div className="bg-gray-50 rounded-2xl p-4">
              <p className="text-xs font-bold text-gray-500 uppercase mb-3">Média de entregas</p>
              <div className="grid grid-cols-3 gap-2">
                <div className="text-center">
                  <p className="text-lg font-bold text-gray-800">{todayDeliveries}</p>
                  <p className="text-[10px] text-gray-500">Hoje</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-gray-800">{weekDeliveries}</p>
                  <p className="text-[10px] text-gray-500">7 dias</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-gray-800">{monthDeliveries}</p>
                  <p className="text-[10px] text-gray-500">30 dias</p>
                </div>
              </div>
            </div>

            {/* Payment config */}
            <div className="bg-white rounded-2xl border border-gray-100 p-4">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign size={16} className="text-primary" />
                <p className="text-sm font-semibold">Configuração de pagamento</p>
              </div>
              <p className="text-xs text-gray-500">
                {deliverer.payment_type === 'per_delivery' && `R$ ${(deliverer.payment_value || 0).toFixed(2)} por entrega`}
                {deliverer.payment_type === 'per_km' && `R$ ${(deliverer.payment_value || 0).toFixed(2)} por KM`}
                {deliverer.payment_type === 'daily' && `R$ ${(deliverer.payment_value || 0).toFixed(2)} por dia`}
                {deliverer.payment_type === 'manual' && 'Valor manual'}
              </p>
            </div>

            {/* History with period filter */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-bold text-gray-500 uppercase">Histórico</p>
                <div className="flex gap-1 bg-gray-100 p-1 rounded-xl text-xs">
                  {[['all', 'Tudo'], ['week', '7d'], ['month', '30d']].map(([v, l]) => (
                    <button key={v} onClick={() => setReportPeriod(v)} className={`px-3 py-1 rounded-lg font-medium ${reportPeriod === v ? 'bg-white shadow-sm text-foreground' : 'text-gray-400'}`}>{l}</button>
                  ))}
                </div>
              </div>
              {filteredCompleted.length === 0 ? (
                <p className="text-center text-sm text-gray-400 py-6">Sem entregas no período</p>
              ) : (
                <div className="space-y-2">
                  {filteredCompleted.map(o => (
                    <div key={o.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl text-sm">
                      <div>
                        <p className="font-medium">#{o.order_number} · {o.customer_name}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{new Date(o.created_date).toLocaleDateString('pt-BR')} · {o.delivery_city || '—'}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-primary">R$ {o.total?.toFixed(2)}</p>
                        <p className="text-[10px] text-green-600">Entregue</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Chat tab ── */}
        {tab === 'chat' && (
          <div className="p-4">
            <DelivererChatTab user={user} deliverer={deliverer} />
          </div>
        )}

        {/* ── Perfil tab ── */}
        {tab === 'profile' && (
          <div className="p-4 space-y-4">
            <div className="flex flex-col items-center py-4">
              <div className="w-24 h-24 rounded-full bg-gray-100 overflow-hidden flex items-center justify-center mb-3 relative">
                {profileForm?.photo_url ? <img src={profileForm.photo_url} className="w-full h-full object-cover" alt="" /> : <Bike size={40} className="text-gray-300" />}
              </div>
              <label className="flex items-center gap-2 text-sm text-primary font-medium cursor-pointer">
                <Camera size={16} /> {uploadingPhoto ? 'Enviando...' : 'Alterar foto'}
                <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" disabled={uploadingPhoto} />
              </label>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block uppercase">Nome</label>
                <input value={profileForm?.name || ''} onChange={e => setProfileForm(p => ({ ...p, name: e.target.value }))}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block uppercase">WhatsApp</label>
                <input value={profileForm?.phone || ''} onChange={e => setProfileForm(p => ({ ...p, phone: e.target.value }))}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block uppercase">Veículo</label>
                <select value={profileForm?.vehicle || 'moto'} onChange={e => setProfileForm(p => ({ ...p, vehicle: e.target.value }))}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
                  {VEHICLE_OPTIONS.map(v => <option key={v.value} value={v.value}>{v.label}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block uppercase">Bio</label>
                <textarea value={profileForm?.bio || ''} onChange={e => setProfileForm(p => ({ ...p, bio: e.target.value }))}
                  placeholder="Conte um pouco sobre você..." rows={3}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none" />
              </div>
            </div>
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
              <div className="flex items-center gap-2">
                <Mail size={18} className="text-gray-400" />
                <div>
                  <p className="text-sm font-semibold">Notificações por e-mail</p>
                  <p className="text-xs text-gray-400">Receber e-mail ao receber nova entrega</p>
                </div>
              </div>
              <button onClick={() => setProfileForm(p => ({ ...p, email_notifications: !p.email_notifications }))}
                className={`w-12 h-6 rounded-full transition-colors ${profileForm?.email_notifications ? 'bg-primary' : 'bg-gray-300'}`}>
                <div className={`w-5 h-5 bg-white rounded-full transition-transform ${profileForm?.email_notifications ? 'translate-x-6' : 'translate-x-0.5'}`} />
              </button>
            </div>
            <button onClick={saveProfile} disabled={savingProfile}
              className="w-full py-3 bg-primary text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50">
              {savingProfile ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Salvar perfil
            </button>
          </div>
        )}
      </div>

      {/* Delivery chat overlay */}
      {chatOrder && (
        <div data-peddi-modal="" className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center" onClick={() => setChatOrder(null)}>
          <div className="bg-white w-full sm:max-w-md sm:rounded-3xl h-[80vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="bg-blue-500 text-white p-3 flex items-center justify-between">
              <div>
                <p className="font-bold text-sm">Chat com cliente</p>
                <p className="text-[10px] text-white/80">Pedido #{chatOrder.order_number}</p>
              </div>
              <button onClick={() => setChatOrder(null)}><X size={18} /></button>
            </div>
            <div className="flex-1 overflow-hidden">
              <DeliveryChat
                orderId={chatOrder.id}
                customerName={chatOrder.customer_name}
                customerEmail={chatOrder.customer_email}
                delivererUserId={user.id}
                userType="deliverer"
              />
            </div>
          </div>
        </div>
      )}

      {/* New assignment popup */}
      <AnimatePresence>
        {popup && (
          <motion.div initial={{ y: -80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -80, opacity: 0 }}
            className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] w-full max-w-sm mx-auto px-4">
            <div className="bg-white border-2 border-green-400 rounded-2xl shadow-2xl p-4 flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center flex-shrink-0">
                <Package size={20} className="text-green-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-heading font-bold text-sm text-green-600">🛵 Nova entrega!</p>
                <p className="text-xs text-gray-600 mt-0.5">Pedido #{popup.order?.order_number} — {popup.order?.customer_name}</p>
              </div>
              <button onClick={() => setPopup(null)} className="p-1"><X size={14} className="text-gray-400" /></button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
