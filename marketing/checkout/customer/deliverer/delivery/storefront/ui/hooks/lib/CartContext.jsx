import React, { createContext, useContext, useState, useEffect } from 'react';
import { emitLiveEvent } from '@/lib/liveSession';

const CartContext = createContext();

export function CartProvider({ children }) {
  const [items, setItems] = useState(() => {
    try {
      const saved = localStorage.getItem('vitrine_cart');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem('vitrine_cart', JSON.stringify(items));
    if (items.length > 0) {
      if (!localStorage.getItem('vitrine_cart_ts')) {
        localStorage.setItem('vitrine_cart_ts', Date.now().toString());
      }
    } else {
      localStorage.removeItem('vitrine_cart_ts');
      Object.keys(localStorage).forEach(k => { if (k.startsWith('abandoned_notified_')) localStorage.removeItem(k); });
    }
  }, [items]);

  const addItem = (product, quantity = 1, variation = '', addons = [], notes = '') => {
    const key = `${product.id}-${variation}-${addons.join(',')}`;
    const existing = items.find(i => i.key === key);
    const newItems = existing
      ? items.map(i => i.key === key ? { ...i, quantity: i.quantity + quantity } : i)
      : [...items, {
          key,
          product_id: product.id,
          product_name: product.name,
          product_image: product.images?.[0] || '',
          unit_price: product.promo_price || product.price,
          quantity,
          variation,
          addons,
          notes,
          addon_total: addons.reduce((sum, a) => sum + (a.price || 0), 0)
        }];
    setItems(newItems);
    emitLiveEvent('carrinho', {
      cart_count: newItems.reduce((s, i) => s + i.quantity, 0),
      cart_items: newItems.map(i => i.product_name),
    }, { noRegression: true });
  };

  const updateQuantity = (key, quantity) => {
    if (quantity <= 0) {
      setItems(prev => prev.filter(i => i.key !== key));
    } else {
      setItems(prev => prev.map(i => i.key === key ? { ...i, quantity } : i));
    }
  };

  const removeItem = (key) => setItems(prev => prev.filter(i => i.key !== key));
  const clearCart = () => setItems([]);
  const totalItems = items.reduce((sum, i) => sum + i.quantity, 0);
  const subtotal = items.reduce((sum, i) => sum + (i.unit_price + i.addon_total) * i.quantity, 0);

  return (
    <CartContext.Provider value={{ items, isOpen, setIsOpen, addItem, updateQuantity, removeItem, clearCart, totalItems, subtotal }}>
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => useContext(CartContext);