import React, { useState } from 'react';
import { ingredientService } from '@/services/api/catalog';
import { X, Save, Loader2, Info } from 'lucide-react';
import { UNITS, UNIT_LABELS } from '@/lib/recipeCost';

export default function IngredientForm({ ingredient, onClose, onSave }) {
  const isEdit = !!ingredient;
  const [form, setForm] = useState(() => {
    const draft = sessionStorage.getItem('peddi_ingredient_draft');
    if (draft) {
      try {
        const saved = JSON.parse(draft);
        if ((saved.ingredient?.id ?? null) === (ingredient?.id ?? null)) return saved.form;
      } catch { sessionStorage.removeItem('peddi_ingredient_draft'); }
    }
    return ingredient ? {
    name: ingredient.name || '',
    unit: ingredient.unit || 'unidade',
    pack_size: ingredient.pack_size ?? 1,
    stock_min: ingredient.stock_min ?? 0,
  } : {
    name: '', unit: 'unidade', pack_size: 1, quantity_purchased: '', cost: '', stock_min: '',
    };
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [sessionExpired, setSessionExpired] = useState(false);
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (saving) return;
    setError('');
    setSessionExpired(false);
    setSaving(true);
    try {
    if (ingredient) {
      await ingredientService.update(ingredient.id, {
        name: form.name,
        unit: form.unit,
        pack_size: parseFloat(form.pack_size) || 1,
        stock_min: parseFloat(form.stock_min) || 0,
      });
    } else {
      const qty = parseFloat(form.quantity_purchased) || 0;
      const cost = parseFloat(form.cost) || 0;
      await ingredientService.create({
        name: form.name,
        unit: form.unit,
        pack_size: parseFloat(form.pack_size) || 1,
        quantity_purchased: qty,
        cost: cost,
        current_stock: qty,
        stock_min: parseFloat(form.stock_min) || 0,
        movements: [{ type: 'entry', quantity: qty, cost: cost, date: new Date().toISOString(), reason: 'Compra inicial' }],
      });
    }
    sessionStorage.removeItem('peddi_ingredient_draft');
    await onSave();
    } catch (err) {
      if (err.status === 401) {
        sessionStorage.setItem('peddi_ingredient_draft', JSON.stringify({ ingredient, form }));
        setSessionExpired(true);
      }
      setError(err.message || 'Não foi possível salvar o insumo.');
    } finally {
      setSaving(false);
    }
  };

  const inp = "w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30";
  const lbl = "block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide";

  const showPackSize = form.unit === 'pacote';
  const packSize = parseFloat(form.pack_size) || 1;
  const unitCost = form.quantity_purchased > 0
    ? (parseFloat(form.cost) || 0) / (parseFloat(form.quantity_purchased) * (showPackSize ? packSize : 1))
    : 0;

  return (
    <div data-peddi-modal="" className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4 my-4">
        <div className="flex items-center justify-between">
          <h2 className="font-heading font-bold text-lg">{ingredient ? 'Editar Insumo' : 'Novo Insumo'}</h2>
          <button onClick={onClose}><X size={20} className="text-gray-400" /></button>
        </div>

        {isEdit && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl px-3 py-2.5 text-xs text-blue-700 flex items-start gap-2">
            <Info size={14} className="flex-shrink-0 mt-0.5" />
            <div>
              Estoque atual: <strong>{ingredient.current_stock || 0} {UNIT_LABELS[ingredient.unit] || ingredient.unit}</strong>
              <br />Use os botões <strong>Comprar</strong> (entrada) e <strong>Saída</strong> para movimentar o estoque. O estoque é controlado automaticamente pelas movimentações.
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
          {sessionExpired && <a href="/login?returnTo=/admin/estoque" className="block text-sm text-primary underline">Entrar novamente e recuperar este cadastro</a>}
          <div>
            <label className={lbl}>Nome *</label>
            <input required value={form.name} onChange={e => set('name', e.target.value)} className={inp} placeholder="Ex: Pão, Queijo, Bacon..." />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl}>Unidade</label>
              <select value={form.unit} onChange={e => set('unit', e.target.value)} className={inp}>
                {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
            {showPackSize && (
              <div>
                <label className={lbl}>Qtd por pacote</label>
                <input type="number" step="0.01" value={form.pack_size} onChange={e => set('pack_size', e.target.value)} className={inp} placeholder="Ex: 10" />
              </div>
            )}
          </div>

          {!isEdit && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={lbl}>Qtd. comprada *</label>
                  <input type="number" step="0.01" required value={form.quantity_purchased} onChange={e => set('quantity_purchased', e.target.value)} className={inp} placeholder="Ex: 10" />
                </div>
                <div>
                  <label className={lbl}>Custo total (R$) *</label>
                  <input type="number" step="0.01" required value={form.cost} onChange={e => set('cost', e.target.value)} className={inp} placeholder="Ex: 16.00" />
                </div>
              </div>
              {parseFloat(form.quantity_purchased) > 0 && parseFloat(form.cost) > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl px-3 py-2 text-xs text-blue-700">
                  Custo unitário: <strong>R$ {unitCost.toFixed(2)}</strong> por {UNIT_LABELS[form.unit] || form.unit}
                  {showPackSize && ` (R$ ${(parseFloat(form.cost) / parseFloat(form.quantity_purchased)).toFixed(2)} por pacote)`}
                </div>
              )}
            </>
          )}

          <div>
            <label className={lbl}>Estoque mínimo (alerta de reposição)</label>
            <input type="number" step="0.01" value={form.stock_min} onChange={e => set('stock_min', e.target.value)} className={inp} placeholder="0" />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium hover:bg-gray-50">Cancelar</button>
            <button type="submit" disabled={saving} className="flex-1 py-2.5 rounded-xl bg-primary text-white text-sm font-bold disabled:opacity-50 flex items-center justify-center gap-2">
              {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />} Salvar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
