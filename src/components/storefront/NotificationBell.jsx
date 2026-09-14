import React, { useState, useEffect, useRef } from 'react';
import { Bell, X, Check } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

export default function NotificationBell() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [open, setOpen] = useState(false);
  const [view, setView] = useState('pending');
  const panelRef = useRef(null);

  const load = () => {
    if (!user?.id) return;
    base44.entities.Notification.filter({ user_id: user.id }, '-created_date', 30).then(setNotifications);
  };

  useEffect(() => {
    load();
    if (!user?.id) return;
    const unsub = base44.entities.Notification.subscribe((event) => {
      if (event.data?.user_id === user.id) load();
    });
    return unsub;
  }, [user?.id]);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => { if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const unreadCount = notifications.filter(n => !n.is_read).length;
  const displayNotifications = view === 'pending' ? notifications.filter(n => !n.is_read) : notifications.filter(n => n.is_read);

  const markAllRead = async () => {
    const unread = notifications.filter(n => !n.is_read);
    await Promise.all(unread.map(n => base44.entities.Notification.update(n.id, { is_read: true })));
    load();
  };

  const markOne = async (n) => {
    if (!n.is_read) {
      await base44.entities.Notification.update(n.id, { is_read: true });
      load();
    }
  };

  const navigate = useNavigate();
  const handleClick = async (n) => {
    await markOne(n);
    setOpen(false);
    if (n.type === 'deliverer_assigned') {
      navigate(`/rastrear/${n.reference_id}`);
    } else if (n.reference_type === 'story') {
      if (window.location.pathname !== '/') {
        navigate('/');
        setTimeout(() => window.dispatchEvent(new CustomEvent('open-store-story')), 300);
      } else {
        window.dispatchEvent(new CustomEvent('open-store-story'));
      }
    } else if (n.reference_type === 'order') {
      navigate(`/meus-pedidos?order=${n.reference_id}`);
    } else if (n.reference_type === 'deliverer_rating') {
      navigate(`/meus-pedidos?rate_deliverer=${n.reference_id}`);
    }
  };

  const timeAgo = (dateStr) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'agora';
    if (mins < 60) return `${mins}min atrás`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h atrás`;
    return `${Math.floor(hrs / 24)}d atrás`;
  };

  if (!user) return null;

  return (
    <div className="relative" ref={panelRef}>
      <button
        aria-label="Ver notificações"
        onClick={() => setOpen(v => !v)}
        className="flex items-center justify-center w-10 h-10 text-gray-700 hover:text-primary transition-colors relative"
      >
        <Bell size={22} />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 min-w-[16px] h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-0.5 leading-none">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <>
            {/* Mobile overlay */}
            <div className="fixed inset-0 z-[99] sm:hidden bg-black/30" onClick={() => setOpen(false)} />

            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.96 }}
              transition={{ duration: 0.15 }}
              className={`
                z-[100] bg-white border border-gray-100 shadow-xl rounded-2xl overflow-hidden
                fixed left-2 right-2 top-[64px]
                sm:absolute sm:left-auto sm:right-0 sm:top-12 sm:w-80 sm:inset-auto
              `}
            >
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                <h3 className="font-heading font-bold text-sm text-gray-900">Notificações</h3>
                <div className="flex items-center gap-2">
                  {unreadCount > 0 && (
                    <button onClick={markAllRead} className="text-[11px] text-primary font-semibold hover:underline flex items-center gap-1">
                      <Check size={11} /> Marcar todas
                    </button>
                  )}
                  <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600">
                    <X size={16} />
                  </button>
                </div>
              </div>

              {/* Tabs Pendentes / Histórico */}
              <div className="flex border-b border-gray-100">
                <button onClick={() => setView('pending')} className={`flex-1 py-2 text-xs font-semibold ${view === 'pending' ? 'text-primary border-b-2 border-primary' : 'text-gray-400'}`}>
                  Pendentes{unreadCount > 0 && ` (${unreadCount})`}
                </button>
                <button onClick={() => setView('history')} className={`flex-1 py-2 text-xs font-semibold ${view === 'history' ? 'text-primary border-b-2 border-primary' : 'text-gray-400'}`}>
                  Histórico
                </button>
              </div>

              <div className="overflow-y-auto" style={{ maxHeight: 'min(400px, calc(100dvh - 120px))' }}>
                {displayNotifications.length === 0 ? (
                  <div className="py-10 text-center">
                    <Bell size={28} className="text-gray-200 mx-auto mb-2" />
                    <p className="text-sm text-gray-400">{view === 'pending' ? 'Tudo em dia!' : 'Sem histórico'}</p>
                  </div>
                ) : (
                  displayNotifications.map(n => (
                    <button
                      key={n.id}
                      onClick={() => handleClick(n)}
                      className={`w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0 ${!n.is_read ? 'bg-primary/5' : ''}`}
                    >
                      <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${!n.is_read ? 'bg-primary' : 'bg-transparent'}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-gray-800 leading-tight">{n.title}</p>
                        <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{n.message}</p>
                        <p className="text-[10px] text-gray-400 mt-1">{timeAgo(n.created_date)}</p>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
