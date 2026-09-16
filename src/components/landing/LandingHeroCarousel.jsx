import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';

const slides = [
  { id: 'dashboard', src: '/Landing/peddi-dashboard-cardapio.png', alt: 'Dashboard do gestor e cardápio PEDDI no celular' },
  { id: 'cardapio', src: '/Landing/peddi-celular-cardapio.png', alt: 'Cardápio PEDDI apresentado em dois celulares' },
  { id: 'mobile', src: '/Landing/peddi-celular2-cardapio.png', alt: 'Experiência mobile do cardápio PEDDI' },
];

export default function LandingHeroCarousel() {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (paused || reducedMotion) return undefined;
    const timer = window.setInterval(() => setActive(index => (index + 1) % slides.length), 4200);
    return () => window.clearInterval(timer);
  }, [paused, reducedMotion]);

  return (
    <div className="relative mx-auto w-full max-w-[620px]" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} onTouchStart={() => setPaused(true)} onTouchEnd={() => setPaused(false)}>
      <div className="pointer-events-none absolute inset-8 rounded-full bg-green-300/25 blur-3xl" aria-hidden="true" />
      <div className="relative aspect-[4/3] overflow-hidden rounded-[2rem]">
        <AnimatePresence mode="wait">
          <motion.img
            key={slides[active].id}
            src={slides[active].src}
            alt={slides[active].alt}
            initial={{ opacity: 0, x: reducedMotion ? 0 : 42 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: reducedMotion ? 0 : -42 }}
            transition={{ duration: reducedMotion ? 0 : 0.55, ease: [0.22, 1, 0.36, 1] }}
            className="h-full w-full object-contain drop-shadow-[0_24px_38px_rgba(15,23,42,0.18)]"
          />
        </AnimatePresence>
      </div>
      <div className="relative mt-3 flex items-center justify-center gap-2" aria-label="Selecionar imagem do carrossel">
        {slides.map((slide, index) => (
          <button key={slide.id} type="button" aria-label={`Mostrar imagem ${index + 1}`} aria-current={active === index} onClick={() => setActive(index)} className={`h-2 rounded-full transition-all ${active === index ? 'w-8 bg-green-500' : 'w-2 bg-green-200 hover:bg-green-300'}`} />
        ))}
      </div>
    </div>
  );
}
