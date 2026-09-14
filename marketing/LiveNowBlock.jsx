import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { sendWhatsAppMessage } from '@/lib/whatsappDispatch';
import { Eye, ShoppingCart, CreditCard, CheckCircle2, UserX, Radio, Clock, ShoppingBag, Send, Check, Loader2, User } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const STAGES = [
  { key: 'navegando', label: 'Navegando', icon: Eye, color: 'text-blue-600', bg: 'bg-blue-50', dot: 'bg-blue-500' },
  { key: 'interessado', label: 'Interessado', icon: Radio, color: 'text-amber-600', bg: 'bg-amber-50', dot: 'bg-amber-500' },
  { key: 'carrinho', label: 'Carrinho Ativo', icon: ShoppingCart, color: 'text-orange-600', bg: 'bg-orange-50', dot: 'bg-orange-500' },
  { key: 'checkout', label: 'Em Checkout', icon: CreditCard, color: 'text-purple-600', bg: 'bg-purple-50', dot: 'bg-purple-500' },
  { key: 'concluida', label: 'Compra Concluída', icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-50', dot: 'bg-green-500' },
  { key: 'abandonou', label: 'Abandonou', icon: UserX, color: 'text-red-600', bg: 'bg-red-50', dot: 'bg-red-500' },
];

const THREE_MIN = 3 * 60 * 1000;
const FIVE_MIN = 5 * 60 * 1000;
const ONE_HOUR = 60 * 60 * 1000;
const TWENTY_FOUR_H = 24 * 60 * 60 * 1000;

function timeAgo(dateStr) {
  if (!dateStr) return '—';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  const secs = Math.floor((diff % 60000) / 1000);
  if (mins < 1) return `${secs}s atrás`;
  if (mins < 60) return `${mins}min atrás`;
  return `${Math.floor(mins / 60)}h atrás`;
}

function displayName(s) {
  if (s.customer_name) return s.customer_name;
  return `Visitante #${(s.session_id || '').slice(-4).toUpperCase()}`;
}

export default function LiveNowBlock() {
  const [sessions, setSessions] = useState([]);
  const [store, setStore] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expandedStage, setExpandedStage] = useState(null);
  const [, setTick] = useState(0);
  const [sendingTo, setSendingTo] = useState(null);
  const [sentTo, setSentTo] = useState(new Set());

  useEffect(() => {
    Promise.all([
      base44.entities.LiveSession.list('-last_event_at', 200),
      base44.entities.Store.list(),
    ]).then(([data, stores]) => {
      setSessions(data);
      setStore(stores[0]);
      setLoading(false);

      // Auto-delete sessions older than 24h (cleanup)
      const now = Date.now();
      data.forEach(s => {
        const lastEvent = s.last_event_at ? new Date(s.last_event_at).getTime() : 0;
        if ((now - lastEvent) > TWENTY_FOUR_H) {
          base44.entities.LiveSession.delete(s.id).catch(() => {});
        }
      });

      // Auto-dispatch recovery for abandoned carts (multicanal)
      const funnelConfig = stores[0]?.funnel_automation || {};
      if (funnelConfig.auto_dispatch_enabled) {
        const channels = funnelConfig.dispatch_channels || ['app'];
        const beforeExpiryHours = funnelConfig.dispatch_before_expiry_hours || 20;
        const dispatchAfterMs = (24 - beforeExpiryHours) * 60 * 60 * 1000;
        const toDispatch = data.filter(s => {
          if (s.recovery_sent_at) return false;
          const lastEvent = s.last_event_at ? new Date(s.last_event_at).getTime() : 0;
          const inactiveMs = now - lastEvent;
          const isAbandoned = s.stage === 'abandonou' || (inactiveMs > FIVE_MIN && ['interessado', 'carrinho', 'checkout'].includes(s.stage));
          return isAbandoned && inactiveMs >= dispatchAfterMs && inactiveMs < TWENTY_FOUR_H && (s.customer_user_id || s.customer_email);
        });
        Promise.all(toDispatch.map(async (s) => {
          try {
            const title = funnelConfig.abandoned_cart_title || 'Carrinho abandonado 🛒';
            let message = funnelConfig.abandoned_cart_message || 'Olá! Finalize seu pedido!';
            if (s.customer_name) message = message.replace(/{nome}/g, s.customer_name.split(' ')[0]);
            if (channels.includes('app')) {
              let userId = s.customer_user_id;
              if (!userId && s.customer_email) {
                const profiles = await base44.entities.CustomerProfile.filter({ email: s.customer_email });
                userId = profiles[0]?.user_id;
              }
              if (userId) {
                await base44.entities.Notification.create({ user_id: userId, type: 'order_status', title, message, is_read: false });
              }
            }
            if (channels.includes('whatsapp')) {
              await sendWhatsAppMessage(s.customer_phone, message);
            }
            await base44.entities.LiveSession.update(s.id, { recovery_sent_at: new Date().toISOString() });
          } catch (_) {}
        }));
      }
    });

    const unsub = base44.entities.LiveSession.subscribe((event) => {
      if (event.type === 'create') {
        setSessions(prev => [event.data, ...prev.filter(s => s.id !== event.data.id)]);
      } else if (event.type === 'update') {
        setSessions(prev => {
          const exists = prev.find(s => s.id === event.id);
          if (exists) {
            return [{ ...exists, ...event.data }, ...prev.filter(s => s.id !== event.id)];
          }
          return [event.data, ...prev];
        });
      } else if (event.type === 'delete') {
        setSessions(prev => prev.filter(s => s.id !== event.id));
      }
    });
    const interval = setInterval(() => setTick(t => t + 1), 10000);
    return () => { unsub(); clearInterval(interval); };
  }, []);

  const computedSessions = useMemo(() => {
    const now = Date.now();
    return sessions.map(s => {
      const lastEvent = s.last_event_at ? new Date(s.last_event_at).getTime() : 0;
      const inactiveMs = now - lastEvent;
      let effectiveStage = s.stage;

      // "Navegando" inactive >3 min: user left, remove from funnel
      if (s.stage === 'navegando' && inactiveMs > THREE_MIN) {
        effectiveStage = 'inactive';
      }
      // Active stages inactive >5 min: mark as abandoned
      else if (inactiveMs > FIVE_MIN && ['interessado', 'carrinho', 'checkout'].includes(s.stage)) {
        effectiveStage = 'abandonou';
      }
      // Abandoned older than 24h: remove
      else if (effectiveStage === 'abandonou' && inactiveMs > TWENTY_FOUR_H) {
        effectiveStage = 'inactive';
      }
      // Concluida older than 1h: remove (no permanent history)
      else if (s.stage === 'concluida' && inactiveMs > ONE_HOUR) {
        effectiveStage = 'inactive';
      }

      return { ...s, effectiveStage, inactiveMs };
    }).filter(s => s.effectiveStage !== 'inactive');
  }, [sessions]);

  const activeCount = computedSessions.filter(s =>
    s.effectiveStage !== 'abandonou' &&
    s.effectiveStage !== 'concluida' &&
    s.inactiveMs < THREE_MIN
  ).length;

  const stageCounts = useMemo(() => {
    const counts = {};
    STAGES.forEach(s => counts[s.key] = 0);
    computedSessions.forEach(s => {
      counts[s.effectiveStage] = (counts[s.effectiveStage] || 0) + 1;
    });
    return counts;
  }, [computedSessions]);

  const maxCount = Math.max(...Object.values(stageCounts), 1);

  const sendRecovery = async (session) => {
    setSendingTo(session.id);
    try {
      const funnelConfig = store?.funnel_automation || {};
      const title = funnelConfig.abandoned_cart_title || 'Carrinho abandonado 🛒';
      let message = funnelConfig.abandoned_cart_message || 'Olá! Notamos que você deixou itens no carrinho. Finalize seu pedido antes que acabe!';
      if (session.customer_name) {
        message = message.replace(/{nome}/g, session.customer_name.split(' ')[0]);
      }

      let userId = session.customer_user_id;
      if (!userId && session.customer_email) {
        const profiles = await base44.entities.CustomerProfile.filter({ email: session.customer_email });
        userId = profiles[0]?.user_id;
      }

      if (userId) {
        await base44.entities.Notification.create({
          user_id: userId,
          type: 'order_status',
          title,
          message,
          is_read: false,
        });
        setSentTo(prev => new Set([...prev, session.id]));
      }
    } catch (_) {}
    setSendingTo(null);
  };

  if (loading) {
    return (
      <div className="bg-card rounded-2xl border border-border/50 p-5">
        <div className="flex items-center gap-2 mb-4">
          <Radio size={18} className="text-primary animate-pulse" />
          <h2 className="font-heading font-semibold text-foreground">Ao Vivo Agora</h2>
        </div>
        <div className="flex justify-center py-6">
          <div className="w-6 h-6 border-2 border-muted border-t-primary rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  const renderSession = (s, isAbandoned = false) => {
    const name = displayName(s);
    const canRecover = isAbandoned && (s.customer_user_id || s.customer_email);
    const isSent = sentTo.has(s.id);
    const isSending = sendingTo === s.id;

    return (
      <div key={s.id} className="flex items-start gap-2 p-2.5 bg-muted/40 rounded-lg text-xs">
        <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
          {s.customer_name ? <User size={12} className="text-primary" /> : <ShoppingBag size={12} className="text-muted-foreground" />}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-foreground truncate">
            {name} {isAbandoned ? 'abandonou o carrinho' : 'está navegando'}
          </p>
          <div className="flex items-center gap-2 mt-0.5 text-muted-foreground flex-wrap">
            <span className="flex items-center gap-0.5">
              <Clock size={10} /> {timeAgo(s.last_event_at)}
            </span>
            {s.current_product && !isAbandoned && (
              <span className="truncate">👁 {s.current_product}</span>
            )}
          </div>
          {s.cart_items?.length > 0 && (
            <p className="text-[10px] text-orange-600 mt-0.5">
              🛒 {s.cart_count || s.cart_items.length} item(s): {s.cart_items.slice(0, 3).join(', ')}
              {s.cart_items.length > 3 && '...'}
            </p>
          )}
          {isAbandoned && !canRecover && (
            <p className="text-[10px] text-gray-400 mt-0.5 italic">Visitante sem login — não é possível notificar</p>
          )}
          {isAbandoned && canRecover && (
            <button
              onClick={() => sendRecovery(s)}
              disabled={isSending || isSent}
              className="mt-1.5 flex items-center gap-1 px-2.5 py-1 bg-primary text-white rounded-lg text-[10px] font-bold hover:bg-primary/90 transition-colors disabled:opacity-60"
            >
              {isSending ? <Loader2 size={10} className="animate-spin" /> : isSent ? <Check size={10} /> : <Send size={10} />}
              {isSending ? 'Enviando...' : isSent ? 'Enviado!' : 'Enviar mensagem'}
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="bg-card rounded-2xl border border-border/50 p-5">
      {/* Header with live indicator */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="relative flex h-3 w-3">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
            <span className="relative inline-flex h-3 w-3 rounded-full bg-red-500" />
          </span>
          <h2 className="font-heading font-semibold text-foreground">Ao Vivo Agora</h2>
        </div>
        <span className="text-xs text-muted-foreground">atualiza sozinho</span>
      </div>

      {/* Big number */}
      <div className="text-center mb-5">
        <motion.p
          key={activeCount}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="font-heading font-extrabold text-4xl text-primary"
        >
          {activeCount}
        </motion.p>
        <p className="text-sm text-muted-foreground mt-1">pessoa(s) no seu cardápio agora</p>
      </div>

      {/* Funnel */}
      <div className="space-y-1.5">
        {STAGES.map(stage => {
          const count = stageCounts[stage.key] || 0;
          const Icon = stage.icon;
          const isExpanded = expandedStage === stage.key;
          const stageSessions = computedSessions.filter(s => s.effectiveStage === stage.key);
          const widthPct = (count / maxCount) * 100;
          const isAbandonedStage = stage.key === 'abandonou';

          return (
            <div key={stage.key}>
              <button
                onClick={() => setExpandedStage(isExpanded ? null : stage.key)}
                className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${isExpanded ? stage.bg : 'hover:bg-muted/50'} ${count === 0 ? 'opacity-50' : ''}`}
              >
                <div className={`w-8 h-8 rounded-lg ${stage.bg} flex items-center justify-center flex-shrink-0`}>
                  <Icon size={16} className={stage.color} />
                </div>
                <div className="flex-1 text-left min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{stage.label}</p>
                  <div className="h-1 bg-muted rounded-full mt-1 overflow-hidden">
                    <div className={`h-full ${stage.dot} rounded-full transition-all duration-500`} style={{ width: `${widthPct}%` }} />
                  </div>
                </div>
                <span className={`font-heading font-bold text-lg ${stage.color} flex-shrink-0 w-8 text-right`}>{count}</span>
              </button>

              <AnimatePresence>
                {isExpanded && count > 0 && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="ml-12 mr-2 mt-1 mb-2 space-y-2">
                      {stageSessions.map(s => renderSession(s, isAbandonedStage))}
                    </div>
                  </motion.div>
                )}
                {isExpanded && count === 0 && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <p className="ml-12 mt-1 mb-2 text-xs text-muted-foreground py-2">Nenhuma sessão nesta etapa</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </div>
  );
}