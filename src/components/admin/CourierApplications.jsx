import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { peddiApi } from '@/services/api/peddiApi';
import { isPresentationDemo } from '@/lib/presentationDemo';
import { toast } from '@/components/ui/use-toast';
import { useAuth } from '@/lib/AuthContext';
import { Bike, Check, X, Clock, Loader2 } from 'lucide-react';

export default function CourierApplications({ onChange }) {
  const { user }=useAuth();
  const [applications,setApplications]=useState([]);
  const [busy,setBusy]=useState(null);
  const [error,setError]=useState('');
  const headers=()=>({Authorization:`Bearer ${localStorage.getItem('peddi_access_token')}`});
  const load=()=>base44.entities.Deliverer.list('-created_date').then(rows=>{setApplications(rows.filter(row=>['pending','rejected'].includes(row.application_status)));setError('');}).catch(()=>setError('Não foi possível carregar as solicitações.'));
  useEffect(()=>{load();const unsubscribe=base44.entities.Deliverer.subscribe(()=>{load();onChange();});return unsubscribe;},[]);
  const decide=async(application,decision)=>{
    if(!window.confirm(decision==='approved'?`Aprovar ${application.name} e liberar acesso às entregas?`:`Recusar a solicitação de ${application.name}?`))return;
    setBusy(application.id);setError('');
    try{
      let result;
      if(isPresentationDemo()){
        await base44.entities.Deliverer.update(application.id,{application_status:decision,is_active:decision==='approved'});
        result={notification_status:'demo'};
      }else result=await peddiApi.request(`/api/v1/admin/courier-applications/${application.id}/decision`,{method:'POST',headers:headers(),body:JSON.stringify({decision})});
      toast({title:decision==='approved'?'Entregador aprovado.':'Solicitação recusada.',description:result.notification_status==='pending_configuration'?'Acesso liberado. A confirmação por e-mail aguarda a configuração do envio.':result.notification_status==='queued'?'Acesso liberado e confirmação por e-mail na fila de envio.':undefined});
      await load();onChange();
    }catch(err){setError(err.message||'Não foi possível analisar a solicitação.');}finally{setBusy(null);}
  };
  const pending=applications.filter(row=>row.application_status==='pending');
  return <section className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-5">
    <header className="mb-4 flex flex-wrap items-center justify-between gap-2"><h2 className="flex items-center gap-2 text-base font-bold text-[#111111]"><Bike className="text-[#22C55E]" size={21}/>Novas solicitações de entregadores</h2><span className="rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-700">{pending.length} pendentes</span></header>
    {user?.storeId&&<div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center"><p className="text-xs text-gray-500">Compartilhe o cadastro da sua loja:</p><input aria-label="Link de cadastro de entregadores" readOnly value={`${window.location.origin}/entregador?store=${encodeURIComponent(user.storeId)}`} className="min-h-10 min-w-0 flex-1 rounded-lg border border-gray-200 bg-gray-50 px-3 text-xs text-gray-600" onFocus={event=>event.target.select()}/></div>}
    {error&&<p role="alert" className="mb-3 rounded-xl bg-red-50 p-3 text-sm text-red-600">{error}</p>}
    {pending.length===0?<p className="text-sm text-[#6B7280]">Nenhuma solicitação pendente.</p>:<div className="grid gap-3 lg:grid-cols-2">{pending.map(application=><article key={application.id} className="flex flex-col gap-4 rounded-xl border border-gray-100 bg-gray-50 p-4 sm:flex-row sm:items-center"><div className="min-w-0 flex-1"><h3 className="font-semibold text-[#111111]">{application.name}</h3><p className="break-all text-sm text-gray-500">{application.email}</p><p className="mt-1 text-xs text-gray-500">{application.phone} · {application.vehicle==='a_pe'?'A pé':application.vehicle}</p><p className="mt-2 flex items-center gap-1 text-xs text-amber-700"><Clock size={13}/>Aguardando aprovação · {new Date(application.applied_at||application.created_date).toLocaleDateString('pt-BR')}</p></div><div className="flex gap-2"><button disabled={busy!==null} onClick={()=>decide(application,'rejected')} className="flex min-h-11 flex-1 items-center justify-center gap-1 rounded-xl border border-red-200 bg-white px-3 text-sm font-semibold text-red-600 disabled:opacity-50"><X size={16}/>Recusar</button><button disabled={busy!==null} onClick={()=>decide(application,'approved')} className="flex min-h-11 flex-1 items-center justify-center gap-1 rounded-xl bg-[#22C55E] px-3 text-sm font-semibold text-white disabled:opacity-50">{busy===application.id?<Loader2 size={16} className="animate-spin"/>:<Check size={16}/>}Aceitar</button></div></article>)}</div>}
    {applications.some(row=>row.application_status==='rejected')&&<details className="mt-4 border-t border-gray-100 pt-3"><summary className="cursor-pointer py-2 text-sm text-gray-500">Solicitações recusadas ({applications.filter(row=>row.application_status==='rejected').length})</summary><div className="mt-2 space-y-2">{applications.filter(row=>row.application_status==='rejected').map(row=><div key={row.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-gray-50 p-3 text-sm"><div><p className="font-medium text-gray-700">{row.name}</p><p className="break-all text-xs text-gray-500">{row.email}</p></div><span className="rounded-full bg-red-50 px-2 py-1 text-xs text-red-600">Recusada · {new Date(row.reviewed_at).toLocaleDateString('pt-BR')}</span></div>)}</div></details>}
  </section>;
}
