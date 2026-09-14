import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Loader2, Save, ImageIcon, Store, Copy, Check, Link2, Bike } from 'lucide-react';
import FakeReviewsManager from '@/components/admin/FakeReviewsManager';

export default function StoreSettings() {
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [uploading, setUploading] = useState({ logo: false, banner: false });
  const [storeId, setStoreId] = useState(null);
  const [copied, setCopied] = useState(false);
  const [copiedDeliverer, setCopiedDeliverer] = useState(false);

  useEffect(() => {
    base44.entities.Store.list().then(stores => {
      if (stores[0]) {
        setStoreId(stores[0].id);
        setForm(stores[0]);
      } else {
        setForm({
          name: '', description: '', phone: '', whatsapp: '', address: '',
          city: '', state: '', business_type: 'menu', opening_hours: '',
          primary_color: '#F97316', logo_url: '', banner_url: '',
          pix_enabled: true, card_enabled: true, cash_enabled: true,
          delivery_enabled: true, pickup_enabled: true,
          flat_delivery_fee: 5, min_order_value: 0, free_shipping_above: 0,
          social_instagram: '', social_facebook: '',
        });
      }
    });
  }, []);

  const set = (f, v) => setForm(p => ({ ...p, [f]: v }));

  const handleUpload = async (field, e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(p => ({ ...p, [field]: true }));
    try {
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    set(field === 'logo' ? 'logo_url' : 'banner_url', file_url);
    } catch (error) { console.error(error); }
    finally { setUploading(p => ({ ...p, [field]: false })); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
    if (storeId) {
      await base44.entities.Store.update(storeId, form);
    } else {
      const created = await base44.entities.Store.create(form);
      setStoreId(created.id);
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
    } catch (error) { console.error(error); }
    finally { setSaving(false); }
  };

  if (!form) return <div className="flex justify-center py-12"><Loader2 className="animate-spin text-primary" size={32} /></div>;

  const inp = "w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30";
  const lbl = "block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide";
  const section = "bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4";

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading font-bold text-2xl text-foreground">Configurações da Loja</h1>
          <p className="text-sm text-muted-foreground mt-1">Personalize o perfil e preferências do seu negócio</p>
        </div>
        <button type="submit" disabled={saving} className="flex items-center gap-2 bg-primary text-white px-5 py-2.5 rounded-xl font-medium text-sm hover:bg-primary/90 transition-colors disabled:opacity-50">
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          {saved ? 'Salvo!' : saving ? 'Salvando...' : 'Salvar'}
        </button>
      </div>

      {/* Link público */}
      <div className={section}>
        <div className="flex items-center gap-2 mb-2">
          <Link2 size={18} className="text-primary" />
          <h2 className="font-heading font-semibold text-gray-900">Link público do cardápio</h2>
        </div>
        <p className="text-xs text-gray-400 mb-3">Compartilhe este link com seus clientes. Eles poderão acessar o catálogo, cadastrar-se, fazer pedidos, ver stories e receber promoções — sem acesso ao painel administrativo.</p>
        <div className="flex items-center gap-2">
          <div className="flex-1 px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-600 truncate">
            {typeof window !== 'undefined' ? window.location.origin + '/loja' : ''}
          </div>
          <button type="button" onClick={() => { if (navigator.clipboard) navigator.clipboard.writeText(window.location.origin + '/loja'); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors flex-shrink-0">
            {copied ? <><Check size={15} /> Copiado!</> : <><Copy size={15} /> Copiar</>}
          </button>
        </div>
      </div>

      {/* Link do entregador */}
      <div className={section}>
        <div className="flex items-center gap-2 mb-2">
          <Bike size={18} className="text-primary" />
          <h2 className="font-heading font-semibold text-gray-900">Link da área do entregador</h2>
        </div>
        <p className="text-xs text-gray-400 mb-3">Envie este link aos seus entregadores. Eles serão direcionados à página exclusiva de cadastro/login do entregador — não à landing page.</p>
        <div className="flex items-center gap-2">
          <div className="flex-1 px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-600 truncate">
            {typeof window !== 'undefined' ? `${window.location.origin}/entregador/cadastro` : ''}
          </div>
          <button type="button" onClick={() => { if (navigator.clipboard) navigator.clipboard.writeText(`${window.location.origin}/entregador/cadastro`); setCopiedDeliverer(true); setTimeout(() => setCopiedDeliverer(false), 2000); }}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors flex-shrink-0">
            {copiedDeliverer ? <><Check size={15} /> Copiado!</> : <><Copy size={15} /> Copiar</>}
          </button>
        </div>
      </div>

      {/* Identidade */}
      <div className={section}>
        <h2 className="font-heading font-semibold text-gray-900">Identidade Visual</h2>

        <div>
          <label className={lbl}>Logo / Foto de Perfil</label>
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-2xl bg-gray-100 overflow-hidden flex-shrink-0">
              {form.logo_url
                ? <img src={form.logo_url} alt="" className="w-full h-full object-cover" />
                : <div className="w-full h-full flex items-center justify-center"><Store size={28} className="text-gray-300" /></div>
              }
            </div>
            <label className="flex items-center gap-2 px-4 py-2 border-2 border-dashed border-gray-200 rounded-xl text-sm text-gray-500 cursor-pointer hover:border-primary/50 hover:text-primary transition-colors">
              {uploading.logo ? <Loader2 size={15} className="animate-spin" /> : <><ImageIcon size={15} /> Upload do Logo</>}
              <input type="file" accept="image/*" className="hidden" onChange={e => handleUpload('logo', e)} />
            </label>
          </div>
          <input value={form.logo_url} onChange={e => set('logo_url', e.target.value)} placeholder="Ou cole a URL da imagem" className={inp + ' mt-2'} />
        </div>

        <div>
          <label className={lbl}>Banner / Capa</label>
          <div className="h-28 rounded-xl bg-gray-100 overflow-hidden mb-2">
            {form.banner_url
              ? <img src={form.banner_url} alt="" className="w-full h-full object-cover" />
              : <div className="w-full h-full flex items-center justify-center text-gray-300"><ImageIcon size={36} /></div>
            }
          </div>
          <label className="flex items-center gap-2 px-4 py-2 border-2 border-dashed border-gray-200 rounded-xl text-sm text-gray-500 cursor-pointer hover:border-primary/50 hover:text-primary transition-colors w-fit">
            {uploading.banner ? <Loader2 size={15} className="animate-spin" /> : <><ImageIcon size={15} /> Upload do Banner</>}
            <input type="file" accept="image/*" className="hidden" onChange={e => handleUpload('banner', e)} />
          </label>
          <input value={form.banner_url} onChange={e => set('banner_url', e.target.value)} placeholder="Ou cole a URL do banner" className={inp + ' mt-2'} />
        </div>
      </div>

      {/* Info Básica */}
      <div className={section}>
        <h2 className="font-heading font-semibold text-gray-900">Informações do Negócio</h2>
        <div>
          <label className={lbl}>Nome do negócio *</label>
          <input value={form.name} onChange={e => set('name', e.target.value)} required className={inp} placeholder="Ex: Pizzaria do João" />
        </div>
        <div>
          <label className={lbl}>Tipo de negócio</label>
          <select value={form.business_type} onChange={e => set('business_type', e.target.value)} className={inp}>
            <option value="menu">Restaurante / Cardápio</option>
            <option value="products">Loja / Produtos</option>
            <option value="services">Serviços</option>
          </select>
        </div>
        <div>
          <label className={lbl}>Descrição / Bio</label>
          <textarea value={form.description} onChange={e => set('description', e.target.value)} rows={3} className={inp + ' resize-none'} placeholder="Conte sobre o seu negócio..." />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={lbl}>Telefone</label>
            <input value={form.phone} onChange={e => set('phone', e.target.value)} className={inp} placeholder="(11) 9999-9999" />
          </div>
          <div>
            <label className={lbl}>WhatsApp</label>
            <input value={form.whatsapp} onChange={e => set('whatsapp', e.target.value)} className={inp} placeholder="5511999999999" />
          </div>
        </div>
        <div>
          <label className={lbl}>Endereço</label>
          <input value={form.address} onChange={e => set('address', e.target.value)} className={inp} placeholder="Rua, número, bairro" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={lbl}>Cidade</label>
            <input value={form.city} onChange={e => set('city', e.target.value)} className={inp} />
          </div>
          <div>
            <label className={lbl}>Estado</label>
            <input value={form.state} onChange={e => set('state', e.target.value)} className={inp} placeholder="SP" />
          </div>
        </div>
        <div>
          <label className={lbl}>Horário de funcionamento</label>
          <input value={form.opening_hours} onChange={e => set('opening_hours', e.target.value)} className={inp} placeholder="Seg-Sex: 11h-22h | Sáb-Dom: 11h-23h" />
        </div>
      </div>

      {/* Entrega */}
      <div className={section}>
        <h2 className="font-heading font-semibold text-gray-900">Entrega e Retirada</h2>
        <div className="flex gap-6">
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={form.delivery_enabled} onChange={e => set('delivery_enabled', e.target.checked)} className="w-4 h-4 rounded accent-primary" />
            Entrega ativa
          </label>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={form.pickup_enabled} onChange={e => set('pickup_enabled', e.target.checked)} className="w-4 h-4 rounded accent-primary" />
            Retirada no local
          </label>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className={lbl}>Taxa de entrega (R$)</label>
            <input type="number" step="0.01" min="0" value={form.flat_delivery_fee} onChange={e => set('flat_delivery_fee', parseFloat(e.target.value) || 0)} className={inp} />
          </div>
          <div>
            <label className={lbl}>Pedido mínimo (R$)</label>
            <input type="number" step="0.01" min="0" value={form.min_order_value} onChange={e => set('min_order_value', parseFloat(e.target.value) || 0)} className={inp} />
          </div>
          <div>
            <label className={lbl}>Frete grátis acima (R$)</label>
            <input type="number" step="0.01" min="0" value={form.free_shipping_above} onChange={e => set('free_shipping_above', parseFloat(e.target.value) || 0)} className={inp} />
          </div>
        </div>
      </div>

      {/* Pagamento */}
      <div className={section}>
        <h2 className="font-heading font-semibold text-gray-900">Formas de Pagamento</h2>
        <div className="grid grid-cols-2 gap-3">
          {[
            { field: 'pix_enabled', label: '💸 PIX' },
            { field: 'card_enabled', label: '💳 Cartão' },
            { field: 'cash_enabled', label: '💵 Dinheiro' },
            { field: 'whatsapp_payment', label: '📱 Combinar via WhatsApp' },
          ].map(({ field, label }) => (
            <label key={field} className="flex items-center gap-2 text-sm cursor-pointer p-3 bg-gray-50 rounded-xl border border-gray-100 hover:border-primary/30 transition-colors">
              <input type="checkbox" checked={form[field] || false} onChange={e => set(field, e.target.checked)} className="w-4 h-4 rounded accent-primary" />
              {label}
            </label>
          ))}
        </div>
      </div>

      {/* Pop-up de Cadastro */}
      <div className={section}>
        <h2 className="font-heading font-semibold text-gray-900">Pop-up de Cadastro</h2>
        <p className="text-xs text-gray-400">Exibido automaticamente para visitantes não cadastrados na vitrine.</p>

        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={form.signup_popup?.enabled !== false}
            onChange={e => set('signup_popup', { ...(form.signup_popup || {}), enabled: e.target.checked })}
            className="w-4 h-4 rounded accent-primary"
          />
          <span className="font-medium">Ativar pop-up de cadastro</span>
        </label>

        <div>
          <label className={lbl}>Atraso para exibição (segundos)</label>
          <input
            type="number" min="1" max="60"
            value={form.signup_popup?.delay_seconds ?? 5}
            onChange={e => set('signup_popup', { ...(form.signup_popup || {}), delay_seconds: parseInt(e.target.value) || 5 })}
            className={inp}
          />
        </div>

        <div>
          <label className={lbl}>Título</label>
          <input
            value={form.signup_popup?.title || ''}
            onChange={e => set('signup_popup', { ...(form.signup_popup || {}), title: e.target.value })}
            placeholder="🎉 Cadastre-se e aproveite!"
            className={inp}
          />
        </div>

        <div>
          <label className={lbl}>Mensagem</label>
          <textarea
            rows={3}
            value={form.signup_popup?.message || ''}
            onChange={e => set('signup_popup', { ...(form.signup_popup || {}), message: e.target.value })}
            placeholder="Acompanhe seus pedidos, receba promoções exclusivas..."
            className={inp + ' resize-none'}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={lbl}>Botão principal</label>
            <input
              value={form.signup_popup?.primary_btn || ''}
              onChange={e => set('signup_popup', { ...(form.signup_popup || {}), primary_btn: e.target.value })}
              placeholder="Criar conta grátis"
              className={inp}
            />
          </div>
          <div>
            <label className={lbl}>Botão secundário</label>
            <input
              value={form.signup_popup?.secondary_btn || ''}
              onChange={e => set('signup_popup', { ...(form.signup_popup || {}), secondary_btn: e.target.value })}
              placeholder="Continuar sem cadastro"
              className={inp}
            />
          </div>
        </div>

        <div>
          <label className={lbl}>Estilo visual</label>
          <select
            value={form.signup_popup?.style || 'modern'}
            onChange={e => set('signup_popup', { ...(form.signup_popup || {}), style: e.target.value })}
            className={inp}
          >
            <option value="modern">Moderno (gradiente laranja/rosa)</option>
            <option value="minimal">Minimalista (clean, cinza)</option>
            <option value="fun">Divertido (gradiente roxo/amarelo)</option>
          </select>
        </div>
      </div>

      {/* Redes Sociais */}
      <div className={section}>
        <h2 className="font-heading font-semibold text-gray-900">Redes Sociais</h2>
        <div>
          <label className={lbl}>Instagram</label>
          <input value={form.social_instagram} onChange={e => set('social_instagram', e.target.value)} className={inp} placeholder="@seurestaurante" />
        </div>
        <div>
          <label className={lbl}>Facebook</label>
          <input value={form.social_facebook} onChange={e => set('social_facebook', e.target.value)} className={inp} placeholder="facebook.com/seurestaurante" />
        </div>
      </div>

      <FakeReviewsManager form={form} set={set} />
    </form>
  );
}
