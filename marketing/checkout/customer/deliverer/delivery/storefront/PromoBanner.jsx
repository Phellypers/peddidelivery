import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const banners = [
  {
    title: "🔥 Semana do Hambúrguer",
    subtitle: "Todos os burguers com 15% OFF",
    bg: "from-orange-500 to-red-500",
    cta: "Ver ofertas"
  },
  {
    title: "🆓 Frete Grátis",
    subtitle: "Em pedidos acima de R$ 80",
    bg: "from-emerald-500 to-teal-500",
    cta: "Pedir agora"
  },
  {
    title: "🎉 Ganhe um brinde!",
    subtitle: "Use o cupom PRIMEIRACOMPRA",
    bg: "from-violet-500 to-purple-600",
    cta: "Aproveitar"
  }
];

export default function PromoBanner() {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setCurrent(p => (p + 1) % banners.length), 4000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="relative mx-4 mt-3 rounded-2xl overflow-hidden shadow-sm">
      <div className={`bg-gradient-to-br ${banners[current].bg} px-5 py-5 text-white`}>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-heading font-extrabold text-lg leading-tight mb-0.5">{banners[current].title}</h2>
            <p className="text-white/85 text-sm mb-3">{banners[current].subtitle}</p>
            <button className="bg-white text-gray-900 text-xs font-bold px-4 py-1.5 rounded-full hover:bg-white/90 transition-colors shadow-sm">
              {banners[current].cta}
            </button>
          </div>
          <div className="text-5xl opacity-30 select-none">🍔</div>
        </div>
      </div>
      <div className="absolute bottom-3 right-3 flex gap-1">
        {banners.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrent(i)}
            className={`h-1.5 rounded-full transition-all ${i === current ? 'bg-white w-5' : 'bg-white/40 w-1.5'}`}
          />
        ))}
      </div>
    </div>
  );
}