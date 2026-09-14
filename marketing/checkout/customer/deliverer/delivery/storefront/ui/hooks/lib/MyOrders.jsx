import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { Link } from 'react-router-dom';
import { ArrowLeft, Package, Loader2, ChevronDown, ChevronUp, Edit, XCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import EditOrderCustomerModal from '@/components/customer/EditOrderCustomerModal';
import DelivererRatingModal from '@/components/customer/DelivererRatingModal';

const EDITABLE_STATUSES = ['pending', 'confirmed'];

const STATUS_STEPS = ['pending', 'confirmed', 'preparing', 'shipped', 'delivered'];
const STATUS_LABELS = {
  pending: 'Recebido',
  confirmed: 'Confirmado',
  preparing: 'Em Preparo',
  shipped: 'Saiu p/ Entrega',
  delivered: 'Entregue',
  cancelled: 'Cancelado',
};
const STATUS_COLORS = {
  pending: 'bg-amber-100 text-amber-700',
  confirmed: 'bg-blue-100 text-blue-700',
  preparing: 'bg-purple-100 text-purple-700',
  shipped: 'bg-cyan-100 text-cyan-700',
  delivered: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
};

function OrderProgressBar({ status }) {
  if (status === 'cancelled') {
    return (
      <div className="text-center py-2">
        <span className="text-xs font-medium text-red-500 bg-red-50 px-3 py-1 rounded-full">Pedido Cancelado</span>
      </div>
    );
  }
  const currentIdx = STATUS_STEPS.indexOf(status);
  return (
    <div className="py-3">
      <div className="flex items-center justify-between relative">
        <div className="absolute top-3 left-0 right-0 h-0.5 bg-gray-200 z-0" />
        <div
          className="absolute top-3 left-0 h-0.5 bg-primary z-0 transition-all duration-500"
          style={{ width: `${currentIdx === 0 ? 0 : (currentIdx / (STATUS_STEPS.length - 1)) * 100}%` }}
        />
        {STATUS_STEPS.map((step, idx) => {
          const done = idx <= currentIdx;
          return (
            <div key={step} className="flex flex-col items-center z-10 gap-1">
              <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${done ? 'bg-primary border-primary' : 'bg-white border-gray-300'}`}>
                {done && <div className="w-2 h-2 bg-white rounded-full" />}
              </div>
              <span className={`text-[9px] font-medium text-center max-w-[48px] leading-tight ${done ? 'text-primary' : 'text-gray-400'}`}>
                {STATUS_LABELS[step]}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function MyOrders() {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);
  const [editingOrder, setEditingOrder] = useState(null);
  const [ratingOrder, setRatingOrder] = useState(null);
  const orderParam = new URLSearchParams(window.location.search).get('order');
  const rateDelivererParam = new URLSearchParams(window.location.search).get('rate_deliverer');

  const loadOrders = () => {
    if (!user) return;
    base44.entities.Order.filter({ customer_email: user.email }, '-created_date').then(data => {
      setOrders(data);
      setLoading(false);
    });
  };

  useEffect(() => { loadOrders(); }, [user]);

  useEffect(() => {
    if (!loading && rateDelivererParam && orders.some(o => o.id === rateDelivererParam)) {
      const order = orders.find(o => o.id === rateDelivererParam);
      if (order && order.status === 'delivered') setRatingOrder(order);
    }
  }, [loading, orders, rateDelivererParam]);

  const cancelOrder = async (order) => {
    if (!window.confirm(`Cancelar o pedido #${order.order_number}?`)) return;
    await base44.entities.Order.update(order.id, { status: 'cancelled' });
    loadOrders();
  };

  useEffect(() => {
    if (!loading && orderParam && orders.some(o => o.id === orderParam)) {
      setExpanded(orderParam);
      setTimeout(() => {
        document.getElementById(`order-${orderParam}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 300);
    }
  }, [loading, orders]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-lg mx-auto bg-white min-h-screen">
        <div className="sticky top-0 z-30 bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3">
          <Link to="/perfil" className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
            <ArrowLeft size={20} />
          </Link>
          <h1 className="font-heading font-bold text-lg">Meus Pedidos</h1>
        </div>

        {loading ? (
          <div className="flex justify-center py-16"><Loader2 size={28} className="animate-spin text-primary" /></div>
        ) : orders.length === 0 ? (
          <div className="text-center py-20 px-6 space-y-3">
            <Package size={48} className="text-gray-200 mx-auto" />
            <p className="text-gray-500 font-medium">Você ainda não fez nenhum pedido</p>
            <Link to="/" className="inline-block text-sm text-primary font-semibold">Ver cardápio</Link>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {orders.map(order => (
              <div key={order.id} id={`order-${order.id}`} className="bg-white">
                <button
                  onClick={() => setExpanded(expanded === order.id ? null : order.id)}
                  className="w-full px-4 py-4 text-left flex items-center justify-between gap-3"
                >
                  <div>
                    <p className="font-heading font-bold text-gray-900">Pedido #{order.order_number}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{new Date(order.created_date).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS_COLORS[order.status]}`}>
                      {STATUS_LABELS[order.status]}
                    </span>
                    {expanded === order.id ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
                  </div>
                </button>

                <AnimatePresence>
                  {expanded === order.id && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="px-4 pb-5 space-y-4 bg-gray-50">
                        <OrderProgressBar status={order.status} />

                        <div className="bg-white rounded-xl p-3 space-y-2">
                          {order.items?.map((item, i) => (
                            <div key={i} className="flex justify-between text-sm">
                              <span className="text-gray-700">{item.quantity}x {item.product_name}</span>
                              <span className="font-medium">R$ {(item.unit_price * item.quantity).toFixed(2)}</span>
                            </div>
                          ))}
                          <div className="border-t border-gray-100 pt-2 flex justify-between font-bold text-sm">
                            <span>Total</span>
                            <span className="text-primary">R$ {order.total?.toFixed(2)}</span>
                          </div>
                        </div>

                        {order.delivery_address && (
                          <p className="text-xs text-gray-500">📍 {order.delivery_address}</p>
                        )}

                        {EDITABLE_STATUSES.includes(order.status) && (
                          <div className="flex gap-2 pt-1">
                            <button onClick={() => setEditingOrder(order)}
                              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-white border-2 border-primary/30 text-primary rounded-xl text-xs font-bold hover:bg-primary/5 transition-colors">
                              <Edit size={13} /> Alterar pedido
                            </button>
                            <button onClick={() => cancelOrder(order)}
                              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-white border-2 border-red-200 text-red-500 rounded-xl text-xs font-bold hover:bg-red-50 transition-colors">
                              <XCircle size={13} /> Cancelar pedido
                            </button>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        )}
      </div>

      {editingOrder && (
        <EditOrderCustomerModal
          order={editingOrder}
          onClose={() => setEditingOrder(null)}
          onSaved={() => { setEditingOrder(null); loadOrders(); }}
        />
      )}

      {ratingOrder && (
        <DelivererRatingModal
          order={ratingOrder}
          onClose={() => setRatingOrder(null)}
          onRated={() => setRatingOrder(null)}
        />
      )}
    </div>
  );
}