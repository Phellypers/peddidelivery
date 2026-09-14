import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Plus, Search, MoreVertical, Edit, Trash2, Copy, Eye, EyeOff, Star, Loader2, Pause, Play, CheckSquare, Square } from 'lucide-react';
import { AnimatePresence } from 'framer-motion';
import ProductForm from '@/components/admin/ProductForm';

export default function Catalog() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState('');
  const [editingProduct, setEditingProduct] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [menuOpen, setMenuOpen] = useState(null);
  const [selected, setSelected] = useState([]);

  const loadData = async () => {
    const [prods, cats] = await Promise.all([
      base44.entities.Product.list('-created_date'),
      base44.entities.Category.list('sort_order')
    ]);
    setProducts(prods);
    setCategories(cats);
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const filteredProducts = products.filter(p => {
    const matchSearch = !search || p.name?.toLowerCase().includes(search.toLowerCase());
    const matchCat = !filterCat || p.category_ids?.includes(filterCat);
    return matchSearch && matchCat;
  });

  const togglePublish = async (product) => {
    await base44.entities.Product.update(product.id, { is_published: !product.is_published });
    loadData();
  };

  const togglePause = async (product) => {
    await base44.entities.Product.update(product.id, { is_paused: !product.is_paused });
    setMenuOpen(null);
    loadData();
  };

  const bulkPause = async (pause) => {
    await Promise.all(selected.map(id => base44.entities.Product.update(id, { is_paused: pause })));
    setSelected([]);
    loadData();
  };

  const duplicateProduct = async (product) => {
    const { id, created_date, updated_date, created_by_id, ...data } = product;
    await base44.entities.Product.create({ ...data, name: `${data.name} (cópia)` });
    setMenuOpen(null);
    loadData();
  };

  const deleteProduct = async (product) => {
    await base44.entities.Product.delete(product.id);
    setMenuOpen(null);
    loadData();
  };

  const getCategoryName = (catId) => categories.find(c => c.id === catId)?.name || '';
  const toggleSelect = (id) => setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  const allFilteredSelected = filteredProducts.length > 0 && filteredProducts.every(p => selected.includes(p.id));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-heading font-bold text-2xl text-foreground">Catálogo</h1>
          <p className="text-sm text-muted-foreground mt-1">{products.length} itens cadastrados</p>
        </div>
        <button onClick={() => { setEditingProduct(null); setShowForm(true); }} className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-xl font-medium text-sm hover:bg-primary/90 transition-colors">
          <Plus size={18} /> Novo Item
        </button>
      </div>

      {selected.length > 0 && (
        <div className="flex items-center gap-3 bg-primary/10 rounded-xl p-3 flex-wrap">
          <span className="text-sm font-medium">{selected.length} selecionado(s)</span>
          <button onClick={() => bulkPause(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-500 text-white rounded-lg text-xs font-bold hover:bg-orange-600 transition-colors">
            <Pause size={13} /> Pausar
          </button>
          <button onClick={() => bulkPause(false)} className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500 text-white rounded-lg text-xs font-bold hover:bg-green-600 transition-colors">
            <Play size={13} /> Ativar
          </button>
          <button onClick={() => setSelected([])} className="text-xs text-muted-foreground hover:text-foreground ml-auto">Limpar seleção</button>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar itens..." className="w-full pl-10 pr-4 py-2.5 bg-muted rounded-xl text-sm border-0 focus:outline-none focus:ring-2 focus:ring-primary/20" />
        </div>
        <select value={filterCat} onChange={e => setFilterCat(e.target.value)} className="px-4 py-2.5 bg-muted rounded-xl text-sm border-0 focus:outline-none focus:ring-2 focus:ring-primary/20">
          <option value="">Todas categorias</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="animate-spin text-primary" size={32} /></div>
      ) : (
        <div className="bg-card rounded-2xl border border-border/50 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="py-3 px-3 w-10">
                    <button onClick={() => { if (allFilteredSelected) setSelected([]); else setSelected(filteredProducts.map(p => p.id)); }}>
                      {allFilteredSelected ? <CheckSquare size={16} className="text-primary" /> : <Square size={16} className="text-gray-300" />}
                    </button>
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground uppercase">Item</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground uppercase hidden md:table-cell">Categoria</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground uppercase">Preço</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground uppercase hidden lg:table-cell">Lucro/un</th>
                  <th className="text-center py-3 px-4 text-xs font-medium text-muted-foreground uppercase hidden sm:table-cell">Status</th>
                  <th className="text-right py-3 px-4 text-xs font-medium text-muted-foreground uppercase">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map(product => {
                  const sellPrice = (product.promo_price && product.promo_price < product.price ? product.promo_price : product.price) || 0;
                  const cost = product.cost || 0;
                  const profit = sellPrice - cost;
                  return (
                    <tr key={product.id} className={`border-b border-border/30 hover:bg-accent/30 transition-colors ${product.is_paused ? 'bg-orange-50/40' : ''}`}>
                      <td className="py-3 px-3">
                        <button onClick={() => toggleSelect(product.id)}>
                          {selected.includes(product.id) ? <CheckSquare size={16} className="text-primary" /> : <Square size={16} className="text-gray-300" />}
                        </button>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <img src={product.images?.[0] || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=80'} alt={product.name} className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
                          <div className="min-w-0">
                            <button onClick={() => { setEditingProduct(product); setShowForm(true); setMenuOpen(null); }} className="font-medium text-foreground truncate flex items-center gap-1 text-left hover:text-primary transition-colors">
                              {product.name}
                              {product.is_featured && <Star size={12} className="fill-amber-400 text-amber-400 flex-shrink-0" />}
                              {product.is_paused && <span className="text-[9px] font-bold text-white bg-orange-500 rounded-full px-1.5 py-0.5 flex-shrink-0">PAUSADO</span>}
                            </button>
                            <p className="text-xs text-muted-foreground truncate max-w-[200px]">{product.description?.slice(0, 50)}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 hidden md:table-cell text-muted-foreground">
                        {product.category_ids?.map(id => getCategoryName(id)).filter(Boolean).join(', ') || '—'}
                      </td>
                      <td className="py-3 px-4">
                        {product.promo_price && product.promo_price < product.price ? (
                          <div>
                            <span className="text-xs text-muted-foreground line-through">R$ {product.price?.toFixed(2)}</span><br />
                            <span className="font-medium text-primary">R$ {product.promo_price?.toFixed(2)}</span>
                          </div>
                        ) : (
                          <span className="font-medium">R$ {product.price?.toFixed(2)}</span>
                        )}
                      </td>
                      <td className="py-3 px-4 hidden lg:table-cell">
                        {cost > 0 ? (
                          <span className={`text-xs font-semibold ${profit >= 0 ? 'text-green-600' : 'text-red-500'}`}>R$ {profit.toFixed(2)}</span>
                        ) : (
                          <span className="text-xs text-gray-300">—</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center hidden sm:table-cell">
                        <button onClick={() => togglePublish(product)}>
                          {product.is_published ? (
                            <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-green-50 text-green-700">Ativo</span>
                          ) : (
                            <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-muted text-muted-foreground">Inativo</span>
                          )}
                        </button>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="relative inline-block">
                          <button onClick={() => setMenuOpen(menuOpen === product.id ? null : product.id)} className="p-2 hover:bg-accent rounded-lg transition-colors">
                            <MoreVertical size={16} />
                          </button>
                          {menuOpen === product.id && (
                            <div className="absolute right-0 top-full mt-1 w-40 bg-card rounded-xl shadow-lg border border-border py-1 z-10">
                              <button onClick={() => { setEditingProduct(product); setShowForm(true); setMenuOpen(null); }} className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-accent transition-colors">
                                <Edit size={14} /> Editar
                              </button>
                              <button onClick={() => duplicateProduct(product)} className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-accent transition-colors">
                                <Copy size={14} /> Duplicar
                              </button>
                              <button onClick={() => togglePause(product)} className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-accent transition-colors">
                                {product.is_paused ? <><Play size={14} /> Reativar</> : <><Pause size={14} /> Pausar</>}
                              </button>
                              <button onClick={() => togglePublish(product)} className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-accent transition-colors">
                                {product.is_published ? <><EyeOff size={14} /> Despublicar</> : <><Eye size={14} /> Publicar</>}
                              </button>
                              <button onClick={() => deleteProduct(product)} className="flex items-center gap-2 w-full px-3 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors">
                                <Trash2 size={14} /> Excluir
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {filteredProducts.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">Nenhum item encontrado</div>
          )}
        </div>
      )}

      <AnimatePresence>
        {showForm && (
          <ProductForm
            product={editingProduct}
            categories={categories}
            onClose={() => { setShowForm(false); setEditingProduct(null); }}
            onSave={() => { setShowForm(false); setEditingProduct(null); loadData(); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}