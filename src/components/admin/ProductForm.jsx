import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { productService, ingredientService } from '@/services/api/catalog';
import { calculateRecipeItemCost, calculateRecipeCost, UNITS, UNIT_LABELS } from '@/lib/recipeCost';
import { X, Plus, Trash2, Loader2, ImageIcon } from 'lucide-react';
import { motion } from 'framer-motion';

const TABS = [
  { id: 'basic', label: 'Informações' },
  { id: 'pricing', label: 'Preços' },
  { id: 'images', label: 'Fotos' },
  { id: 'variations', label: 'Variações' },
  { id: 'addons', label: 'Complementos' },
  { id: 'availability', label: 'Disponibilidade' },
  { id: 'custom_fields', label: 'Campos extras' },
  { id: 'recipe', label: 'Ficha Técnica' },
  { id: 'stock', label: 'Estoque' },
];

const WEEK_DAYS = [
  { id: 'seg', label: 'Seg' },
  { id: 'ter', label: 'Ter' },
  { id: 'qua', label: 'Qua' },
  { id: 'qui', label: 'Qui' },
  { id: 'sex', label: 'Sex' },
  { id: 'sab', label: 'Sáb' },
  { id: 'dom', label: 'Dom' },
];

const emptyCustomField = () => ({ label: '', type: 'text', options: [], required: false });

const emptyVariation = () => ({ name: '', options: [{ label: '', price_modifier: 0 }] });
const emptyAddon = () => ({ name: '', price: 0, max_qty: 1 });

export default function ProductForm({ product, categories, onClose, onSave }) {
  const [tab, setTab] = useState('basic');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [ingredientError, setIngredientError] = useState('');
  const [sessionExpired, setSessionExpired] = useState(false);
  const [uploadingImg, setUploadingImg] = useState(false);
  const activeTabIndex = TABS.findIndex(item => item.id === tab);

  useEffect(() => {
    const priorOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const handleKeyDown = event => { if (event.key === 'Escape' && !saving && !uploadingImg) onClose(); };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = priorOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose, saving, uploadingImg]);

  const [form, setForm] = useState(() => {
    const draft = sessionStorage.getItem('peddi_product_draft');
    if (draft) {
      try {
        const saved = JSON.parse(draft);
        if ((saved.product?.id ?? null) === (product?.id ?? null)) return saved.form;
      } catch { sessionStorage.removeItem('peddi_product_draft'); }
    }
    return {
    name: product?.name || '',
    description: product?.description || '',
    category_ids: product?.category_ids || [],
    tags: product?.tags || [],
    is_featured: product?.is_featured || false,
    is_published: product?.is_published ?? true,
    is_paused: product?.is_paused || false,
    badge_label: product?.badge_label || '',
    badge_color: product?.badge_color || 'red',
    // Pricing
    price: product?.price || '',
    cost: product?.cost || '',
    promo_price: product?.promo_price || '',
    price_on_request: product?.price_on_request || false,
    // Images
    images: product?.images || [],
    // Variations
    variations: product?.variations || [],
    // Addons
    addons: product?.addons || [],
    // Stock / extras
    stock: product?.stock ?? 999,
    sku: product?.sku || '',
    prep_time_min: product?.prep_time_min || '',
    allergens: product?.allergens || [],
    nutritional_info: product?.nutritional_info || '',
    // Availability
    available_days: product?.available_days || [],
    availability_start: product?.availability_start || '',
    availability_end: product?.availability_end || '',
    availability_by_day: product?.availability_by_day || Object.fromEntries(WEEK_DAYS.map(day => [day.id, {
      enabled: !product?.available_days?.length || product.available_days.includes(day.id),
      start: product?.availability_start || '', end: product?.availability_end || '',
    }])),
    // Custom fields
    custom_fields: product?.custom_fields || [],
    // Recipe (ficha técnica)
    recipe: product?.recipe || [],
    };
  });

  const set = (field, value) => setForm(p => ({ ...p, [field]: value }));
  const availabilityByDay = form.availability_by_day || Object.fromEntries(WEEK_DAYS.map(day => [day.id, {
    enabled: !form.available_days?.length || form.available_days.includes(day.id),
    start: form.availability_start || '', end: form.availability_end || '',
  }]));

  // ─── Image Upload ───────────────────────────────────────
  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');
    setUploadingImg(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      set('images', [...form.images, file_url]);
    } catch (err) {
      setError(err.message || 'Não foi possível enviar a foto. O upload ainda depende da Base44.');
    } finally {
      setUploadingImg(false);
    }
  };
  const removeImage = (idx) => set('images', form.images.filter((_, i) => i !== idx));

  // ─── Tags ────────────────────────────────────────────────
  const [ingredients, setIngredients] = useState([]);
  useEffect(() => { ingredientService.list('name').then(setIngredients).catch(err => setIngredientError(err.message || 'Não foi possível carregar os insumos.')); }, []);

  // ─── Recipe (Ficha Técnica) ─────────────────────────────
  const addRecipeItem = () => set('recipe', [...form.recipe, { ingredient_id: '', quantity: 1, unit: 'unidade' }]);
  const removeRecipeItem = (ri) => set('recipe', form.recipe.filter((_, i) => i !== ri));
  const updateRecipeItem = (ri, field, value) => {
    const newRecipe = form.recipe.map((item, i) => i === ri ? { ...item, [field]: value } : item);
    if (field === 'ingredient_id') {
      const ing = ingredients.find(i => i.id === value);
      if (ing) { newRecipe[ri].unit = ing.unit; newRecipe[ri].ingredient_name = ing.name; }
    }
    set('recipe', newRecipe);
  };

  const [tagInput, setTagInput] = useState('');
  const addTag = () => {
    const t = tagInput.trim();
    if (t && !form.tags.includes(t)) set('tags', [...form.tags, t]);
    setTagInput('');
  };

  // ─── Allergens ───────────────────────────────────────────
  const [allergenInput, setAllergenInput] = useState('');
  const addAllergen = () => {
    const t = allergenInput.trim();
    if (t && !form.allergens.includes(t)) set('allergens', [...form.allergens, t]);
    setAllergenInput('');
  };

  // ─── Variations ──────────────────────────────────────────
  const addVariation = () => set('variations', [...form.variations, emptyVariation()]);
  const removeVariation = (vi) => set('variations', form.variations.filter((_, i) => i !== vi));
  const setVariation = (vi, field, value) => {
    const v = form.variations.map((item, i) => i === vi ? { ...item, [field]: value } : item);
    set('variations', v);
  };
  const addVarOption = (vi) => {
    const v = form.variations.map((item, i) => i === vi
      ? { ...item, options: [...item.options, { label: '', price_modifier: 0 }] }
      : item);
    set('variations', v);
  };
  const setVarOption = (vi, oi, field, value) => {
    const v = form.variations.map((item, i) => i === vi
      ? { ...item, options: item.options.map((o, j) => j === oi ? { ...o, [field]: value } : o) }
      : item);
    set('variations', v);
  };
  const removeVarOption = (vi, oi) => {
    const v = form.variations.map((item, i) => i === vi
      ? { ...item, options: item.options.filter((_, j) => j !== oi) }
      : item);
    set('variations', v);
  };

  // ─── Addons ──────────────────────────────────────────────
  const addAddon = () => set('addons', [...form.addons, emptyAddon()]);
  const removeAddon = (i) => set('addons', form.addons.filter((_, j) => j !== i));
  const setAddon = (i, field, value) => {
    const a = form.addons.map((item, j) => j === i ? { ...item, [field]: value } : item);
    set('addons', a);
  };

  // ─── Categories ──────────────────────────────────────────
  const toggleCategory = (catId) => {
    set('category_ids', form.category_ids.includes(catId)
      ? form.category_ids.filter(id => id !== catId)
      : [...form.category_ids, catId]);
  };

  // ─── Save ────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (saving || uploadingImg) return;
    setError('');
    setSessionExpired(false);
    setSaving(true);
    try {
    const recipeCostValue = calculateRecipeCost(form.recipe, ingredients);
    const data = {
      ...form,
      price: parseFloat(form.price) || 0,
      cost: form.recipe.length > 0 ? recipeCostValue : (parseFloat(form.cost) || 0),
      promo_price: form.promo_price ? parseFloat(form.promo_price) : null,
      prep_time_min: form.prep_time_min ? parseInt(form.prep_time_min) : null,
      stock: form.stock === '' ? 999 : Number(form.stock),
      available_days: form.available_days,
      availability_start: form.availability_start,
      availability_end: form.availability_end,
      availability_by_day: availabilityByDay,
      custom_fields: form.custom_fields,
    };
    if (product) {
      await productService.update(product.id, data);
    } else {
      await productService.create(data);
    }
    sessionStorage.removeItem('peddi_product_draft');
    await onSave();
    } catch (err) {
      if (err.status === 401) {
        sessionStorage.setItem('peddi_product_draft', JSON.stringify({ product, form }));
        setSessionExpired(true);
      }
      setError(err.message || 'Não foi possível salvar o produto.');
    } finally {
      setSaving(false);
    }
  };

  const input = "w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50";
  const label = "block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      data-peddi-modal="product" className="fixed inset-0 z-50 flex items-stretch justify-center bg-black/50 backdrop-blur-sm sm:items-center sm:p-4"
    >
      <motion.div
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 30, opacity: 0 }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="product-form-title"
        className="peddi-product-form flex h-[100dvh] w-full flex-col overflow-hidden bg-white shadow-2xl sm:h-[min(900px,calc(100dvh-32px))] sm:max-w-4xl sm:rounded-3xl sm:border sm:border-gray-100"
      >
        {/* Header */}
        <div className="peddi-modal-header flex flex-shrink-0 items-center justify-between gap-3 border-b border-gray-100 px-4 py-3 sm:px-6 sm:py-4">
          <div className="min-w-0">
            <h2 id="product-form-title" className="truncate font-heading text-lg font-bold text-gray-900 sm:text-xl">{product ? 'Editar Produto' : 'Novo Produto'}</h2>
            <p className="mt-0.5 truncate text-xs text-gray-500">{product?.name || 'Cadastre as informações para publicar no cardápio'}</p>
          </div>
          <div className="flex flex-shrink-0 items-center gap-2">
            <span className="hidden rounded-full bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary sm:inline">Etapa {activeTabIndex + 1} de {TABS.length}</span>
            <button type="button" aria-label="Fechar cadastro de produto" onClick={onClose} className="flex h-11 w-11 items-center justify-center rounded-xl text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900">
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="h-1 flex-shrink-0 bg-gray-100"><div className="h-full bg-primary transition-[width] duration-300" style={{ width: `${((activeTabIndex + 1) / TABS.length) * 100}%` }} /></div>

        {/* Tabs */}
        <div role="tablist" aria-label="Seções do produto" className="peddi-product-tabs flex flex-shrink-0 gap-1 overflow-x-auto border-b border-gray-100 px-3 sm:px-5">
          {TABS.map(t => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              aria-controls={`product-panel-${t.id}`}
              onClick={() => setTab(t.id)}
              className={`flex-shrink-0 whitespace-nowrap px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                tab === t.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-800'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          {error && <p role="alert" className="px-6 pt-4 text-sm text-red-600">{error}</p>}
          {sessionExpired && <a href="/login?returnTo=/admin/catalogo" className="block px-6 py-2 text-sm text-primary underline">Entrar novamente e recuperar este cadastro</a>}
          <div id={`product-panel-${tab}`} role="tabpanel" className="peddi-product-form-content min-h-0 flex-1 space-y-5 overflow-y-auto p-4 sm:p-6">

            {/* ── TAB: Informações ── */}
            {tab === 'basic' && (
              <div className="space-y-4">
                <div>
                  <label className={label}>Nome do produto *</label>
                  <input value={form.name} onChange={e => set('name', e.target.value)} required className={input} placeholder="Ex: X-Burguer Especial" />
                </div>
                <div>
                  <label className={label}>Descrição</label>
                  <textarea value={form.description} onChange={e => set('description', e.target.value)} rows={3} className={input + ' resize-none'} placeholder="Descreva o produto, ingredientes, detalhes..." />
                </div>
                <div>
                  <label className={label}>Categorias</label>
                  <div className="flex flex-wrap gap-2">
                    {categories.map(cat => (
                      <button key={cat.id} type="button" onClick={() => toggleCategory(cat.id)}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                          form.category_ids.includes(cat.id)
                            ? 'bg-primary text-white border-primary'
                            : 'bg-white text-gray-600 border-gray-200 hover:border-primary/50'
                        }`}
                      >
                        {cat.icon} {cat.name}
                      </button>
                    ))}
                    {categories.length === 0 && <p className="text-xs text-gray-400">Nenhuma categoria cadastrada</p>}
                  </div>
                </div>
                <div>
                  <label className={label}>Tags</label>
                  <div className="flex gap-2 mb-2 flex-wrap">
                    {form.tags.map((t, i) => (
                      <span key={i} className="flex items-center gap-1 bg-blue-50 text-blue-700 text-xs px-2.5 py-1 rounded-full">
                        {t}
                        <button type="button" onClick={() => set('tags', form.tags.filter((_, j) => j !== i))}><X size={10} /></button>
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input value={tagInput} onChange={e => setTagInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addTag())} placeholder="Digite e pressione Enter" className={input + ' flex-1'} />
                    <button type="button" onClick={addTag} className="px-3 py-2 bg-gray-100 rounded-xl text-sm hover:bg-gray-200">Adicionar</button>
                  </div>
                </div>
                <div>
                  <label className={label}>Tempo de preparo (minutos)</label>
                  <input type="number" value={form.prep_time_min} onChange={e => set('prep_time_min', e.target.value)} className={input} placeholder="Ex: 20" />
                </div>
                <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-3 pt-1">
                  <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
                    <input type="checkbox" checked={form.is_featured} onChange={e => set('is_featured', e.target.checked)} className="w-4 h-4 rounded accent-primary" />
                    <span className="text-gray-700">Produto em destaque</span>
                  </label>
                  <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
                    <input type="checkbox" checked={form.is_published} onChange={e => set('is_published', e.target.checked)} className="w-4 h-4 rounded accent-primary" />
                    <span className="text-gray-700">Publicado (visível na loja)</span>
                  </label>
                  <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
                    <input type="checkbox" checked={form.is_paused} onChange={e => set('is_paused', e.target.checked)} className="w-4 h-4 rounded accent-primary" />
                    <span className="text-gray-700">Pausar vendas (esconde do cardápio)</span>
                  </label>
                </div>
              </div>
            )}

            {/* ── TAB: Preços ── */}
            {tab === 'pricing' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={label}>Preço normal (R$) *</label>
                    <input type="number" step="0.01" min="0" value={form.price} onChange={e => set('price', e.target.value)} required={!form.price_on_request} className={input} placeholder="0,00" />
                  </div>
                  <div>
                    <label className={label}>Preço promocional (R$)</label>
                    <input type="number" step="0.01" min="0" value={form.promo_price} onChange={e => set('promo_price', e.target.value)} className={input} placeholder="0,00" />
                  </div>
                </div>
                <div>
                  <label className={label}>Custo de produção (R$)</label>
                  <input type="number" step="0.01" min="0" value={form.cost} onChange={e => set('cost', e.target.value)} className={input} placeholder="0,00" />
                  <p className="text-xs text-gray-400 mt-1">Usado para calcular margem de lucro nos relatórios</p>
                </div>
                {form.price && form.promo_price && parseFloat(form.promo_price) < parseFloat(form.price) && (
                  <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-sm text-green-700">
                    💰 Desconto de <strong>{Math.round((1 - parseFloat(form.promo_price) / parseFloat(form.price)) * 100)}%</strong> será exibido na loja
                  </div>
                )}
                {form.price && parseFloat(form.cost) > 0 && (() => {
                  const sellPrice = form.promo_price ? parseFloat(form.promo_price) : parseFloat(form.price);
                  const cost = parseFloat(form.cost);
                  const profit = sellPrice - cost;
                  const margin = sellPrice > 0 ? (profit / sellPrice * 100) : 0;
                  return (
                    <div className={`rounded-xl px-4 py-3 text-sm ${profit >= 0 ? 'bg-blue-50 border border-blue-200 text-blue-700' : 'bg-red-50 border border-red-200 text-red-700'}`}>
                      📊 Lucro por item: <strong>R$ {profit.toFixed(2)}</strong> · Margem: <strong>{margin.toFixed(1)}%</strong>
                    </div>
                  );
                })()}
                <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
                  <input type="checkbox" checked={form.price_on_request} onChange={e => set('price_on_request', e.target.checked)} className="w-4 h-4 rounded accent-primary" />
                  <span className="text-gray-700">Preço sob consulta (não exibe valor)</span>
                </label>
                <div>
                  <label className={label}>SKU / Código do produto</label>
                  <input value={form.sku} onChange={e => set('sku', e.target.value)} className={input} placeholder="Ex: PROD-001" />
                </div>
              </div>
            )}

            {/* ── TAB: Fotos ── */}
            {tab === 'images' && (
              <div className="space-y-4">
                <p className="text-sm text-gray-500">Adicione fotos do produto. A primeira será a imagem principal.</p>
                <div className="grid grid-cols-3 gap-3">
                  {form.images.map((url, i) => (
                    <div key={i} className="relative aspect-square rounded-xl overflow-hidden bg-gray-100 group">
                      <img src={url} alt="" className="w-full h-full object-cover" />
                      <button type="button" onClick={() => removeImage(i)}
                        className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <X size={12} />
                      </button>
                      {i === 0 && <span className="absolute bottom-1 left-1 bg-black/60 text-white text-[9px] px-1.5 py-0.5 rounded-full">Principal</span>}
                    </div>
                  ))}
                  <label className="aspect-square rounded-xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-colors">
                    {uploadingImg
                      ? <Loader2 size={24} className="animate-spin text-primary" />
                      : <>
                          <ImageIcon size={24} className="text-gray-300 mb-1" />
                          <span className="text-xs text-gray-400">Adicionar foto</span>
                        </>
                    }
                    <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={uploadingImg} />
                  </label>
                </div>
                {form.images.length === 0 && (
                  <p className="text-xs text-gray-400 text-center pt-2">Nenhuma foto adicionada ainda</p>
                )}

                {/* Badge label */}
                <div className="border-t border-gray-100 pt-4 space-y-3">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Etiqueta na foto</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={label}>Texto da etiqueta</label>
                      <input
                        value={form.badge_label}
                        onChange={e => set('badge_label', e.target.value)}
                        placeholder="Ex: 10% OFF, Novidade, Mais Pedido"
                        className={input}
                      />
                      <p className="text-xs text-gray-400 mt-1">Deixe vazio para mostrar desconto automático</p>
                    </div>
                    <div>
                      <label className={label}>Cor da etiqueta</label>
                      <div className="flex gap-2 flex-wrap mt-1">
                        {['red','green','orange','blue','purple','pink'].map(c => (
                          <button
                            key={c}
                            type="button"
                            onClick={() => set('badge_color', c)}
                            className={`w-7 h-7 rounded-full border-2 transition-all ${form.badge_color === c ? 'border-gray-800 scale-110' : 'border-transparent'}`}
                            style={{ backgroundColor: {red:'#ef4444',green:'#22c55e',orange:'#f97316',blue:'#3b82f6',purple:'#a855f7',pink:'#ec4899'}[c] }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── TAB: Variações ── */}
            {tab === 'variations' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-800">Variações do produto</p>
                    <p className="text-xs text-gray-400 mt-0.5">Ex: Tamanho (P, M, G), Cor, Sabor</p>
                  </div>
                  <button type="button" onClick={addVariation} className="flex items-center gap-1.5 px-3 py-2 bg-primary text-white text-sm rounded-xl hover:bg-primary/90 transition-colors">
                    <Plus size={15} /> Variação
                  </button>
                </div>

                {form.variations.length === 0 && (
                  <div className="text-center py-8 text-gray-400 text-sm border-2 border-dashed border-gray-200 rounded-xl">
                    Nenhuma variação cadastrada
                  </div>
                )}

                {form.variations.map((variation, vi) => (
                  <div key={vi} className="border border-gray-200 rounded-xl p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <input
                        value={variation.name}
                        onChange={e => setVariation(vi, 'name', e.target.value)}
                        placeholder="Nome da variação (ex: Tamanho)"
                        className={input + ' flex-1'}
                      />
                      <button type="button" onClick={() => removeVariation(vi)} className="p-2 text-red-400 hover:bg-red-50 rounded-lg transition-colors">
                        <Trash2 size={16} />
                      </button>
                    </div>
                    <div className="space-y-2">
                      {variation.options.map((opt, oi) => (
                        <div key={oi} className="flex items-center gap-2 pl-3">
                          <input
                            value={opt.label}
                            onChange={e => setVarOption(vi, oi, 'label', e.target.value)}
                            placeholder="Opção (ex: Grande)"
                            className={input + ' flex-1'}
                          />
                          <div className="flex items-center gap-1">
                            <span className="text-xs text-gray-400 whitespace-nowrap">+ R$</span>
                            <input
                              type="number" step="0.01"
                              value={opt.price_modifier}
                              onChange={e => setVarOption(vi, oi, 'price_modifier', parseFloat(e.target.value) || 0)}
                              className={input + ' w-20'}
                            />
                          </div>
                          <button type="button" onClick={() => removeVarOption(vi, oi)} className="p-1.5 text-gray-400 hover:text-red-400 transition-colors">
                            <X size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                    <button type="button" onClick={() => addVarOption(vi)} className="text-xs text-primary flex items-center gap-1 pl-3 hover:underline">
                      <Plus size={12} /> Adicionar opção
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* ── TAB: Complementos ── */}
            {tab === 'addons' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-800">Complementos / Adicionais</p>
                    <p className="text-xs text-gray-400 mt-0.5">Ex: Bacon extra, Queijo duplo, Molho especial</p>
                  </div>
                  <button type="button" onClick={addAddon} className="flex items-center gap-1.5 px-3 py-2 bg-primary text-white text-sm rounded-xl hover:bg-primary/90 transition-colors">
                    <Plus size={15} /> Complemento
                  </button>
                </div>

                {form.addons.length === 0 && (
                  <div className="text-center py-8 text-gray-400 text-sm border-2 border-dashed border-gray-200 rounded-xl">
                    Nenhum complemento cadastrado
                  </div>
                )}

                <div className="space-y-2">
                  {form.addons.map((addon, i) => (
                    <div key={i} className="p-3 bg-gray-50 rounded-xl border border-gray-100 space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 bg-primary/10 rounded-lg flex items-center justify-center text-xs font-bold text-primary flex-shrink-0">{i + 1}</span>
                        <input
                          value={addon.name}
                          onChange={e => setAddon(i, 'name', e.target.value)}
                          placeholder="Nome do complemento"
                          className={input + ' flex-1'}
                        />
                        <button type="button" onClick={() => removeAddon(i)} className="p-2 text-red-400 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0">
                          <Trash2 size={15} />
                        </button>
                      </div>
                      <div className="flex items-center gap-3 pl-8">
                        <div className="flex items-center gap-1 flex-1">
                          <span className="text-xs text-gray-400 whitespace-nowrap">Preço R$</span>
                          <input
                            type="number" step="0.01" min="0"
                            value={addon.price}
                            onChange={e => setAddon(i, 'price', parseFloat(e.target.value) || 0)}
                            className={input + ' w-24'}
                            placeholder="0,00"
                          />
                        </div>
                        <div className="flex items-center gap-1 flex-1">
                          <span className="text-xs text-gray-400 whitespace-nowrap">Qtd máx.</span>
                          <input
                            type="number" min="1"
                            value={addon.max_qty}
                            onChange={e => setAddon(i, 'max_qty', parseInt(e.target.value) || 1)}
                            className={input + ' w-16'}
                          />
                        </div>
                        {addon.price === 0 && <span className="text-xs text-green-600 font-medium">Grátis</span>}
                        {addon.price > 0 && <span className="text-xs text-primary font-medium">+R${parseFloat(addon.price).toFixed(2)}</span>}
                      </div>
                    </div>
                  ))}
                </div>
                {form.addons.length > 0 && (
                  <p className="text-xs text-gray-400 text-center">{form.addons.length} complemento(s) cadastrado(s)</p>
                )}
              </div>
            )}

            {/* ── TAB: Disponibilidade ── */}
            {tab === 'availability' && (
              <div className="space-y-4">
                <p className="text-sm font-semibold text-gray-800">Disponibilidade por dia da semana</p>
                <p className="text-xs text-gray-500">Ative os dias disponíveis e defina um horário para cada um. Sem início e fim, o produto fica disponível o dia todo. Se o fim for anterior ao início, o horário termina no dia seguinte.</p>
                {WEEK_DAYS.map(day => (
                  <div key={day.id} className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-center p-3 bg-gray-50 border border-gray-200 rounded-xl">
                    <label className="flex gap-2 items-center text-sm font-semibold text-gray-700">
                      <input type="checkbox" aria-label={`${day.label} disponível`} checked={availabilityByDay[day.id].enabled} onChange={e => {
                        const schedule = { ...availabilityByDay, [day.id]: { ...availabilityByDay[day.id], enabled: e.target.checked } };
                        setForm(previous => ({ ...previous, availability_by_day: schedule, available_days: WEEK_DAYS.filter(d => schedule[d.id].enabled).map(d => d.id), availability_start: '', availability_end: '' }));
                      }} className="accent-primary" />
                      {day.label}
                    </label>
                    {['start', 'end'].map(field => (
                      <label key={field} className="text-xs text-gray-500">
                        {field === 'start' ? 'Início' : 'Fim'}
                        <input type="time" aria-label={`${day.label} ${field === 'start' ? 'início' : 'fim'}`} disabled={!availabilityByDay[day.id].enabled} value={availabilityByDay[day.id][field]} onChange={e => set('availability_by_day', { ...availabilityByDay, [day.id]: { ...availabilityByDay[day.id], [field]: e.target.value } })} className={input + ' mt-1 disabled:opacity-50'} />
                      </label>
                    ))}
                  </div>
                ))}
              </div>
            )}
            {tab === 'custom_fields' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-800">Campos personalizados</p>
                    <p className="text-xs text-gray-500 mt-1">Defina perguntas para personalizar o produto, como “Nome na embalagem”, “Mensagem no bolo” ou “Ponto da carne”.</p>
                  </div>
                  <button type="button" onClick={() => set('custom_fields', [...form.custom_fields, emptyCustomField()])}
                    className="flex items-center gap-1.5 px-3 py-2 bg-primary text-white text-sm rounded-xl hover:bg-primary/90 transition-colors">
                    <Plus size={15} /> Campo
                  </button>
                </div>
                <div className="rounded-xl bg-blue-50 p-3 text-xs text-blue-800 space-y-1">
                  <p><strong>Texto:</strong> resposta livre, como uma mensagem. <strong>Número:</strong> valor numérico, como uma idade. <strong>Seleção:</strong> escolha entre as opções que você cadastrar.</p>
                  <p><strong>Obrigatório:</strong> indica que a pergunta precisa ser respondida. Esses campos não alteram o preço; para cobrar por uma escolha, use Complementos ou Variações.</p>
                  <p>O cliente responde na página do produto. As respostas acompanham o item no pedido.</p>
                </div>
                {form.custom_fields.length === 0 && (
                  <div className="text-center py-8 text-gray-400 text-sm border-2 border-dashed border-gray-200 rounded-xl">
                    Nenhum campo personalizado
                  </div>
                )}
                {form.custom_fields.map((cf, fi) => (
                  <div key={fi} className="border border-gray-200 rounded-xl p-4 space-y-3">
                    <div className="flex gap-2">
                      <input value={cf.label} onChange={e => {
                        const cfs = form.custom_fields.map((x, j) => j === fi ? { ...x, label: e.target.value } : x);
                        set('custom_fields', cfs);
                      }} placeholder="Nome do campo (ex: Sabor preferido)" className={input + ' flex-1'} />
                      <select value={cf.type} onChange={e => {
                        const cfs = form.custom_fields.map((x, j) => j === fi ? { ...x, type: e.target.value } : x);
                        set('custom_fields', cfs);
                      }} className={input + ' w-28'}>
                        <option value="text">Texto</option>
                        <option value="select">Seleção</option>
                      </select>
                      <button type="button" onClick={() => set('custom_fields', form.custom_fields.filter((_, j) => j !== fi))}
                        className="p-2 text-red-400 hover:bg-red-50 rounded-lg transition-colors">
                        <Trash2 size={16} />
                      </button>
                    </div>
                    {cf.type === 'select' && (
                      <div className="pl-2 space-y-2">
                        <p className="text-xs text-gray-500 font-medium">Opções (uma por linha):</p>
                        <textarea rows={3} value={(cf.options || []).join('\n')} onChange={e => {
                          const opts = e.target.value.split('\n');
                          const cfs = form.custom_fields.map((x, j) => j === fi ? { ...x, options: opts } : x);
                          set('custom_fields', cfs);
                        }} placeholder="Opção A&#10;Opção B&#10;Opção C" className={input + ' resize-none text-xs'} />
                      </div>
                    )}
                    <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
                      <input type="checkbox" checked={cf.required} onChange={e => {
                        const cfs = form.custom_fields.map((x, j) => j === fi ? { ...x, required: e.target.checked } : x);
                        set('custom_fields', cfs);
                      }} className="w-4 h-4 rounded accent-primary" />
                      <span className="text-gray-600">Campo obrigatório</span>
                    </label>
                  </div>
                ))}
              </div>
            )}

            {/* ── TAB: Ficha Técnica ── */}
            {tab === 'recipe' && (
              <div className="space-y-4">
                {ingredientError && <p role="alert" className="text-sm text-red-600">{ingredientError}</p>}
                <div>
                  <p className="text-sm font-medium text-gray-800">Ficha Técnica do produto</p>
                  <p className="text-xs text-gray-400 mt-0.5">Vincule insumos e quantidades para calcular o custo automático e salvar a ficha junto ao produto.</p>
                </div>

                {form.recipe.length === 0 && (
                  <div className="text-center py-8 text-gray-400 text-sm border-2 border-dashed border-gray-200 rounded-xl">
                    Nenhum insumo vinculado. Adicione insumos para calcular o custo real.
                  </div>
                )}

                {form.recipe.map((item, ri) => {
                  const ing = ingredients.find(i => i.id === item.ingredient_id);
                  const itemCost = calculateRecipeItemCost(item, ing);
                  return (
                    <div key={ri} className="flex items-center gap-2 p-2 bg-gray-50 rounded-xl border border-gray-100">
                      <select value={item.ingredient_id} onChange={e => updateRecipeItem(ri, 'ingredient_id', e.target.value)} className={input + ' flex-1'}>
                        <option value="">— Selecione o insumo —</option>
                        {ingredients.map(i => <option key={i.id} value={i.id}>{i.name} ({UNIT_LABELS[i.unit] || i.unit})</option>)}
                      </select>
                      <input type="number" step="0.01" min="0" value={item.quantity} onChange={e => updateRecipeItem(ri, 'quantity', parseFloat(e.target.value) || 0)} className={input + ' w-16'} placeholder="Qtd" />
                      <select value={item.unit} onChange={e => updateRecipeItem(ri, 'unit', e.target.value)} className={input + ' w-20'}>
                        {UNITS.map(u => <option key={u} value={u}>{UNIT_LABELS[u]}</option>)}
                      </select>
                      <span className="text-xs text-primary font-bold w-16 text-right flex-shrink-0">R$ {itemCost.toFixed(2)}</span>
                      <button type="button" onClick={() => removeRecipeItem(ri)} className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg flex-shrink-0">
                        <Trash2 size={15} />
                      </button>
                    </div>
                  );
                })}

                <button type="button" onClick={addRecipeItem} className="w-full flex items-center justify-center gap-2 py-2.5 border-2 border-dashed border-primary/40 rounded-xl text-primary text-sm font-semibold hover:bg-primary/5 transition-colors">
                  <Plus size={15} /> Adicionar insumo
                </button>

                {form.recipe.length > 0 && (
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-sm text-blue-700">
                    💰 Custo calculado da ficha: <strong>R$ {calculateRecipeCost(form.recipe, ingredients).toFixed(2)}</strong>
                    <p className="text-xs text-blue-600 mt-0.5">Ao salvar, o custo do produto será atualizado automaticamente.</p>
                  </div>
                )}
                {ingredients.length === 0 && (
                  <p className="text-xs text-orange-600">⚠️ Cadastre insumos em Admin → Estoque antes de montar a ficha técnica.</p>
                )}
              </div>
            )}

            {/* ── TAB: Estoque ── */}
            {tab === 'stock' && (
              <div className="space-y-4">
                <div>
                  <label className={label}>Quantidade em estoque</label>
                  <input type="number" min="0" value={form.stock} onChange={e => set('stock', e.target.value)} className={input} placeholder="999" />
                  <p className="text-xs text-gray-400 mt-1">Use 999 para estoque ilimitado</p>
                </div>
                <div>
                  <label className={label}>Informações nutricionais</label>
                  <textarea value={form.nutritional_info} onChange={e => set('nutritional_info', e.target.value)} rows={3} className={input + ' resize-none'} placeholder="Calorias, proteínas, carboidratos..." />
                </div>
                <div>
                  <label className={label}>Alérgenos</label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {form.allergens.map((a, i) => (
                      <span key={i} className="flex items-center gap-1 bg-red-50 text-red-700 text-xs px-2.5 py-1 rounded-full">
                        ⚠️ {a}
                        <button type="button" onClick={() => set('allergens', form.allergens.filter((_, j) => j !== i))}><X size={10} /></button>
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input value={allergenInput} onChange={e => setAllergenInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addAllergen())} placeholder="Ex: Glúten, Lactose..." className={input + ' flex-1'} />
                    <button type="button" onClick={addAllergen} className="px-3 py-2 bg-gray-100 rounded-xl text-sm hover:bg-gray-200">Adicionar</button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="peddi-modal-footer flex flex-shrink-0 gap-3 border-t border-gray-100 px-4 py-3 sm:px-6 sm:py-4">
            <button type="button" onClick={onClose} className="min-h-12 flex-1 rounded-xl bg-gray-100 px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200 sm:flex-none">
              Cancelar
            </button>
            <button type="submit" disabled={saving || uploadingImg} className="flex min-h-12 flex-[1.5] items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-primary/90 disabled:opacity-50 sm:ml-auto sm:flex-none">
              {saving && <Loader2 size={15} className="animate-spin" />}
              {saving ? 'Salvando...' : product ? 'Salvar alterações' : 'Criar produto'}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}
