import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { base44 } from '@/api/base44Client';
import { installSoundUnlock, playNotificationSound, resetNotificationSounds } from '@/lib/notificationSounds';

// Reuse the existing entity subscriptions; first poll initializes history silently.
export default function NotificationSounds() {
  const { user, isAuthenticated } = useAuth();
  const { pathname } = useLocation();
  const manager = ['manager', 'peddi_admin', 'admin'].includes(user?.role) && pathname.startsWith('/admin');
  const courier = ['courier', 'deliverer'].includes(user?.role);
  useEffect(() => installSoundUnlock(), []);
  useEffect(() => {
    resetNotificationSounds();
    if (!isAuthenticated || !user?.id) return;
    const unsubscribers = [];
    const newTickets = new Map();
    if (manager) unsubscribers.push(base44.entities.SupportTicket.subscribe(event => {
      if (event.type !== 'create') return;
      newTickets.set(event.id, Date.now());
      for (const [id, time] of newTickets) if (Date.now() - time > 60000) newTickets.delete(id);
      playNotificationSound('newTicket', event.id);
    }));
    unsubscribers.push(base44.entities.ChatMessage.subscribe(event => {
      const message = event.data;
      if (event.type !== 'create' || !message) return;
      const incoming = manager ? message.sender_type !== 'store' : courier
        ? message.sender_type !== 'deliverer' && (message.deliverer_user_id === user.id || message.conversation_id === `deliverer_${user.id}`)
        : message.sender_type !== 'customer' && message.customer_email === user.email;
      if (!incoming || (manager && Date.now() - (newTickets.get(message.conversation_id) || 0) < 6000)) return;
      playNotificationSound('message', event.id);
    }));
    unsubscribers.push(base44.entities.Notification.subscribe(event => {
      if (event.type !== 'create' || event.data?.user_id !== user.id || event.data.is_read || event.data.type === 'order_status') return;
      playNotificationSound('general', event.id);
    }));
    // Customer order status is seeded so historical orders never sound on entry.
    let cancelled = false;
    if (!manager && !courier && user.email) {
      base44.entities.Order.filter({ customer_email: user.email }, '-created_date', 1000).then(orders => {
        if (cancelled) return;
        const statuses = new Map(orders.map(order => [order.id, order.status]));
        unsubscribers.push(base44.entities.Order.subscribe(event => {
          const order = event.data;
          if (!order || order.customer_email !== user.email || event.type === 'delete') return;
          const previous = statuses.get(event.id);
          statuses.set(event.id, order.status);
          if (event.type !== 'update' || !previous || previous === order.status) return;
          playNotificationSound(order.status === 'ready' ? 'ready' : 'general', `${order.id}:${order.status}`);
        }));
      }).catch(() => {});
    }
    return () => { cancelled = true; unsubscribers.forEach(unsubscribe => unsubscribe()); resetNotificationSounds(); };
  }, [isAuthenticated, user?.id, user?.email, manager, courier]);
  return null;
}
