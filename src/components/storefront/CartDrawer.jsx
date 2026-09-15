import React, { useEffect } from 'react';
import { X, Plus, Minus, ShoppingBag, Trash2, ArrowRight } from 'lucide-react';
import { useCart } from '@/lib/CartContext';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';

export default function CartDrawer() {
  const { items, isOpen, setIsOpen, updateQuantity, removeItem, totalItems, subtotal } = useCart();

  useEffect(() => {
    if (!isOpen) return undefined;
    const priorOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const handleKeyDown = event => { if (event.key === 'Escape') setIsOpen(false); };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = priorOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, setIsOpen]);

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsOpen(false)} className="fixed inset-0 z-[110] bg-black/40 backdrop-blur-sm" />
          <motion.div
            initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 240 }}
            data-peddi-cart="" role="dialog" aria-modal="true" aria-labelledby="cart-drawer-title"
            className="peddi-cart-drawer fixed inset-y-0 left-0 right-0 z-[120] flex w-screen max-w-none flex-col bg-white text-[#111111] shadow-2xl sm:left-auto sm:w-full sm:max-w-md"
          >
            <div className="flex flex-shrink-0 items-center justify-between border-b border-[#E5E7EB] bg-white px-4 pb-4 pt-[max(1rem,env(safe-area-inset-top))]">
              <div className="flex items-center gap-2">
                <ShoppingBag size={21} className="text-[#22C55E]" />
                <h2 id="cart-drawer-title" className="font-heading text-lg font-bold text-[#111111]">Seu Pedido</h2>
                <span className="rounded-full bg-[#DCFCE7] px-2 py-0.5 text-xs font-bold text-[#15803D]">{totalItems}</span>
              </div>
              <button aria-label="Fechar carrinho" onClick={() => setIsOpen(false)} className="flex h-11 w-11 items-center justify-center rounded-xl text-[#6B7280] transition-colors hover:bg-[#F3F4F6] hover:text-[#111111]"><X size={20} /></button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-white p-4">
              {items.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center text-center">
                  <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#F3F4F6]"><ShoppingBag size={32} className="text-[#9CA3AF]" /></div>
                  <p className="font-semibold text-[#111111]">Seu carrinho está vazio</p>
                  <p className="mt-1 text-sm text-[#6B7280]">Adicione itens do cardápio</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {items.map(item => (
                    <div key={item.key} className="flex gap-3 rounded-2xl border border-[#E5E7EB] bg-[#F9FAFB] p-3">
                      {item.product_image && <img src={item.product_image} alt={item.product_name} className="h-16 w-16 flex-shrink-0 rounded-xl object-cover" />}
                      <div className="min-w-0 flex-1">
                        <h4 className="truncate text-sm font-semibold text-[#111111]">{item.product_name}</h4>
                        {item.variation && <p className="text-xs text-[#6B7280]">{item.variation}</p>}
                        {item.addons?.length > 0 && <p className="line-clamp-2 text-xs text-[#6B7280]">+ {item.addons.map(addon => addon.name).join(', ')}</p>}
                        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center rounded-xl border border-[#E5E7EB] bg-white">
                            <button aria-label={`Diminuir quantidade de ${item.product_name}`} onClick={() => updateQuantity(item.key, item.quantity - 1)} className="flex h-10 w-10 items-center justify-center rounded-l-xl text-[#6B7280] transition-colors hover:bg-[#F3F4F6]"><Minus size={14} /></button>
                            <span className="w-7 text-center text-sm font-semibold text-[#111111]">{item.quantity}</span>
                            <button aria-label={`Aumentar quantidade de ${item.product_name}`} onClick={() => updateQuantity(item.key, item.quantity + 1)} className="flex h-10 w-10 items-center justify-center rounded-r-xl text-[#6B7280] transition-colors hover:bg-[#F3F4F6]"><Plus size={14} /></button>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="whitespace-nowrap text-sm font-bold text-[#111111]">R$ {((item.unit_price + item.addon_total) * item.quantity).toFixed(2)}</span>
                            <button aria-label={`Remover ${item.product_name} do carrinho`} onClick={() => removeItem(item.key)} className="flex h-10 w-10 items-center justify-center rounded-xl text-[#9CA3AF] transition-colors hover:bg-red-50 hover:text-red-600"><Trash2 size={16} /></button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {items.length > 0 && (
              <div className="flex-shrink-0 space-y-3 border-t border-[#E5E7EB] bg-white px-4 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
                <div className="flex justify-between text-sm">
                  <span className="text-[#6B7280]">Subtotal</span>
                  <span className="font-bold text-[#111111]">R$ {subtotal.toFixed(2)}</span>
                </div>
                <Link to="/checkout" onClick={() => setIsOpen(false)} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#22C55E] px-4 py-3.5 font-heading text-sm font-bold text-[#111111] transition-colors hover:bg-[#16A34A] hover:text-white">
                  Finalizar Pedido <ArrowRight size={18} />
                </Link>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body,
  );
}
