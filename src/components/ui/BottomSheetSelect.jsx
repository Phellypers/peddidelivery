import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, X, ChevronDown } from 'lucide-react';

/**
 * Native-style bottom-sheet selection drawer — replaces raw <select> on mobile.
 * Props:
 *  - value: current value
 *  - onChange: (value) => void
 *  - options: [{ value, label }]
 *  - placeholder, label, className
 */
export default function BottomSheetSelect({ value, onChange, options, placeholder, label, className }) {
  const [open, setOpen] = useState(false);
  const selected = options.find(o => o.value === value);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`w-full flex items-center justify-between px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 text-left ${className || ''}`}
      >
        <span className={selected ? 'text-gray-900' : 'text-gray-400'}>
          {selected ? selected.label : (placeholder || 'Selecione...')}
        </span>
        <ChevronDown size={16} className="text-gray-400 flex-shrink-0" />
      </button>

      <AnimatePresence>
        {open && (
          <div data-peddi-select-overlay="" className="fixed inset-0 z-[60] flex items-end justify-center" onClick={() => setOpen(false)}>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/40"
            />
            <motion.div
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 32, stiffness: 320 }}
              data-peddi-sheet=""
              className="relative bg-white rounded-t-3xl w-full max-w-lg p-4 pb-safe max-h-[70vh] overflow-y-auto"
              onClick={e => e.stopPropagation()}
            >
              <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-3" />
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-heading font-bold text-base">{label || placeholder || 'Selecione'}</h3>
                <button onClick={() => setOpen(false)} className="p-1.5 hover:bg-gray-100 rounded-full">
                  <X size={18} className="text-gray-400" />
                </button>
              </div>
              <div className="space-y-1">
                {options.map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => { onChange(opt.value); setOpen(false); }}
                    className={`w-full flex items-center justify-between px-4 py-3.5 rounded-xl text-sm font-medium transition-colors ${
                      opt.value === value ? 'bg-primary/10 text-primary' : 'hover:bg-gray-50 text-gray-700'
                    }`}
                  >
                    <span>{opt.label}</span>
                    {opt.value === value && <Check size={18} />}
                  </button>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
