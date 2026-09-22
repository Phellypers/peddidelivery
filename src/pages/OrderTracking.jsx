import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Loader2, ArrowLeft, Bike, Star, Navigation } from 'lucide-react';
import DeliveryChat from '@/components/delivery/DeliveryChat';
import SafeBackButton from '@/components/navigation/SafeBackButton';
import { peddiApi } from '@/services/api/peddiApi';

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
    html: `<div style="background:#3B82F6;width:36px;height:36px;border-radius:50%;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;font-size:18px;">&#128757;</div>`,
    className: '', iconSize: [36, 36], iconAnchor: [18, 18],
  });
}

const destinationIcon=L.divIcon({html:'<div style="background:#22C55E;width:28px;height:28px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:3px solid white;box-shadow:0 2px 8px #0004"><span style="display:block;transform:rotate(45deg);text-align:center;line-height:22px">&#8962;</span></div>',className:'',iconSize:[28,28],iconAnchor:[14,28]});
function FitTrackingMap({points}) {
  const map=useMap();
  const key=points.flat().join(',');
  useEffect(()=>{if(points.length>1)map.fitBounds(points,{padding:[35,35],maxZoom:16});else if(points[0])map.setView(points[0],16);},[map,key]);
  return null;
}

export default function OrderTracking() {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [deliverer, setDeliverer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [customerLocation,setCustomerLocation]=useState(null);
  const [streamError,setStreamError]=useState('');

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
  }, [id]);

  useEffect(()=>{
    if(order?.status!=='shipped')return undefined;
    const controller=new AbortController();
    (async()=>{try{
      const response=await peddiApi.trackingStream(id,controller.signal);
      if(!response.ok||!response.body)throw new Error('Tracking unavailable');
      const reader=response.body.getReader(),decoder=new TextDecoder();let buffer='';
      while(true){const {done,value}=await reader.read();if(done)break;buffer+=decoder.decode(value,{stream:true});const events=buffer.split('\n\n');buffer=events.pop()||'';
        for(const event of events){const line=event.split('\n').find(part=>part.startsWith('data: '));if(!line)continue;const snapshot=JSON.parse(line.slice(6));
          if(snapshot.status)setOrder(previous=>previous?{...previous,status:snapshot.status}:previous);
          if(snapshot.courier)setDeliverer(previous=>({...previous,...snapshot.courier,photo_url:snapshot.courier.photoUrl,location_updated_at:snapshot.courier.updatedAt}));
          if(snapshot.destination?.lat&&snapshot.destination?.lng)setCustomerLocation([snapshot.destination.lat,snapshot.destination.lng]);
        }
      }
    }catch(error){if(error.name!=='AbortError')setStreamError('A localização será atualizada assim que o entregador estiver disponível.');}})();
    return()=>controller.abort();
  },[id,order?.status==='shipped']);

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin text-primary" size={32} /></div>;
  if (!order) return <div className="min-h-screen flex items-center justify-center text-gray-400">Pedido não encontrado</div>;

  const isChatActive = !['delivered', 'cancelled'].includes(order.status);
  const updatedAt = new Date(deliverer?.location_updated_at || 0).getTime();
  const locationIsFresh = Number.isFinite(updatedAt) && Date.now() - updatedAt <= 3 * 60 * 1000;
  const hasLocation = order.status==='shipped' && locationIsFresh && deliverer?.lat != null && deliverer?.lng != null && Number.isFinite(Number(deliverer.lat)) && Number.isFinite(Number(deliverer.lng));
  const center = hasLocation ? [Number(deliverer.lat), Number(deliverer.lng)] : [-14.235, -51.9253];
  const mapPoints=[...(hasLocation?[center]:[]),...(customerLocation?[customerLocation]:[])];

  return (
    <div className="min-h-screen bg-gray-50 pb-6">
      <div className="max-w-lg mx-auto bg-white min-h-screen">
        {/* Header */}
        <div className="sticky top-0 z-30 bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3">
          <SafeBackButton fallback="/meus-pedidos" aria-label="Voltar aos pedidos" className="p-1.5 rounded-lg hover:bg-gray-100"><ArrowLeft size={20} /></SafeBackButton>
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
                  <FitTrackingMap points={mapPoints}/>
                  <Marker position={center} icon={makeDelivererIcon()}>
                    <Popup>
                      <div>
                        <p style={{ fontWeight: 'bold' }}>{deliverer.name}</p>
                        <p style={{ fontSize: '11px', color: '#666' }}>{STATUS_LABELS[order.status]}</p>
                      </div>
                    </Popup>
                  </Marker>
                  {customerLocation&&<Marker position={customerLocation} icon={destinationIcon}><Popup>Sua localização / endereço de entrega</Popup></Marker>}
                  {customerLocation&&<Polyline positions={[center,customerLocation]} pathOptions={{color:'#22C55E',weight:4,dashArray:'8 8'}}/>}
                </MapContainer>
              </div>
            ) : (
              <div className="h-[200px] flex flex-col items-center justify-center text-gray-400 bg-gray-50">
                <Navigation size={32} className="opacity-30 mb-2" />
                <p className="text-xs">Aguardando localização do entregador...</p>
              </div>
            )}
          </div>
          {streamError&&<p className="px-3 py-2 text-xs text-amber-700">{streamError}</p>}
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
