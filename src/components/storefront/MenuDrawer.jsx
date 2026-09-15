import React from 'react';
import { getCategoryCover } from '@/lib/categoryCovers';
import { X, Star, Tag, Flame, Settings, LogIn, Heart } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';

export default function MenuDrawer({ open, onClose, categories, activeCategory, onSelectCategory, isAdmin }) {
  const quickSections = [
    { id: '__most_ordered__', label: 'Mais Pedidos', icon: Flame, color: 'text-orange-500' },
    { id: '__promotions__', label: 'Promoções do Dia', icon: Tag, color: 'text-green-600' },
    { id: '__featured__', label: 'Destaques', icon: Star, color: 'text-yellow-500' },
  ];

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 z-40"
          />
          <motion.aside
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 220 }}
            className="fixed top-0 left-0 bottom-0 w-72 bg-white z-50 flex flex-col shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h2 className="font-heading font-bold text-gray-900">Cardápio</h2>
              <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                <X size={18} className="text-gray-500" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              {/* Quick Sections */}
              <div className="px-3 pt-3 pb-1">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-2 mb-1">Seções rápidas</p>
                {quickSections.map(s => {
                  const Icon = s.icon;
                  const isActive = activeCategory === s.id;
                  return (
                    <button
                      key={s.id}
                      onClick={() => { onSelectCategory(s.id); onClose(); }}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors mb-0.5 ${
                        isActive ? 'bg-primary/10 text-primary' : 'hover:bg-gray-50 text-gray-700'
                      }`}
                    >
                      <Icon size={18} className={isActive ? 'text-primary' : s.color} />
                      {s.label}
                    </button>
                  );
                })}
              </div>

              <div className="mx-3 my-2 border-t border-gray-100" />

              {/* Categories */}
              <div className="px-3 pb-3">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-2 mb-1">Categorias</p>
                <button
                  onClick={() => { onSelectCategory(null); onClose(); }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors mb-0.5 ${
                    !activeCategory || !activeCategory.startsWith('__') ? '' : ''
                  } ${activeCategory === null ? 'bg-primary/10 text-primary' : 'hover:bg-gray-50 text-gray-700'}`}
                >
                  <span className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center text-sm">🏠</span>
                  Todos os produtos
                </button>
                {categories.filter(c => c.is_active).map(cat => {
                  const isActive = activeCategory === cat.id;
                  return (
                    <button
                      key={cat.id}
                      onClick={() => { onSelectCategory(cat.id); onClose(); }}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors mb-0.5 ${
                        isActive ? 'bg-primary/10 text-primary' : 'hover:bg-gray-50 text-gray-700'
                      }`}
                    >
                      <span className="w-7 h-7 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                        {getCategoryCover(cat)
                          ? <img src={getCategoryCover(cat)} alt={cat.name} className="w-full h-full object-cover" />
                          : <span className="w-full h-full flex items-center justify-center text-sm">📦</span>
                        }
                      </span>
                      {cat.name}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-gray-100 p-3 space-y-1">
              <Link to="/favoritos" onClick={onClose} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"><Heart size={18} />Favoritos</Link>
              {isAdmin && (
                <Link
                  to="/admin"
                  onClick={onClose}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-orange-600 hover:bg-orange-50 transition-colors"
                >
                  <Settings size={18} />
                  Painel do Gestor
                </Link>
              )}
              <Link
                to="/perfil"
                onClick={onClose}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
              >
                <LogIn size={18} />
                Minha Conta
              </Link>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
