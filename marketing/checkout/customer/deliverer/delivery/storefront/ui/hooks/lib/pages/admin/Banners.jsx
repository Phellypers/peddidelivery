import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Plus, Trash2, Upload, Loader2, GripVertical, ToggleLeft, ToggleRight, Link, Save } from 'lucide-react';

export default function Banners() {
  const [store, setStore] = useState(null);
  const [products, setProducts] = useState([]);
  const [banners, setBanners] = useState([]);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(null); // index being uploaded

  useEffect(() => {
    Promise.all([
      base44.entities.Store.list(),
      base44.entities.Product.filter({ is_published: true }, 'name'),
    ]).then(([stores, prods]) => {
      const s = stores[0];
      setStore(s);
      setProducts(prods);
      setBanners(s?.banners || []);
    });
  }, []);

  const save = async (newBanners) => {
    if (!store) return;
    setSaving(true);
    await base44.entities.Store.update(store.id, { banners: newBanners });
    setBanners(newBanners);
    setStore(s => ({ ...s, banners: newBanners }));
    setSaving(false);
  };

  const handleUpload = async (e, index) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(index);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    const updated = banners.map((b, i) => i === index ? { ...b, image_url: file_url } : b);
    setBanners(updated);
    setUploading(null);
  };

  const addBanner = () => {
    setBanners(prev => [...prev, { image_url: '', title: '', product_id: '', is_active: true }]);
  };

  const update = (index, key, val) => {
    setBanners(prev => prev.map((b, i) => i === index ? { ...b, [key]: val } : b));
  };

  const remove = (index) => {
    const updated = banners.filter((_, i) => i !== index);
    save(updated);
  };

  const moveUp = (index) => {
    if (index === 0) return;
    const arr = [...banners];
    [arr[index - 1], arr[index]] = [arr[index], arr[index - 1]];
    setBanners(arr);
  };

  const moveDown = (index) => {
    if (index === banners.length - 1) return;
    const arr = [...banners];
    [arr[index], arr[index + 1]] = [arr[index + 1], arr[index]];
    setBanners(arr);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading font-bold text-2xl text-foreground">Banners</h1>
          <p className="text-sm text-muted-foreground mt-1">Gerencie os banners do carrossel na vitrine</p>
        </div>
        <button onClick={addBanner} className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors">
          <Plus size={16} /> Novo Banner
        </button>
      </div>

      {banners.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <p className="mb-2">Nenhum banner cadastrado.</p>
          <button onClick={addBanner} className="text-primary font-medium text-sm">+ Adicionar primeiro banner</button>
        </div>
      )}

      <div className="space-y-4">
        {banners.map((banner, index) => (
          <div key={index} className="bg-card rounded-2xl border border-border/50 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex flex-col gap-0.5">
                  <button onClick={() => moveUp(index)} className="p-0.5 hover:bg-accent rounded text-muted-foreground hover:text-foreground transition-colors" disabled={index === 0}>▲</button>
                  <button onClick={() => moveDown(index)} className="p-0.5 hover:bg-accent rounded text-muted-foreground hover:text-foreground transition-colors" disabled={index === banners.length - 1}>▼</button>
                </div>
                <span className="text-sm font-semibold text-foreground">Banner {index + 1}</span>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => update(index, 'is_active', !banner.is_active)} title={banner.is_active ? 'Desativar' : 'Ativar'}>
                  {banner.is_active ? <ToggleRight size={24} className="text-green-500" /> : <ToggleLeft size={24} className="text-gray-300" />}
                </button>
                <button onClick={() => remove(index)} className="p-1.5 hover:bg-red-50 rounded-lg transition-colors">
                  <Trash2 size={15} className="text-red-400" />
                </button>
              </div>
            </div>

            {/* Image */}
            <div className="aspect-[3/1] rounded-xl overflow-hidden bg-muted relative">
              {banner.image_url
                ? <img src={banner.image_url} alt="" className="w-full h-full object-cover" />
                : <div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm">Sem imagem</div>
              }
              <label className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 hover:opacity-100 transition-opacity cursor-pointer">
                {uploading === index
                  ? <Loader2 size={24} className="text-white animate-spin" />
                  : <div className="flex items-center gap-2 text-white font-medium text-sm"><Upload size={18} /> Enviar imagem</div>
                }
                <input type="file" accept="image/*" className="hidden" onChange={e => handleUpload(e, index)} disabled={uploading !== null} />
              </label>
            </div>

            {/* Title */}
            <input
              value={banner.title || ''}
              onChange={e => update(index, 'title', e.target.value)}
              placeholder="Título do banner (opcional)"
              className="w-full px-3 py-2.5 bg-muted rounded-xl text-sm border-0 focus:outline-none focus:ring-2 focus:ring-primary/20"
            />

            {/* Product link */}
            <div>
              <label className="text-xs text-muted-foreground mb-1 block flex items-center gap-1"><Link size={11} /> Produto vinculado (ao clicar no banner)</label>
              <select
                value={banner.product_id || ''}
                onChange={e => update(index, 'product_id', e.target.value)}
                className="w-full px-3 py-2.5 bg-muted rounded-xl text-sm border-0 focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="">— Sem produto vinculado —</option>
                {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
          </div>
        ))}
      </div>

      {banners.length > 0 && (
        <button onClick={() => save(banners)} disabled={saving}
          className="w-full flex items-center justify-center gap-2 py-3.5 bg-primary text-white rounded-2xl font-heading font-bold text-sm hover:bg-primary/90 transition-colors disabled:opacity-50">
          {saving ? <Loader2 size={18} className="animate-spin" /> : <><Save size={18} /> Salvar todos os banners</>}
        </button>
      )}
    </div>
  );
}