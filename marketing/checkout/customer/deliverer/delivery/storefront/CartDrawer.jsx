import React from 'react';
import { X, Plus, Minus, ShoppingBag, Trash2, ArrowRight } from 'lucide-react';
import { useCart } from '@/lib/CartContext';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

export default function CartDrawer() {
  const { items, isOpen, setIsOpen, updateQuantity, removeItem, totalItems, subtotal } = useCart();

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
          />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-card z-50 flex flex-col shadow-2xl"
          >
            <div className="flex items-center justify-between p-4 border-b border-border">
              <div className="flex items-center gap-2">
                <ShoppingBag size={20} className="text-primary" />
                <h2 className="font-heading font-bold text-lg">Seu Pedido</h2>
                <span className="bg-primary/10 text-primary text-xs font-bold px-2 py-0.5 rounded-full">{totalItems}</span>
              </div>
              <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-accent rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {items.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <ShoppingBag size={48} className="text-muted-foreground/30 mb-4" />
                  <p className="text-muted-foreground font-medium">Seu carrinho está vazio</p>
                  <p className="text-sm text-muted-foreground mt-1">Adicione itens do cardápio</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {items.map(item => (
                    <div key={item.key} className="flex gap-3 p-3 bg-muted/50 rounded-xl">
                      {item.product_image && (
                        <img src={item.product_image} alt={item.product_name} className="w-16 h-16 rounded-lg object-cover flex-shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-sm text-foreground truncate">{item.product_name}</h4>
                        {item.variation && <p className="text-xs text-muted-foreground">{item.variation}</p>}
                        {item.addons?.length > 0 && (
                          <p className="text-xs text-muted-foreground">+ {item.addons.map(a => a.name).join(', ')}</p>
                        )}
                        <div className="flex items-center justify-between mt-2">
                          <div className="flex items-center gap-2 bg-card rounded-lg border border-border">
                            <button onClick={() => updateQuantity(item.key, item.quantity - 1)} className="p-1.5 hover:bg-accent rounded-l-lg transition-colors">
                              <Minus size={14} />
                            </button>
                            <span className="text-sm font-medium w-6 text-center">{item.quantity}</span>
                            <button onClick={() => updateQuantity(item.key, item.quantity + 1)} className="p-1.5 hover:bg-accent rounded-r-lg transition-colors">
                              <Plus size={14} />
                            </button>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-foreground">
                              R$ {((item.unit_price + item.addon_total) * item.quantity).toFixed(2)}
                            </span>
                            <button onClick={() => removeItem(item.key)} className="p-1 text-muted-foreground hover:text-destructive transition-colors">
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {items.length > 0 && (
              <div className="p-4 border-t border-border space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-bold">R$ {subtotal.toFixed(2)}</span>
                </div>
                <Link
                  to="/checkout"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center justify-center gap-2 w-full bg-primary text-primary-foreground py-3.5 rounded-xl font-heading font-bold text-sm hover:bg-primary/90 transition-colors"
                >
                  Finalizar Pedido <ArrowRight size={18} />
                </Link>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}