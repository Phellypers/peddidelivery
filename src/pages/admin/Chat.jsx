import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Loader2, MessageCircle, Send, Search, Bike, History, ArrowLeft, SlidersHorizontal, Info } from 'lucide-react';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from '@/components/ui/alert-dialog';
import BottomNav from '@/components/storefront/BottomNav';
import { buildConversations, filterConversations, matchesChatTab, remainingChatDays, chatReasons, chatLabels } from '@/lib/chatConversations';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

const TICKET_STATUS = {
  open: { label: 'Aberto', color: 'bg-amber-100 text-amber-700' },
  in_progress: { label: 'Em atendimento', color: 'bg-blue-100 text-blue-700' },
  resolved: { label: 'Resolvido', color: 'bg-green-100 text-green-700' },
  closed: { label: 'Encerrada', color: 'bg-gray-100 text-gray-500' },
};

const REASON_LABELS = {
  order_problem: 'Problema com pedido',
  deliverer_problem: 'Problema com entregador',
  order_change: 'Alteração do pedido',
  question: 'Dúvida',
  other: 'Outros',
};

async function readAll(entity) {const rows=[];for(let skip=0;;skip+=500){const page=await entity.list('-created_date',500,skip);rows.push(...page);if(page.length<500)return rows;}}

export default function Chat() {
  const [confirmClose, setConfirmClose] = useState(false);
  const [closing, setClosing] = useState(false);
  const [chatError, setChatError] = useState('');
  const [messages, setMessages] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [params, setParams] = useSearchParams();
  const selectedConv = params.get('conv');
  const selectedRef=useRef(selectedConv);selectedRef.current=selectedConv;
  const setSelectedConv = id => setParams(prev => {const next=new URLSearchParams(prev);if(id)next.set('conv',id);else {next.delete('conv');next.delete('name');}return next;});
  const [filterTab,setFilterTab] = useState('all');
  const [filters,setFilters] = useState({reason:'',status:'',from:'',to:''});
  const [showFilters,setShowFilters] = useState(false);
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);
  const [search, setSearch] = useState('');
  const [chatTab, setChatTab] = useState(selectedConv?.startsWith('deliverer_')?'deliverers':'customers');
  const [showHistory, setShowHistory] = useState(false);
  const scrollRef = useRef(null);
  const urlParams = new URLSearchParams(window.location.search);
  const nameParam = urlParams.get('name');

  const load = async () => {
    const [all, tix] = await Promise.all([
      readAll(base44.entities.ChatMessage),
      readAll(base44.entities.SupportTicket),
    ]);
    setMessages(all);
    setTickets(tix);
    setLoading(false);
  };

  useEffect(() => {
    load().catch(error=>{setChatError(error.message);setLoading(false);});

    const unsub = base44.entities.ChatMessage.subscribe((event) => {
      if (event.type === 'create') {
        setMessages(prev => [event.data, ...prev.filter(m=>m.id!==event.id)]);
        if (selectedRef.current && event.data.conversation_id === selectedRef.current) {
          void markRead(selectedRef.current);
          setTimeout(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' }); }, 100);
        }
      } else {setMessages(prev=>event.type==='delete'?prev.filter(m=>m.id!==event.id):[event.data,...prev.filter(m=>m.id!==event.id)]);}
    });
    const unsubTickets = base44.entities.SupportTicket.subscribe(event => {setTickets(prev=>event.type==='delete'?prev.filter(t=>t.id!==event.id):[event.data,...prev.filter(t=>t.id!==event.id)]);if(event.type==='delete')setMessages(prev=>prev.filter(m=>m.conversation_id!==event.id));});
    return () => { unsub(); unsubTickets(); };
  }, []);

  const convList = buildConversations(messages,tickets);
  const conversations = Object.fromEntries(convList.map(c=>[c.id,c]));
  const ticketMap = Object.fromEntries(tickets.map(t=>[t.id,t]));
  const tabFilteredConvs = filterConversations(convList,{...filters,search,tab:chatTab});
  const filteredConvs = tabFilteredConvs.filter(c=>matchesChatTab(c,filterTab));
  const currentConv = conversations[selectedConv];
  const currentMessages = currentConv?.messages || [];
  const currentTicket = ticketMap[selectedConv];
  const customerTickets = currentConv?.email ? tickets.filter(t=>t.customer_email===currentConv.email) : [];
  const markRead = async id => {
    try {
      await base44.entities.ChatMessage.updateMany({conversation_id:id,sender_type:id.startsWith('deliverer_')?'deliverer':'customer',is_read_by_store:false},{$set:{is_read_by_store:true}});
      setMessages(prev=>prev.map(m=>m.conversation_id===id&&m.sender_type!=='store'?{...m,is_read_by_store:true}:m));
    } catch(error) {setChatError(error.message);}
  };
  useEffect(()=>{if(selectedConv&&!loading)void markRead(selectedConv);setReply('');},[selectedConv,loading]);

  const sendReply = async () => {
    if (!reply.trim() || !selectedConv || sending || !currentConv || currentTicket?.status === 'closed') return;
    setSending(true);
    setChatError('');
    try {
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
    if(currentTicket && currentTicket.status!=='closed') await base44.entities.SupportTicket.update(currentTicket.id,{status:'in_progress'});
    load();
    } catch(error) { setChatError(error.message); load(); } finally { setSending(false); }
  };

  const openConv = async (convId) => {
    setSelectedConv(convId);
    setShowHistory(false);
    await markRead(convId);
  };

  const updateTicketStatus = async (ticketId, newStatus) => {
    setChatError('');setClosing(true);
    try {
      await base44.entities.SupportTicket.update(ticketId, {status:newStatus,
        ...(newStatus==='closed'?{closed_at:new Date().toISOString(),delete_after:new Date(Date.now()+30*86400000).toISOString()}: {})});
      setConfirmClose(false);await load();
    } catch(error) {setChatError(error.message);} finally {setClosing(false);}

  };

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [currentMessages.length]);

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-primary" size={32} /></div>;
  }

  return (
    <div className="space-y-4 text-[#111111] pb-[calc(5rem+env(safe-area-inset-bottom))] md:pb-0">
      <AlertDialog open={confirmClose} onOpenChange={value => {if(!closing)setConfirmClose(value);}}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Finalizar atendimento?</AlertDialogTitle>
          <AlertDialogDescription>Deseja finalizar este atendimento? O protocolo será encerrado e seu histórico será excluído permanentemente após 30 dias.</AlertDialogDescription>
        </AlertDialogHeader><AlertDialogFooter><AlertDialogCancel disabled={closing}>Cancelar</AlertDialogCancel>
          <AlertDialogAction disabled={closing} onClick={event => {event.preventDefault();updateTicketStatus(currentTicket.id,'closed');}}> {closing?'Finalizando...':'Finalizar atendimento'}</AlertDialogAction>
        </AlertDialogFooter>{chatError && <p role="alert" className="text-sm text-red-600">{chatError}</p>}</AlertDialogContent>
      </AlertDialog>

      <div className={selectedConv ? 'hidden md:block' : ''}>
        <h1 className="font-heading font-bold text-2xl text-foreground">Chat</h1>
        <p className="text-sm text-muted-foreground mt-1">{convList.filter(c=>(c.id.startsWith('deliverer_')?'deliverers':'customers')===chatTab).length} conversas · {convList.filter(c=>(c.id.startsWith('deliverer_')?'deliverers':'customers')===chatTab&&c.unread>0).length} não lidas</p>
      </div>

      {/* Tabs: Clientes / Entregadores */}
      <div className={`${selectedConv ? 'hidden md:flex' : 'flex'} gap-1 bg-gray-100 p-1 rounded-2xl w-full md:w-fit`}>
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
            <button key={t.id} onClick={() => { setChatTab(t.id);setFilterTab('all'); setSelectedConv(null); }}
              className={`flex items-center gap-1.5 min-h-11 flex-1 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${chatTab === t.id ? 'bg-white text-green-600 shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
              <Icon size={15} /> {t.label}
              {tabUnread > 0 && <span className="bg-red-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">{tabUnread}</span>}
            </button>
          );
        })}
      </div>

      <div className={`${selectedConv?'hidden md:flex':'flex'} flex-wrap gap-2`}>
        {[['all','Todas'],['unread','Não lidas'],['in_progress','Em atendimento'],['closed','Encerradas']].map(([key,label])=><button key={key} aria-pressed={filterTab===key} onClick={()=>setFilterTab(key)} className={`min-h-11 rounded-xl px-3 text-sm ${filterTab===key?'bg-[#22C55E] text-white':'bg-gray-100 text-gray-600'}`}>{label} <span className="ml-2 rounded-full bg-black/5 px-2 py-1 text-xs">{tabFilteredConvs.filter(c=>matchesChatTab(c,key)).length}</span></button>)}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-[minmax(280px,0.85fr)_minmax(0,1.6fr)] gap-4 md:h-[min(720px,calc(100dvh-260px))] md:min-h-[450px]">
        {/* Conversation list */}
        <div className={`${selectedConv ? 'hidden md:flex' : 'flex'} min-h-0 min-w-0 bg-white rounded-2xl border border-gray-200 flex-col overflow-hidden`}>
          <div className="p-3 border-b border-border/30">
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input value={search} onChange={e => setSearch(e.target.value)} aria-label="Buscar por nome ou protocolo" placeholder="Buscar por nome ou protocolo..." className="w-full min-h-11 pl-9 pr-12 py-2 bg-gray-50 rounded-xl text-sm focus:outline-none" />
              <button aria-label="Filtros adicionais" aria-expanded={showFilters} onClick={()=>setShowFilters(v=>!v)} className="absolute right-1 top-0 flex h-11 w-11 items-center justify-center text-gray-500"><SlidersHorizontal size={18}/></button>
            </div>
            {showFilters && <div className="mt-3 grid grid-cols-2 gap-2">
              <label className="text-xs text-gray-500">Motivo<select value={filters.reason} onChange={e=>setFilters(p=>({...p,reason:e.target.value}))} className="mt-1 min-h-11 w-full rounded-xl border bg-white px-2 text-sm"><option value="">Todos</option>{Object.entries(chatReasons).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></label>
              <label className="text-xs text-gray-500">Status<select value={filters.status} onChange={e=>setFilters(p=>({...p,status:e.target.value}))} className="mt-1 min-h-11 w-full rounded-xl border bg-white px-2 text-sm"><option value="">Todos</option>{Object.entries(chatLabels).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></label>
              {['from','to'].map(key=><label key={key} className="min-w-0 text-xs text-gray-500">{key==='from'?'De':'Até'}<input type="date" value={filters[key]} onChange={e=>setFilters(p=>({...p,[key]:e.target.value}))} className="mt-1 min-h-11 min-w-0 w-full rounded-xl border bg-white px-2 text-sm"/></label>)}
              <button onClick={()=>{setFilters({reason:'',status:'',from:'',to:''});setSearch('');setFilterTab('all');}} className="col-span-2 min-h-11 text-sm font-semibold text-green-600">Limpar filtros</button>
            </div>}
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            {filteredConvs.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-8">Nenhuma conversa</p>
            ) : filteredConvs.map(c => {
              const ticket = ticketMap[c.id];
              return (
                <button key={c.id} onClick={() => openConv(c.id)}
                  className={`w-full text-left p-4 border-b border-gray-100 transition-colors ${selectedConv === c.id ? 'bg-green-50 ring-1 ring-inset ring-green-400' : c.unread ? 'bg-green-50/60' : 'hover:bg-gray-50'}`}>
                  <div className="flex items-start gap-3">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-green-100 text-sm font-semibold text-green-600">{(c.name||c.email||'?').split(' ').slice(0,2).map(p=>p[0]).join('').toUpperCase()}</span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2"><p className="truncate text-sm font-bold">{c.name||c.email||'Usuário'}</p><time className="shrink-0 text-[11px] text-gray-500">{c.date && new Date(c.date).toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})}</time></div>
                      <p className={`mt-1 truncate text-sm ${c.unread?'font-semibold text-gray-900':'text-gray-600'}`}>{c.last?.message||'Atendimento iniciado'}</p>
                      <p className="mt-1 break-words text-xs text-gray-500">{ticket?.protocol||'Sem protocolo'} · {c.reason}</p>
                      <div className="mt-2 flex items-center justify-between"><span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${{unread:'bg-red-50 text-red-600',in_progress:'bg-blue-50 text-blue-600',waiting:'bg-amber-50 text-amber-700',closed:'bg-gray-100 text-gray-600'}[c.status]}`}>{chatLabels[c.status]}</span>{c.unread>0&&<span aria-label={`${c.unread} mensagens não lidas`} className="rounded-full bg-[#22C55E] px-2 py-0.5 text-xs font-bold text-white">{c.unread}</span>}</div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Messages */}
        <div className={`${selectedConv ? 'fixed left-4 right-4 top-[72px] bottom-[calc(94px+env(safe-area-inset-bottom))] z-30 flex' : 'hidden md:flex'} min-w-0 md:static md:z-auto md:h-auto md:min-h-0 bg-white rounded-2xl border border-gray-200 flex-col overflow-hidden`}>
          {!selectedConv || !currentConv ? (
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
              <MessageCircle size={40} className="opacity-30 mb-3" />
              <p className="text-sm">{selectedConv?'Atendimento indisponível ou histórico excluído.':'Selecione uma conversa'}</p>{selectedConv&&<button onClick={()=>setSelectedConv(null)} className="min-h-11 text-green-600 md:hidden">Voltar à lista</button>}
            </div>
          ) : (
            <>
              <div className="shrink-0 p-4 border-b border-gray-100">
                <div className="grid grid-cols-[44px_minmax(0,1fr)] items-center gap-x-3 gap-y-2 md:flex md:flex-wrap">
                  <button aria-label="Voltar às conversas" onClick={()=>setSelectedConv(null)} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl md:hidden"><ArrowLeft size={22}/></button>
                  <span className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-full bg-green-100 font-semibold text-green-600 md:flex">{(currentConv.name||currentConv.email||'?').split(' ').slice(0,2).map(p=>p[0]).join('').toUpperCase()}</span>
                  <div className="min-w-0 flex-1">
                    <p title={currentConv?.name || nameParam} className="truncate font-semibold text-base">{currentConv?.name || nameParam || 'Nova conversa'}</p>
                    <p title={currentConv?.email} className="truncate text-xs text-muted-foreground">{currentConv?.email || (selectedConv?.startsWith('deliverer_') ? 'Entregador' : '')}</p>
                  </div>
                  <div className="col-span-2 flex min-w-0 flex-wrap items-center gap-2 md:ml-auto">
                    <span className={`rounded-full px-2 py-1 text-xs font-semibold ${{unread:'bg-red-50 text-red-600',in_progress:'bg-blue-50 text-blue-600',waiting:'bg-amber-50 text-amber-700',closed:'bg-gray-100 text-gray-600'}[currentConv.status]}`}>{chatLabels[currentConv.status]}</span>
                    {currentTicket && (
                      <>
                        {currentTicket.status !== 'closed' && <select aria-label="Status do atendimento" disabled={closing} value={currentTicket.status} onChange={e => updateTicketStatus(currentTicket.id, e.target.value)}
                          className={`min-h-11 text-xs font-bold px-2 py-1 rounded-xl border-0 cursor-pointer ${TICKET_STATUS[currentTicket.status]?.color}`}>
                          {Object.entries(TICKET_STATUS).filter(([k]) => k !== 'closed' || currentTicket.status === 'closed').map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                        </select>}
                        {currentTicket.status !== 'closed' && <button onClick={() => setConfirmClose(true)} className="min-h-11 rounded-xl border border-[#22C55E] px-3 py-2 text-xs font-semibold text-green-600">Finalizar atendimento</button>}
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
                  <div className="flex flex-wrap items-center gap-2 mt-3">
                    <span className="max-w-full truncate text-xs font-mono font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded">{currentTicket.protocol}</span>
                    <span className="text-xs text-muted-foreground">Motivo: {REASON_LABELS[currentTicket.reason] || currentTicket.reason_label}</span>
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

              <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto p-4 space-y-2">
                {currentMessages.map(m => (
                  <div key={m.id} className={`flex ${m.sender_type === 'store' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[75%] whitespace-pre-wrap break-words px-4 py-3 rounded-2xl text-sm leading-relaxed ${m.sender_type === 'store' ? 'bg-green-100 text-[#111111]' : 'bg-gray-100 text-[#111111]'}`}>
                      {m.message}
                      <p className={`text-[9px] mt-0.5 ${m.sender_type === 'store' ? 'text-gray-500' : 'text-gray-500'}`}>{new Date(m.created_date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                  </div>
                ))}
              {currentTicket?.status === 'closed' && <p className="shrink-0 border-t bg-gray-50 p-3 text-xs leading-relaxed text-gray-600">Atendimento encerrado. Este histórico será excluído permanentemente 30 dias após o encerramento.<br/>Encerrado em {currentTicket.closed_at ? new Date(currentTicket.closed_at).toLocaleString('pt-BR') : 'Data indisponível'}.<br/>{remainingChatDays(currentTicket)} dias restantes para exclusão.</p>}
              </div>

              {chatError && <p role="alert" className="p-3 text-sm text-red-600">{chatError}</p>}
              <div className="mx-4 mb-3 hidden md:flex shrink-0 items-center gap-2 rounded-xl bg-gray-50 p-3 text-xs text-gray-500"><Info size={16} className="shrink-0"/>Históricos encerrados são excluídos após 30 dias.</div>
              <div className="shrink-0 bg-white p-3 border-t border-gray-100 flex gap-2">
                <input disabled={currentTicket?.status === 'closed'} value={reply} onChange={e => setReply(e.target.value)} placeholder="Digite sua mensagem..." onKeyDown={e => { if (e.key === 'Enter') sendReply(); }}
                  className="min-w-0 min-h-12 flex-1 px-3 py-2 bg-gray-50 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-primary/20" />
                <button onClick={sendReply} disabled={sending || !reply.trim() || currentTicket?.status === 'closed'} className="min-h-12 px-4 py-2 bg-[#22C55E] text-white rounded-xl text-sm font-bold disabled:opacity-50 flex items-center gap-1">
                  {sending ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
      <div className="md:hidden"><BottomNav/></div>
    </div>
  );
}