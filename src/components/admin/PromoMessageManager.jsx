import React, { useEffect, useState } from 'react';
import { Edit2, Megaphone, Plus, Save, ToggleLeft, ToggleRight, Trash2, X } from 'lucide-react';
import { base44 } from '@/api/base44Client';

const emptyForm = () => ({ text: '', is_active: true, start_date: '', end_date: '', sort_order: 0 });

export default function PromoMessageManager({ store, onStoreChange }) {
  const [messages, setMessages] = useState(store?.promo_messages || []);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { setMessages(store?.promo_messages || []); }, [store?.promo_messages]);
  const persist = async nextMessages => {
    if (!store?.id) throw new Error('Loja não encontrada. Atualize a página e tente novamente.');
    const ordered = [...nextMessages].sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0));
    const updatedStore = await base44.entities.Store.update(store.id, { promo_messages: ordered });
    setMessages(ordered);
    onStoreChange?.(previous => ({ ...previous, ...updatedStore, promo_messages: ordered }));
  };
  const startNew = () => { setEditing(null); setForm(emptyForm()); setShowForm(true); };
  const startEdit = message => { setEditing(message); setForm({ text: message.text, is_active: message.is_active, start_date: message.start_date || '', end_date: message.end_date || '', sort_order: message.sort_order || 0 }); setShowForm(true); };
  const save = async () => {
    setSaving(true); setError('');
    try {
      const record = { ...form, text: form.text.trim(), id: editing?.id || crypto.randomUUID() };
      const nextMessages = editing
        ? messages.map(message => message.id === editing.id ? record : message)
        : [...messages, record];
      await persist(nextMessages);
      setShowForm(false); setEditing(null); setForm(emptyForm());
    } catch (saveError) {
      setError(saveError.message || 'Não foi possível salvar a faixa promocional.');
    } finally { setSaving(false); }
  };

  const toggle = async message => {
    setError('');
    try { await persist(messages.map(item => item.id === message.id ? { ...item, is_active: !item.is_active } : item)); }
    catch (saveError) { setError(saveError.message || 'Não foi possível alterar a faixa promocional.'); }
  };

  const remove = async message => {
    setError('');
    try { await persist(messages.filter(item => item.id !== message.id)); }
    catch (saveError) { setError(saveError.message || 'Não foi possível excluir a faixa promocional.'); }
  };

  return <section className="space-y-4 rounded-2xl border border-border/60 bg-card p-4 sm:p-5" aria-labelledby="promo-strip-title">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 id="promo-strip-title" className="flex items-center gap-2 font-heading font-bold"><Megaphone size={18} className="text-primary"/>Faixa promocional do topo</h2><p className="mt-1 text-sm text-muted-foreground">Mensagens rotativas exibidas acima das categorias do cardápio.</p></div><button onClick={startNew} className="flex min-h-11 items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-white"><Plus size={16}/>Nova mensagem</button></div>
    {error&&<p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
    {showForm&&<div className="space-y-3 rounded-xl border border-border bg-muted/40 p-4"><textarea value={form.text} onChange={event=>setForm(previous=>({...previous,text:event.target.value}))} rows={2} placeholder="Texto da mensagem promocional" className="w-full resize-none rounded-xl border border-border bg-white px-3 py-2.5 text-sm"/><div className="grid gap-3 sm:grid-cols-2"><label className="text-xs text-muted-foreground">Início (opcional)<input type="date" value={form.start_date} onChange={event=>setForm(previous=>({...previous,start_date:event.target.value}))} className="mt-1 w-full rounded-xl border border-border bg-white px-3 py-2.5 text-sm"/></label><label className="text-xs text-muted-foreground">Fim (opcional)<input type="date" value={form.end_date} onChange={event=>setForm(previous=>({...previous,end_date:event.target.value}))} className="mt-1 w-full rounded-xl border border-border bg-white px-3 py-2.5 text-sm"/></label></div><div className="flex gap-2"><button onClick={save} disabled={saving||!form.text.trim()} className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-bold text-white disabled:opacity-50"><Save size={16}/>{saving?'Salvando...':'Salvar mensagem'}</button><button aria-label="Cancelar" onClick={()=>setShowForm(false)} className="flex h-11 w-11 items-center justify-center rounded-xl bg-white"><X size={17}/></button></div></div>}
    <div className="space-y-2">{messages.map(message=><article key={message.id} className="flex items-center gap-3 rounded-xl border border-border/60 bg-white p-3"><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{message.text}</p><p className="mt-1 text-xs text-muted-foreground">{message.start_date?`De ${new Date(message.start_date).toLocaleDateString('pt-BR')}`:'Início imediato'}{message.end_date?` até ${new Date(message.end_date).toLocaleDateString('pt-BR')}`:' • sem data final'}</p></div><button aria-label={message.is_active?'Desativar mensagem':'Ativar mensagem'} onClick={()=>toggle(message)}>{message.is_active?<ToggleRight size={26} className="text-green-500"/>:<ToggleLeft size={26} className="text-gray-300"/>}</button><button aria-label="Editar mensagem" onClick={()=>startEdit(message)} className="p-2 text-muted-foreground"><Edit2 size={16}/></button><button aria-label="Excluir mensagem" onClick={()=>remove(message)} className="p-2 text-destructive"><Trash2 size={16}/></button></article>)}{!messages.length&&!showForm&&<p className="py-5 text-center text-sm text-muted-foreground">Nenhuma faixa promocional cadastrada.</p>}</div>
  </section>;
}
