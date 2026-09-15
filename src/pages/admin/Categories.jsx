import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Plus, Edit, Trash2, Loader2, X, ImageIcon, Eye, EyeOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getCategoryCover, getTemporaryCategoryCover } from '@/lib/categoryCovers';

export default function Categories() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);

  const load = async () => {
    try {
      const cats = await base44.entities.Category.list('sort_order');
      setCategories(cats);
    } catch (error) { console.error(error); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const toggleActive = async (cat) => {
    await base44.entities.Category.update(cat.id, { is_active: !cat.is_active });
    load();
  };

  const toggleFeatured = async (cat) => {
    await base44.entities.Category.update(cat.id, { is_featured: !cat.is_featured });
    load();
  };

  const deleteCategory = async (id) => {
    if (!confirm('Excluir esta categoria?')) return;
    await base44.entities.Category.delete(id);
    load();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading font-bold text-2xl text-foreground">Categorias</h1>
          <p className="text-sm text-muted-foreground mt-1">{categories.length} categorias cadastradas</p>
        </div>
        <button
          onClick={() => { setEditing(null); setShowForm(true); }}
          className="flex items-center gap-2 bg-primary text-white px-4 py-2.5 rounded-xl font-medium text-sm hover:bg-primary/90 transition-colors"
        >
          <Plus size={18} /> Nova Categoria
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="animate-spin text-primary" size={32} /></div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.map(cat => (
            <div key={cat.id} className="bg-card rounded-2xl border border-border/50 overflow-hidden group">
              <div className="relative h-32 bg-gradient-to-br from-orange-100 to-orange-50">
                {getCategoryCover(cat) ? (
                  <img src={getCategoryCover(cat)} alt={cat.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-4xl">
                    <ImageIcon size={40} className="text-gray-300" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                <div className="absolute bottom-2 left-3">
                  <h3 className="font-heading font-bold text-white text-sm">{cat.name}</h3>
                </div>
                <div className="absolute top-2 right-2 flex gap-1.5">
                  {getTemporaryCategoryCover(cat) && (
                    <span className="bg-white/90 text-gray-700 text-[10px] font-bold px-2 py-0.5 rounded-full">Capa temporária</span>
                  )}
                  {cat.is_featured && (
                    <span className="bg-yellow-400 text-yellow-900 text-[10px] font-bold px-2 py-0.5 rounded-full">Destaque</span>
                  )}
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${cat.is_active ? 'bg-green-400 text-green-900' : 'bg-gray-300 text-gray-600'}`}>
                    {cat.is_active ? 'Ativa' : 'Inativa'}
                  </span>
                </div>
              </div>
              <div className="p-3">
                {cat.description && (
                  <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{cat.description}</p>
                )}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => { setEditing(cat); setShowForm(true); }}
                    className="flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-muted rounded-lg text-xs font-medium hover:bg-accent transition-colors"
                  >
                    <Edit size={13} /> Editar
                  </button>
                  <button
                    onClick={() => toggleFeatured(cat)}
                    title={cat.is_featured ? 'Remover destaque' : 'Destacar'}
                    className={`p-1.5 rounded-lg text-xs transition-colors ${cat.is_featured ? 'bg-yellow-100 text-yellow-600' : 'bg-muted text-muted-foreground hover:bg-accent'}`}
                  >
                    ★
                  </button>
                  <button
                    onClick={() => toggleActive(cat)}
                    className={`p-1.5 rounded-lg transition-colors ${cat.is_active ? 'bg-green-100 text-green-600' : 'bg-muted text-muted-foreground hover:bg-accent'}`}
                  >
                    {cat.is_active ? <Eye size={13} /> : <EyeOff size={13} />}
                  </button>
                  <button
                    onClick={() => deleteCategory(cat.id)}
                    className="p-1.5 rounded-lg bg-muted text-muted-foreground hover:bg-red-50 hover:text-red-500 transition-colors"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            </div>
          ))}

          {categories.length === 0 && (
            <div className="col-span-full text-center py-16 text-muted-foreground">
              <ImageIcon size={40} className="mx-auto mb-3 opacity-30" />
              <p>Nenhuma categoria cadastrada</p>
            </div>
          )}
        </div>
      )}

      <AnimatePresence>
        {showForm && (
          <CategoryForm
            category={editing}
            onClose={() => { setShowForm(false); setEditing(null); }}
            onSave={() => { setShowForm(false); setEditing(null); load(); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function CategoryForm({ category, onClose, onSave }) {
  const [form, setForm] = useState({
    name: category?.name || '',
    description: category?.description || '',
    image_url: category?.image_url || '',
    badge_label: category?.badge_label || '',
    badge_color: category?.badge_color || 'orange',
    sort_order: category?.sort_order ?? 0,
    is_active: category?.is_active ?? true,
    is_featured: category?.is_featured ?? false,
  });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const temporaryCover = getTemporaryCategoryCover({ ...category, ...form });

  const set = (f, v) => setForm(p => ({ ...p, [f]: v }));

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      set('image_url', file_url);
    } catch (error) { console.error(error); }
    finally { setUploading(false); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
    const data = { ...form, sort_order: parseInt(form.sort_order) || 0, badge_label: form.badge_label || null };
    if (category) {
      await base44.entities.Category.update(category.id, data);
    } else {
      await base44.entities.Category.create(data);
    }
    onSave();
    } catch (error) { console.error(error); }
    finally { setSaving(false); }
  };

  const inp = "w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30";
  const lbl = "block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide";

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      data-peddi-modal="" className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
    >
      <motion.div
        initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20, opacity: 0 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90dvh] overflow-y-auto"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="font-heading font-bold text-lg">{category ? 'Editar Categoria' : 'Nova Categoria'}</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full"><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className={lbl}>Imagem da Categoria</label>
            <div className="relative h-36 bg-gray-100 rounded-xl overflow-hidden mb-2">
              {form.image_url || temporaryCover ? (
                <img src={form.image_url || temporaryCover} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-300">
                  <ImageIcon size={40} />
                </div>
              )}
            </div>
            {temporaryCover && <p className="mb-2 text-xs text-amber-700">Capa temporária de demonstração. Envie uma imagem para substituí-la.</p>}
            <label className="flex items-center justify-center gap-2 w-full py-2.5 border-2 border-dashed border-gray-200 rounded-xl text-sm text-gray-500 cursor-pointer hover:border-primary/50 hover:text-primary transition-colors">
              {uploading ? <Loader2 size={16} className="animate-spin" /> : <><ImageIcon size={16} /> Fazer upload da imagem</>}
              <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={uploading} />
            </label>
            <p className="text-xs text-gray-400 mt-1">Ou cole uma URL abaixo</p>
            <input value={form.image_url} onChange={e => set('image_url', e.target.value)} placeholder="https://..." className={inp + ' mt-1'} />
          </div>

          <div>
            <label className={lbl}>Nome *</label>
            <input value={form.name} onChange={e => set('name', e.target.value)} required className={inp} placeholder="Ex: Pizzas, Hambúrgueres..." />
          </div>
          <div>
            <label className={lbl}>Descrição</label>
            <textarea value={form.description} onChange={e => set('description', e.target.value)} rows={2} className={inp + ' resize-none'} placeholder="Descrição breve da categoria" />
          </div>
          <div>
            <label className={lbl}>Ordem de exibição</label>
            <input type="number" value={form.sort_order} onChange={e => set('sort_order', e.target.value)} className={inp} placeholder="0" />
          </div>
          <div>
            <label className={lbl}>Etiqueta flutuante (opcional)</label>
            <div className="grid grid-cols-2 gap-2">
              <input
                value={form.badge_label}
                onChange={e => set('badge_label', e.target.value)}
                placeholder="Ex: Novidade, Temporada"
                className={inp}
              />
              <select value={form.badge_color} onChange={e => set('badge_color', e.target.value)} className={inp}>
                <option value="orange">Laranja</option>
                <option value="red">Vermelho</option>
                <option value="green">Verde</option>
                <option value="blue">Azul</option>
                <option value="purple">Roxo</option>
                <option value="pink">Rosa</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={form.is_active} onChange={e => set('is_active', e.target.checked)} className="w-4 h-4 rounded accent-primary" />
              Ativa
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={form.is_featured} onChange={e => set('is_featured', e.target.checked)} className="w-4 h-4 rounded accent-primary" />
              Destacar no topo
            </label>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors">Cancelar</button>
            <button type="submit" disabled={saving} className="flex-1 py-2.5 rounded-xl text-sm font-bold bg-primary text-white hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
              {saving && <Loader2 size={15} className="animate-spin" />}
              {saving ? 'Salvando...' : category ? 'Salvar' : 'Criar'}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}
