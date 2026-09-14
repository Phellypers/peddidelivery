import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';

export default function ChatBadge() {
  const [unread, setUnread] = useState(0);

  const load = async () => {
    try {
      const msgs = await base44.entities.ChatMessage.list('-created_date', 500);
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
    <span className="ml-auto bg-red-500 text-white text-[10px] font-bold min-w-[18px] h-[18px] px-1 rounded-full flex items-center justify-center">
      {unread > 9 ? '9+' : unread}
    </span>
  );
}