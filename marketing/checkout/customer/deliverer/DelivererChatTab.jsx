import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Send, Loader2, MessageCircle } from 'lucide-react';

export default function DelivererChatTab({ user, deliverer }) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const scrollRef = useRef(null);
  const conversationId = `deliverer_${user.id}`;

  const load = async () => {
    const msgs = await base44.entities.ChatMessage.filter({ conversation_id: conversationId }, 'created_date', 200);
    setMessages(msgs);
    setLoading(false);
    // Mark store messages as read
    try {
      await base44.entities.ChatMessage.updateMany(
        { conversation_id: conversationId, sender_type: 'store', is_read_by_deliverer: false },
        { $set: { is_read_by_deliverer: true } }
      );
    } catch (_) {}
    setTimeout(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight }); }, 100);
  };

  useEffect(() => {
    if (!user?.id) return;
    load();
    const unsub = base44.entities.ChatMessage.subscribe((event) => {
      if (event.type === 'create' && event.data.conversation_id === conversationId) {
        setMessages(prev => {
          if (prev.find(m => m.id === event.data.id)) return prev;
          return [...prev, event.data];
        });
        if (event.data.sender_type === 'store') {
          base44.entities.ChatMessage.update(event.data.id, { is_read_by_deliverer: true }).catch(() => {});
        }
        setTimeout(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' }); }, 100);
      }
    });
    return () => unsub();
  }, [user?.id]);

  const send = async () => {
    if (!text.trim()) return;
    setSending(true);
    await base44.entities.ChatMessage.create({
      conversation_id: conversationId,
      customer_name: deliverer.name,
      sender_type: 'deliverer',
      message: text,
      is_read_by_store: false,
      is_read_by_deliverer: true,
    });
    setText('');
    setSending(false);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-200px)]">
      <div className="bg-blue-50 border-b border-blue-100 p-3 flex items-center gap-2">
        <MessageCircle size={18} className="text-blue-500" />
        <div>
          <p className="font-bold text-sm text-gray-900">Chat com o gestor</p>
          <p className="text-[10px] text-gray-500">Suas mensagens aparecem em tempo real no painel</p>
        </div>
      </div>
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-2 bg-gray-50">
        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="animate-spin text-blue-500" size={24} /></div>
        ) : messages.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <MessageCircle size={32} className="mx-auto mb-2 opacity-30" />
            <p className="text-xs">Nenhuma mensagem ainda. Envie a primeira!</p>
          </div>
        ) : messages.map(m => (
          <div key={m.id} className={`flex ${m.sender_type === 'deliverer' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm ${m.sender_type === 'deliverer' ? 'bg-blue-500 text-white' : 'bg-white border border-gray-100 text-gray-800'}`}>
              {m.message}
              <p className={`text-[9px] mt-0.5 ${m.sender_type === 'deliverer' ? 'text-white/60' : 'text-gray-400'}`}>
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
    </div>
  );
}