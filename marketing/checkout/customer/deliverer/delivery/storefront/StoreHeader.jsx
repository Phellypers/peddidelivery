import React, { useState } from 'react';
import { Search, ShoppingBag, Heart, X } from 'lucide-react';
import { useCart } from '@/lib/CartContext';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

export default function StoreHeader({ store, categories, onSearch, onCategoryFilter }) {
  const { totalItems, setIsOpen } = useCart();
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = (e) => {
    e.preventDefault();
    onSearch?.(searchQuery);
    setSearchOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-gray-100" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
      <div className="max-w-xl mx-auto px-4">
        <div className="flex items-center justify-between h-14">
          {/* Logo / Store name - Instagram style centered */}
          <Link to="/loja" className="flex-1 flex justify-start items-center gap-2">
            {store?.logo_url ? (
              <img src={store.logo_url} alt={store?.name} className="w-8 h-8 rounded-full object-cover" />
            ) : (
              <span className="font-display font-black text-xl tracking-tight text-gray-900" style={{fontStyle: 'italic'}}>
                {store?.name || 'Vitrine'}
              </span>
            )}
          </Link>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setSearchOpen(!searchOpen)}
              className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
            >
              {searchOpen ? <X size={22} className="text-gray-800" /> : <Search size={22} className="text-gray-800" />}
            </button>
            <Link to="/favoritos" className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors">
              <Heart size={22} className="text-gray-800" />
            </Link>
            <button
              onClick={() => setIsOpen(true)}
              className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors relative"
            >
              <ShoppingBag size={22} className="text-gray-800" />
              {totalItems > 0 && (
                <span className="absolute top-1 right-1 bg-red-500 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold leading-none">
                  {totalItems}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {searchOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-t border-gray-100"
          >
            <form onSubmit={handleSearch} className="max-w-xl mx-auto px-4 py-2.5">
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  autoFocus
                  value={searchQuery}
                  onChange={e => { setSearchQuery(e.target.value); onSearch?.(e.target.value); }}
                  placeholder="Buscar..."
                  className="w-full pl-9 pr-4 py-2 bg-gray-100 rounded-xl text-sm border-0 focus:outline-none focus:ring-2 focus:ring-gray-200"
                />
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}