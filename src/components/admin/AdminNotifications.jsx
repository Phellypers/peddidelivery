import React, { useEffect, useMemo, useState } from 'react';
import { Bell, Check, ChevronRight, Megaphone, Package, Settings, ShoppingBag, Truck, X } from 'lucide-react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';

const tabs = [['all','Todas'],['orders','Pedidos'],['system','Sistema'],['marketing','Marketing'],['read','Lidas']];
const iconFor = type => type?.includes('order') ? ShoppingBag : type?.includes('deliver') ? Truck : type?.includes('product') || type?.includes('stock') ? Package : type?.includes('campaign') || type?.includes('marketing') ? Megaphone : Settings;
const groupFor = type => type?.includes('order') || type?.includes('deliver') ? 'orders' : type?.includes('campaign') || type?.includes('marketing') ? 'marketing' : 'system';
const relative = value => { const seconds=Math.max(1,Math.floor((Date.now()-Date.parse(value))/1000)); if(seconds<60)return'Agora mesmo';if(seconds<3600)return`${Math.floor(seconds/60)} min atrás`;if(seconds<86400)return`${Math.floor(seconds/3600)} h atrás`;return`${Math.floor(seconds/86400)} dia(s) atrás`; };

export default function AdminNotifications(){
  const { user }=useAuth(); const navigate=useNavigate();
  const [open,setOpen]=useState(false),[active,setActive]=useState('all'),[items,setItems]=useState([]);
  const load=()=>base44.entities.Notification.list('-created_date',200).then(rows=>setItems(rows.filter(n=>n.audience==='manager'||n.user_id===user?.id))).catch(()=>setItems([]));
  useEffect(()=>{load();const unsub=base44.entities.Notification.subscribe(load);return unsub;},[user?.id]);
  const unread=items.filter(n=>!n.is_read).length;
  const filtered=useMemo(()=>items.filter(n=>active==='read'?n.is_read:active==='all'?!n.is_read:!n.is_read&&groupFor(n.type)===active),[items,active]);
  const counts=Object.fromEntries(tabs.map(([id])=>[id,id==='read'?items.filter(n=>n.is_read).length:id==='all'?unread:items.filter(n=>!n.is_read&&groupFor(n.type)===id).length]));
  const mark=async n=>{if(!n.is_read){setItems(old=>old.map(x=>x.id===n.id?{...x,is_read:true}:x));await base44.entities.Notification.update(n.id,{is_read:true});}};
  const destination=n=>n.reference_type==='product'?`/admin/catalogo?edit=${n.reference_id}`:n.reference_type==='order'?`/admin/pedidos?order=${n.reference_id}`:groupFor(n.type)==='marketing'?'/admin/marketing':'/admin';
  const openItem=async n=>{await mark(n);setOpen(false);navigate(destination(n));};
  const markAll=async()=>{const pending=items.filter(n=>!n.is_read);setItems(old=>old.map(n=>({...n,is_read:true})));await Promise.all(pending.map(n=>base44.entities.Notification.update(n.id,{is_read:true})));setActive('read');};
  return <div className="relative">
    <button type="button" aria-label="Notificações do gestor" aria-expanded={open} onClick={()=>setOpen(v=>!v)} className="relative flex h-11 w-11 items-center justify-center rounded-xl text-gray-700 hover:bg-gray-100"><Bell size={21}/>{unread>0&&<span className="absolute right-1 top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">{unread>99?'99+':unread}</span>}</button>
    {open&&createPortal(<><button aria-label="Fechar notificações" className="fixed inset-0 z-[190] bg-black/20 sm:bg-transparent" onClick={()=>setOpen(false)}/><section className="fixed inset-x-3 top-16 z-[200] max-h-[calc(100dvh-5rem)] overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl sm:inset-x-auto sm:right-5 sm:w-[480px]" role="dialog" aria-label="Notificações">
      <header className="flex items-center justify-between px-5 py-4"><h2 className="text-lg font-bold">Notificações</h2><div className="flex items-center gap-2"><button onClick={markAll} disabled={!unread} className="min-h-10 text-xs font-semibold text-primary disabled:opacity-40"><Check size={14} className="inline"/> Marcar todas como lidas</button><button onClick={()=>setOpen(false)} className="flex h-10 w-10 items-center justify-center rounded-xl hover:bg-gray-100"><X size={18}/></button></div></header>
      <div className="flex gap-2 overflow-x-auto border-y border-gray-100 px-4 py-3">{tabs.map(([id,label])=><button key={id} onClick={()=>setActive(id)} className={`whitespace-nowrap rounded-full px-3 py-2 text-xs font-semibold ${active===id?'bg-primary text-white':'bg-gray-100 text-gray-600'}`}>{label} ({counts[id]})</button>)}</div>
      <div className="max-h-[60dvh] overflow-y-auto">{filtered.length?filtered.map(n=>{const Icon=iconFor(n.type);return <button key={n.id} onClick={()=>openItem(n)} className="flex w-full items-start gap-3 border-b border-gray-100 px-5 py-4 text-left hover:bg-gray-50"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary"><Icon size={19}/></span><span className="min-w-0 flex-1"><span className="flex items-center gap-2"><strong className="text-sm text-gray-900">{n.title}</strong>{!n.is_read&&<i className="h-2 w-2 shrink-0 rounded-full bg-primary"/>}</span><span className="mt-1 block text-xs leading-relaxed text-gray-500">{n.message}</span><time className="mt-1 block text-[11px] text-gray-400">{relative(n.created_date)}</time></span><ChevronRight className="mt-3 shrink-0 text-gray-400" size={18}/></button>}):<div className="px-6 py-12 text-center text-sm text-gray-400"><Bell className="mx-auto mb-3 text-gray-200"/>Nenhuma notificação nesta categoria.</div>}</div>
    </section></>,document.body)}
  </div>;
}
