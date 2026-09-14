import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, Edit2, X, Check, Loader2, Users, UtensilsCrossed } from 'lucide-react';

const STATUS_CONFIG = {
  free: { label: 'Livre', color: 'bg-green-50 border-green-300 text-green-700', dot: 'bg-green-500' },
  open: { label: 'Pedido em aberto', color: 'bg-orange-50 border-orange-300 text-orange-700', dot: 'bg-orange-500' },
  awaiting_payment: { label: 'Aguardando pgto', color: 'bg-purple-50 border-purple-300 text-purple-700', dot: 'bg-purple-500' },
};

export default function Tables() {
  const [tables, setTables] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [comandaTable, setComandaTable] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editTable, setEditTable] = useState(null);
  const [form, setForm] = useState({ name: '', seats: 0 });
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();

  const load = async () => {
    const [tbls, ords] = await Promise.all([
      base44.entities.Table.list('sort_order'),
      base44.entities.Order.list('-created_date', 50),
    ]);
    setTables(tbls);
    setOrders(ords);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const save = async () => {
    setSaving(true);
    if (editTable) await base44.entities.Table.update(editTable.id, form);
    else await base44.entities.Table.create(form);
    setSaving(false); setShowForm(false); setEditTable(null);
    setForm({ name: '', seats: 0 });
    load();
  };

  const freeTable = async (t) => {
    await base44.entities.Table.update(t.id, { status: 'free', current_order_id: '', current_order_number: '' });
    load();
  };

  const remove = async (t) => {
    await base44.entities.Table.delete(t.id);
    load();
  };

  const openPDV = (t) => {
    navigate(`/admin/pdv?table=${t.id}`);
  };

  const inp = "w-full px-3 py-2.5 bg-muted rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading font-bold text-2xl text-foreground">Mesas e Comandas</h1>
          <p className="text-sm text-muted-foreground mt-1">Gerencie o atendimento no salão</p>
        </div>
        <button onClick={() => { setEditTable(null); setForm({ name: '', seats: 0 }); setShowForm(true); }} className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors">
          <Plus size={16} /> Nova mesa
        </button>
      </div>

      {showForm && (
        <div className="bg-card rounded-2xl border border-border/50 p-4 flex items-end gap-3 flex-wrap">
          <div className="flex-1 min-w-[180px]">
            <label className="text-xs font-semibold text-muted-foreground mb-1 block">Nome da mesa *</label>
            <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Ex: Mesa 01, Balcão, Terrazzo" className={inp} />
          </div>
          <div className="w-24">
            <label className="text-xs font-semibold text-muted-foreground mb-1 block">Lugares</label>
            <input type="number" min="0" value={form.seats} onChange={e => setForm(p => ({ ...p, seats: parseInt(e.target.value) || 0 }))} className={inp} />
          </div>
          <button onClick={save} disabled={saving || !form.name} className="px-4 py-2.5 bg-primary text-white rounded-xl text-sm font-bold disabled:opacity-50 flex items-center gap-1">
            {saving ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />} Salvar
          </button>
          <button onClick={() => setShowForm(false)} className="px-3 py-2.5 bg-muted rounded-xl text-sm"><X size={15} /></button>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="animate-spin text-primary" size={32} /></div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {tables.map(t => {
            const config = STATUS_CONFIG[t.status] || STATUS_CONFIG.free;
            return (
              <div key={t.id} className={`rounded-2xl border-2 p-4 space-y-3 ${config.color}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <UtensilsCrossed size={18} />
                    <p className="font-heading font-bold text-sm">{t.name}</p>
                  </div>
                  <div className={`w-2.5 h-2.5 rounded-full ${config.dot}`} />
                </div>
                {t.seats > 0 && <p className="text-xs opacity-70 flex items-center gap-1"><Users size={11} /> {t.seats} lugares</p>}
                {(() => { const ord = orders.find(o => o.id === t.current_order_id); return (
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold">{config.label}</span>
                    {ord ? <span className="text-xs font-bold">R$ {ord.total?.toFixed(2)}</span> : t.current_order_number && <span className="text-xs font-bold">#{t.current_order_number}</span>}
                  </div>
                ); })()}
                <div className="flex gap-1 pt-1" onClick={e => e.stopPropagation()}>
                  {t.status === 'free' ? (
                    <button onClick={() => openPDV(t)} className="flex-1 text-xs py-1.5 bg-white/70 rounded-lg font-medium hover:bg-white transition-colors">
                      Abrir pedido
                    </button>
                  ) : (
                    <>
                      <button onClick={() => setComandaTable(t)} className="flex-1 text-xs py-1.5 bg-white/70 rounded-lg font-medium hover:bg-white transition-colors">
                        Ver comanda
                      </button>
                      <button onClick={() => openPDV(t)} className="px-2 py-1.5 bg-white/70 rounded-lg hover:bg-white transition-colors" title="Adicionar itens">
                        <Plus size={12} />
                      </button>
                      <button onClick={() => freeTable(t)} className="px-2 py-1.5 bg-white/70 rounded-lg hover:bg-white transition-colors" title="Liberar mesa">
                        <Check size={12} />
                      </button>
                    </>
                  )}
                  <button onClick={() => { setEditTable(t); setForm({ name: t.name, seats: t.seats || 0 }); setShowForm(true); }} className="px-2 py-1.5 bg-white/70 rounded-lg hover:bg-white transition-colors">
                    <Edit2 size={12} />
                  </button>
                  <button onClick={() => remove(t)} className="px-2 py-1.5 bg-white/70 rounded-lg hover:bg-white transition-colors text-red-500">
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            );
          })}
          {tables.length === 0 && (
            <div className="col-span-full text-center py-12 text-muted-foreground">
              <UtensilsCrossed size={32} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm">Nenhuma mesa cadastrada. Crie mesas ou áreas como "Balcão" para começar.</p>
            </div>
          )}
        </div>
      )}

      {comandaTable && (() => {
        const ord = orders.find(o => o.id === comandaTable.current_order_id);
        if (!ord) return null;
        return (
          <div data-peddi-modal="" className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setComandaTable(null)}>
            <div className="bg-white rounded-2xl w-full max-w-md p-5 space-y-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-heading font-bold text-base">Comanda — {comandaTable.name}</h3>
                  <p className="text-xs text-muted-foreground">Pedido #{ord.order_number}</p>
                </div>
                <button onClick={() => setComandaTable(null)}><X size={18} className="text-gray-400" /></button>
              </div>
              <div className="space-y-2">
                {ord.items?.map((item, i) => (
                  <div key={i} className="flex items-center gap-2 p-2 bg-gray-50 rounded-xl">
                    <img src={item.product_image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=60'} alt="" className="w-9 h-9 rounded-lg object-cover flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{item.product_name}</p>
                      {item.notes && <p className="text-xs text-orange-600 italic">"{item.notes}"</p>}
                    </div>
                    <span className="text-sm font-bold">{item.quantity}x</span>
                    <span className="text-sm font-bold text-primary">R$ {(item.unit_price * item.quantity).toFixed(2)}</span>
                  </div>
                ))}
              </div>
              <div className="border-t border-gray-100 pt-3 flex justify-between font-heading font-bold text-base">
                <span>Total</span>
                <span className="text-primary">R$ {ord.total?.toFixed(2)}</span>
              </div>
              <div className="flex gap-2">
                <button onClick={() => navigate(`/admin/pdv?table=${comandaTable.id}`)} className="flex-1 py-2.5 bg-gray-100 text-gray-700 rounded-xl text-sm font-bold hover:bg-gray-200 transition-colors flex items-center justify-center gap-1">
                  <Plus size={14} /> Adicionar itens
                </button>
                <button onClick={() => navigate(`/admin/pdv?order=${ord.id}&table=${comandaTable.id}`)} className="flex-1 py-2.5 bg-green-600 text-white rounded-xl text-sm font-bold hover:bg-green-700 transition-colors flex items-center justify-center gap-1">
                  <Check size={14} /> Finalizar
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}