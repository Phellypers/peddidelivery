import React, { useState, useEffect, useRef, useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

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
  const slides = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const active = banners?.filter(b => b.is_active !== false && b.image_url && (!b.start_date || b.start_date <= today) && (!b.end_date || b.end_date >= today)) || [];
    return active.length ? active : DEFAULT_BANNERS;
  }, [banners]);
  const [current, setCurrent] = useState(0);
  const trackRef = useRef(null);
  const interacting = useRef(false);
  const currentRef = useRef(0);
  const goTo = index => {
    const track = trackRef.current;
    const slide = track?.children[index];
    if (!slide) return;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    track.scrollTo({left: slide.offsetLeft - track.children[0].offsetLeft, behavior: reduceMotion ? 'auto' : 'smooth'});
  };
  useEffect(() => {
    currentRef.current = 0;setCurrent(0);
    trackRef.current?.scrollTo({left: 0, behavior: 'auto'});
    if (slides.length < 2) return undefined;
    const timer = setInterval(() => {
      if (!interacting.current && !document.hidden) goTo((currentRef.current + 1) % slides.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [slides]);
  const onScroll = () => {
    const track = trackRef.current;
    const first = track?.children[0];
    if (!first) return;
    let closest = 0, distance = Infinity;
    Array.from(track.children).forEach((slide,index) => {
      const delta = Math.abs(slide.offsetLeft - first.offsetLeft - track.scrollLeft);
      if (delta < distance) {distance = delta;closest = index;}
    });
    currentRef.current = closest;setCurrent(closest);
  };
  return <section aria-label="Banners promocionais" aria-roledescription="carrossel" className="peddi-promo-compact relative">
    <div ref={trackRef} onScroll={onScroll} onPointerDown={() => {interacting.current=true;}} onPointerUp={() => {interacting.current=false;}} onPointerCancel={() => {interacting.current=false;}} onPointerLeave={() => {interacting.current=false;}}
      className="peddi-promo-track scrollbar-hide">
      {slides.map((banner,index) => {
        const campaignPath = banner.destination_url || `/loja/campanha/${encodeURIComponent(banner.id || `index-${banners?.indexOf(banner) ?? index}`)}`;
        return <a key={banner.id || index} href={campaignPath} className={`peddi-promo-slide ${slides.length === 1 ? 'single' : ''}`}
          aria-label={banner.title || `Banner ${index + 1}`} onClick={event => {if(onSelectBanner&&!banner.destination_url) {event.preventDefault();onSelectBanner(banner,index);}}}>
          <img src={banner.image_url || banner.image} alt={banner.title || ''} className="h-full w-full object-cover" draggable="false" loading={index === 0 ? 'eager' : 'lazy'}/>
        </a>;
      })}
    </div>
    {slides.length > 1 && <>
      <button type="button" aria-label="Banner anterior" onClick={() => goTo((current - 1 + slides.length) % slides.length)} className="peddi-promo-arrow left-1 hidden sm:flex"><ChevronLeft size={16}/></button>
      <button type="button" aria-label="Próximo banner" onClick={() => goTo((current + 1) % slides.length)} className="peddi-promo-arrow right-1 hidden sm:flex"><ChevronRight size={16}/></button>
      <div className="flex justify-center gap-0.5 pt-1">{slides.map((banner,index) => <button type="button" key={banner.id || index} aria-label={`Mostrar banner ${index + 1}`} aria-current={current === index ? 'true' : undefined} onClick={() => goTo(index)} className="flex h-7 w-7 items-center justify-center rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-green-500"><span className={`h-1.5 w-1.5 rounded-full transition-colors ${current === index ? 'bg-primary' : 'bg-gray-300'}`}/></button>)}</div>
    </>}
  </section>;
}
