import React, { useEffect, useRef, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { newDeliveryAction } from '@/lib/deliveryEvents';
import { playNotificationSound } from '@/lib/notificationSounds';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Bell } from 'lucide-react';

const POPUP_CONFIG = {
  new: { border: 'border-green-400', bg: 'bg-green-100', text: 'text-green-600', label: '🛍️ Novo pedido recebido!' },
  edited: { border: 'border-orange-400', bg: 'bg-orange-100', text: 'text-orange-600', label: '⚠️ Pedido alterado pelo cliente!' },
  accepted: { border: 'border-blue-400', bg: 'bg-blue-100', text: 'text-blue-600', label: '✅ Entregador aceitou o pedido!' },
  refused: { border: 'border-red-400', bg: 'bg-red-100', text: 'text-red-600', label: '❌ Entregador recusou o pedido!' },
  picked_up: { border: 'border-cyan-400', bg: 'bg-cyan-100', text: 'text-cyan-600', label: '📦 Entregador retirou o pedido!' },
  delivered: { border: 'border-green-400', bg: 'bg-green-100', text: 'text-green-600', label: '🎉 Pedido entregue pelo entregador!' },
};

export default function NewOrderNotifier() {
  const [popup, setPopup] = useState(null);
  const knownIds = useRef(null);
  const editedFlagged = useRef(new Set());
  const prevStates = useRef(new Map());

  useEffect(() => {
    base44.entities.Order.list('-created_date', 50).then(orders => {
      knownIds.current = new Set(orders.map(o => o.id));
      editedFlagged.current = new Set(orders.filter(o => o.edited_by_customer).map(o => o.id));
      const states = new Map();
      orders.forEach(o => states.set(o.id, { status: o.status, deliverer_accepted: o.deliverer_accepted, deliverer_user_id: o.deliverer_user_id, delivery_action_event: o.delivery_action_event }));
      prevStates.current = states;
    });

    const unsub = base44.entities.Order.subscribe((event) => {
      if (event.type === 'create') {
        if (knownIds.current === null) return;
        if (knownIds.current.has(event.id)) return;
        knownIds.current.add(event.id);
        prevStates.current.set(event.id, { status: event.data?.status, deliverer_accepted: event.data?.deliverer_accepted, deliverer_user_id: event.data?.deliverer_user_id, delivery_action_event: event.data?.delivery_action_event });
        playNotificationSound('newOrder', event.id + ':' + (event.data?.status || '') + ':' + 'newOrder');
        setPopup({ ...event.data, _kind: 'new' });
        setTimeout(() => setPopup(null), 8000);
      } else if (event.type === 'update') {
        const prev = prevStates.current.get(event.id);
        const curr = { status: event.data?.status, deliverer_accepted: event.data?.deliverer_accepted, deliverer_user_id: event.data?.deliverer_user_id, delivery_action_event: event.data?.delivery_action_event };

        const deliveryAction = prev && newDeliveryAction(prev, curr);
        if (deliveryAction) {
          const sound = ['accepted', 'refused'].includes(deliveryAction) ? deliveryAction : 'general';
          playNotificationSound(sound, event.id + ':' + curr.delivery_action_event.id);
          setPopup({ ...event.data, _kind: deliveryAction });
          setTimeout(() => setPopup(null), 8000);
        }
        prevStates.current.set(event.id, curr);

        // Edited by customer
        if (event.data?.edited_by_customer) {
          if (!editedFlagged.current.has(event.id)) {
            editedFlagged.current.add(event.id);
            playNotificationSound('general', event.id + ':' + (event.data?.status || '') + ':' + 'general');
            setPopup({ ...event.data, _kind: 'edited' });
            setTimeout(() => setPopup(null), 8000);
          }
        } else {
          editedFlagged.current.delete(event.id);
        }
      }
    });

    return () => unsub();
  }, []);

  const config = popup ? POPUP_CONFIG[popup._kind] : null;

  return (
    <AnimatePresence>
      {popup && config && (
        <motion.div
          initial={{ y: -80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -80, opacity: 0 }}
          className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] w-full max-w-sm mx-auto px-4"
        >
          <div className={`bg-white border-2 rounded-2xl shadow-2xl p-4 flex items-start gap-3 ${config.border}`}>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${config.bg}`}>
              <Bell size={20} className={config.text} />
            </div>
            <div className="flex-1 min-w-0">
              <p className={`font-heading font-bold text-sm ${config.text}`}>{config.label}</p>
              <p className="text-xs text-gray-600 mt-0.5 truncate">
                {popup.customer_name} — R$ {popup.total?.toFixed(2)}
              </p>
              <p className="text-[10px] text-gray-400 mt-0.5">Pedido #{popup.order_number}</p>
            </div>
            <button onClick={() => setPopup(null)} className="p-1 hover:bg-gray-100 rounded-lg flex-shrink-0">
              <X size={14} className="text-gray-400" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}