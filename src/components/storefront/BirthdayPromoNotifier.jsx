import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { motion, AnimatePresence } from 'framer-motion';
import { Gift, X, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function BirthdayPromoNotifier({ user }) {
  const [promo, setPromo] = useState(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    (async () => {
      try {
        const [stores, profiles] = await Promise.all([
          base44.entities.Store.list(),
          base44.entities.CustomerProfile.filter({ user_id: user.id }),
        ]);
        if (cancelled) return;
        const config = stores[0]?.birthday_promo;
        const profile = profiles[0];
        if (!config?.enabled || !profile?.birth_month || !profile?.birth_day) return;

        const today = new Date();
        const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        let birthday = new Date(today.getFullYear(), profile.birth_month - 1, profile.birth_day);
        if (birthday < todayMidnight) {
          birthday = new Date(today.getFullYear() + 1, profile.birth_month - 1, profile.birth_day);
        }
        const daysUntil = Math.ceil((birthday - todayMidnight) / (1000 * 60 * 60 * 24));

        if (daysUntil <= (config.days_before || 3) && daysUntil >= 0) {
          const todayKey = today.toISOString().split('T')[0];
          if (localStorage.getItem('birthday_promo_shown') === todayKey) return;
          if (cancelled) return;
          setPromo(config);
          setShow(true);
          localStorage.setItem('birthday_promo_shown', todayKey);
        }
      } catch (_) {}
    })();
    return () => { cancelled = true; };
  }, [user?.id]);

  return (
    <AnimatePresence>
      {show && promo && (
        <motion.div
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -100, opacity: 0 }}
          className="fixed top-0 left-0 right-0 z-50 px-3 pt-3"
        >
          <div className="max-w-lg mx-auto bg-gradient-to-r from-pink-500 to-purple-600 rounded-2xl p-4 shadow-2xl flex items-center gap-3">
            <div className="w-11 h-11 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0">
              <Gift size={22} className="text-white" />
            </div>
            <div className="flex-1 min-w-0 text-white">
              <p className="font-bold text-sm">{promo.title || '🎁 Oferta de aniversário!'}</p>
              {promo.message && <p className="text-xs text-white/90 mt-0.5 leading-tight line-clamp-2">{promo.message}</p>}
            </div>
            <Link to="/" onClick={() => setShow(false)} className="bg-white text-purple-600 rounded-xl px-3 py-2 text-xs font-bold flex-shrink-0 flex items-center gap-1">
              Aproveitar <ChevronRight size={12} />
            </Link>
            <button onClick={() => setShow(false)} className="text-white/70 hover:text-white flex-shrink-0">
              <X size={18} />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}