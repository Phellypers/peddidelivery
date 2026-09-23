import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { base44 } from '@/api/base44Client';
import { Loader2, Bike, MapPin, Clock, Package } from 'lucide-react';
import DelivererDetailPanel from '@/components/admin/DelivererDetailPanel';
import { mapTileLayer } from '@/lib/mapTiles';

const STATUS_LABELS = { available: 'Disponível', delivering: 'Em entrega', offline: 'Offline' };
const STATUS_COLORS = { available: '#22C55E', delivering: '#3B82F6', offline: '#9CA3AF' };
const LOCATION_MAX_AGE = 3 * 60 * 1000;

function coordinates(deliverer) {
  const lat = Number(deliverer?.lat);
  const lng = Number(deliverer?.lng);
  return Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180 ? [lat, lng] : null;
}

function hasFreshLocation(deliverer) {
  const updatedAt = new Date(deliverer?.location_updated_at || 0).getTime();
  return Boolean(coordinates(deliverer) && Number.isFinite(updatedAt) && Date.now() - updatedAt <= LOCATION_MAX_AGE);
}

function MapViewport({ points }) {
  const map = useMap();
  const key = points.flat().join(',');
  useEffect(() => {
    if (points.length > 1) map.fitBounds(points, { padding: [45, 45], maxZoom: 16 });
    else if (points[0]) map.setView(points[0], 16);
  }, [map, key]);
  return null;
}

function makeIcon(status) {
  const color = STATUS_COLORS[status] || STATUS_COLORS.offline;
  return L.divIcon({
    html: `<div style="background:${color};width:32px;height:32px;border-radius:50%;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;font-size:16px;">🛵</div>`,
    className: '',
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
}

function timeAgo(dateStr) {
  if (!dateStr) return '—';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'agora';
  if (mins < 60) return `${mins}min atrás`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h atrás`;
  return `${Math.floor(hrs / 24)}d atrás`;
}

export default function DelivererMap() {
  const [deliverers, setDeliverers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [cities, setCities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDeliverer, setSelectedDeliverer] = useState(null);

  useEffect(() => {
    Promise.all([
      base44.entities.Deliverer.list('name'),
      base44.entities.Order.filter({ status: 'shipped' }, '-created_date', 50),
      base44.entities.City.list('name'),
    ]).then(([ds, ords, cs]) => {
      setDeliverers(ds);
      setOrders(ords);
      setCities(cs);
      setLoading(false);
    });
    const unsub = base44.entities.Deliverer.subscribe((event) => {
      if (event.type === 'update') {
        setDeliverers(prev => prev.map(d => d.id === event.id ? { ...d, ...event.data } : d));
      } else if (event.type === 'create') {
        setDeliverers(prev => [...prev, event.data]);
      }
    });
    return () => unsub();
  }, []);

  const located = deliverers.filter(hasFreshLocation);
  const points = located.map(coordinates);
  const center = points[0] || [-14.235, -51.9253];

  const ordersForDeliverer = (deliverer) => {
    return orders.filter(o => o.deliverer_user_id === deliverer.user_id || (!o.deliverer_user_id && o.tracking_code === deliverer.name));
  };

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="animate-spin text-primary" size={32} /></div>;
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-heading font-bold text-2xl text-foreground">Mapa de Entregadores</h1>
        <p className="text-sm text-muted-foreground mt-1">{located.length} de {deliverers.length} entregadores com localização ativa</p>
      </div>

      {located.length === 0 ? (
        <div className="bg-card rounded-2xl border border-border/50 p-8 text-center">
          <MapPin size={40} className="mx-auto mb-3 text-muted-foreground opacity-30" />
          <p className="text-sm text-muted-foreground">Nenhum entregador compartilhando localização no momento.</p>
          <p className="text-xs text-muted-foreground mt-1">Os entregadores precisam ativar o GPS na área deles (<span className="text-primary">/entregador</span>).</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-card rounded-2xl border border-border/50 overflow-hidden relative z-0">
           <div className="h-[300px] sm:h-[400px] lg:h-[600px]">
              <MapContainer center={center} zoom={13} style={{ height: '100%', width: '100%' }}>
                <TileLayer {...mapTileLayer} />
                <MapViewport points={points} />
                {located.map(d => (
                  <Marker key={d.id} position={coordinates(d)} icon={makeIcon(d.current_status)}>
                    <Popup>
                      <div style={{ minWidth: '180px' }}>
                        <p style={{ fontWeight: 'bold', fontSize: '14px', margin: 0 }}>{d.name}</p>
                        <p style={{ fontSize: '12px', color: STATUS_COLORS[d.current_status], margin: '2px 0' }}>{STATUS_LABELS[d.current_status] || 'Offline'}</p>
                        <p style={{ fontSize: '11px', color: '#666', margin: 0 }}>📍 {timeAgo(d.location_updated_at)}</p>
                        <button onClick={() => setSelectedDeliverer(d)} style={{ marginTop: '6px', padding: '4px 10px', background: '#22C55E', color: 'white', border: 'none', borderRadius: '8px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}>Ver detalhes</button>
                      </div>
                    </Popup>
                  </Marker>
                ))}
              </MapContainer>
            </div>
          </div>

          <div className="relative z-10">
            <div className={`space-y-2 ${selectedDeliverer ? 'lg:hidden' : ''}`}>
            {deliverers.map(d => {
              const dOrders = ordersForDeliverer(d);
              const hasLoc = hasFreshLocation(d);
              const displayStatus = hasLoc ? d.current_status : 'offline';
              return (
                <div key={d.id} onClick={() => setSelectedDeliverer(d)} className={`bg-card rounded-2xl border p-3 cursor-pointer hover:border-primary transition-colors ${hasLoc ? 'border-border/50' : 'border-border/30 opacity-60'}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: STATUS_COLORS[displayStatus] + '20' }}>
                      <Bike size={16} style={{ color: STATUS_COLORS[displayStatus] }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{d.name}</p>
                      <p className="text-[10px] text-muted-foreground">{STATUS_LABELS[displayStatus] || 'Offline'}</p>
                    </div>
                  </div>
                  <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                    <Clock size={10} /> {hasLoc ? timeAgo(d.location_updated_at) : 'Sem localização'}
                  </div>
                  {dOrders.length > 0 && (
                    <div className="mt-1.5 text-[10px] text-blue-600 flex items-center gap-1">
                      <Package size={10} /> {dOrders.length} pedido(s) em rota
                    </div>
                  )}
                </div>
              );
            })}
            </div>
            {selectedDeliverer && (
              <DelivererDetailPanel deliverer={selectedDeliverer} cities={cities} allDeliverers={deliverers} onClose={() => setSelectedDeliverer(null)} />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
