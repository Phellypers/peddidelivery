import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { getCategoryCover } from '@/lib/categoryCovers';
import { X, Star, Tag, Flame, Settings, UserRound, Heart, House, ChefHat, ChevronRight, Package } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';

const quickSections = [
  { id: '__most_ordered__', label: 'Mais Pedidos', icon: Flame },
  { id: '__promotions__', label: 'Promoções do Dia', icon: Tag },
  { id: '__featured__', label: 'Destaques', icon: Star },
];
const rowClass = active => `relative flex min-h-14 w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left text-sm font-semibold transition-colors ${active ? 'bg-green-50 text-green-700 before:absolute before:inset-y-3 before:left-0 before:w-1 before:rounded-full before:bg-green-500' : 'bg-gray-50 text-gray-800 hover:bg-gray-100'}`;

export default function MenuDrawer({ open, onClose, categories, activeCategory, onSelectCategory, isAdmin, store }) {
  const drawer = useRef(null);
  useEffect(() => {
    if (!open) return;
    const previousFocus = document.activeElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    drawer.current?.querySelector('button')?.focus();
    const handleKey = event => {
      if (event.key === 'Escape') onClose();
      if (event.key !== 'Tab') return;
      const controls = [...drawer.current.querySelectorAll('button, a[href]')];
      const first = controls[0], last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener('keydown', handleKey);
    return () => { document.body.style.overflow = overflow; document.removeEventListener('keydown', handleKey); previousFocus?.focus?.(); };
  }, [open, onClose]);
  const select = id => { onSelectCategory(id); onClose(); };
  const visibleCategories = categories.filter(category => category.is_active !== false)
    .sort((a,b) => Number(Boolean(b.is_featured)) - Number(Boolean(a.is_featured)) || Number(a.sort_order || 0) - Number(b.sort_order || 0));
  const sectionTitle = 'mb-3 text-[11px] font-bold uppercase tracking-[0.14em] text-gray-500';
  const footerClass = 'flex min-h-12 items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50';
  return createPortal(
    <AnimatePresence>
      {open && <>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} aria-hidden="true" className="fixed inset-0 z-[110] bg-black/40" />
        <motion.aside ref={drawer} role="dialog" aria-modal="true" aria-label="Menu do cardápio" initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }} transition={{ duration: 0.25, ease: 'easeOut' }}
          className="fixed inset-y-0 left-0 z-[111] flex w-[86vw] max-w-[360px] flex-col overflow-hidden rounded-r-3xl bg-white text-gray-900 shadow-xl"
          style={{ colorScheme: 'light', paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}>
          <header className="flex shrink-0 items-center gap-3 border-b border-gray-100 px-5 py-5">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-green-600 text-white">
              {store?.logo_url ? <img src={store.logo_url} alt="" className="h-full w-full object-cover" /> : <ChefHat size={30} />}
            </div>
            <div className="min-w-0 flex-1"><h2 className="break-words font-heading text-base font-bold leading-tight">{store?.name || 'Meu Restaurante'}</h2><p className="mt-1 text-xs text-gray-500">Cardápio digital</p></div>
            <button type="button" onClick={onClose} aria-label="Fechar menu" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200"><X size={20} /></button>
          </header>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5">
            <section><h3 className={sectionTitle}>Seções rápidas</h3><div className="space-y-2">{quickSections.map(({ id, label, icon: Icon }) => <button type="button" key={id} onClick={() => select(id)} aria-pressed={activeCategory === id} className={rowClass(activeCategory === id)}><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-100 text-green-600"><Icon size={22} /></span><span className="min-w-0 flex-1 break-words">{label}</span><ChevronRight size={18} className="shrink-0" /></button>)}</div></section>
            <section className="mt-5 border-t border-gray-100 pt-5"><h3 className={sectionTitle}>Categorias</h3><div className="space-y-2">
              <button type="button" onClick={() => select(null)} aria-pressed={activeCategory === null} className={rowClass(activeCategory === null)}><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-green-600"><House size={23} /></span><span className="min-w-0 flex-1">Todos os produtos</span><ChevronRight size={18} className="shrink-0" /></button>
              {visibleCategories.map(category => { const cover = getCategoryCover(category); return <button type="button" key={category.id} onClick={() => select(category.id)} aria-pressed={activeCategory === category.id} className={rowClass(activeCategory === category.id)}><span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white text-green-600">{cover ? <img src={cover} alt="" className="h-full w-full object-cover" /> : <Package size={22} />}</span><span className="min-w-0 flex-1 break-words">{category.name}</span><ChevronRight size={18} className="shrink-0" /></button>; })}
            </div></section>
            <footer className="mt-5 space-y-1 border-t border-gray-100 pt-4">
              <Link to="/favoritos" onClick={onClose} className={footerClass}><Heart size={22} /><span className="flex-1">Favoritos</span><ChevronRight size={18} /></Link>
              {isAdmin && <Link to="/admin" onClick={onClose} className={footerClass}><Settings size={22} className="text-green-600" /><span className="flex-1">Painel do Gestor</span><ChevronRight size={18} /></Link>}
              <Link to="/perfil" onClick={onClose} className={footerClass}><UserRound size={22} /><span className="flex-1">Minha Conta</span><ChevronRight size={18} /></Link>
            </footer>
          </div>
        </motion.aside>
      </>}
    </AnimatePresence>, document.body,
  );
}
