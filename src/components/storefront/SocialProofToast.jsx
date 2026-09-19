import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingBag } from 'lucide-react';
import { playNotificationSound } from '@/lib/notificationSounds';

const NAMES = ['Maria', 'João', 'Ana Paula', 'Carlos', 'Fernanda', 'Rafael', 'Beatriz', 'Lucas', 'Juliana', 'Pedro'];
const ACTIONS = [
  (p) => `acabou de pedir ${p}`,
  (p) => `comprou ${p} agora`,
  (p) => `adicionou ${p} ao carrinho`,
];

export default function SocialProofToast({ products }) {
  const [notification, setNotification] = useState(null);
  const timerRef = useRef(null);

  const showNext = () => {
    if (!products || products.length === 0) return;
    const product = products[Math.floor(Math.random() * products.length)];
    const name = NAMES[Math.floor(Math.random() * NAMES.length)];
    const action = ACTIONS[Math.floor(Math.random() * ACTIONS.length)];
    const minutesAgo = Math.floor(Math.random() * 8) + 1;
    const id = Date.now();
    setNotification({
      id,
      name,
      text: action(product.name),
      image: product.images?.[0],
      time: `há ${minutesAgo} min`,
    });
    playNotificationSound('socialProof', id);
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
    <div className="pointer-events-none fixed left-1/2 top-[calc(max(1rem,env(safe-area-inset-top))+3.5rem)] z-[60] w-full max-w-[min(92vw,30rem)] -translate-x-1/2 px-2 sm:top-[max(1rem,env(safe-area-inset-top))] sm:px-4">
      <AnimatePresence>
        {notification && (
          <motion.div
            key={notification.id}
            initial={{ opacity: 0, y: -24, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -16, scale: 0.95 }}
            transition={{ type: 'spring', damping: 22, stiffness: 260 }}
            className="flex min-h-[68px] items-center gap-3 rounded-2xl border border-gray-100 bg-white/95 px-4 py-3 shadow-[0_10px_30px_rgba(15,23,42,0.14)] backdrop-blur-md"
          >
            <div className="h-11 w-11 flex-shrink-0 overflow-hidden rounded-xl bg-gray-100">
              {notification.image
                ? <img src={notification.image} alt="" className="w-full h-full object-cover" />
                : <div className="w-full h-full flex items-center justify-center"><ShoppingBag size={14} className="text-gray-400" /></div>
              }
            </div>
            <div className="min-w-0 flex-1">
              <p className="line-clamp-2 break-words text-[13px] font-bold leading-[1.35] text-gray-900">
                {notification.name} <span className="font-normal text-gray-500">{notification.text}</span>
              </p>
              <p className="mt-1 text-[11px] text-gray-500">{notification.time} · 🔥 Popular</p>
            </div>
            <div className="w-2 h-2 rounded-full bg-green-400 flex-shrink-0 animate-pulse" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
