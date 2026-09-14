import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { base44 } from '@/api/base44Client';
import { ArrowLeft, Save, Loader2, User, Phone, Mail, MapPin } from 'lucide-react';
import { Link } from 'react-router-dom';

const inp = "w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30";
const lbl = "block text-xs font-semibold text-gray-500 mb-1";

export default function MyData() {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState({ name: '', phone: '', email: '', address: '', city: '', zip: '', delivery_notes: '' });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    base44.entities.CustomerProfile.filter({ user_id: user.id }).then(res => {
      const p = res[0];
      if (p) {
        setProfile(p);
        setForm({
          name: p.name || user.full_name || '',
          phone: p.phone || '',
          email: p.email || user.email || '',
          address: p.address || '',
          city: p.city || '',
          zip: p.zip || '',
          delivery_notes: p.delivery_notes || '',
        });
      } else {
        setForm(f => ({ ...f, name: user.full_name || '', email: user.email || '' }));
      }
    });
  }, [user]);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    const data = { ...form, user_id: user.id };
    if (profile?.id) {
      await base44.entities.CustomerProfile.update(profile.id, data);
    } else {
      const p = await base44.entities.CustomerProfile.create(data);
      setProfile(p);
    }
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-lg mx-auto bg-white min-h-screen">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white border-b border-gray-100 px-4 flex items-center h-14">
          <Link to="/perfil" className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors">
            <ArrowLeft size={20} />
          </Link>
          <h1 className="font-heading font-bold text-lg ml-2">Meus Dados</h1>
        </div>

        <form onSubmit={handleSave} className="p-4 space-y-5 pb-24">
          {/* Dados pessoais */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <User size={18} className="text-primary" />
              <h2 className="font-heading font-semibold text-gray-800">Dados pessoais</h2>
            </div>
            <div>
              <label className={lbl}>Nome completo</label>
              <input value={form.name} onChange={e => set('name', e.target.value)} className={inp} placeholder="Seu nome" />
            </div>
            <div>
              <label className={lbl}>WhatsApp</label>
              <input value={form.phone} onChange={e => set('phone', e.target.value)} className={inp} placeholder="(11) 99999-9999" />
            </div>
            <div>
              <label className={lbl}>E-mail</label>
              <input type="email" value={form.email} onChange={e => set('email', e.target.value)} className={inp} placeholder="seu@email.com" />
            </div>
          </div>

          {/* Endereço de entrega */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <MapPin size={18} className="text-primary" />
              <h2 className="font-heading font-semibold text-gray-800">Endereço de entrega</h2>
            </div>
            <div>
              <label className={lbl}>Endereço completo</label>
              <input value={form.address} onChange={e => set('address', e.target.value)} className={inp} placeholder="Rua, número" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={lbl}>Cidade</label>
                <input value={form.city} onChange={e => set('city', e.target.value)} className={inp} placeholder="Sua cidade" />
              </div>
              <div>
                <label className={lbl}>CEP</label>
                <input value={form.zip} onChange={e => set('zip', e.target.value)} className={inp} placeholder="00000-000" />
              </div>
            </div>
            <div>
              <label className={lbl}>Complemento / Referência</label>
              <input value={form.delivery_notes} onChange={e => set('delivery_notes', e.target.value)} className={inp} placeholder="Ap. 12, próximo ao..." />
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl font-heading font-bold text-sm transition-all ${saved ? 'bg-green-500 text-white' : 'bg-primary text-white hover:bg-primary/90'} disabled:opacity-50`}
          >
            {saving ? <Loader2 size={18} className="animate-spin" /> : saved ? '✓ Dados salvos!' : <><Save size={18} /> Salvar dados</>}
          </button>
        </form>
      </div>
    </div>
  );
}