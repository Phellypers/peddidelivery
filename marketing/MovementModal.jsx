import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { X, Loader2, ArrowDownCircle, ArrowUpCircle } from 'lucide-react';
import { UNIT_LABELS } from '@/lib/recipeCost';

export default function MovementModal({ ingredient, initialType, onClose, onSave }) {
  const [type, setType] = useState(initialType || 'entry');
  const [quantity, setQuantity] = useState('');
  const [cost, setCost] = useState('');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const qty = parseFloat(quantity) || 0;
    if (qty <= 0) return;
    setSaving(true);
    const newStock = type === 'entry'
      ? (ingredient.current_stock || 0) + qty
      : (ingredient.current_stock || 0) - qty;
    const movement = {
      type,
      quantity: qty,
      date: new Date().toISOString(),
      reason: reason || (type === 'entry' ? 'Compra' : 'Saída manual'),
    };
    const updateData = {
      current_stock: newStock,
      movements: [...(ingredient.movements || []), movement],
    };
    if (type === 'entry') {
      const purchaseCost = parseFloat(cost) || 0;
      movement.cost = purchaseCost;
      // Weighted average: accumulate total cost and total quantity purchased
      updateData.quantity_purchased = (ingredient.quantity_purchased || 0) + qty;
      updateData.cost = (ingredient.cost || 0) + purchaseCost;
    }
    await base44.entities.Ingredient.update(ingredient.id, updateData);
    setSaving(false);
    onSave();
  };

  const inp = "w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30";
  const movements = [...(ingredient.movements || [])].reverse().slice(0, 15);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4 my-4">
        <div className="flex items-center justify-between">
          <h2 className="font-heading font-bold text-lg">{type === 'entry' ? 'Registrar Compra' : 'Registrar Saída'} — {ingredient.name}</h2>
          <button onClick={onClose}><X size={20} className="text-gray-400" /></button>
        </div>
        <p className="text-xs text-muted-foreground">Estoque atual: <strong>{ingredient.current_stock || 0} {UNIT_LABELS[ingredient.unit] || ingredient.unit}</strong></p>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="flex gap-2">
            <button type="button" onClick={() => setType('entry')} className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-bold border-2 transition-all ${type === 'entry' ? 'bg-green-50 border-green-500 text-green-700' : 'border-gray-200 text-gray-500'}`}>
              <ArrowDownCircle size={16} /> Entrada
            </button>
            <button type="button" onClick={() => setType('exit')} className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-bold border-2 transition-all ${type === 'exit' ? 'bg-red-50 border-red-500 text-red-700' : 'border-gray-200 text-gray-500'}`}>
              <ArrowUpCircle size={16} /> Saída
            </button>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1 block uppercase">Quantidade ({UNIT_LABELS[ingredient.unit] || ingredient.unit})</label>
            <input type="number" step="0.01" required value={quantity} onChange={e => setQuantity(e.target.value)} className={inp} placeholder="0" autoFocus />
          </div>
          {type === 'entry' && (
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1 block uppercase">Custo total desta compra (R$)</label>
              <input type="number" step="0.01" required value={cost} onChange={e => setCost(e.target.value)} className={inp} placeholder="0.00" />
              <p className="text-[10px] text-gray-400 mt-1">O custo médio do insumo será recalculado automaticamente (média ponderada).</p>
            </div>
          )}
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1 block uppercase">Motivo (opcional)</label>
            <input value={reason} onChange={e => setReason(e.target.value)} className={inp} placeholder={type === 'entry' ? 'Ex: Compra de reposição' : 'Ex: Perda, descarte, ajuste...'} />
          </div>
          <button type="submit" disabled={saving || !quantity || (type === 'entry' && !cost)} className="w-full py-2.5 rounded-xl bg-primary text-white text-sm font-bold disabled:opacity-50 flex items-center justify-center gap-2">
            {saving ? <Loader2 size={15} className="animate-spin" /> : null} Confirmar
          </button>
        </form>

        {/* Movement history */}
        {movements.length > 0 && (
          <div className="border-t border-gray-100 pt-3">
            <p className="text-xs font-bold text-gray-500 uppercase mb-2">Histórico de movimentações</p>
            <div className="max-h-40 overflow-y-auto space-y-1.5">
              {movements.map((m, idx) => (
                <div key={idx} className="flex items-center justify-between text-xs p-2 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${m.type === 'entry' ? 'bg-green-500' : 'bg-red-500'}`} />
                    <span className="text-gray-600 truncate">{m.reason || (m.type === 'entry' ? 'Compra' : 'Saída')}</span>
                  </div>
                  <div className="text-right flex-shrink-0 ml-2">
                    <span className={`font-bold ${m.type === 'entry' ? 'text-green-600' : 'text-red-600'}`}>
                      {m.type === 'entry' ? '+' : '−'}{m.quantity} {UNIT_LABELS[ingredient.unit] || ingredient.unit}
                    </span>
                    {m.cost != null && m.type === 'entry' && <span className="text-gray-400 ml-2">R$ {(m.cost || 0).toFixed(2)}</span>}
                    <p className="text-[10px] text-gray-400">{m.date ? new Date(m.date).toLocaleDateString('pt-BR') : ''}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}