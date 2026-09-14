import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Star, Search, Loader2, ChevronDown, ChevronUp, Plus, Minus, Edit2, X, Check, UserPlus, Key, Upload, LayoutList, Columns, Trash2, AlertTriangle } from 'lucide-react';

function StarRating({ value, onChange }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map(s => (
        <button key={s} type="button" onClick={() => onChange && onChange(s)}
          onMouseEnter={() => onChange && setHover(s)} onMouseLeave={() => onChange && setHover(0)}>
          <Star size={18} className={`transition-colors ${(hover || value) >= s ? 'fill-amber-400 text-amber-400' : 'text-gray-300'}`} />
        </button>
      ))}
    </div>
  );
}

function CustomerForm({ profile, onSave, onClose }) {
  const [form, setForm] = useState({
    name: profile?.name || '',
    email: profile?.email || '',
    phone: profile?.phone || '',
    admin_notes: profile?.admin_notes || '',
    cashback_balance: profile?.cashback_balance || 0,
    internal_rating: profile?.internal_rating || 5.0,
  });
  const [uploading, setUploading] = useState(false);
  const [photoUrl, setPhotoUrl] = useState(profile?.photo_url || '');
  const [saving, setSaving] = useState(false);

  const handlePhoto = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setPhotoUrl(file_url);
    setUploading(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    const data = { ...form, photo_url: photoUrl };
    if (profile?.id) {
      await base44.entities.CustomerProfile.update(profile.id, data);
    } else {
      await base44.entities.CustomerProfile.create({ ...data, user_id: 'manual_' + Date.now(), total_orders: 0, total_spent: 0 });
    }
    setSaving(false);
    onSave();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-md p-6 space-y-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="font-heading font-bold text-lg">{profile?.id ? 'Editar Cliente' : 'Novo Cliente'}</h3>
          <button onClick={onClose}><X size={20} className="text-gray-400" /></button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          {/* Photo */}
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-gray-100 overflow-hidden flex-shrink-0 flex items-center justify-center">
              {photoUrl
                ? <img src={photoUrl} alt="" className="w-full h-full object-cover" />
                : <span className="text-2xl font-bold text-gray-400">{(form.name || '?')[0]?.toUpperCase()}</span>
              }
            </div>
            <label className="flex items-center gap-2 px-3 py-2 bg-gray-100 rounded-xl text-sm text-gray-600 cursor-pointer hover:bg-gray-200 transition-colors">
              {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
              {uploading ? 'Enviando...' : 'Foto do perfil'}
              <input type="file" accept="image/*" className="hidden" onChange={handlePhoto} disabled={uploading} />
            </label>
          </div>

          {[
            { label: 'Nome', key: 'name', type: 'text', required: true },
            { label: 'E-mail', key: 'email', type: 'email' },
            { label: 'Telefone', key: 'phone', type: 'tel' },
          ].map(f => (
            <div key={f.key}>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{f.label}</label>
              <input
                type={f.type} required={f.required}
                value={form[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                className="w-full mt-1 px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          ))}

          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Saldo de Cashback (R$)</label>
            <input type="number" min="0" step="0.01"
              value={form.cashback_balance} onChange={e => setForm(p => ({ ...p, cashback_balance: parseFloat(e.target.value) || 0 }))}
              className="w-full mt-1 px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Avaliação interna</label>
            <div className="mt-1 flex items-center gap-3">
              <StarRating value={Math.round(form.internal_rating)} onChange={r => setForm(p => ({ ...p, internal_rating: r }))} />
              <span className="text-sm font-bold text-gray-700">{form.internal_rating.toFixed(1)}</span>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Observações internas</label>
            <textarea rows={3} value={form.admin_notes} onChange={e => setForm(p => ({ ...p, admin_notes: e.target.value }))}
              placeholder="Anotações sobre este cliente..."
              className="w-full mt-1 px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
            />
          </div>

          <button type="submit" disabled={saving}
            className="w-full py-3 bg-primary text-white rounded-xl font-bold text-sm disabled:opacity-50 flex items-center justify-center gap-2">
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
            {profile?.id ? 'Salvar alterações' : 'Cadastrar cliente'}
          </button>
        </form>
      </div>
    </div>
  );
}

function CashbackModal({ profile, onClose, onSave }) {
  const [amount, setAmount] = useState('');
  const [type, setType] = useState('add');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!amount) return;
    setSaving(true);
    const delta = parseFloat(amount) * (type === 'add' ? 1 : -1);
    const newBalance = Math.max(0, (profile.cashback_balance || 0) + delta);
    const history = profile.cashback_history || [];
    await base44.entities.CustomerProfile.update(profile.id, {
      cashback_balance: Math.round(newBalance * 100) / 100,
      cashback_history: [...history, {
        type,
        amount: parseFloat(amount),
        reason,
        date: new Date().toISOString(),
      }],
    });
    setSaving(false);
    onSave();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-sm p-6 space-y-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="font-heading font-bold text-lg">Ajuste de Cashback</h3>
          <button onClick={onClose}><X size={20} className="text-gray-400" /></button>
        </div>
        <p className="text-sm text-gray-500">Saldo atual: <span className="font-bold text-gray-800">R$ {(profile.cashback_balance || 0).toFixed(2)}</span></p>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="flex gap-2">
            <button type="button" onClick={() => setType('add')}
              className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-colors ${type === 'add' ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-600'}`}>
              + Adicionar
            </button>
            <button type="button" onClick={() => setType('remove')}
              className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-colors ${type === 'remove' ? 'bg-red-500 text-white' : 'bg-gray-100 text-gray-600'}`}>
              - Remover
            </button>
          </div>
          <input type="number" min="0.01" step="0.01" required placeholder="Valor (R$)"
            value={amount} onChange={e => setAmount(e.target.value)}
            className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
          <input type="text" placeholder="Motivo (opcional)"
            value={reason} onChange={e => setReason(e.target.value)}
            className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
          <button type="submit" disabled={saving}
            className="w-full py-3 bg-primary text-white rounded-xl font-bold text-sm disabled:opacity-50 flex items-center justify-center gap-2">
            {saving ? <Loader2 size={16} className="animate-spin" /> : 'Confirmar ajuste'}
          </button>
        </form>
      </div>
    </div>
  );
}

function ResetPasswordModal({ profile, onClose }) {
  const [tempPassword, setTempPassword] = useState('');
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);

  const generateTemp = () => {
    const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
    let pwd = '';
    for (let i = 0; i < 8; i++) pwd += chars[Math.floor(Math.random() * chars.length)];
    setTempPassword(pwd);
  };

  const sendReset = async () => {
    if (!profile.email) return;
    setSending(true);
    // Send password reset email via platform
    await base44.integrations.Core.SendEmail({
      to: profile.email,
      subject: 'Redefinição de senha',
      body: tempPassword
        ? `Olá ${profile.name || ''},\n\nSua senha temporária é: ${tempPassword}\n\nAcesse o app e altere sua senha após o login.\n\nQualquer dúvida, entre em contato.`
        : `Olá ${profile.name || ''},\n\nClique no link para redefinir sua senha: ${window.location.origin}/forgot-password\n\nQualquer dúvida, entre em contato.`,
    });
    setSending(false);
    setSent(true);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-sm p-6 space-y-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="font-heading font-bold text-lg">Redefinir Senha</h3>
          <button onClick={onClose}><X size={20} className="text-gray-400" /></button>
        </div>
        <p className="text-sm text-gray-500">Cliente: <span className="font-semibold text-gray-800">{profile.name}</span> ({profile.email})</p>

        {sent ? (
          <div className="text-center py-4 space-y-2">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto">
              <Check size={24} className="text-green-600" />
            </div>
            <p className="font-semibold text-green-700">E-mail enviado com sucesso!</p>
            <button onClick={onClose} className="mt-2 text-sm text-primary font-medium">Fechar</button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="bg-gray-50 rounded-xl p-4 space-y-3">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Opção 1 — Link de redefinição</p>
              <p className="text-xs text-gray-500">Envia um e-mail com link para o cliente criar uma nova senha.</p>
              <button onClick={() => { setTempPassword(''); sendReset(); }} disabled={sending || !profile.email}
                className="w-full py-2.5 bg-blue-500 text-white rounded-xl text-sm font-semibold disabled:opacity-40 flex items-center justify-center gap-2">
                {sending ? <Loader2 size={14} className="animate-spin" /> : <Key size={14} />}
                Enviar link de redefinição
              </button>
            </div>

            <div className="bg-gray-50 rounded-xl p-4 space-y-3">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Opção 2 — Senha temporária</p>
              {tempPassword ? (
                <div className="bg-white border-2 border-dashed border-primary/40 rounded-xl p-3 text-center">
                  <p className="text-xs text-gray-400 mb-1">Senha temporária gerada:</p>
                  <p className="font-mono font-bold text-xl text-primary tracking-widest">{tempPassword}</p>
                </div>
              ) : (
                <button onClick={generateTemp}
                  className="w-full py-2.5 bg-orange-500 text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-2">
                  <Key size={14} /> Gerar senha temporária
                </button>
              )}
              {tempPassword && (
                <button onClick={sendReset} disabled={sending || !profile.email}
                  className="w-full py-2.5 bg-green-500 text-white rounded-xl text-sm font-semibold disabled:opacity-40 flex items-center justify-center gap-2">
                  {sending ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                  Enviar por e-mail
                </button>
              )}
            </div>
            {!profile.email && <p className="text-xs text-red-500 text-center">Este cliente não tem e-mail cadastrado.</p>}
          </div>
        )}
      </div>
    </div>
  );
}

const KANBAN_COLS = [
  { id: 'vip', label: '⭐ VIP', color: 'border-amber-300 bg-amber-50' },
  { id: 'regular', label: '🟢 Regular', color: 'border-green-300 bg-green-50' },
  { id: 'new', label: '🆕 Novo', color: 'border-blue-300 bg-blue-50' },
  { id: 'inactive', label: '😴 Inativo', color: 'border-gray-300 bg-gray-50' },
];

function getKanbanCol(profile, orders) {
  const custOrders = orders.filter(o => o.customer_email === profile.email || o.customer_name === profile.name);
  if (custOrders.length === 0) return 'new';
  const lastOrder = custOrders[0];
  const daysSinceLast = (Date.now() - new Date(lastOrder.created_date)) / (1000 * 60 * 60 * 24);
  if (daysSinceLast > 60) return 'inactive';
  if ((profile.internal_rating || 5) >= 4.5 || custOrders.length >= 5) return 'vip';
  return 'regular';
}

export default function Customers() {
  const [profiles, setProfiles] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState(null);
  const [formProfile, setFormProfile] = useState(null);
  const [cashbackProfile, setCashbackProfile] = useState(null);
  const [resetProfile, setResetProfile] = useState(null);
  const [deleteProfile, setDeleteProfile] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [viewMode, setViewMode] = useState('list');

  const load = async () => {
    const [profs, ords] = await Promise.all([
      base44.entities.CustomerProfile.list('-total_orders'),
      base44.entities.Order.list('-created_date', 200),
    ]);
    setProfiles(profs);
    setOrders(ords);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const getCustomerOrders = (profile) =>
    orders.filter(o => o.customer_email === profile.email || o.customer_name === profile.name);

  const updateRating = async (profile, newRating) => {
    await base44.entities.CustomerProfile.update(profile.id, { internal_rating: newRating });
    load();
  };

  const confirmDelete = async () => {
    if (!deleteProfile) return;
    setDeleting(true);
    await base44.entities.CustomerProfile.delete(deleteProfile.id);
    setDeleting(false);
    setDeleteProfile(null);
    load();
  };

  const filtered = profiles.filter(p =>
    !search || p.name?.toLowerCase().includes(search.toLowerCase()) || p.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading font-bold text-2xl text-foreground">Clientes</h1>
          <p className="text-sm text-muted-foreground mt-1">{profiles.length} clientes cadastrados</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex gap-1 bg-muted p-1 rounded-xl">
            <button onClick={() => setViewMode('list')} className={`p-2 rounded-lg transition-colors ${viewMode === 'list' ? 'bg-white shadow-sm text-foreground' : 'text-muted-foreground'}`} title="Lista"><LayoutList size={16} /></button>
            <button onClick={() => setViewMode('kanban')} className={`p-2 rounded-lg transition-colors ${viewMode === 'kanban' ? 'bg-white shadow-sm text-foreground' : 'text-muted-foreground'}`} title="Kanban"><Columns size={16} /></button>
          </div>
          <button onClick={() => setFormProfile({})}
            className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors">
            <UserPlus size={16} /> Novo Cliente
          </button>
        </div>
      </div>

      <div className="relative">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por nome ou e-mail..."
          className="w-full pl-10 pr-4 py-2.5 bg-muted rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="animate-spin text-primary" size={32} /></div>
      ) : viewMode === 'kanban' ? (
        <div className="flex gap-3 overflow-x-auto pb-4">
          {KANBAN_COLS.map(col => {
            const colProfiles = filtered.filter(p => getKanbanCol(p, orders) === col.id);
            return (
              <div key={col.id} className={`flex-shrink-0 w-56 rounded-2xl border-2 ${col.color} p-3 space-y-2`}>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-bold uppercase tracking-wide">{col.label}</p>
                  <span className="text-xs font-bold bg-white/80 rounded-full px-2 py-0.5">{colProfiles.length}</span>
                </div>
                {colProfiles.map(p => (
                  <div key={p.id} className="bg-white rounded-xl p-3 shadow-sm cursor-pointer hover:shadow-md transition-shadow" onClick={() => setExpanded(expanded === p.id ? null : p.id)}>
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary flex-shrink-0">
                        {p.photo_url ? <img src={p.photo_url} className="w-full h-full rounded-full object-cover" alt="" /> : (p.name || '?')[0].toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold truncate">{p.name || 'Cliente'}</p>
                        <p className="text-[10px] text-muted-foreground">{orders.filter(o => o.customer_email === p.email).length} pedidos</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 mt-1.5">
                      <Star size={10} className="fill-amber-400 text-amber-400" />
                      <span className="text-[10px] font-bold">{(p.internal_rating || 5).toFixed(1)}</span>
                      {p.cashback_balance > 0 && <span className="ml-auto text-[10px] text-green-600 font-bold">R$ {p.cashback_balance.toFixed(0)} CB</span>}
                    </div>
                  </div>
                ))}
                {colProfiles.length === 0 && <p className="text-[11px] text-muted-foreground text-center py-3 opacity-60">Vazio</p>}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(profile => {
            const custOrders = getCustomerOrders(profile);
            const isExpanded = expanded === profile.id;
            const avgTicket = custOrders.length ? (profile.total_spent || 0) / custOrders.length : 0;
            const lastOrder = custOrders[0];

            return (
              <div key={profile.id} className="bg-card rounded-2xl border border-border/50 overflow-hidden">
                <button onClick={() => setExpanded(isExpanded ? null : profile.id)}
                  className="w-full px-4 py-4 flex items-center gap-4 text-left hover:bg-accent/30 transition-colors">
                  <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 bg-primary/10 flex items-center justify-center font-bold text-primary text-sm">
                    {profile.photo_url
                      ? <img src={profile.photo_url} alt="" className="w-full h-full object-cover" />
                      : (profile.name || '?')[0].toUpperCase()
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground">{profile.name || 'Cliente'}</p>
                    <p className="text-xs text-muted-foreground">{profile.email || profile.phone || '—'}</p>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <div className="text-right hidden sm:block">
                      <p className="text-xs font-bold text-foreground">{custOrders.length} pedidos</p>
                      <p className="text-xs text-muted-foreground">R$ {(profile.total_spent || 0).toFixed(2)}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Star size={13} className="fill-amber-400 text-amber-400" />
                      <span className="text-xs font-bold">{(profile.internal_rating || 5).toFixed(1)}</span>
                    </div>
                    {isExpanded ? <ChevronUp size={16} className="text-muted-foreground" /> : <ChevronDown size={16} className="text-muted-foreground" />}
                  </div>
                </button>

                {isExpanded && (
                  <div className="px-4 pb-4 border-t border-border/50 pt-4 space-y-4 bg-muted/20">
                    {/* Action buttons */}
                    <div className="flex flex-wrap gap-2">
                      <button onClick={() => setFormProfile(profile)}
                        className="flex items-center gap-1.5 px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors">
                        <Edit2 size={13} /> Editar dados
                      </button>
                      <button onClick={() => setCashbackProfile(profile)}
                        className="flex items-center gap-1.5 px-3 py-2 bg-green-50 border border-green-200 rounded-xl text-xs font-semibold text-green-700 hover:bg-green-100 transition-colors">
                        <Plus size={13} /> Cashback
                      </button>
                      <button onClick={() => setResetProfile(profile)}
                        className="flex items-center gap-1.5 px-3 py-2 bg-blue-50 border border-blue-200 rounded-xl text-xs font-semibold text-blue-700 hover:bg-blue-100 transition-colors">
                        <Key size={13} /> Redefinir senha
                      </button>
                      <button onClick={() => setDeleteProfile(profile)}
                        className="flex items-center gap-1.5 px-3 py-2 bg-red-50 border border-red-200 rounded-xl text-xs font-semibold text-red-600 hover:bg-red-100 transition-colors">
                        <Trash2 size={13} /> Excluir cliente
                      </button>
                    </div>

                    {/* Stats grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {[
                        { label: 'Total pedidos', value: custOrders.length },
                        { label: 'Total gasto', value: `R$ ${(profile.total_spent || 0).toFixed(2)}` },
                        { label: 'Ticket médio', value: `R$ ${avgTicket.toFixed(2)}` },
                        { label: 'Cashback', value: `R$ ${(profile.cashback_balance || 0).toFixed(2)}` },
                      ].map(stat => (
                        <div key={stat.label} className="bg-white rounded-xl p-3 text-center">
                          <p className="text-xs text-muted-foreground">{stat.label}</p>
                          <p className="font-bold text-sm text-foreground mt-0.5">{stat.value}</p>
                        </div>
                      ))}
                    </div>

                    {lastOrder && (
                      <p className="text-xs text-muted-foreground">
                        Último pedido: {new Date(lastOrder.created_date).toLocaleDateString('pt-BR')} — R$ {lastOrder.total?.toFixed(2)}
                      </p>
                    )}

                    {/* Internal rating */}
                    <div className="bg-white rounded-xl p-3 space-y-2">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Avaliação Interna</p>
                      <div className="flex items-center gap-3">
                        <StarRating value={Math.round(profile.internal_rating || 5)} onChange={(r) => updateRating(profile, r)} />
                        <span className="text-sm font-bold">{(profile.internal_rating || 5).toFixed(1)} / 5.0</span>
                      </div>
                    </div>

                    {/* Cashback history */}
                    {profile.cashback_history?.length > 0 && (
                      <div className="bg-white rounded-xl p-3 space-y-2">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Histórico de Cashback</p>
                        <div className="space-y-1 max-h-32 overflow-y-auto">
                          {[...profile.cashback_history].reverse().map((h, i) => (
                            <div key={i} className="flex items-center justify-between text-xs">
                              <div className="flex items-center gap-2">
                                <span className={`font-bold ${h.type === 'add' ? 'text-green-600' : 'text-red-500'}`}>
                                  {h.type === 'add' ? '+' : '-'}R$ {parseFloat(h.amount).toFixed(2)}
                                </span>
                                {h.reason && <span className="text-gray-400">— {h.reason}</span>}
                              </div>
                              <span className="text-gray-400">{new Date(h.date).toLocaleDateString('pt-BR')}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Admin notes */}
                    {profile.admin_notes && (
                      <div className="bg-white rounded-xl p-3">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Observações</p>
                        <p className="text-xs text-gray-600">{profile.admin_notes}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
          {filtered.length === 0 && <div className="text-center py-12 text-muted-foreground">Nenhum cliente encontrado</div>}
        </div>
      )}

      {formProfile !== null && (
        <CustomerForm
          profile={Object.keys(formProfile).length === 0 ? null : formProfile}
          onSave={() => { setFormProfile(null); load(); }}
          onClose={() => setFormProfile(null)}
        />
      )}
      {cashbackProfile && (
        <CashbackModal profile={cashbackProfile} onClose={() => setCashbackProfile(null)} onSave={() => { setCashbackProfile(null); load(); }} />
      )}
      {resetProfile && (
        <ResetPasswordModal profile={resetProfile} onClose={() => setResetProfile(null)} />
      )}
      {deleteProfile && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => !deleting && setDeleteProfile(null)}>
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 space-y-4 text-center" onClick={e => e.stopPropagation()}>
            <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto">
              <AlertTriangle size={28} className="text-red-500" />
            </div>
            <h3 className="font-heading font-bold text-lg">Excluir cliente?</h3>
            <p className="text-sm text-gray-500">
              Tem certeza que deseja excluir <strong className="text-gray-800">{deleteProfile.name}</strong>?
              Esta ação não pode ser desfeita. O histórico de pedidos permanecerá, mas o perfil do cliente será removido.
            </p>
            <div className="flex gap-3 pt-1">
              <button onClick={() => setDeleteProfile(null)} disabled={deleting}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium hover:bg-gray-50 transition-colors disabled:opacity-50">
                Cancelar
              </button>
              <button onClick={confirmDelete} disabled={deleting}
                className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm font-bold hover:bg-red-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                {deleting ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
                {deleting ? 'Excluindo...' : 'Excluir'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}