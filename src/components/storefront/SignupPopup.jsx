import React, { useEffect, useState } from 'react';
import { X, Gift, Star, Bell } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { isPublicDemo } from '@/lib/presentationDemo';

export default function SignupPopup({ store, user }) {
  const [visible, setVisible] = useState(false);

  const popup = store?.signup_popup || {};
  const enabled = popup.enabled !== false; // default true
  const delayMs = (popup.delay_seconds ?? 5) * 1000;
  const title = popup.title || '🎉 Cadastre-se e aproveite!';
  const message = popup.message || 'Acompanhe seus pedidos, receba promoções exclusivas e fique por dentro das novidades do nosso cardápio.';
  const primaryBtn = popup.primary_btn || 'Criar conta grátis';
  const secondaryBtn = popup.secondary_btn || 'Continuar sem cadastro';
  const style = popup.style || 'modern'; // modern | minimal | fun
  const storeQuery = store?.id ? `?store=${encodeURIComponent(store.id)}` : '';

  // Only show if enabled and user is not logged in
  const shouldShow = enabled && !user && !isPublicDemo();

  useEffect(() => {
    if (!shouldShow) return;
    // Don't show if already dismissed in this session
    if (sessionStorage.getItem('signup_popup_dismissed')) return;

    const timer = setTimeout(() => setVisible(true), delayMs);
    return () => clearTimeout(timer);
  }, [shouldShow, delayMs]);

  const dismiss = () => {
    setVisible(false);
    sessionStorage.setItem('signup_popup_dismissed', '1');
  };

  const styleConfig = {
    modern: {
      overlay: 'bg-black/50 backdrop-blur-sm',
      card: 'bg-white rounded-3xl',
      header: 'bg-gradient-to-br from-orange-500 to-pink-500 rounded-t-3xl',
      primaryClass: 'bg-primary text-white hover:bg-primary/90',
      secondaryClass: 'text-gray-500 hover:text-gray-700 underline',
    },
    minimal: {
      overlay: 'bg-black/40',
      card: 'bg-white rounded-2xl',
      header: 'bg-gray-50 border-b border-gray-100 rounded-t-2xl',
      primaryClass: 'bg-gray-900 text-white hover:bg-gray-800',
      secondaryClass: 'text-gray-400 hover:text-gray-600 underline',
    },
    fun: {
      overlay: 'bg-purple-900/50 backdrop-blur-sm',
      card: 'bg-white rounded-3xl',
      header: 'bg-gradient-to-br from-purple-500 via-pink-500 to-yellow-400 rounded-t-3xl',
      primaryClass: 'bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:opacity-90',
      secondaryClass: 'text-purple-400 hover:text-purple-600 underline',
    },
  };

  const cfg = styleConfig[style] || styleConfig.modern;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className={`fixed inset-0 z-[70] flex items-center justify-center p-4 ${cfg.overlay}`}
          onClick={dismiss}
        >
          <motion.div
            initial={{ scale: 0.85, opacity: 0, y: 30 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: 'spring', damping: 20, stiffness: 260 }}
            onClick={e => e.stopPropagation()}
            className={`w-full max-w-sm shadow-2xl overflow-hidden ${cfg.card}`}
          >
            {/* Header */}
            <div className={`px-6 pt-8 pb-6 text-center relative ${cfg.header}`}>
              <button
                onClick={dismiss}
                className="absolute top-3 right-3 p-1.5 rounded-full bg-white/20 hover:bg-white/40 text-white transition-colors"
              >
                <X size={16} />
              </button>
              <div className="flex justify-center gap-3 mb-3 text-white">
                <Gift size={22} />
                <Star size={22} />
                <Bell size={22} />
              </div>
              <h2 className="font-heading font-extrabold text-xl text-white leading-snug">{title}</h2>
            </div>

            {/* Body */}
            <div className="px-6 py-5 text-center space-y-4">
              <p className="text-sm text-gray-600 leading-relaxed">{message}</p>

              <div className="space-y-2.5 pt-1">
                <Link
                  to={`/register${storeQuery}`}
                  onClick={dismiss}
                  className={`block w-full py-3 rounded-xl font-bold text-sm transition-all ${cfg.primaryClass}`}
                >
                  {primaryBtn}
                </Link>
                <button
                  onClick={dismiss}
                  className={`block w-full py-2 text-sm transition-colors ${cfg.secondaryClass}`}
                >
                  {secondaryBtn}
                </button>
              </div>

              <p className="text-xs text-gray-400">Já tem conta? <Link to={`/login${storeQuery}`} onClick={dismiss} className="text-primary font-medium underline">Entrar</Link></p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
