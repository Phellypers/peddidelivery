import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Megaphone } from 'lucide-react';

export default function PromoHeaderBanner() {
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    base44.entities.PromoMessage.filter({ is_active: true }, 'sort_order').then(msgs => {
      const now = new Date().toISOString().split('T')[0];
      const active = msgs.filter(m => {
        if (m.start_date && m.start_date > now) return false;
        if (m.end_date && m.end_date < now) return false;
        return true;
      });
      setMessages(active);
    });
  }, []);

  if (messages.length === 0) return null;

  const display = [...messages, ...messages];

  return (
    <div className="peddi-promo-strip border-b py-2 overflow-hidden">
      <div className="flex items-center gap-2 px-4">
        <Megaphone size={13} className="text-primary flex-shrink-0" />
        <div className="flex-1 overflow-hidden">
          <div className="marquee-content flex items-center gap-8 whitespace-nowrap">
            {display.map((m, i) => (
              <span key={i} className="text-xs font-semibold text-primary">
                {m.text}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
