import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingBag } from 'lucide-react';

const NAMES = ['Maria', 'João', 'Ana Paula', 'Carlos', 'Fernanda', 'Rafael', 'Beatriz', 'Lucas', 'Juliana', 'Pedro'];
const ACTIONS = [
  (p) => `acabou de pedir ${p}`,
  (p) => `comprou ${p} agora`,
  (p) => `adicionou ${p} ao carrinho`,
];

export default function SocialProofToast({ products }) {
  const [notification, setNotification] = useState(null);
  const timerRef = useRef(null);
  const audioRef = useRef(null);

  const playSound = () => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(660, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.3);
    } catch (e) {}
  };

  const showNext = () => {
    if (!products || products.length === 0) return;
    const product = products[Math.floor(Math.random() * products.length)];
    const name = NAMES[Math.floor(Math.random() * NAMES.length)];
    const action = ACTIONS[Math.floor(Math.random() * ACTIONS.length)];
    const minutesAgo = Math.floor(Math.random() * 8) + 1;
    setNotification({
      id: Date.now(),
      name,
      text: action(product.name),
      image: product.images?.[0],
      time: `há ${minutesAgo} min`,
    });
    playSound();
    setTimeout(() => setNotification(null), 4500);
  };

  useEffect(() => {
    if (!products || products.length === 0) return;
    const first = setTimeout(() => {
      showNext();
      timerRef.current = setInterval(showNext, 18000);
    }, 6000);
    return () => { clearTimeout(first); clearInterval(timerRef.current); };
  }, [products]);

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[60] pointer-events-none w-full max-w-xs px-4">
      <AnimatePresence>
        {notification && (
          <motion.div
            key={notification.id}
            initial={{ opacity: 0, y: -24, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -16, scale: 0.95 }}
            transition={{ type: 'spring', damping: 22, stiffness: 260 }}
            className="bg-white/95 backdrop-blur-md rounded-2xl shadow-lg border border-gray-100 px-3 py-2.5 flex items-center gap-2.5"
          >
            <div className="w-9 h-9 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0">
              {notification.image
                ? <img src={notification.image} alt="" className="w-full h-full object-cover" />
                : <div className="w-full h-full flex items-center justify-center"><ShoppingBag size={14} className="text-gray-400" /></div>
              }
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-bold text-gray-900 leading-tight truncate">
                {notification.name} <span className="font-normal text-gray-500">{notification.text}</span>
              </p>
              <p className="text-[10px] text-gray-400 mt-0.5">{notification.time} · 🔥 Popular</p>
            </div>
            <div className="w-2 h-2 rounded-full bg-green-400 flex-shrink-0 animate-pulse" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}