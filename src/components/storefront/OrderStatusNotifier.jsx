import React, { useEffect, useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { AnimatePresence } from 'framer-motion';
import OrderStatusToast from './OrderStatusToast';

const MAX_VISIBLE = 3;
export default function OrderStatusNotifier({ customerEmail }) {
  const { user } = useAuth();
  const seen = useRef(new Set());
  const [toasts, setToasts] = useState([]);
  const dismiss = id => setToasts(previous => previous.filter(toast => toast.id !== id));
  useEffect(() => {
    seen.current.clear();
    setToasts([]);
    if (!customerEmail || !user?.id) return;
    let active = true;
    const show = notification => {
      if (!active || notification.user_id !== user.id || notification.type !== 'order_status' || notification.is_read || seen.current.has(notification.id)) return;
      seen.current.add(notification.id);
      setToasts(previous => [...previous.slice(-(MAX_VISIBLE - 1)), { id: notification.id, orderId: notification.reference_id, title: notification.title, description: notification.message }]);
    };
    const unsubscribe = base44.entities.Notification.subscribe(event => {
      if (event.type === 'create') show(event.data);
    });
    // Show the latest unread updates received while the customer was away.
    base44.entities.Notification.filter({ user_id: user.id, type: 'order_status', is_read: false }, '-created_date', MAX_VISIBLE)
      .then(notifications => { if (active) [...notifications].reverse().forEach(show); }).catch(() => {});
    return () => { active = false; unsubscribe(); };
  }, [customerEmail, user?.id]);
  return <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[200] flex w-[calc(100%-2rem)] max-w-sm flex-col gap-2 pointer-events-none"><AnimatePresence>{toasts.map(toast => <OrderStatusToast key={toast.id} toast={toast} onDismiss={dismiss} />)}</AnimatePresence></div>;
}
