import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Loader2, MessageCircle, Send, Search, Bike, History } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const TICKET_STATUS = {
  open: { label: 'Aberto', color: 'bg-amber-100 text-amber-700' },
  in_progress: { label: 'Em atendimento', color: 'bg-blue-100 text-blue-700' },
  resolved: { label: 'Resolvido', color: 'bg-green-100 text-green-700' },
  closed: { label: 'Fechado', color: 'bg-gray-100 text-gray-500' },
};

const REASON_LABELS = {
  order_problem: 'Problema com pedido',
  deliverer_problem: 'Problema com entregador',
  order_change: 'Alteração do pedido',
  question: 'Dúvida',
  other: 'Outros',
};

export default function Chat() {
  const [messages, setMessages] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedConv, setSelectedConv] = useState(null);
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);
  const [search, setSearch] = useState('');
  const [chatTab, setChatTab] = useState('customers');
  const [showHistory, setShowHistory] = useState(false);
  const scrollRef = useRef(null);
  const urlParams = new URLSearchParams(window.location.search);
  const convParam = urlParams.get('conv');
  const nameParam = urlParams.get('name');

  const load = async () => {
    const [all, tix] = await Promise.all([
      base44.entities.ChatMessage.list('-created_date', 500),
      base44.entities.SupportTicket.list('-created_date', 200).catch(() => []),
    ]);
    setMessages(all);
    setTickets(tix);
    setLoading(false);
  };

  useEffect(() => {
    load();
    if (convParam) setSelectedConv(convParam);
    const unsub = base44.entities.ChatMessage.subscribe((event) => {
      if (event.type === 'create') {
        setMessages(prev => [event.data, ...prev]);
        if (selectedConv && event.data.conversation_id === selectedConv) {
          setTimeout(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' }); }, 100);
        }
      }
    });
    return () => unsub();
  }, [selectedConv]);

  // Group by conversation_id
  const conversations = {};
  messages.forEach(m => {
    if (!conversations[m.conversation_id]) {
      conversations[m.conversation_id] = { id: m.conversation_id, name: m.customer_name, email: m.customer_email, messages: [], unread: 0 };
    }
    conversations[m.conversation_id].messages.push(m);
    if ((m.sender_type === 'customer' || m.sender_type === 'deliverer') && !m.is_read_by_store) conversations[m.conversation_id].unread++;
  });

  const ticketMap = {};
  tickets.forEach(t => { ticketMap[t.id] = t; });

  const convList = Object.values(conversations).sort((a, b) => {
    const aLast = a.messages[0]?.created_date || '';
    const bLast = b.messages[0]?.created_date || '';
    return bLast.localeCompare(aLast);
  });

  const tabFilteredConvs = convList.filter(c => {
    const isDeliverer = c.id.startsWith('deliverer_');
    return chatTab === 'deliverers' ? isDeliverer : !isDeliverer;
  });
  const filteredConvs = tabFilteredConvs.filter(c => !search || c.name?.toLowerCase().includes(search.toLowerCase()) || c.email?.toLowerCase().includes(search.toLowerCase()));

  const currentConv = conversations[selectedConv];
  const currentMessages = currentConv?.messages?.sort((a, b) => (a.created_date || '').localeCompare(b.created_date || '')) || [];
  const currentTicket = selectedConv ? ticketMap[selectedConv] : null;
  const customerTickets = currentConv?.email ? tickets.filter(t => t.customer_email === currentConv.email) : [];

  const sendReply = async () => {
    if (!reply.trim() || !selectedConv) return;
    setSending(true);
    const conv = conversations[selectedConv];
    const name = conv?.name || nameParam || 'Conversa';
    const isDeliverer = selectedConv.startsWith('deliverer_');
    await base44.entities.ChatMessage.create({
      conversation_id: selectedConv,
      customer_name: name,
      customer_email: conv?.email || '',
      sender_type: 'store',
      message: reply,
      is_read_by_store: true,
      is_read_by_customer: false,
      is_read_by_deliverer: false,
    });
    const senderType = isDeliverer ? 'deliverer' : 'customer';
    await base44.entities.ChatMessage.updateMany(
      { conversation_id: selectedConv, sender_type: senderType, is_read_by_store: false },
      { $set: { is_read_by_store: true } }
    );
    setReply('');
    setSending(false);
    load();
  };

  const openConv = async (convId) => {
    setSelectedConv(convId);
    setShowHistory(false);
    const isDeliverer = convId.startsWith('deliverer_');
    await base44.entities.ChatMessage.updateMany(
      { conversation_id: convId, sender_type: isDeliverer ? 'deliverer' : 'customer', is_read_by_store: false },
      { $set: { is_read_by_store: true } }
    );
    setTimeout(() => load(), 300);
  };

  const updateTicketStatus = async (ticketId, newStatus) => {
    await base44.entities.SupportTicket.update(ticketId, {
      status: newStatus,
      closed_at: newStatus === 'closed' ? new Date().toISOString() : null,
    });
    load();
  };

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [currentMessages.length]);

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-primary" size={32} /></div>;
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-heading font-bold text-2xl text-foreground">Chat</h1>
        <p className="text-sm text-muted-foreground mt-1">{convList.length} conversas · {convList.reduce((s, c) => s + c.unread, 0)} não lidas</p>
      </div>

      {/* Tabs: Clientes / Entregadores */}
      <div className="flex gap-1 bg-muted p-1 rounded-2xl w-fit">
        {[
          { id: 'customers', label: 'Clientes', icon: MessageCircle },
          { id: 'deliverers', label: 'Entregadores', icon: Bike },
        ].map(t => {
          const Icon = t.icon;
          const tabConvs = convList.filter(c => {
            const isDeliverer = c.id.startsWith('deliverer_');
            return t.id === 'deliverers' ? isDeliverer : !isDeliverer;
          });
          const tabUnread = tabConvs.reduce((s, c) => s + c.unread, 0);
          return (
            <button key={t.id} onClick={() => { setChatTab(t.id); setSelectedConv(null); }}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${chatTab === t.id ? 'bg-white text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
              <Icon size={15} /> {t.label}
              {tabUnread > 0 && <span className="bg-red-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">{tabUnread}</span>}
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-[600px]">
        {/* Conversation list */}
        <div className="md:col-span-1 bg-card rounded-2xl border border-border/50 flex flex-col overflow-hidden">
          <div className="p-3 border-b border-border/30">
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar..." className="w-full pl-9 pr-3 py-2 bg-muted rounded-lg text-sm focus:outline-none" />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {filteredConvs.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-8">Nenhuma conversa</p>
            ) : filteredConvs.map(c => {
              const ticket = ticketMap[c.id];
              return (
                <button key={c.id} onClick={() => openConv(c.id)}
                  className={`w-full text-left p-3 border-b border-border/20 transition-colors ${selectedConv === c.id ? 'bg-primary/5' : 'hover:bg-accent/30'}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 min-w-0">
                      {c.id.startsWith('deliverer_') && <Bike size={13} className="text-blue-500 flex-shrink-0" />}
                      <p className="text-sm font-semibold truncate">{c.name || c.email}</p>
                    </div>
                    {c.unread > 0 && <span className="bg-red-500 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0">{c.unread}</span>}
                  </div>
                  {ticket && (
                    <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                      <span className="text-[9px] font-mono font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded">{ticket.protocol}</span>
                      <span className="text-[9px] text-muted-foreground">{REASON_LABELS[ticket.reason] || ticket.reason_label}</span>
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${TICKET_STATUS[ticket.status]?.color}`}>{TICKET_STATUS[ticket.status]?.label}</span>
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground truncate mt-0.5">{c.messages[0]?.message}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Messages */}
        <div className="md:col-span-2 bg-card rounded-2xl border border-border/50 flex flex-col overflow-hidden">
          {!selectedConv ? (
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
              <MessageCircle size={40} className="opacity-30 mb-3" />
              <p className="text-sm">Selecione uma conversa</p>
            </div>
          ) : (
            <>
              <div className="p-3 border-b border-border/30">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-sm">{currentConv?.name || nameParam || 'Nova conversa'}</p>
                    <p className="text-xs text-muted-foreground">{currentConv?.email || (selectedConv?.startsWith('deliverer_') ? 'Entregador' : '')}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {currentTicket && (
                      <>
                        <select value={currentTicket.status} onChange={e => updateTicketStatus(currentTicket.id, e.target.value)}
                          className={`text-[10px] font-bold px-2 py-1 rounded-full border-0 cursor-pointer ${TICKET_STATUS[currentTicket.status]?.color}`}>
                          {Object.entries(TICKET_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                        </select>
                        {chatTab === 'customers' && customerTickets.length > 1 && (
                          <button onClick={() => setShowHistory(v => !v)} className={`p-1.5 rounded-lg transition-colors ${showHistory ? 'bg-primary/10 text-primary' : 'hover:bg-accent text-muted-foreground'}`} title="Histórico de protocolos">
                            <History size={15} />
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
                {currentTicket && (
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="text-[10px] font-mono font-bold text-primary bg-primary/10 px-2 py-0.5 rounded">{currentTicket.protocol}</span>
                    <span className="text-[10px] text-muted-foreground">{REASON_LABELS[currentTicket.reason] || currentTicket.reason_label}</span>
                  </div>
                )}
              </div>

              {/* Ticket history */}
              <AnimatePresence>
                {showHistory && customerTickets.length > 0 && (
                  <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden border-b border-border/30">
                    <div className="p-3 max-h-48 overflow-y-auto">
                      <p className="text-xs font-bold text-muted-foreground uppercase mb-2">Histórico de protocolos ({customerTickets.length})</p>
                      <div className="space-y-1.5">
                        {customerTickets.map(t => (
                          <div key={t.id} className={`flex items-center justify-between p-2 rounded-lg text-xs ${t.id === selectedConv ? 'bg-primary/10' : 'bg-muted/40'}`}>
                            <div className="min-w-0">
                              <p className="font-mono font-bold">{t.protocol}</p>
                              <p className="text-muted-foreground">{REASON_LABELS[t.reason] || t.reason_label}</p>
                              {t.order_number && <p className="text-[10px] text-blue-500">Pedido #{t.order_number}</p>}
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${TICKET_STATUS[t.status]?.color}`}>{TICKET_STATUS[t.status]?.label}</span>
                              {t.id !== selectedConv && (
                                <button onClick={() => openConv(t.id)} className="text-[10px] text-primary font-medium hover:underline">Abrir</button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-2">
                {currentMessages.map(m => (
                  <div key={m.id} className={`flex ${m.sender_type === 'store' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[75%] px-3 py-2 rounded-2xl text-sm ${m.sender_type === 'store' ? 'bg-primary text-white' : 'bg-muted text-foreground'}`}>
                      {m.message}
                      <p className={`text-[9px] mt-0.5 ${m.sender_type === 'store' ? 'text-white/60' : 'text-muted-foreground'}`}>{new Date(m.created_date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="p-3 border-t border-border/30 flex gap-2">
                <input value={reply} onChange={e => setReply(e.target.value)} placeholder="Digite sua mensagem..." onKeyDown={e => { if (e.key === 'Enter') sendReply(); }}
                  className="flex-1 px-3 py-2 bg-muted rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
                <button onClick={sendReply} disabled={sending || !reply.trim()} className="px-4 py-2 bg-primary text-white rounded-xl text-sm font-bold disabled:opacity-50 flex items-center gap-1">
                  {sending ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}