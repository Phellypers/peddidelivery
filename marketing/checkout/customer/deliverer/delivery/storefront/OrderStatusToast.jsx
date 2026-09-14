import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// Single dismissible pop-up card: auto-hides, closable by X, or swipe up.
export default function OrderStatusToast({ toast, onDismiss }) {
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => onDismiss(toast.id), 5000);
    return () => clearTimeout(timer);
  }, [toast.id]);

  const handleClick = () => {
    onDismiss(toast.id);
    if (toast.orderId) navigate(`/meus-pedidos?order=${toast.orderId}`);
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -30, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -60, scale: 0.95 }}
      transition={{ type: 'spring', damping: 25, stiffness: 300 }}
      drag="y"
      dragDirectionLock
      dragConstraints={{ top: 0, bottom: 0 }}
      dragElastic={{ top: 0.6, bottom: 0 }}
      onDragEnd={(e, info) => { if (info.offset.y < -40) onDismiss(toast.id); }}
      onClick={handleClick}
      className="pointer-events-auto w-full bg-white rounded-2xl shadow-lg border border-gray-100 p-4 flex items-start gap-3 cursor-pointer active:cursor-grabbing"
    >
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-gray-900 leading-tight">{toast.title}</p>
        <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{toast.description}</p>
      </div>
      <button onClick={(e) => { e.stopPropagation(); onDismiss(toast.id); }} className="text-gray-300 hover:text-gray-500 flex-shrink-0">
        <X size={16} />
      </button>
    </motion.div>
  );
}