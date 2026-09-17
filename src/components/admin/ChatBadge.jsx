import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';

export default function ChatBadge() {
  const [unread, setUnread] = useState(0);

  const load = async () => {
    try {
      const msgs=[];for(let skip=0;;skip+=500){const page=await base44.entities.ChatMessage.list('-created_date',500,skip);msgs.push(...page);if(page.length<500)break;}
      const count = msgs.filter(m => m.sender_type !== 'store' && !m.is_read_by_store).length;
      setUnread(count);
    } catch (_) {}
  };

  useEffect(() => {
    load();
    const unsub = base44.entities.ChatMessage.subscribe(() => load());
    return () => unsub();
  }, []);

  if (unread === 0) return null;

  return (
    <span role="status" aria-label={`${unread} mensagens não lidas no Chat`} className="ml-auto bg-red-500 text-white text-[10px] font-bold min-w-[18px] h-[18px] px-1 rounded-full flex items-center justify-center">
      {unread}
    </span>
  );
}