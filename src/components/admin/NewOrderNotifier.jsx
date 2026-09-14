import React, { useEffect, useRef, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Bell } from 'lucide-react';

function playAlertSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const play = (freq, start, dur) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.connect(g); g.connect(ctx.destination);
      o.frequency.value = freq;
      o.type = 'sine';
      g.gain.setValueAtTime(0.4, ctx.currentTime + start);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + dur);
      o.start(ctx.currentTime + start);
      o.stop(ctx.currentTime + start + dur);
    };
    play(880, 0, 0.15);
    play(1100, 0.18, 0.15);
    play(880, 0.36, 0.15);
    play(1320, 0.54, 0.3);
  } catch (e) { /* silent fail */ }
}

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
      orders.forEach(o => states.set(o.id, { status: o.status, deliverer_accepted: o.deliverer_accepted, deliverer_user_id: o.deliverer_user_id }));
      prevStates.current = states;
    });

    const unsub = base44.entities.Order.subscribe((event) => {
      if (event.type === 'create') {
        if (knownIds.current === null) return;
        if (knownIds.current.has(event.id)) return;
        knownIds.current.add(event.id);
        prevStates.current.set(event.id, { status: event.data?.status, deliverer_accepted: event.data?.deliverer_accepted, deliverer_user_id: event.data?.deliverer_user_id });
        playAlertSound();
        setPopup({ ...event.data, _kind: 'new' });
        setTimeout(() => setPopup(null), 8000);
      } else if (event.type === 'update') {
        const prev = prevStates.current.get(event.id);
        const curr = { status: event.data?.status, deliverer_accepted: event.data?.deliverer_accepted, deliverer_user_id: event.data?.deliverer_user_id };

        // Detect deliverer actions
        if (prev) {
          if (!prev.deliverer_accepted && curr.deliverer_accepted) {
            playAlertSound();
            setPopup({ ...event.data, _kind: 'accepted' });
            setTimeout(() => setPopup(null), 8000);
          }
          if (prev.deliverer_user_id && !curr.deliverer_user_id) {
            playAlertSound();
            setPopup({ ...event.data, _kind: 'refused' });
            setTimeout(() => setPopup(null), 8000);
          }
          if (prev.status !== 'shipped' && curr.status === 'shipped' && curr.deliverer_user_id) {
            playAlertSound();
            setPopup({ ...event.data, _kind: 'picked_up' });
            setTimeout(() => setPopup(null), 8000);
          }
          if (prev.status !== 'delivered' && curr.status === 'delivered' && curr.deliverer_user_id) {
            playAlertSound();
            setPopup({ ...event.data, _kind: 'delivered' });
            setTimeout(() => setPopup(null), 8000);
          }
        }
        prevStates.current.set(event.id, curr);

        // Edited by customer
        if (event.data?.edited_by_customer) {
          if (!editedFlagged.current.has(event.id)) {
            editedFlagged.current.add(event.id);
            playAlertSound();
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