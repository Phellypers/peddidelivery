import React, { useState, useEffect } from 'react';
import { X, Plus, Minus, Trash2, Loader2, Check, PackagePlus, Search } from 'lucide-react';
import { motion } from 'framer-motion';
import { base44 } from '@/api/base44Client';

export default function EditOrderCustomerModal({ order, onClose, onSaved }) {
  const [items, setItems] = useState(order.items.map(i => ({ ...i })));
  const [orderNotes, setOrderNotes] = useState(order.order_notes || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [addingItem, setAddingItem] = useState(false);
  const [products, setProducts] = useState([]);
  const [productSearch, setProductSearch] = useState('');

  useEffect(() => {
    if (addingItem && products.length === 0) {
      base44.entities.Product.filter({ is_published: true }).then(setProducts);
    }
  }, [addingItem]);

  const addProduct = (product) => {
    setItems(prev => {
      const existingIdx = prev.findIndex(it => it.product_id === product.id && !it.variation);
      if (existingIdx >= 0) {
        return prev.map((it, i) => i === existingIdx ? { ...it, quantity: it.quantity + 1 } : it);
      }
      return [...prev, {
        product_id: product.id,
        product_name: product.name,
        product_image: product.images?.[0] || '',
        quantity: 1,
        unit_price: product.promo_price || product.price,
        variation: '',
        addons: [],
        notes: '',
      }];
    });
    setAddingItem(false);
    setProductSearch('');
  };

  const filteredProducts = products.filter(p => p.name.toLowerCase().includes(productSearch.toLowerCase()));

  const changeQty = (idx, delta) => {
    setItems(prev => prev.map((it, i) => i === idx ? { ...it, quantity: Math.max(1, it.quantity + delta) } : it));
  };

  const removeItem = (idx) => {
    setItems(prev => prev.filter((_, i) => i !== idx));
  };

  const newSubtotal = items.reduce((sum, it) => sum + (it.unit_price * it.quantity), 0);
  const newTotal = newSubtotal - (order.discount || 0) + (order.delivery_fee || 0);

  const handleSave = async () => {
    if (items.length === 0) {
      setError('O pedido precisa ter ao menos um item.');
      return;
    }
    setSaving(true);
    await base44.entities.Order.update(order.id, {
      items,
      subtotal: newSubtotal,
      total: newTotal,
      order_notes: orderNotes,
      edited_by_customer: true,
    });
    setSaving(false);
    onSaved();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center" onClick={onClose}>
      <motion.div
        initial={{ y: 80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 80, opacity: 0 }}
        className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-md p-6 space-y-4 max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="font-heading font-bold text-lg">Alterar Pedido #{order.order_number}</h3>
          <button onClick={onClose}><X size={20} className="text-gray-400" /></button>
        </div>

        <div className="space-y-3">
          {items.map((item, idx) => (
            <div key={idx} className="flex items-center gap-3 bg-gray-50 rounded-xl p-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-800 truncate">{item.product_name}</p>
                {item.variation && <p className="text-xs text-gray-400">{item.variation}</p>}
                <p className="text-xs text-primary font-bold mt-0.5">R$ {(item.unit_price * item.quantity).toFixed(2)}</p>
              </div>
              <div className="flex items-center gap-1.5 bg-white rounded-lg border border-gray-200 px-1.5 py-1">
                <button type="button" onClick={() => changeQty(idx, -1)} className="w-6 h-6 flex items-center justify-center text-gray-500 hover:text-primary">
                  <Minus size={12} />
                </button>
                <span className="text-sm font-semibold w-5 text-center">{item.quantity}</span>
                <button type="button" onClick={() => changeQty(idx, 1)} className="w-6 h-6 flex items-center justify-center text-gray-500 hover:text-primary">
                  <Plus size={12} />
                </button>
              </div>
              <button type="button" onClick={() => removeItem(idx)} className="text-red-400 hover:text-red-500">
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>

        {addingItem ? (
          <div className="border border-gray-200 rounded-xl p-3 space-y-2 bg-gray-50">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input autoFocus value={productSearch} onChange={e => setProductSearch(e.target.value)}
                placeholder="Buscar produto..." className="w-full pl-8 pr-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <div className="max-h-48 overflow-y-auto space-y-1">
              {filteredProducts.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-3">Nenhum produto encontrado</p>
              ) : filteredProducts.map(p => (
                <button key={p.id} onClick={() => addProduct(p)}
                  className="w-full flex items-center gap-2 p-2 bg-white rounded-lg hover:bg-primary/5 transition-colors text-left">
                  <div className="w-9 h-9 rounded-lg bg-gray-100 overflow-hidden flex-shrink-0">
                    {p.images?.[0] && <img src={p.images[0]} alt="" className="w-full h-full object-cover" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-gray-800 truncate">{p.name}</p>
                    <p className="text-xs text-primary font-bold">R$ {(p.promo_price || p.price)?.toFixed(2)}</p>
                  </div>
                </button>
              ))}
            </div>
            <button onClick={() => { setAddingItem(false); setProductSearch(''); }} className="w-full text-xs text-gray-400 py-1">Cancelar</button>
          </div>
        ) : (
          <button onClick={() => setAddingItem(true)}
            className="w-full flex items-center justify-center gap-2 py-2.5 border-2 border-dashed border-primary/40 rounded-xl text-primary text-sm font-semibold hover:bg-primary/5 transition-colors">
            <PackagePlus size={15} /> Adicionar item
          </button>
        )}

        <div>
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Observações do pedido</label>
          <textarea rows={2} value={orderNotes} onChange={e => setOrderNotes(e.target.value)}
            className="w-full mt-1 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none" />
        </div>

        <div className="flex justify-between items-center pt-2 border-t border-gray-100 font-heading font-bold text-sm">
          <span>Novo total</span>
          <span className="text-primary">R$ {newTotal.toFixed(2)}</span>
        </div>

        {error && <p className="text-xs text-red-500">{error}</p>}

        <button onClick={handleSave} disabled={saving}
          className="w-full py-3 bg-primary text-white rounded-2xl font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50">
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
          {saving ? 'Salvando...' : 'Salvar alterações'}
        </button>
      </motion.div>
    </div>
  );
}