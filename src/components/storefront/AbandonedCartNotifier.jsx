import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useCart } from '@/lib/CartContext';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingCart, X, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function AbandonedCartNotifier({ user }) {
  const [show, setShow] = useState(false);
  const [message, setMessage] = useState('');
  const { items } = useCart();

  useEffect(() => {
    if (!user?.id || items.length === 0) { setShow(false); return; }
    let cancelled = false;

    const check = async () => {
      try {
        const stores = await base44.entities.Store.list();
        if (cancelled) return;
        const config = stores[0]?.abandoned_cart;
        if (!config?.enabled) return;

        const ts = parseInt(localStorage.getItem('vitrine_cart_ts') || '0');
        if (!ts) return;
        const elapsed = Date.now() - ts;
        const timeout = (config.timeout_minutes || 30) * 60 * 1000;
        if (elapsed < timeout) return;

        const notifiedKey = `abandoned_notified_${ts}`;
        if (localStorage.getItem(notifiedKey)) return;
        if (cancelled) return;

        setMessage(config.message || 'Você deixou um item no carrinho. Finalize seu pedido antes que acabe.');
        setShow(true);
        localStorage.setItem(notifiedKey, '1');
      } catch (_) {}
    };

    const initialTimer = setTimeout(check, 3000);
    const interval = setInterval(check, 60000);
    return () => { cancelled = true; clearTimeout(initialTimer); clearInterval(interval); };
  }, [user?.id, items.length]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          className="fixed bottom-24 right-3 left-3 z-40 max-w-lg mx-auto"
        >
          <Link to="/checkout" onClick={() => setShow(false)} className="block bg-white rounded-2xl shadow-2xl border-2 border-primary p-3 flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
              <ShoppingCart size={20} className="text-primary" />
            </div>
            <p className="flex-1 text-xs text-gray-700 font-medium leading-tight">{message}</p>
            <span className="bg-primary text-white rounded-lg px-2.5 py-1.5 text-[10px] font-bold flex-shrink-0 flex items-center gap-0.5">
              Finalizar <ChevronRight size={10} />
            </span>
          </Link>
          <button onClick={(e) => { e.preventDefault(); setShow(false); }} className="absolute -top-2 -right-2 w-6 h-6 bg-white shadow-md rounded-full flex items-center justify-center text-gray-400 hover:text-gray-600 z-10">
            <X size={14} />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}