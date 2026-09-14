import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { MessageCircle, X, Send, Loader2, Package, Bike, Edit3, HelpCircle, MessageSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const REASONS = [
  { id: 'order_problem', label: 'Problema com pedido', icon: Package },
  { id: 'deliverer_problem', label: 'Problema com entregador', icon: Bike },
  { id: 'order_change', label: 'Alteração do pedido', icon: Edit3 },
  { id: 'question', label: 'Dúvida', icon: HelpCircle },
  { id: 'other', label: 'Outros', icon: MessageSquare },
];

const REASON_LABELS = {
  order_problem: 'Problema com pedido',
  deliverer_problem: 'Problema com entregador',
  order_change: 'Alteração do pedido',
  question: 'Dúvida',
  other: 'Outros',
};

function generateProtocol() {
  const d = new Date();
  const ymd = d.getFullYear().toString() + String(d.getMonth() + 1).padStart(2, '0') + String(d.getDate()).padStart(2, '0');
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `SUP-${ymd}-${rand}`;
}

export default function ChatWidget({ externalOpen = false, onExternalClose, hideLauncher = false }) {
  const { user, isAuthenticated } = useAuth();
  const [open, setOpen] = useState(false);
  useEffect(() => { if (externalOpen) setOpen(true); }, [externalOpen]);
  const closeChat = () => { setOpen(false); onExternalClose?.(); };
  const [step, setStep] = useState('reason'); // reason | chat
  const [ticket, setTicket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [starting, setStarting] = useState(false);
  const scrollRef = useRef(null);

  // Check for existing active ticket on mount
  useEffect(() => {
    if (!isAuthenticated || !user?.email) return;
    base44.entities.SupportTicket.filter({ customer_email: user.email }, '-created_date', 10)
      .then(tickets => {
        const active = tickets.find(t => t.status === 'open' || t.status === 'in_progress');
        if (active) {
          setTicket(active);
          setStep('chat');
        }
      })
      .catch(() => {});
  }, [isAuthenticated, user]);

  const conversationId = ticket?.id || '';

  useEffect(() => {
    if (!open || !conversationId) return;
    loadMessages();
    const unsub = base44.entities.ChatMessage.subscribe((event) => {
      if (event.type === 'create' && event.data.conversation_id === conversationId) {
        setMessages(prev => [...prev, event.data]);
        setTimeout(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' }); }, 100);
      }
    });
    return () => unsub();
  }, [open, conversationId]);

  const loadMessages = async () => {
    if (!conversationId) return;
    setLoading(true);
    const msgs = await base44.entities.ChatMessage.filter({ conversation_id: conversationId }, 'created_date', 200);
    setMessages(msgs);
    setLoading(false);
    setTimeout(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight }); }, 100);
  };

  const startTicket = async (reasonId) => {
    setStarting(true);
    const protocol = generateProtocol();
    try {
      const created = await base44.entities.SupportTicket.create({
        protocol,
        customer_name: user?.full_name || user?.email,
        customer_email: user?.email,
        customer_user_id: user?.id,
        reason: reasonId,
        reason_label: REASON_LABELS[reasonId],
        status: 'open',
      });
      setTicket(created);
      setStep('chat');
      await base44.entities.ChatMessage.create({
        conversation_id: created.id,
        customer_name: user?.full_name || user?.email,
        customer_email: user?.email,
        sender_type: 'customer',
        message: `📋 Protocolo ${protocol}\nMotivo: ${REASON_LABELS[reasonId]}`,
        is_read_by_store: false,
        is_read_by_customer: true,
      });
      loadMessages();
    } catch (_) {}
    setStarting(false);
  };

  const send = async () => {
    if (!text.trim() || !conversationId) return;
    setSending(true);
    await base44.entities.ChatMessage.create({
      conversation_id: conversationId,
      customer_name: user?.full_name || user?.email,
      customer_email: user?.email,
      sender_type: 'customer',
      message: text,
      is_read_by_store: false,
      is_read_by_customer: true,
    });
    setText('');
    setSending(false);
  };

  if (!isAuthenticated || !user) return null;

  return (
    <>
      {!hideLauncher && <button onClick={() => setOpen(o => !o)}
        className="fixed bottom-5 right-5 z-40 w-12 h-12 bg-blue-500 text-white rounded-full shadow-lg flex items-center justify-center hover:bg-blue-600 transition-colors"
        title="Conversar com a loja">
        <MessageCircle size={22} />
      </button>}

      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, y: 20, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-24 right-4 z-[70] w-80 max-w-[calc(100vw-2rem)] bg-white rounded-3xl shadow-2xl border border-gray-100 flex flex-col overflow-hidden" style={{ height: 'min(450px, calc(100dvh - 120px))' }}>

            {step === 'reason' ? (
              <>
                <div className="bg-blue-500 text-white p-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MessageCircle size={18} />
                    <p className="font-bold text-sm">Atendimento ao cliente</p>
                  </div>
                  <button aria-label="Fechar chat" onClick={closeChat} className="p-3"><X size={18} /></button>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-2">
                  <p className="text-xs text-gray-500 mb-3">Selecione o motivo do seu atendimento para iniciarmos:</p>
                  {starting ? (
                    <div className="flex justify-center py-8"><Loader2 className="animate-spin text-blue-500" size={24} /></div>
                  ) : REASONS.map(r => {
                    const Icon = r.icon;
                    return (
                      <button key={r.id} onClick={() => startTicket(r.id)}
                        className="w-full flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:border-blue-300 hover:bg-blue-50 transition-colors text-left">
                        <div className="w-9 h-9 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0">
                          <Icon size={16} className="text-blue-500" />
                        </div>
                        <span className="text-sm font-medium text-gray-700">{r.label}</span>
                      </button>
                    );
                  })}
                </div>
              </>
            ) : (
              <>
                <div className="bg-blue-500 text-white p-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MessageCircle size={18} />
                    <div>
                      <p className="font-bold text-sm">Chat com a loja</p>
                      {ticket && <p className="text-[10px] text-white/80">Protocolo {ticket.protocol}</p>}
                    </div>
                  </div>
                  <button aria-label="Fechar chat" onClick={closeChat} className="p-3"><X size={18} /></button>
                </div>
                <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-2 bg-gray-50">
                  {loading ? (
                    <div className="flex justify-center py-8"><Loader2 className="animate-spin text-blue-500" size={24} /></div>
                  ) : messages.length === 0 ? (
                    <div className="text-center py-8 text-gray-400">
                      <MessageCircle size={32} className="mx-auto mb-2 opacity-30" />
                      <p className="text-xs">Envie uma mensagem para a loja</p>
                    </div>
                  ) : messages.map(m => (
                    <div key={m.id} className={`flex ${m.sender_type === 'customer' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm ${m.sender_type === 'customer' ? 'bg-blue-500 text-white' : 'bg-white border border-gray-100 text-gray-800'}`}>
                        {m.message}
                        <p className={`text-[9px] mt-0.5 ${m.sender_type === 'customer' ? 'text-white/60' : 'text-gray-400'}`}>
                          {new Date(m.created_date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="p-2 border-t border-gray-100 flex gap-1.5">
                  <input value={text} onChange={e => setText(e.target.value)} placeholder="Mensagem..." onKeyDown={e => { if (e.key === 'Enter') send(); }}
                    className="flex-1 px-3 py-2 bg-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
                  <button onClick={send} disabled={sending || !text.trim()} className="w-9 h-9 bg-blue-500 text-white rounded-xl flex items-center justify-center disabled:opacity-50">
                    {sending ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
                  </button>
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
