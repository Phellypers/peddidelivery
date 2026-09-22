/* eslint no-undef: "error" */
import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { MessageCircle, X, Send, Loader2, Package, Bike, Edit3, HelpCircle, MessageSquare, ChevronDown, ChevronRight, CalendarDays } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';
import TypingIndicator from './TypingIndicator';
import { useChatTyping } from '@/hooks/useChatTyping';
import { useDragControls } from 'framer-motion';

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
  const closeChat = () => { setOpen(false); setHistoryOpen(false); onExternalClose?.(); };
  const [step, setStep] = useState('reason'); // reason | chat
  const [historyOpen, setHistoryOpen] = useState(false);
  const [ticketHistory, setTicketHistory] = useState([]);
  const [ticket, setTicket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [chatError, setChatError] = useState('');
  const [starting, setStarting] = useState(false);
  const scrollRef = useRef(null);
  const dragControls = useDragControls();

  useEffect(() => {
    if (open) setHistoryOpen(false);
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const handleKeyDown = event => { if (event.key === 'Escape') closeChat(); };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  // Check for existing active ticket on mount
  useEffect(() => {
    if (!isAuthenticated || !user?.email) return;
    base44.entities.SupportTicket.filter({ customer_email: user.email }, '-created_date', 200)
      .then(tickets => {
        setTicketHistory(tickets);
        const active = tickets.find(t => t.status !== 'closed') || tickets[0];
        if (active) {
          setTicket(active);
          setStep('chat');
        }
      })
      .catch(() => {});
  }, [isAuthenticated, user]);

  const conversationId = ticket?.id || '';
  const chatTyping=useChatTyping(conversationId,open && ticket?.status!=='closed');

  useEffect(() => {
    if (!open || !conversationId) return;
    let cancelled = false;
    setLoading(true);
    base44.entities.ChatMessage.filter({conversation_id:conversationId}, 'created_date', 200)
      .then(rows => {if(!cancelled)setMessages(rows);})
      .catch(error => {if(!cancelled)setChatError(error.message);})
      .finally(() => {if(!cancelled)setLoading(false);});
    const unsub = base44.entities.ChatMessage.subscribe((event) => {
      if (event.type === 'create' && event.data.conversation_id === conversationId) {
        setMessages(prev => [...prev, event.data]);
        setTimeout(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' }); }, 100);
      }
    });
    const unsubTickets = base44.entities.SupportTicket.subscribe(event => {
      setTicketHistory(prev => event.type === 'delete' ? prev.filter(t => t.id !== event.id) : [event.data, ...prev.filter(t => t.id !== event.id)]);
      if(event.id !== conversationId) return;
      if(event.type === 'delete') {setTicket(null);setMessages([]);setStep('reason');}
      else setTicket(event.data);
    });
    return () => {cancelled=true;unsub();unsubTickets();};
  }, [open, conversationId]);

  const startTicket = async (reasonId) => {
    setStarting(true);setChatError('');setMessages([]);
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
      setTicket(created);setTicketHistory(prev => [created,...prev]);
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
    } catch (error) {setChatError(error.message);}
    setStarting(false);
  };

  const send = async () => {
    if (!text.trim() || !conversationId || ticket?.status === 'closed') return;
    chatTyping.stop();
    setSending(true);setChatError('');
    try {
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
    } catch(error) {setChatError(error.message); const latest=await base44.entities.SupportTicket.get(conversationId);if(latest)setTicket(latest);} finally {setSending(false);}
  };

  if (!isAuthenticated || !user) return null;

  return (
    <>
      {!hideLauncher && <button onClick={() => setOpen(o => !o)}
        className="fixed bottom-5 right-5 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-[#22C55E] text-white shadow-lg transition-colors hover:bg-[#16A34A]"
        title="Conversar com a loja">
        <MessageCircle size={22} />
      </button>}

      {createPortal(
        <AnimatePresence>
          {open && (
            <>
              <motion.button type="button" aria-label="Fechar chat" onClick={closeChat}
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 z-[210] cursor-default bg-[#111111]/35 backdrop-blur-[1px]" />
              <motion.section
                data-peddi-chat-sheet=""
                role="dialog"
                aria-modal="true"
                aria-labelledby="peddi-chat-title"
                initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 30, stiffness: 330 }}
                drag="y" dragControls={dragControls} dragListener={false} dragConstraints={{ top: 0, bottom: 0 }} dragElastic={{ top: 0, bottom: 0.35 }}
                onDragEnd={(_, info) => { if (info.offset.y > 100 || info.velocity.y > 700) closeChat(); }}
                className="peddi-chat-sheet fixed z-[220] flex flex-col overflow-hidden border border-[#E5E7EB] bg-white text-[#111111] shadow-2xl"
              >
                <button type="button" aria-label="Arraste para fechar o chat" onPointerDown={event => dragControls.start(event)} className="flex h-7 flex-shrink-0 touch-none cursor-grab items-center justify-center bg-white active:cursor-grabbing">
                  <span className="h-1.5 w-12 rounded-full bg-[#D1D5DB]" />
                </button>

                <header className="flex flex-shrink-0 items-center justify-between gap-3 border-b border-[#E5E7EB] bg-white px-4 pb-4 sm:px-5">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-[#22C55E] text-white"><MessageCircle size={23} /></span>
                    <div className="min-w-0">
                      <h2 id="peddi-chat-title" className="truncate text-lg font-bold text-[#111111]">Chat com a loja</h2>
                      <p className="truncate text-xs text-[#6B7280]">{ticket?.protocol ? `Protocolo ${ticket.protocol}` : 'Novo atendimento'}</p>
                      {ticket && <p role="status" className="mt-1 text-xs font-semibold text-[#15803D]">{{open:'Aguardando atendimento',in_progress:'Em atendimento',waiting_response:'Aguardando resposta',resolved:'Em atendimento',closed:'Encerrado'}[ticket.status] || 'Aguardando atendimento'}</p>}
                    </div>
                  </div>
                  <button type="button" aria-label="Fechar chat" onClick={closeChat} className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl text-[#6B7280] transition-colors hover:bg-[#F3F4F6] hover:text-[#111111]"><X size={22} /></button>
                </header>

                {ticketHistory.length > 0 && <section className="flex-shrink-0 border-b border-[#E5E7EB] bg-white px-4 py-2">
                  <button type="button" onClick={() => setHistoryOpen(value => !value)} aria-expanded={historyOpen} aria-controls="chat-history-list" className="flex min-h-11 w-full items-center justify-between gap-2 text-left text-sm font-medium text-[#6B7280]">
                    Histórico de atendimentos <ChevronDown size={18} className={`shrink-0 transition-transform ${historyOpen ? 'rotate-180' : ''}`}/>
                  </button>
                  {historyOpen && <div id="chat-history-list" className="max-h-[min(22dvh,180px)] space-y-2 overflow-y-auto overscroll-contain pb-2">
                    {ticketHistory.map(previous => <button type="button" key={previous.id} aria-pressed={ticket?.id === previous.id} onClick={() => {setHistoryOpen(false);if(ticket?.id === previous.id && step === 'chat')return;setTicket(previous);setMessages([]);setText('');setChatError('');setStep('chat');}} className={`flex min-h-24 w-full items-center gap-3 rounded-2xl border bg-white p-3 text-left transition-colors ${ticket?.id === previous.id ? 'border-[#BBF7D0]' : 'border-[#E5E7EB] hover:border-[#22C55E]'}`}>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2"><p className="break-words text-sm font-bold text-[#111111]">Protocolo {previous.protocol}</p><span className={`rounded-full px-2 py-1 text-[11px] font-semibold ${previous.status === 'closed' ? 'bg-[#F3F4F6] text-[#6B7280]' : 'bg-[#ECFDF3] text-[#15803D]'}`}>{{open:'Aberto',in_progress:'Em atendimento',resolved:'Resolvido',waiting_response:'Aguardando resposta',closed:'Encerrado'}[previous.status] || 'Aberto'}</span></div>
                        <p className="mt-1 text-xs text-[#6B7280]">{REASON_LABELS[previous.reason] || previous.reason_label || 'Motivo não informado'}</p>
                        <p className="mt-2 flex items-center gap-2 text-xs text-[#6B7280]"><CalendarDays size={14}/>{previous.created_date ? new Date(previous.created_date).toLocaleDateString('pt-BR') : 'Data indisponível'}</p>
                      </div><ChevronRight size={18} className="shrink-0 text-[#6B7280]"/>
                    </button>)}
                  </div>}
                </section>}
                {chatError && <p role="alert" className="px-4 py-2 text-sm text-red-600">{chatError}</p>}
                {step === 'reason' ? (
                  <div className="min-h-0 flex-1 overflow-y-auto bg-white p-4 sm:p-5">
                    <div className="mb-4 rounded-2xl bg-[#ECFDF3] p-4">
                      <p className="text-sm font-bold text-[#15803D]">Estamos online!</p>
                      <p className="mt-0.5 text-sm text-[#6B7280]">Nossa equipe responde o mais rápido possível.</p>
                    </div>
                    <p className="mb-3 text-sm text-[#6B7280]">Selecione o motivo do atendimento:</p>
                    <div className="space-y-2">
                      {starting ? (
                        <div className="flex justify-center py-8"><Loader2 className="animate-spin text-[#22C55E]" size={24} /></div>
                      ) : REASONS.map(reason => {
                        const Icon = reason.icon;
                        return (
                          <button key={reason.id} type="button" onClick={() => startTicket(reason.id)}
                            className="flex min-h-14 w-full items-center gap-3 rounded-xl border border-[#E5E7EB] bg-white p-3 text-left transition-colors hover:border-[#22C55E] hover:bg-[#F0FDF4]">
                            <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-[#ECFDF3]"><Icon size={18} className="text-[#16A34A]" /></span>
                            <span className="text-sm font-semibold text-[#111111]">{reason.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <>
                    <div ref={scrollRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto bg-[#F9FAFB] p-4 overscroll-contain">
                      <div className="rounded-2xl bg-[#ECFDF3] px-4 py-3">
                        <p className="text-sm font-bold text-[#15803D]">Estamos online!</p>
                        <p className="text-xs text-[#6B7280]">Nossa equipe responde o mais rápido possível.</p>
                      </div>
                      {loading ? (
                        <div className="flex justify-center py-8"><Loader2 className="animate-spin text-[#22C55E]" size={24} /></div>
                      ) : messages.length === 0 ? (
                        <div className="py-10 text-center text-[#9CA3AF]"><MessageCircle size={34} className="mx-auto mb-2 opacity-40" /><p className="text-sm">Envie uma mensagem para a loja</p></div>
                      ) : messages.map(message => (
                        <div key={message.id} className={`flex ${message.sender_type === 'customer' ? 'justify-end' : 'justify-start'}`}>
                          <div aria-label={message.sender_type === 'customer' ? 'Mensagem do cliente' : 'Mensagem da loja'} className={`max-w-[82%] min-w-0 whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2.5 text-sm ${message.sender_type === 'customer' ? 'rounded-br-md bg-[#DCFCE7] text-[#111111]' : 'rounded-bl-md border border-[#E5E7EB] bg-white text-[#111111]'}`}>
                            {message.message}
                            <p className="mt-1 text-right text-[10px] text-[#6B7280]">{new Date(message.created_date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                    {chatTyping.typing && <TypingIndicator/>}
                    {ticket?.status === 'closed' ? <div className="flex-shrink-0 border-t border-[#E5E7EB] bg-white p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
                      <p className="text-sm text-[#6B7280]">Este atendimento foi encerrado pelo estabelecimento. O histórico ficará disponível por 30 dias e, depois desse período, será excluído permanentemente.</p>
                      <button type="button" onClick={() => {setStep('reason');setTicket(null);setMessages([]);setText('');}} className="mt-3 min-h-11 w-full rounded-xl bg-[#22C55E] px-4 font-semibold text-white">Iniciar novo atendimento</button>
                    </div> : <form onSubmit={event => { event.preventDefault(); send(); }} className="flex flex-shrink-0 items-center gap-2 border-t border-[#E5E7EB] bg-white px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 sm:px-4">
                      <input value={text} onChange={event => {setText(event.target.value);chatTyping.change(event.target.value);}} onBlur={chatTyping.stop} placeholder="Mensagem..." aria-label="Mensagem"
                        className="min-h-12 min-w-0 flex-1 rounded-2xl border border-[#D1D5DB] bg-white px-4 text-base text-[#111111] outline-none placeholder:text-[#9CA3AF] focus:border-[#22C55E] focus:ring-2 focus:ring-[#22C55E]/20" />
                      <button type="submit" aria-label="Enviar mensagem" disabled={sending || !text.trim()} className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-[#22C55E] text-white transition-colors hover:bg-[#16A34A] disabled:opacity-40">
                        {sending ? <Loader2 size={18} className="animate-spin" /> : <Send size={19} />}
                      </button>
                    </form>}
                  </>
                )}
              </motion.section>
            </>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </>
  );
}
