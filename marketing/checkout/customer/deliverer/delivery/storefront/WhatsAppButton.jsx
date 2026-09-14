import React from 'react';
import { MessageCircle } from 'lucide-react';

export default function WhatsAppButton({ phone = '5511999991234' }) {
  if (!phone) return null;
  return (
    <a
      href={`https://wa.me/${phone}?text=Olá!%20Preciso%20de%20ajuda.`}
      target="_blank"
      rel="noopener noreferrer"
      title="Falar com o estabelecimento"
      className="fixed bottom-20 right-3 md:bottom-5 md:right-5 z-40 w-11 h-11 bg-green-500 hover:bg-green-600 text-white rounded-full flex items-center justify-center shadow-md shadow-green-500/25 transition-all hover:scale-105"
    >
      <MessageCircle size={20} className="fill-white" />
    </a>
  );
}