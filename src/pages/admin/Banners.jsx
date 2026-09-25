import ImageUrlInput from '@/components/admin/ImageUrlInput';
import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Plus, Trash2, Upload, Loader2, ToggleLeft, ToggleRight, Link, Save } from 'lucide-react';
import { ensureBannerIds, getBannerProductIds, withBannerProductIds } from '@/lib/bannerProducts';
import PromoMessageManager from '@/components/admin/PromoMessageManager';

export default function Banners() {
  const [store, setStore] = useState(null);
  const [products, setProducts] = useState([]);
  const [banners, setBanners] = useState([]);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(null); // index being uploaded
  const [uploadError, setUploadError] = useState('');

  useEffect(() => {
    Promise.all([
      base44.entities.Store.list(),
      base44.entities.Product.filter({ is_published: true }, 'name'),
    ]).then(([stores, prods]) => {
      const s = stores[0];
      setStore(s);
      setProducts(prods);
      setBanners(ensureBannerIds(s?.banners || []));
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
    setUploadError('');
    setUploading(index);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      const updated = banners.map((b, i) => i === index ? { ...b, image_url: file_url } : b);
      setBanners(updated);
    } catch (error) {
      setUploadError(error.message || 'Não foi possível enviar a imagem. Tente novamente.');
    } finally {
      setUploading(null);
      e.target.value = '';
    }
  };

  const addBanner = () => {
    setBanners(prev => [...prev, { id: crypto.randomUUID(), image_url: '', title: '', product_id: '', product_ids: [], is_active: true }]);
  };

  const update = (index, key, val) => {
    setBanners(prev => prev.map((b, i) => i === index ? { ...b, [key]: val } : b));
  };

  const toggleProduct = (index, productId) => {
    setBanners(prev => prev.map((banner, i) => {
      if (i !== index) return banner;
      const linked = getBannerProductIds(banner);
      return withBannerProductIds(banner, linked.includes(productId)
        ? linked.filter(id => id !== productId)
        : [...linked, productId]);
    }));
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
        {uploadError && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">{uploadError}</p>}
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
            <div className="aspect-[23/10] overflow-hidden rounded-xl bg-muted">
              {banner.image_url
                ? <img src={banner.image_url} alt="" className="w-full h-full object-cover" />
                : <div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm">Sem imagem</div>
              }
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <label className={`inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-white ${uploading !== null ? 'cursor-not-allowed opacity-60' : 'cursor-pointer hover:bg-primary/90'}`}>
                {uploading === index ? <Loader2 size={18} className="animate-spin" /> : <Upload size={18} />}
                {uploading === index ? 'Enviando imagem...' : banner.image_url ? 'Trocar imagem' : 'Enviar imagem'}
                <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={e => handleUpload(e, index)} disabled={uploading !== null} />
              </label>
              {banner.image_url && <button type="button" onClick={() => update(index, 'image_url', '')} disabled={uploading !== null} className="min-h-11 rounded-xl border border-red-200 px-4 text-sm font-medium text-red-600 disabled:opacity-50">Remover imagem</button>}
            </div>
            <p className="text-xs text-muted-foreground">Recomendado: 1200 × 522 px (proporção 2,3:1), em PNG, JPG ou WebP.</p>
            <ImageUrlInput onApply={url => update(index, 'image_url', url)} disabled={uploading !== null} />

            {/* Title */}
            <input
              value={banner.title || ''}
              onChange={e => update(index, 'title', e.target.value)}
              placeholder="Título do banner (opcional)"
              className="w-full px-3 py-2.5 bg-muted rounded-xl text-sm border-0 focus:outline-none focus:ring-2 focus:ring-primary/20"
            />

            {/* Product links */}
            <div>
              <label className="mb-2 flex items-center gap-1 text-xs text-muted-foreground"><Link size={11} /> Produtos da campanha</label>
              <p className="mb-3 text-xs text-muted-foreground">Ao clicar neste banner, o cliente verá todos os produtos selecionados.</p>
              <div className="grid max-h-56 grid-cols-1 gap-2 overflow-y-auto rounded-xl border border-border/60 bg-muted/40 p-2 sm:grid-cols-2">
                {products.map(product => {
                  const selected = getBannerProductIds(banner).includes(product.id);
                  return (
                    <label key={product.id} className={`flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border px-3 py-2 text-sm transition-colors ${selected ? 'border-primary bg-primary/10 text-foreground' : 'border-transparent bg-white text-muted-foreground hover:border-primary/30'}`}>
                      <input type="checkbox" checked={selected} onChange={() => toggleProduct(index, product.id)} className="h-4 w-4 accent-primary" />
                      <span className="min-w-0 truncate">{product.name}</span>
                    </label>
                  );
                })}
                {products.length === 0 && <p className="p-3 text-xs text-muted-foreground">Nenhum produto publicado disponível.</p>}
              </div>
              <p className="mt-2 text-xs font-medium text-primary">{getBannerProductIds(banner).length} produto(s) vinculado(s)</p>
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
      <PromoMessageManager />
    </div>
  );
}
