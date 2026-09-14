import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Plus, Edit, Trash2, Loader2, Package, AlertTriangle, Minus, Boxes } from 'lucide-react';
import { UNIT_LABELS } from '@/lib/recipeCost';
import IngredientForm from '@/components/admin/IngredientForm';
import MovementModal from '@/components/admin/MovementModal';

export default function Estoque() {
  const [ingredients, setIngredients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [movement, setMovement] = useState(null);

  const load = async () => {
    const data = await base44.entities.Ingredient.list('name');
    setIngredients(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const lowStock = ingredients.filter(i => (i.stock_min || 0) > 0 && (i.current_stock || 0) <= (i.stock_min || 0));
  const totalValue = ingredients.reduce((s, i) => {
    const packSize = i.pack_size || 1;
    const totalBase = (i.quantity_purchased || 0) * (i.unit === 'pacote' ? packSize : 1) * (i.unit === 'quilo' || i.unit === 'litro' ? 1000 : 1);
    const unitCost = totalBase > 0 ? (i.cost || 0) / totalBase : 0;
    const stockBase = (i.current_stock || 0) * (i.unit === 'pacote' ? packSize : 1) * (i.unit === 'quilo' || i.unit === 'litro' ? 1000 : 1);
    return s + unitCost * stockBase;
  }, 0);

  const remove = async (id) => {
    if (!confirm('Excluir este insumo?')) return;
    await base44.entities.Ingredient.delete(id);
    load();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading font-bold text-2xl text-foreground">Estoque & Insumos</h1>
          <p className="text-sm text-muted-foreground mt-1">{ingredients.length} insumos · {lowStock.length} com estoque baixo</p>
        </div>
        <button onClick={() => { setEditing(null); setShowForm(true); }} className="flex items-center gap-2 bg-primary text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-primary/90">
          <Plus size={18} /> Novo insumo
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-card rounded-2xl border border-border/50 p-4">
          <div className="flex items-center gap-2 mb-1"><Boxes size={16} className="text-primary" /><span className="text-xs text-muted-foreground">Insumos</span></div>
          <p className="font-heading font-bold text-2xl text-foreground">{ingredients.length}</p>
        </div>
        <div className="bg-card rounded-2xl border border-border/50 p-4">
          <div className="flex items-center gap-2 mb-1"><AlertTriangle size={16} className="text-orange-500" /><span className="text-xs text-muted-foreground">Estoque baixo</span></div>
          <p className="font-heading font-bold text-2xl text-orange-600">{lowStock.length}</p>
        </div>
        <div className="bg-card rounded-2xl border border-border/50 p-4">
          <div className="flex items-center gap-2 mb-1"><Package size={16} className="text-green-500" /><span className="text-xs text-muted-foreground">Valor em estoque</span></div>
          <p className="font-heading font-bold text-2xl text-green-600">R$ {totalValue.toFixed(2)}</p>
        </div>
      </div>

      {/* Low stock alerts */}
      {lowStock.length > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle size={18} className="text-orange-500" />
            <p className="font-semibold text-orange-800">Alerta de reposição</p>
          </div>
          <div className="space-y-1.5">
            {lowStock.map(ing => (
              <div key={ing.id} className="flex items-center justify-between text-sm">
                <span className="text-orange-700">{ing.name}</span>
                <span className="text-orange-600 font-medium">{ing.current_stock || 0} {UNIT_LABELS[ing.unit] || ing.unit} (mín: {ing.stock_min})</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Ingredient list */}
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="animate-spin text-primary" size={32} /></div>
      ) : ingredients.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground"><Boxes size={40} className="mx-auto mb-3 opacity-30" /><p>Nenhum insumo cadastrado</p></div>
      ) : (
        <div className="grid gap-3">
          {ingredients.map(ing => {
            const isLow = (ing.stock_min || 0) > 0 && (ing.current_stock || 0) <= (ing.stock_min || 0);
            const packSize = ing.pack_size || 1;
            const totalBase = (ing.quantity_purchased || 0) * (ing.unit === 'pacote' ? packSize : 1) * (ing.unit === 'quilo' || ing.unit === 'litro' ? 1000 : 1);
            const unitCost = totalBase > 0 ? (ing.cost || 0) / totalBase : 0;
            return (
              <div key={ing.id} className={`bg-card rounded-2xl border p-4 flex items-center gap-3 ${isLow ? 'border-orange-300' : 'border-border/50'}`}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-foreground">{ing.name}</p>
                    <span className="text-[10px] bg-muted text-muted-foreground px-2 py-0.5 rounded-full">{UNIT_LABELS[ing.unit] || ing.unit}</span>
                    {isLow && <span className="text-[10px] bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-bold">⚠️ Baixo</span>}
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                    <span>Estoque: <strong className={isLow ? 'text-orange-600' : 'text-foreground'}>{ing.current_stock || 0} {UNIT_LABELS[ing.unit] || ing.unit}</strong></span>
                    <span>Mín: {ing.stock_min || 0}</span>
                    <span>R$ {unitCost.toFixed(2)}/{UNIT_LABELS[ing.unit] || ing.unit}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button onClick={() => setMovement({ ingredient: ing, type: 'entry' })} className="p-2 hover:bg-green-50 rounded-lg" title="Registrar compra">
                    <Plus size={16} className="text-green-500" />
                  </button>
                  <button onClick={() => setMovement({ ingredient: ing, type: 'exit' })} className="p-2 hover:bg-orange-50 rounded-lg" title="Registrar saída">
                    <Minus size={16} className="text-orange-500" />
                  </button>
                  <button onClick={() => { setEditing(ing); setShowForm(true); }} className="p-2 hover:bg-accent rounded-lg">
                    <Edit size={16} className="text-muted-foreground" />
                  </button>
                  <button onClick={() => remove(ing.id)} className="p-2 hover:bg-red-50 rounded-lg">
                    <Trash2 size={16} className="text-red-400" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showForm && <IngredientForm ingredient={editing} onClose={() => setShowForm(false)} onSave={() => { setShowForm(false); load(); }} />}
      {movement && <MovementModal ingredient={movement.ingredient} initialType={movement.type} onClose={() => setMovement(null)} onSave={() => { setMovement(null); load(); }} />}
    </div>
  );
}