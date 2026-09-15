import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { peddiApi } from '@/services/api/peddiApi';
import { sendWhatsAppMessage } from '@/lib/whatsappDispatch';
import { Eye, ShoppingCart, CreditCard, CheckCircle2, UserX, Radio, Clock, ShoppingBag, Send, Check, Loader2, User, Users, RefreshCw, BarChart3, Percent, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { summarizeLiveSessions } from '@/lib/liveFunnel';
import './LiveNowBlock.css';

const DESCRIPTIONS = {
  navegando: 'Pessoas explorando seu cardápio',
  interessado: 'Visualizaram itens ou promoções',
  carrinho: 'Adicionaram itens ao carrinho',
  checkout: 'Preenchendo os dados de entrega',
  concluida: 'Finalizaram um pedido hoje',
  abandonou: 'Saíram sem finalizar hoje',
};

const STAGES = [
  { key: 'navegando', label: 'Navegando', icon: Eye, color: 'text-blue-600', bg: 'bg-blue-50', dot: 'bg-blue-500' },
  { key: 'interessado', label: 'Interessado', icon: Radio, color: 'text-amber-600', bg: 'bg-amber-50', dot: 'bg-amber-500' },
  { key: 'carrinho', label: 'Carrinho Ativo', icon: ShoppingCart, color: 'text-orange-600', bg: 'bg-orange-50', dot: 'bg-orange-500' },
  { key: 'checkout', label: 'Em Checkout', icon: CreditCard, color: 'text-purple-600', bg: 'bg-purple-50', dot: 'bg-purple-500' },
  { key: 'concluida', label: 'Compra Concluída', icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-50', dot: 'bg-[#22C55E]' },
  { key: 'abandonou', label: 'Abandonou', icon: UserX, color: 'text-red-600', bg: 'bg-red-50', dot: 'bg-red-500' },
];

const FIVE_MIN = 5 * 60 * 1000;
const TWENTY_FOUR_H = 24 * 60 * 60 * 1000;

function timeAgo(dateStr) {
  if (!dateStr) return '—';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  const secs = Math.floor((diff % 60000) / 1000);
  if (diff < 5000) return 'agora';
  if (mins < 1) return `${secs}s atrás`;
  if (mins < 60) return `${mins}min atrás`;
  return `${Math.floor(mins / 60)}h atrás`;
}

function displayName(s) {
  if (s.customer_user_id && s.customer_name) return s.customer_name;
  return 'Visitante';
}

export default function LiveNowBlock() {
  const [sessions, setSessions] = useState([]);
  const [store, setStore] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expandedStage, setExpandedStage] = useState(null);
  const [tick, setTick] = useState(0);
  const [error, setError] = useState(false);
  const [sendingTo, setSendingTo] = useState(null);
  const [sentTo, setSentTo] = useState(new Set());
  const [clearing, setClearing] = useState(false);

  useEffect(() => {
    Promise.all([
      base44.entities.LiveSession.list('-last_event_at', 1000),
      base44.entities.Store.list(),
    ]).then(([data, stores]) => {
      setSessions(data);
      setStore(stores[0]);
      setLoading(false);

      // Auto-dispatch recovery for abandoned carts (multicanal)
      const funnelConfig = stores[0]?.funnel_automation || {};
      if (funnelConfig.auto_dispatch_enabled) {
        const now = Date.now();
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
    }).catch(() => { setError(true); setLoading(false); });

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

  const summary = useMemo(() => summarizeLiveSessions(sessions, Date.now()), [sessions, tick]);
  const { computedSessions, stageCounts, activeCount, events, conversions, abandonments, buyingCount, conversionRate } = summary;

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

  const clearHistory = async () => {
    if (!window.confirm('Limpar todo o histórico do funil desta loja? Pedidos não serão apagados.')) return;
    setClearing(true);
    try {
      await peddiApi.request('/api/v1/demo/live-sessions/history', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${localStorage.getItem('peddi_access_token') || ''}` },
      });
      setSessions([]);
      setSentTo(new Set());
    } catch (_) {
      setError(true);
    } finally {
      setClearing(false);
    }
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
    <section className="peddi-live-panel rounded-2xl border border-gray-200 bg-white p-4 text-[#111111] sm:p-6" aria-label="Funil de vendas ao vivo">
      <header className="peddi-live-header mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="peddi-live-light relative flex h-2 w-2" aria-hidden="true"><span className="absolute h-full w-full animate-ping rounded-full bg-red-400 opacity-40 motion-reduce:animate-none" /><span className="relative h-2 w-2 rounded-full bg-red-500" /></span>
            <h2 className="text-base font-semibold">Ao Vivo Agora</h2>
          </div>
          <p className="mt-1 text-xs text-gray-500">Acompanhe o movimento do seu cardápio.</p>
        </div>
        <div className="flex items-start gap-3">
          <div className="peddi-live-total"><div className="peddi-live-total-top"><Users size={32} /><AnimatedNumber value={activeCount} /><span className="peddi-live-badge">● Tempo real</span></div><span>{activeCount === 1 ? 'pessoa' : 'pessoas'} no seu cardápio agora</span></div>
          <button type="button" onClick={clearHistory} disabled={clearing} className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50">
            {clearing ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
            Limpar histórico
          </button>
        </div>
        <div className="peddi-live-refresh"><RefreshCw size={22} /><div>atualiza sozinho<small>Dados atualizados automaticamente</small></div></div>
      </header>
      {error && <p role="alert" className="mb-4 text-sm text-red-600">Não foi possível carregar o funil. Recarregue para tentar novamente.</p>}
      <div className="peddi-live-body grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <div className="peddi-live-funnel min-w-0 space-y-2">
          {STAGES.map(stage => {
            const count = stageCounts[stage.key] || 0;
            const Icon = stage.icon;
            const isExpanded = expandedStage === stage.key;
            const historical = ['concluida', 'abandonou'].includes(stage.key);
            const denominator = historical ? conversions + abandonments : activeCount;
            const percentage = denominator ? Math.round(count / denominator * 100) : 0;
            const stageSessions = computedSessions.filter(s => s.effectiveStage === stage.key);
            return <div key={stage.key} data-funnel-stage={stage.key} className={`peddi-live-stage rounded-xl ${count > 0 ? 'is-active' : ''}`}>
              <button onClick={() => setExpandedStage(isExpanded ? null : stage.key)} aria-expanded={isExpanded} className="peddi-live-stage-button flex w-full min-w-0 items-center gap-3 rounded-xl p-3 text-left transition-colors">
                <span className={`peddi-live-stage-icon flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${stage.bg}`}><Icon size={28} className={stage.color} /></span>
                <div className="min-w-0 flex-1">
                  <span className="peddi-live-stage-title">{stage.label}</span>
                  <p className="peddi-live-stage-description">{DESCRIPTIONS[stage.key]}</p>
                  <div className="peddi-live-progress mt-2 flex items-center gap-3"><div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/40"><motion.div initial={false} animate={{ width: `${percentage}%` }} transition={{ duration: 0.3 }} className={`h-full rounded-full ${stage.dot}`} /></div><span className="w-9 text-right text-[11px] tabular-nums">{percentage}%</span></div>
                </div>
                <div className="peddi-live-stage-count"><AnimatedNumber value={count} /><small>{historical ? 'hoje' : count === 1 ? 'pessoa' : 'pessoas'}</small></div>
              </button>
              <AnimatePresence initial={false}>{isExpanded && <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }} className="peddi-live-stage-details overflow-hidden"><div className="space-y-2 px-3 pb-3">{historical && <p className="text-[11px] text-gray-500">Métricas de hoje; não representam pessoas online.</p>}{stageSessions.length ? stageSessions.map(s => renderSession(s, stage.key === 'abandonou')) : <p className="py-2 text-xs text-gray-500">Nenhuma sessão nesta etapa.</p>}</div></motion.div>}</AnimatePresence>
            </div>;
          })}
          <p className="px-1 pt-1 text-[11px] leading-relaxed text-gray-500">Etapas ativas: percentual das pessoas online. Conclusões e abandonos: percentual dos eventos de hoje.</p>
        </div>
        <aside className="peddi-live-activity min-w-0 rounded-xl border border-gray-100 p-4">
          <h3 className="flex items-center gap-2 text-sm font-semibold"><span className="h-1.5 w-1.5 rounded-full bg-[#22C55E]" />Atividade em tempo real</h3>
          <p className="mt-1 text-[11px] text-gray-500">Últimos eventos · atualização automática</p>
          <ol className="mt-4 divide-y divide-gray-100"><AnimatePresence initial={false}>{events.slice(0, 6).map(event => {
            const stage = STAGES.find(s => s.key === event.stage);
            const Icon = stage?.icon || Eye;
            const initials = event.name === 'Visitante' ? null : event.name.split(' ').map(part => part[0]).slice(0, 2).join('').toUpperCase();
            return <motion.li layout key={event.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }} className="flex min-w-0 items-start gap-3 py-3"><span className={`peddi-live-avatar mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${stage?.bg} ${stage?.color}`}>{initials || <Icon size={18} />}</span><div className="min-w-0 flex-1"><p className="break-words text-xs leading-5"><span className="font-semibold">{event.name}</span> {event.message}</p><p className={`mt-0.5 text-xs ${stage?.color}`}>{stage?.label}</p></div><span className="peddi-live-event-time">{timeAgo(event.at)}</span></motion.li>;
          })}</AnimatePresence></ol>
          {!events.length && <p className="py-8 text-center text-xs text-gray-500">Os eventos aparecem quando alguém interage com o cardápio.</p>}
        </aside>
      </div>
      <footer className="peddi-live-metrics mt-6 grid grid-cols-2 gap-x-5 gap-y-4 sm:grid-cols-3 xl:grid-cols-5">
        {[['Pessoas online', activeCount, Users, 'green'], ['Em processo de compra', buyingCount, ShoppingCart, 'orange'], ['Conversões hoje', conversions, BarChart3, 'green'], ['Abandonos hoje', abandonments, UserX, 'red'], ['Taxa de conversão', `${conversionRate}%`, Percent, 'green']].map(([label, value, Icon, color]) => <div key={label} className="peddi-live-metric"><span className={`peddi-live-metric-icon ${color}`}><Icon size={25} /></span><div><AnimatedNumber value={value} className="text-lg font-semibold tabular-nums" /><p className="text-[11px] text-gray-500">{label}</p></div></div>)}
      </footer>
    </section>
  );
}

function AnimatedNumber({ value, className = '' }) {
  return <motion.span key={value} initial={{ opacity: 0.5, y: 3 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }} className={`inline-block ${className}`}>{value}</motion.span>;
}
