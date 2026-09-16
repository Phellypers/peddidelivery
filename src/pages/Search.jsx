import React, { useState, useEffect, useMemo } from 'react';
import { ArrowLeft, Search as SearchIcon, SlidersHorizontal, X, Loader2 } from 'lucide-react';
import { createPortal } from 'react-dom';
import ProductCard from '@/components/storefront/ProductCard';
import CartDrawer from '@/components/storefront/CartDrawer';
import BottomNav from '@/components/storefront/BottomNav';
import { useSafeBack } from '@/components/navigation/SafeBackButton';
import { loadPublicCatalog } from '@/services/api/peddiApi';
import { defaultSearchFilters, filterSearchProducts } from '@/lib/searchFilters';
const sorts = [['most_ordered','Mais pedidos'],['price_low','Menor preço'],['price_high','Maior preço'],['new','Novidades'],['recent','Mais recentes']];
export default function Search() {
  const back = useSafeBack('/loja');
  const [query,setQuery] = useState('');
  const [all,setAll] = useState([]);
  const [categories,setCategories] = useState([]);
  const [category,setCategory] = useState('');
  const [filters,setFilters] = useState(defaultSearchFilters);
  const [draft,setDraft] = useState(defaultSearchFilters);
  const [open,setOpen] = useState(false);
  const [loading,setLoading] = useState(true);
  useEffect(() => { loadPublicCatalog().then(data => { setAll(data.products); setCategories(data.categories); }).finally(() => setLoading(false)); },[]);
  useEffect(() => {
    if (!open) return undefined;
    const prior = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const close = e => { if(e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown',close);
    return () => { document.body.style.overflow = prior; window.removeEventListener('keydown',close); };
  },[open]);
  const products = useMemo(() => filterSearchProducts(all,query,category,filters),[all,query,category,filters]);
  const preview = useMemo(() => filterSearchProducts(all,query,category,draft),[all,query,category,draft]);
  const invalid = draft.min !== '' && draft.max !== '' && Number(draft.min)>Number(draft.max);
  const count = Number(filters.sort !== 'most_ordered')+Number(filters.min !== '')+Number(filters.max !== '')+Number(filters.promotions)+Number(filters.available);
  const set = (key,value) => setDraft(p => ({...p,[key]:value}));
  return <div className="min-h-screen bg-background pb-24 text-foreground">
    <CartDrawer />
    <header className="sticky top-0 z-30 border-b border-border bg-white/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3">
        <button type="button" aria-label="Voltar ao cardápio" onClick={back} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full hover:bg-accent"><ArrowLeft size={22}/></button>
        <div className="relative min-w-0 flex-1"><SearchIcon size={19} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"/><input type="search" aria-label="Buscar produtos" value={query} onChange={e => setQuery(e.target.value)} placeholder="Buscar pratos, bebidas..." className="h-12 w-full rounded-2xl border border-green-200 bg-white pl-10 pr-3 text-sm outline-none focus:ring-2 focus:ring-green-200"/></div>
      </div>
      <div className="mx-auto flex max-w-5xl gap-2 px-4 pb-3">
        <div className="flex min-w-0 flex-1 gap-2 overflow-x-auto scrollbar-hide">{[{id:'',name:'Todos'},...categories].map(c => <button key={c.id} type="button" onClick={() => setCategory(c.id)} aria-pressed={category === c.id} className={`min-h-11 shrink-0 rounded-xl border px-4 text-sm font-medium ${category === c.id ? 'border-green-100 bg-green-100 text-green-800' : 'border-gray-200 bg-white text-gray-600'}`}>{c.name}</button>)}</div>
        <button type="button" onClick={() => {setDraft(filters);setOpen(true);}} className="flex min-h-11 shrink-0 items-center gap-2 rounded-xl border border-gray-400 bg-white px-3 text-sm font-semibold"><SlidersHorizontal size={18}/>Filtros {count>0 && <span className="rounded-full bg-green-100 px-1.5 text-xs">{count}</span>}</button>
      </div>
    </header>
    <main className="mx-auto mt-5 max-w-5xl px-4">{loading ? <Loader2 className="mx-auto my-12 animate-spin text-green-600"/> : <><p className="mb-4 text-sm text-gray-500">{products.length} produtos encontrados</p>{products.length ? <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">{products.map(p => <ProductCard key={p.id} product={p}/>)}</div> : <p className="py-12 text-center text-gray-500">Nenhum produto encontrado. Tente limpar os filtros.</p>}</>}</main>
    <BottomNav/>
    {open && createPortal(<div className="fixed inset-0 z-[250]" role="dialog" aria-modal="true" aria-labelledby="filter-title">
      <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)}/>
      <section className="absolute inset-x-0 bottom-0 mx-auto flex max-h-[85dvh] max-w-xl flex-col overflow-hidden rounded-t-[28px] border border-gray-100 bg-white text-[#111111] shadow-xl animate-in slide-in-from-bottom duration-300">
        <header className="shrink-0 px-5 pb-4 pt-3"><div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-gray-200"/><div className="flex items-center justify-between"><h2 id="filter-title" className="font-heading text-xl font-bold">Filtrar e ordenar</h2><button type="button" aria-label="Fechar filtros" onClick={() => setOpen(false)} className="flex h-11 w-11 items-center justify-center rounded-xl hover:bg-gray-100"><X size={20}/></button></div></header>
        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain px-5 pb-5">
          <fieldset><legend className="mb-2 text-sm font-bold">Ordenar por</legend>{sorts.map(([value,label]) => <label key={value} className="flex min-h-11 items-center gap-3 text-sm"><input type="radio" name="search-sort" checked={draft.sort === value} onChange={() => set('sort',value)} className="h-5 w-5 accent-green-500"/>{label}</label>)}</fieldset>
          <fieldset className="border-t border-gray-200 pt-4"><legend className="text-sm font-bold">Faixa de preço</legend><div className="mt-3 grid grid-cols-2 gap-3">{[['min','Mínimo'],['max','Máximo']].map(([key,label]) => <label key={key} className="flex min-w-0 items-center gap-2 rounded-xl border border-gray-200 px-3"><span className="text-sm text-gray-500">R$</span><input aria-label={`Preço ${label.toLowerCase()}`} type="number" min="0" step="0.01" inputMode="decimal" value={draft[key]} onChange={e => set(key,e.target.value)} placeholder={label} className="h-12 w-full min-w-0 bg-white text-sm outline-none"/></label>)}</div>{invalid && <p role="alert" className="mt-2 text-xs text-red-600">O mínimo não pode ser maior que o máximo.</p>}</fieldset>
          <div className="border-t border-gray-200 pt-3">{[['promotions','Em promoção'],['available','Disponíveis agora']].map(([key,label]) => <label key={key} className="flex min-h-12 items-center gap-3 text-sm"><input type="checkbox" checked={draft[key]} onChange={e => set(key,e.target.checked)} className="h-5 w-5 accent-green-500"/>{label}</label>)}</div>
        </div>
        <footer className="flex shrink-0 gap-3 border-t border-gray-100 px-5 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))]"><button type="button" onClick={() => setDraft({...defaultSearchFilters})} className="min-h-12 flex-1 text-sm font-bold text-green-700">Limpar filtros</button><button type="button" disabled={invalid} onClick={() => {setFilters(draft);setOpen(false);}} className="min-h-12 flex-[1.6] rounded-2xl bg-[#22C55E] px-3 text-sm font-bold text-[#111111] disabled:opacity-50">Mostrar {preview.length} produtos</button></footer>
      </section>
    </div>,document.body)}
  </div>;
}
