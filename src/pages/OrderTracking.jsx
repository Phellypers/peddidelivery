import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Loader2, ArrowLeft, Bike, Star, Navigation } from 'lucide-react';
import DeliveryChat from '@/components/delivery/DeliveryChat';

const STATUS_LABELS = {
  pending: 'Recebido', confirmed: 'Confirmado', preparing: 'Em preparo',
  shipped: 'Saiu p/ Entrega', delivered: 'Entregue', cancelled: 'Cancelado',
};
const STATUS_COLORS = {
  pending: 'bg-amber-100 text-amber-700', confirmed: 'bg-blue-100 text-blue-700',
  preparing: 'bg-purple-100 text-purple-700', shipped: 'bg-cyan-100 text-cyan-700',
  delivered: 'bg-green-100 text-green-700', cancelled: 'bg-red-100 text-red-700',
};

function makeDelivererIcon() {
  return L.divIcon({
    html: `<div style="background:#3B82F6;width:36px;height:36px;border-radius:50%;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;font-size:18px;">🛵</div>`,
    className: '', iconSize: [36, 36], iconAnchor: [18, 18],
  });
}

export default function OrderTracking() {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [deliverer, setDeliverer] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    base44.entities.Order.get(id).then(o => {
      setOrder(o);
      setLoading(false);
      if (o.deliverer_user_id) {
        base44.entities.Deliverer.filter({ user_id: o.deliverer_user_id }).then(dels => setDeliverer(dels[0]));
      } else if (o.tracking_code) {
        base44.entities.Deliverer.list('name').then(all => setDeliverer(all.find(d => d.name === o.tracking_code)));
      }
    });
    const unsub = base44.entities.Order.subscribe(event => {
      if (event.id === id) setOrder(prev => prev ? { ...prev, ...event.data, id } : prev);
    });
    return () => unsub();
  }, [id]);

  useEffect(() => {
    if (!deliverer?.id) return;
    const unsub = base44.entities.Deliverer.subscribe(event => {
      if (event.id === deliverer.id) setDeliverer(prev => prev ? { ...prev, ...event.data } : prev);
    });
    return () => unsub();
  }, [deliverer?.id]);

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin text-primary" size={32} /></div>;
  if (!order) return <div className="min-h-screen flex items-center justify-center text-gray-400">Pedido não encontrado</div>;

  const isChatActive = !['delivered', 'cancelled'].includes(order.status);
  const hasLocation = deliverer?.lat && deliverer?.lng;
  const center = hasLocation ? [deliverer.lat, deliverer.lng] : [-23.5505, -46.6333];

  return (
    <div className="min-h-screen bg-gray-50 pb-6">
      <div className="max-w-lg mx-auto bg-white min-h-screen">
        {/* Header */}
        <div className="sticky top-0 z-30 bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3">
          <Link to="/meus-pedidos" className="p-1.5 rounded-lg hover:bg-gray-100"><ArrowLeft size={20} /></Link>
          <div>
            <h1 className="font-heading font-bold text-lg">Acompanhar entrega</h1>
            <p className="text-xs text-gray-400">Pedido #{order.order_number}</p>
          </div>
        </div>

        {/* Status */}
        <div className="px-4 py-3">
          <span className={`text-xs font-semibold px-3 py-1 rounded-full ${STATUS_COLORS[order.status]}`}>
            {STATUS_LABELS[order.status]}
          </span>
        </div>

        {/* Deliverer info */}
        {deliverer && (
          <div className="px-4 pb-3">
            <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-2xl">
              <div className="w-12 h-12 rounded-full bg-blue-100 overflow-hidden flex items-center justify-center flex-shrink-0">
                {deliverer.photo_url ? <img src={deliverer.photo_url} className="w-full h-full object-cover" alt="" /> : <Bike size={24} className="text-blue-500" />}
              </div>
              <div className="flex-1">
                <p className="font-bold text-sm text-gray-900">{deliverer.name}</p>
                {deliverer.rating_count > 0 && (
                  <div className="flex items-center gap-1">
                    <Star size={11} className="fill-amber-400 text-amber-400" />
                    <span className="text-xs font-medium text-amber-600">{deliverer.rating_avg?.toFixed(1)} ({deliverer.rating_count})</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Map */}
        <div className="px-4 pb-4">
          <div className="rounded-2xl overflow-hidden border border-gray-100">
            {hasLocation ? (
              <div className="h-[300px]">
                <MapContainer center={center} zoom={15} style={{ height: '100%', width: '100%' }}>
                  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; OpenStreetMap' />
                  <Marker position={center} icon={makeDelivererIcon()}>
                    <Popup>
                      <div>
                        <p style={{ fontWeight: 'bold' }}>{deliverer.name}</p>
                        <p style={{ fontSize: '11px', color: '#666' }}>{STATUS_LABELS[order.status]}</p>
                      </div>
                    </Popup>
                  </Marker>
                </MapContainer>
              </div>
            ) : (
              <div className="h-[200px] flex flex-col items-center justify-center text-gray-400 bg-gray-50">
                <Navigation size={32} className="opacity-30 mb-2" />
                <p className="text-xs">Aguardando localização do entregador...</p>
              </div>
            )}
          </div>
        </div>

        {/* Chat */}
        {isChatActive && deliverer ? (
          <div className="px-4 pb-6">
            <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
              <div className="bg-blue-500 text-white p-3 flex items-center gap-2">
                <Bike size={16} />
                <div>
                  <p className="font-bold text-sm">Chat com entregador</p>
                  <p className="text-[10px] text-white/80">Tire dúvidas sobre sua entrega</p>
                </div>
              </div>
              <div className="h-[350px]">
                <DeliveryChat
                  orderId={order.id}
                  customerName={order.customer_name}
                  customerEmail={order.customer_email}
                  delivererUserId={deliverer.user_id || order.deliverer_user_id}
                  userType="customer"
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="px-4 pb-6 text-center">
            <p className="text-sm text-gray-400">
              {order.status === 'delivered' ? '✅ Entrega finalizada! O chat foi encerrado.' : 'Chat indisponível'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}