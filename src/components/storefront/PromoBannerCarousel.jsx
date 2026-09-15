import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getBannerProductIds } from '@/lib/bannerProducts';

// Default banners shown when no store banners configured
const DEFAULT_BANNERS = [
  {
    id: 1,
    image: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800&h=300&fit=crop',
    title: 'Promoções do Dia',
    subtitle: 'Aproveite os melhores preços!',
    badge: '🔥 OFERTA',
    color: 'from-orange-600/70',
  },
  {
    id: 2,
    image: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=800&h=300&fit=crop',
    title: 'Pizza Gigante',
    subtitle: '50cm por apenas R$ 49,90',
    badge: '🍕 DESTAQUE',
    color: 'from-red-700/70',
  },
  {
    id: 3,
    image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800&h=300&fit=crop',
    title: 'Combos Especiais',
    subtitle: 'Lanche + Bebida com desconto',
    badge: '⚡ COMBO',
    color: 'from-amber-700/70',
  },
];

export default function PromoBannerCarousel({ banners, onSelectBanner }) {
  // Use store banners (active only) if available, otherwise fall back to defaults
  const activeBanners = banners?.filter(b => b.is_active && b.image_url);
  const slides = (activeBanners && activeBanners.length > 0) ? activeBanners : DEFAULT_BANNERS;
  const [current, setCurrent] = useState(0);
  const timerRef = useRef(null);

  const next = () => setCurrent(c => (c + 1) % slides.length);
  const prev = () => setCurrent(c => (c - 1 + slides.length) % slides.length);

  useEffect(() => {
    timerRef.current = setInterval(next, 4000);
    return () => clearInterval(timerRef.current);
  }, [slides.length]);

  const resetTimer = () => {
    clearInterval(timerRef.current);
    timerRef.current = setInterval(next, 4000);
  };

  const selectCurrentBanner = () => {
    if (getBannerProductIds(slides[current]).length) onSelectBanner?.(slides[current], current);
  };

  return (
    <div className="peddi-banner-carousel relative w-full overflow-hidden rounded-none" style={{ aspectRatio: '16/7' }}>
      <AnimatePresence mode="wait">
        <motion.div
          key={current}
          initial={{ opacity: 0, x: 60 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -60 }}
          transition={{ duration: 0.35 }}
          className={`absolute inset-0 ${getBannerProductIds(slides[current]).length ? 'cursor-pointer' : ''}`}
          onClick={selectCurrentBanner}
        >
          <img
            src={slides[current].image_url || slides[current].image}
            alt={slides[current].title || ''}
            className="h-full w-full object-cover"
          />
          <div className={`peddi-banner-shade absolute inset-0 bg-gradient-to-r ${slides[current].color || 'from-black/60'} to-transparent`} />
          <div className="peddi-banner-copy absolute bottom-0 left-0 p-4">
            {slides[current].badge && (
              <span className="bg-primary text-white text-[10px] font-bold px-2 py-0.5 rounded-full mb-1.5 inline-block">
                {slides[current].badge}
              </span>
            )}
            <h3 className="font-heading font-bold text-white text-lg leading-tight drop-shadow">{slides[current].title}</h3>
            {slides[current].subtitle && (
              <p className="text-white/90 text-xs mt-0.5">{slides[current].subtitle}</p>
            )}
            {getBannerProductIds(slides[current]).length > 0 && <button type="button" className="peddi-banner-cta">Ver campanha</button>}
            {getBannerProductIds(slides[current]).length === 0 && <a href="#cardapio-produtos" className="peddi-banner-cta inline-block">Peça já!</a>}
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Arrows */}
      {slides.length > 1 && (
        <>
          <button
            aria-label="Banner anterior"
            onClick={() => { prev(); resetTimer(); }}
            className="absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 bg-black/30 hover:bg-black/50 text-white rounded-full flex items-center justify-center transition-colors"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            aria-label="Próximo banner"
            onClick={() => { next(); resetTimer(); }}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 bg-black/30 hover:bg-black/50 text-white rounded-full flex items-center justify-center transition-colors"
          >
            <ChevronRight size={16} />
          </button>
        </>
      )}

      {/* Dots */}
      <div className="peddi-banner-dots absolute bottom-2 right-3 flex gap-1">
        {slides.map((_, i) => (
          <button
            key={i}
            aria-label={`Mostrar banner ${i + 1}`}
            onClick={() => { setCurrent(i); resetTimer(); }}
            className={`h-1.5 rounded-full transition-all ${i === current ? 'bg-white w-4' : 'bg-white/50 w-1.5'}`}
          />
        ))}
      </div>
    </div>
  );
}
