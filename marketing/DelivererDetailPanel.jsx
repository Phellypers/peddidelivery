import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { X, Bike, Phone, Star, MessageCircle, Package, ExternalLink, Shuffle, Loader2 } from 'lucide-react';

const VEHICLE_LABELS = { moto: '🏍️ Moto', bicicleta: '🚲 Bicicleta', carro: '🚗 Carro', a_pe: '🚶 A pé' };
const STATUS_LABELS = { available: 'Disponível', delivering: 'Em entrega', offline: 'Offline' };

export default function DelivererDetailPanel({ deliverer, cities, allDeliverers, onClose }) {
  const [orders, setOrders] = useState([]);
  const [ratings, setRatings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reassigningId, setReassigningId] = useState(null);
  const [reassignTarget, setReassignTarget] = useState('');
  const [reassigning, setReassigning] = useState(false);
  const navigate = useNavigate();

  const loadOrders = async () => {
    if (!deliverer?.id) return;
    setLoading(true);
    Promise.all([
      deliverer.user_id
        ? base44.entities.Order.filter({ deliverer_user_id: deliverer.user_id }, '-created_date', 100).catch(() => [])
        : Promise.resolve([]),
      base44.entities.DelivererRating.filter({ deliverer_id: deliverer.id }, '-created_date', 50).catch(() => []),
    ]).then(([ords, rats]) => {
      setOrders(ords);
      setRatings(rats);
      setLoading(false);
    });
  };

  useEffect(() => { loadOrders(); }, [deliverer?.id]);

  if (!deliverer) return null;

  const activeOrders = orders.filter(o => o.status !== 'delivered' && o.status !== 'cancelled');
  const completedOrders = orders.filter(o => o.status === 'delivered');
  const delivererCities = (deliverer.city_ids || []).map(id => cities?.find(c => c.id === id)).filter(Boolean);

  const totalEarnings = (() => {
    const val = deliverer.payment_value || 0;
    if (deliverer.payment_type === 'per_delivery' || deliverer.payment_type === 'per_km') return completedOrders.length * val;
    if (deliverer.payment_type === 'daily') {
      const days = new Set(completedOrders.map(o => new Date(o.created_date).toDateString())).size;
      return Math.max(days, completedOrders.length > 0 ? 1 : 0) * val;
    }
    return 0;
  })();

  const openChat = () => {
    navigate(`/admin/chat?conv=deliverer_${deliverer.user_id || deliverer.id}&name=${encodeURIComponent(deliverer.name)}`);
  };

  const reassign = async (orderId) => {
    if (!reassignTarget) return;
    setReassigning(true);
    const newD = allDeliverers?.find(d => d.id === reassignTarget);
    if (newD) {
      await base44.entities.Order.update(orderId, {
        deliverer_user_id: newD.user_id || '',
        tracking_code: newD.name,
        deliverer_accepted: false,
      });
      if (newD.user_id) {
        try {
          await base44.entities.Notification.create({
            user_id: newD.user_id,
            type: 'deliverer_assigned',
            title: 'Nova entrega atribuída',
            message: `Pedido foi remanejado para você`,
            is_read: false,
            reference_id: orderId,
            reference_type: 'order',
          });
        } catch (_) {}
      }
    }
    setReassigning(false);
    setReassigningId(null);
    setReassignTarget('');
    loadOrders();
  };

  const otherDeliverers = (allDeliverers || []).filter(d => d.id !== deliverer.id && d.is_active);

  return (
    <div className="fixed inset-0 z-[1000] flex justify-end lg:relative lg:z-20 lg:inset-auto lg:block" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 lg:hidden" />
      <div className="relative w-full max-w-md lg:max-w-full bg-white h-full lg:h-[600px] overflow-y-auto shadow-2xl lg:shadow-lg lg:rounded-2xl lg:border lg:border-border/50" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="bg-gradient-to-br from-primary to-emerald-400 p-5 text-white sticky top-0 z-10">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold bg-white/20 px-3 py-1 rounded-full">{STATUS_LABELS[deliverer.current_status] || 'Offline'}</span>
            <button onClick={onClose} className="p-1.5 hover:bg-white/20 rounded-lg"><X size={18} /></button>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-full bg-white/20 overflow-hidden flex items-center justify-center flex-shrink-0">
              {deliverer.photo_url ? <img src={deliverer.photo_url} alt="" className="w-full h-full object-cover" /> : <Bike size={28} />}
            </div>
            <div>
              <h2 className="font-heading font-bold text-lg">{deliverer.name}</h2>
              <p className="text-xs text-white/80">{VEHICLE_LABELS[deliverer.vehicle]}</p>
              {deliverer.rating_count > 0 && (
                <div className="flex items-center gap-1 mt-0.5">
                  <Star size={12} className="fill-amber-300 text-amber-300" />
                  <span className="text-xs font-semibold">{deliverer.rating_avg?.toFixed(1)} ({deliverer.rating_count})</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="p-4 space-y-4">
          {/* Contact */}
          <div className="space-y-2 text-sm">
            {deliverer.phone && <div className="flex items-center gap-2 text-gray-600"><Phone size={14} /> {deliverer.phone}</div>}
            {deliverer.email && <div className="flex items-center gap-2 text-gray-600">✉️ {deliverer.email}</div>}
            {deliverer.bio && <p className="text-gray-500 italic">"{deliverer.bio}"</p>}
          </div>

          {/* Cities */}
          {delivererCities.length > 0 && (
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase mb-2">Cidades</p>
              <div className="flex flex-wrap gap-2">
                {delivererCities.map(c => <span key={c.id} className="px-3 py-1 bg-blue-50 text-blue-700 text-xs font-medium rounded-full">{c.name}</span>)}
              </div>
            </div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-blue-50 rounded-xl p-3 text-center">
              <p className="text-lg font-bold text-blue-700">{activeOrders.length}</p>
              <p className="text-[10px] text-blue-600">Em andamento</p>
            </div>
            <div className="bg-green-50 rounded-xl p-3 text-center">
              <p className="text-lg font-bold text-green-700">{completedOrders.length}</p>
              <p className="text-[10px] text-green-600">Entregues</p>
            </div>
            <div className="bg-orange-50 rounded-xl p-3 text-center">
              <p className="text-lg font-bold text-orange-700">R$ {totalEarnings.toFixed(0)}</p>
              <p className="text-[10px] text-orange-600">A receber</p>
            </div>
          </div>

          {/* Chat button */}
          <button onClick={openChat} className="w-full flex items-center justify-center gap-2 py-3 bg-blue-500 text-white rounded-xl font-bold text-sm hover:bg-blue-600 transition-colors">
            <MessageCircle size={16} /> Conversar com entregador
          </button>

          {/* Active orders */}
          {activeOrders.length > 0 && (
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase mb-2 flex items-center gap-1"><Package size={12} /> Pedidos em andamento</p>
              <div className="space-y-2">
                {activeOrders.map(o => (
                  <div key={o.id} className="p-2 bg-gray-50 rounded-xl text-xs">
                    <div className="flex items-center justify-between mb-1">
                      <p className="font-medium">#{o.order_number} · {o.customer_name}</p>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-50 text-cyan-600">{o.status === 'shipped' ? 'A CAMINHO' : 'PENDENTE'}</span>
                    </div>
                    <p className="text-gray-400 mb-2">{o.delivery_city || '—'}</p>
                    {reassigningId === o.id ? (
                      <div className="space-y-2">
                        <select value={reassignTarget} onChange={e => setReassignTarget(e.target.value)}
                          className="w-full px-2 py-1.5 bg-white border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-primary/20">
                          <option value="">Selecione o entregador...</option>
                          {otherDeliverers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                        </select>
                        <div className="flex gap-1.5">
                          <button onClick={() => reassign(o.id)} disabled={!reassignTarget || reassigning}
                            className="flex-1 py-1.5 bg-primary text-white rounded-lg text-[10px] font-bold disabled:opacity-50 flex items-center justify-center gap-1">
                            {reassigning ? <Loader2 size={11} className="animate-spin" /> : <Shuffle size={11} />} Confirmar
                          </button>
                          <button onClick={() => { setReassigningId(null); setReassignTarget(''); }}
                            className="px-3 py-1.5 bg-gray-200 rounded-lg text-[10px] font-medium">Cancelar</button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex gap-1.5">
                        <button onClick={() => { setReassigningId(o.id); setReassignTarget(''); }}
                          className="flex-1 py-1.5 bg-amber-50 text-amber-600 border border-amber-200 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1">
                          <Shuffle size={11} /> Remanejar
                        </button>
                        <button onClick={() => navigate(`/admin/pedidos?order=${o.id}&deliverer=${deliverer.user_id || ''}`)}
                          className="flex-1 py-1.5 bg-blue-50 text-blue-600 border border-blue-200 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1">
                          <ExternalLink size={11} /> Detalhes
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Ratings */}
          {ratings.length > 0 && (
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase mb-2 flex items-center gap-1"><Star size={12} /> Avaliações de clientes</p>
              <div className="space-y-2">
                {ratings.map(r => (
                  <div key={r.id} className="bg-white border border-gray-100 rounded-xl p-3">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-semibold">{r.customer_name || 'Cliente'}</p>
                      <div className="flex items-center gap-0.5">
                        {[1,2,3,4,5].map(s => <Star key={s} size={11} className={s <= r.rating ? 'fill-amber-400 text-amber-400' : 'text-gray-200'} />)}
                      </div>
                    </div>
                    {r.comment && <p className="text-xs text-gray-500 italic">"{r.comment}"</p>}
                    <p className="text-[10px] text-gray-400 mt-1">Pedido #{r.order_number}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Completed orders history */}
          {completedOrders.length > 0 && (
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase mb-2">Histórico de entregas</p>
              <div className="space-y-1.5">
                {completedOrders.slice(0, 10).map(o => (
                  <div key={o.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-xl text-xs">
                    <div>
                      <p className="font-medium">#{o.order_number} · {o.customer_name}</p>
                      <p className="text-gray-400">{new Date(o.created_date).toLocaleDateString('pt-BR')}</p>
                    </div>
                    <p className="font-bold text-green-600">R$ {(o.total || 0).toFixed(2)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {loading && <div className="flex justify-center py-4"><div className="w-6 h-6 border-2 border-gray-200 border-t-primary rounded-full animate-spin" /></div>}
        </div>
      </div>
    </div>
  );
}