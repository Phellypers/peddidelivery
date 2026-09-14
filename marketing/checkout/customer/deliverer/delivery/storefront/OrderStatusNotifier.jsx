import React, { useEffect, useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { AnimatePresence } from 'framer-motion';
import OrderStatusToast from './OrderStatusToast';

const STATUS_MESSAGES = {
  confirmed: { title: '✅ Pedido Confirmado!', desc: 'Seu pedido foi aceito e está sendo preparado.' },
  preparing: { title: '👨‍🍳 Em Preparo', desc: 'A cozinha está preparando seu pedido.' },
  shipped: { title: '🛵 Saiu para Entrega!', desc: 'Seu pedido está a caminho!' },
  delivered: { title: '🎉 Pedido Entregue!', desc: 'Aproveite! Obrigado pela preferência.' },
  cancelled: { title: '❌ Pedido Cancelado', desc: 'Seu pedido foi cancelado. Entre em contato conosco.' },
};

const MAX_VISIBLE = 3;

export default function OrderStatusNotifier({ customerEmail }) {
  const { user } = useAuth();
  const knownStatuses = useRef({});
  const [toasts, setToasts] = useState([]);

  const dismiss = (id) => setToasts(prev => prev.filter(t => t.id !== id));

  useEffect(() => {
    if (!customerEmail) return;

    const unsubscribe = base44.entities.Order.subscribe(async (event) => {
      const order = event.data;
      if (!order || order.customer_email !== customerEmail) return;
      if (event.type !== 'update') return;

      const prevStatus = knownStatuses.current[order.id];
      const newStatus = order.status;

      if (prevStatus && prevStatus !== newStatus && STATUS_MESSAGES[newStatus]) {
        const msg = STATUS_MESSAGES[newStatus];

        // Add popup, keeping the stack short so they don't pile up
        setToasts(prev => [
          ...prev.slice(-(MAX_VISIBLE - 1)),
          { id: `${order.id}-${Date.now()}`, orderId: order.id, title: msg.title, description: `${msg.desc} (Pedido #${order.order_number})` },
        ]);

        // Persist notification in bell
        if (user?.id) {
          try {
            await base44.entities.Notification.create({
              user_id: user.id,
              type: 'order_status',
              title: msg.title,
              message: `${msg.desc} (Pedido #${order.order_number})`,
              is_read: false,
              reference_id: order.id,
              reference_type: 'order',
            });
          } catch (e) { /* silent */ }
        }
      }

      knownStatuses.current[order.id] = newStatus;
    });

    return unsubscribe;
  }, [customerEmail, user?.id]);

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[200] w-[calc(100%-2rem)] max-w-sm flex flex-col gap-2 pointer-events-none">
      <AnimatePresence>
        {toasts.map(t => <OrderStatusToast key={t.id} toast={t} onDismiss={dismiss} />)}
      </AnimatePresence>
    </div>
  );
}