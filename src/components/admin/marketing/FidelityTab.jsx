import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Plus, Trash2, Save, X, Loader2, ToggleLeft, ToggleRight, Search } from 'lucide-react';

export default function FidelityTab({ products }) {
  const [rules, setRules] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ product_id: '', product_name: '', cashback_amount: 0, is_active: true });
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');

  const load = () => base44.entities.CashbackRule.list().then(setRules);
  useEffect(() => { load(); }, []);

  const save = async () => {
    setSaving(true);
    const product = products.find(p => p.id === form.product_id);
    const data = { ...form, product_name: product?.name || form.product_name };
    await base44.entities.CashbackRule.create(data);
    setSaving(false); setShowForm(false);
    setForm({ product_id: '', product_name: '', cashback_amount: 0, is_active: true });
    load();
  };

  const filteredProducts = products.filter(p => !search || p.name?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Vincule produtos e defina o cashback por compra</p>
        <button onClick={() => { setShowForm(true); setForm({ product_id: '', product_name: '', cashback_amount: 0, is_active: true }); }} className="flex items-center gap-1.5 px-3 py-2 bg-primary text-white rounded-xl text-sm font-bold">
          <Plus size={15} /> Nova regra
        </button>
      </div>

      {showForm && (
        <div className="bg-muted/50 rounded-2xl p-5 space-y-3 border border-border">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar produto..." className="w-full pl-9 pr-3 py-2.5 bg-white rounded-xl text-sm border border-border/50 focus:outline-none focus:ring-2 focus:ring-primary/20" />
          </div>
          <div className="max-h-48 overflow-y-auto space-y-1">
            {filteredProducts.map(p => (
              <div key={p.id} onClick={() => setForm(f => ({ ...f, product_id: p.id, product_name: p.name }))} className={`flex items-center gap-2 px-3 py-2 rounded-xl cursor-pointer text-sm transition-colors ${form.product_id === p.id ? 'bg-primary/10 border border-primary' : 'bg-white border border-border/50 hover:bg-accent/50'}`}>
                {p.images?.[0] && <img src={p.images[0]} className="w-8 h-8 rounded-lg object-cover" alt="" />}
                <span className="truncate font-medium flex-1">{p.name}</span>
                <span className="text-muted-foreground text-xs flex-shrink-0">R$ {(p.promo_price || p.price)?.toFixed(2)}</span>
              </div>
            ))}
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Cashback por item (R$)</label>
            <input type="number" step="0.01" min="0" value={form.cashback_amount} onChange={e => setForm(f => ({ ...f, cashback_amount: parseFloat(e.target.value) || 0 }))} className="w-full px-3 py-2.5 bg-white rounded-xl text-sm border border-border/50 focus:outline-none focus:ring-2 focus:ring-primary/20" />
          </div>
          <div className="flex gap-2">
            <button onClick={save} disabled={saving || !form.product_id} className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-primary text-white rounded-xl text-sm font-bold disabled:opacity-50">
              {saving ? <Loader2 size={15} className="animate-spin" /> : <><Save size={15} /> Salvar</>}
            </button>
            <button onClick={() => setShowForm(false)} className="px-4 py-2.5 bg-muted rounded-xl text-sm"><X size={15} /></button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {rules.map(r => (
          <div key={r.id} className="bg-card rounded-2xl border border-border/50 p-4 flex items-center gap-3">
            <div className="flex-1">
              <p className="font-semibold text-sm">{r.product_name || 'Produto'}</p>
              <p className="text-xs text-green-600 font-bold mt-0.5">R$ {r.cashback_amount?.toFixed(2)} de cashback por item</p>
            </div>
            <button onClick={() => base44.entities.CashbackRule.update(r.id, { is_active: !r.is_active }).then(load)}>
              {r.is_active ? <ToggleRight size={26} className="text-green-500" /> : <ToggleLeft size={26} className="text-gray-300" />}
            </button>
            <button onClick={() => base44.entities.CashbackRule.delete(r.id).then(load)} className="p-1.5 hover:bg-destructive/10 rounded-lg"><Trash2 size={15} className="text-destructive" /></button>
          </div>
        ))}
        {rules.length === 0 && !showForm && <p className="text-center text-sm text-muted-foreground py-8">Nenhuma regra de cashback criada</p>}
      </div>
    </div>
  );
}