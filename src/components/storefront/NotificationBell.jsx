import React, { useEffect, useState } from 'react';
import { Bell, Check, X } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { createPortal } from 'react-dom';

export default function NotificationBell() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [open, setOpen] = useState(false);
  const [view, setView] = useState('pending');

  const load = () => {
    if (!user?.id) return;
    base44.entities.Notification.filter({ user_id: user.id }, '-created_date', 30).then(setNotifications);
  };

  useEffect(() => {
    load();
    if (!user?.id) return undefined;
    const unsubscribe = base44.entities.Notification.subscribe(event => {
      if (event.data?.user_id === user.id) load();
    });
    return unsubscribe;
  }, [user?.id]);

  useEffect(() => {
    if (!open) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const closeOnEscape = event => { if (event.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', closeOnEscape);
    };
  }, [open]);

  const unreadCount = notifications.filter(notification => !notification.is_read).length;
  const displayed = view === 'pending' ? notifications.filter(notification => !notification.is_read) : notifications;

  const markAllRead = async () => {
    await Promise.all(notifications.filter(notification => !notification.is_read).map(notification => base44.entities.Notification.update(notification.id, { is_read: true })));
    load();
  };

  const markOne = async notification => {
    if (!notification.is_read) {
      await base44.entities.Notification.update(notification.id, { is_read: true });
      load();
    }
  };

  const openNotification = async notification => {
    await markOne(notification);
    setOpen(false);
    if (notification.type === 'deliverer_assigned') navigate(`/rastrear/${notification.reference_id}`);
    else if (notification.reference_type === 'story') {
      if (window.location.pathname !== '/loja') {
        navigate('/loja');
        setTimeout(() => window.dispatchEvent(new CustomEvent('open-store-story')), 300);
      } else window.dispatchEvent(new CustomEvent('open-store-story'));
    } else if (notification.reference_type === 'order') navigate(`/meus-pedidos?order=${notification.reference_id}`);
    else if (notification.reference_type === 'deliverer_rating') navigate(`/meus-pedidos?rate_deliverer=${notification.reference_id}`);
  };

  const timeAgo = dateString => {
    const minutes = Math.floor((Date.now() - new Date(dateString).getTime()) / 60000);
    if (minutes < 1) return 'agora';
    if (minutes < 60) return `${minutes}min atrás`;
    const hours = Math.floor(minutes / 60);
    return hours < 24 ? `${hours}h atrás` : `${Math.floor(hours / 24)}d atrás`;
  };

  if (!user) return null;

  return (
    <div className="relative">
      <button aria-label="Ver notificações" aria-expanded={open} onClick={() => setOpen(value => !value)} className="relative flex h-10 w-10 items-center justify-center text-gray-700 transition-colors hover:text-primary">
        <Bell size={22} />
        {unreadCount > 0 && <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-0.5 text-[9px] font-bold leading-none text-white">{unreadCount > 9 ? '9+' : unreadCount}</span>}
      </button>

      {createPortal(
        <AnimatePresence>
          {open && (
            <>
              <motion.button type="button" aria-label="Fechar notificações" onClick={() => setOpen(false)} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[210] cursor-default bg-[#111111]/40 backdrop-blur-[1px]" />
              <motion.section role="dialog" aria-modal="true" aria-labelledby="peddi-notifications-title" initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 30, stiffness: 330 }} className="fixed inset-x-0 bottom-0 z-[220] flex h-[76dvh] max-h-[calc(100dvh-env(safe-area-inset-top)-0.75rem)] w-full flex-col overflow-hidden rounded-t-[26px] border border-gray-100 bg-white text-[#111111] shadow-2xl sm:inset-x-auto sm:bottom-auto sm:right-[max(1rem,calc((100vw-640px)/2))] sm:top-20 sm:h-auto sm:max-h-[calc(100dvh-6rem)] sm:w-80 sm:rounded-2xl">
                <div aria-hidden="true" className="flex h-7 flex-shrink-0 items-center justify-center sm:hidden"><span className="h-1.5 w-12 rounded-full bg-gray-300" /></div>
                <header className="flex flex-shrink-0 items-center justify-between border-b border-gray-100 bg-white px-4 py-3">
                  <h2 id="peddi-notifications-title" className="font-heading text-base font-bold text-gray-900">Notificações</h2>
                  <div className="flex items-center gap-1">
                    {unreadCount > 0 && <button onClick={markAllRead} className="flex min-h-11 items-center gap-1 px-2 text-[11px] font-semibold text-primary hover:underline"><Check size={12} /> Marcar todas</button>}
                    <button aria-label="Fechar notificações" onClick={() => setOpen(false)} className="flex h-11 w-11 items-center justify-center rounded-xl text-gray-500 hover:bg-gray-100 hover:text-gray-700"><X size={20} /></button>
                  </div>
                </header>

                <div className="flex flex-shrink-0 border-b border-gray-100 bg-white">
                  <button onClick={() => setView('pending')} className={`min-h-11 flex-1 text-xs font-semibold ${view === 'pending' ? 'border-b-2 border-primary text-primary' : 'text-gray-400'}`}>Pendentes{unreadCount > 0 && ` (${unreadCount})`}</button>
                  <button onClick={() => setView('history')} className={`min-h-11 flex-1 text-xs font-semibold ${view === 'history' ? 'border-b-2 border-primary text-primary' : 'text-gray-400'}`}>Histórico</button>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-white pb-[max(0.75rem,env(safe-area-inset-bottom))]">
                  {displayed.length === 0 ? (
                    <div className="py-10 text-center"><Bell size={28} className="mx-auto mb-2 text-gray-200" /><p className="text-sm text-gray-400">{view === 'pending' ? 'Tudo em dia!' : 'Sem histórico'}</p></div>
                  ) : displayed.map(notification => (
                    <button key={notification.id} onClick={() => openNotification(notification)} className={`flex w-full items-start gap-3 border-b border-gray-50 px-4 py-3 text-left transition-colors last:border-0 hover:bg-gray-50 ${!notification.is_read ? 'bg-primary/5' : ''}`}>
                      <span className={`mt-1.5 h-2 w-2 flex-shrink-0 rounded-full ${!notification.is_read ? 'bg-primary' : 'bg-transparent'}`} />
                      <span className="min-w-0 flex-1"><span className="block text-xs font-bold leading-tight text-gray-800">{notification.title}</span><span className="mt-0.5 block break-words text-xs leading-relaxed text-gray-500">{notification.message}</span><span className="mt-1 block text-[10px] text-gray-400">{timeAgo(notification.created_date)}</span></span>
                    </button>
                  ))}
                </div>
              </motion.section>
            </>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </div>
  );
}
