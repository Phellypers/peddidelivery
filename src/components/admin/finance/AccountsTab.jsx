import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Plus, Trash2, X, Check, Loader2, ArrowUpCircle, ArrowDownCircle, AlertCircle, Edit2 } from 'lucide-react';

const STATUS_LABELS = { pending: 'Pendente', paid: 'Pago', received: 'Recebido', cancelled: 'Cancelado' };
const STATUS_COLORS = {
  pending: 'bg-amber-100 text-amber-700', paid: 'bg-green-100 text-green-700',
  received: 'bg-green-100 text-green-700', cancelled: 'bg-red-100 text-red-700'
};

function AccountForm({ account, onSave, onClose }) {
  const [form, setForm] = useState({
    description: account?.description || '',
    type: account?.type || 'payable',
    amount: account?.amount || '',
    due_date: account?.due_date || '',
    status: account?.status || 'pending',
    category: account?.category || '',
    notes: account?.notes || '',
    is_recurring: account?.is_recurring || false,
  });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    const data = { ...form, amount: parseFloat(form.amount) || 0 };
    if (account?.id) await base44.entities.Account.update(account.id, data);
    else await base44.entities.Account.create(data);
    setSaving(false);
    onSave();
  };

  const inp = "w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30";
  const lbl = "block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide";

  return (
    <div data-peddi-modal="" className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-md p-6 space-y-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="font-heading font-bold text-lg">{account?.id ? 'Editar conta' : 'Nova conta'}</h3>
          <button onClick={onClose}><X size={20} className="text-gray-400" /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div><label className={lbl}>Descrição *</label><input value={form.description} onChange={e => set('description', e.target.value)} required className={inp} placeholder="Ex: Aluguel, Fornecedor, Venda" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={lbl}>Tipo *</label><select value={form.type} onChange={e => set('type', e.target.value)} className={inp}><option value="payable">A pagar</option><option value="receivable">A receber</option></select></div>
            <div><label className={lbl}>Valor (R$) *</label><input type="number" step="0.01" min="0" value={form.amount} onChange={e => set('amount', e.target.value)} required className={inp} placeholder="0,00" /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={lbl}>Vencimento *</label><input type="date" value={form.due_date} onChange={e => set('due_date', e.target.value)} required className={inp} /></div>
            <div><label className={lbl}>Status</label><select value={form.status} onChange={e => set('status', e.target.value)} className={inp}>{Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
          </div>
          <div>
            <label className={lbl}>Categoria</label>
            <input list="fin-category-list" value={form.category} onChange={e => set('category', e.target.value)} className={inp} placeholder="Selecione ou digite" />
            <datalist id="fin-category-list">
              <option value="Receita" />
              <option value="Despesa Fixa" />
              <option value="Despesa Variável" />
              <option value="Custo de Produto" />
              <option value="Imposto" />
              <option value="Fornecedor" />
              <option value="Aluguel" />
              <option value="Salários" />
              <option value="Marketing" />
              <option value="Equipamentos" />
              <option value="Outro" />
            </datalist>
          </div>
          <div><label className={lbl}>Observações</label><textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={2} className={inp + ' resize-none'} /></div>
          <label className="flex items-center gap-2 text-sm cursor-pointer"><input type="checkbox" checked={form.is_recurring} onChange={e => set('is_recurring', e.target.checked)} className="w-4 h-4 rounded accent-primary" /><span>Conta recorrente</span></label>
          <button type="submit" disabled={saving} className="w-full py-3 bg-primary text-white rounded-xl font-bold text-sm disabled:opacity-50 flex items-center justify-center gap-2">
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
            {saving ? 'Salvando...' : 'Salvar'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function AccountsTab() {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [editing, setEditing] = useState(null);
  const [showForm, setShowForm] = useState(false);

  const load = async () => {
    const data = await base44.entities.Account.list('-due_date');
    setAccounts(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const markSettled = async (account) => {
    const newStatus = account.type === 'payable' ? 'paid' : 'received';
    await base44.entities.Account.update(account.id, { status: newStatus, paid_date: new Date().toISOString().split('T')[0] });
    load();
  };

  const remove = async (account) => {
    await base44.entities.Account.delete(account.id);
    load();
  };

  const today = new Date().toISOString().split('T')[0];
  const filtered = accounts.filter(a => {
    if (filter === 'all') return true;
    if (filter === 'pending') return a.status === 'pending';
    if (filter === 'overdue') return a.status === 'pending' && a.due_date < today;
    return a.type === filter;
  });

  const payables = accounts.filter(a => a.type === 'payable' && a.status === 'pending');
  const receivables = accounts.filter(a => a.type === 'receivable' && a.status === 'pending');
  const overdue = accounts.filter(a => a.status === 'pending' && a.due_date < today);
  const totalPayable = payables.reduce((s, a) => s + (a.amount || 0), 0);
  const totalReceivable = receivables.reduce((s, a) => s + (a.amount || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Contas a pagar e receber</p>
        <button onClick={() => { setEditing(null); setShowForm(true); }} className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors">
          <Plus size={16} /> Nova conta
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-card rounded-2xl border border-border/50 p-4">
          <div className="flex items-center gap-2 mb-2"><ArrowDownCircle size={18} className="text-red-500" /><span className="text-xs font-semibold text-muted-foreground uppercase">A pagar</span></div>
          <p className="font-heading font-bold text-xl text-red-600">R$ {totalPayable.toFixed(2)}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{payables.length} pendente(s)</p>
        </div>
        <div className="bg-card rounded-2xl border border-border/50 p-4">
          <div className="flex items-center gap-2 mb-2"><ArrowUpCircle size={18} className="text-green-500" /><span className="text-xs font-semibold text-muted-foreground uppercase">A receber</span></div>
          <p className="font-heading font-bold text-xl text-green-600">R$ {totalReceivable.toFixed(2)}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{receivables.length} pendente(s)</p>
        </div>
        <div className="bg-card rounded-2xl border border-border/50 p-4">
          <div className="flex items-center gap-2 mb-2"><AlertCircle size={18} className="text-orange-500" /><span className="text-xs font-semibold text-muted-foreground uppercase">Vencidas</span></div>
          <p className="font-heading font-bold text-xl text-orange-600">{overdue.length}</p>
          <p className="text-xs text-muted-foreground mt-0.5">em atraso</p>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        {[{ id: 'all', label: 'Todas' }, { id: 'payable', label: 'A pagar' }, { id: 'receivable', label: 'A receber' }, { id: 'pending', label: 'Pendentes' }, { id: 'overdue', label: 'Vencidas' }].map(f => (
          <button key={f.id} onClick={() => setFilter(f.id)} className={`px-3 py-1.5 rounded-xl text-sm font-medium transition-colors ${filter === f.id ? 'bg-primary text-white' : 'bg-muted text-foreground hover:bg-accent'}`}>{f.label}</button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="animate-spin text-primary" size={32} /></div>
      ) : (
        <div className="space-y-2">
          {filtered.map(account => {
            const isOverdue = account.status === 'pending' && account.due_date < today;
            return (
              <div key={account.id} className={`bg-card rounded-2xl border p-4 flex items-center gap-4 ${isOverdue ? 'border-orange-300 bg-orange-50/50' : 'border-border/50'}`}>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${account.type === 'payable' ? 'bg-red-50 text-red-500' : 'bg-green-50 text-green-500'}`}>
                  {account.type === 'payable' ? <ArrowDownCircle size={20} /> : <ArrowUpCircle size={20} />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-foreground truncate">{account.description}</p>
                    {isOverdue && <span className="text-[10px] font-bold text-white bg-orange-500 rounded-full px-2 py-0.5 flex-shrink-0">VENCIDA</span>}
                    {account.is_recurring && <span className="text-[10px] font-bold text-white bg-blue-500 rounded-full px-2 py-0.5 flex-shrink-0">RECORRENTE</span>}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                    <span>Venc: {new Date(account.due_date).toLocaleDateString('pt-BR')}</span>
                    {account.category && <span>· {account.category}</span>}
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className={`font-heading font-bold ${account.type === 'payable' ? 'text-red-600' : 'text-green-600'}`}>R$ {(account.amount || 0).toFixed(2)}</p>
                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[account.status]}`}>{STATUS_LABELS[account.status]}</span>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  {account.status === 'pending' && (
                    <button onClick={() => markSettled(account)} title="Marcar como pago/recebido" className="p-2 hover:bg-green-50 rounded-lg text-green-600 transition-colors"><Check size={16} /></button>
                  )}
                  <button onClick={() => { setEditing(account); setShowForm(true); }} className="p-2 hover:bg-accent rounded-lg text-muted-foreground transition-colors"><Edit2 size={15} /></button>
                  <button onClick={() => remove(account)} className="p-2 hover:bg-red-50 rounded-lg text-red-400 transition-colors"><Trash2 size={15} /></button>
                </div>
              </div>
            );
          })}
          {filtered.length === 0 && <div className="text-center py-12 text-muted-foreground">Nenhuma conta encontrada</div>}
        </div>
      )}

      {showForm && (
        <AccountForm account={editing} onSave={() => { setShowForm(false); setEditing(null); load(); }} onClose={() => { setShowForm(false); setEditing(null); }} />
      )}
    </div>
  );
}