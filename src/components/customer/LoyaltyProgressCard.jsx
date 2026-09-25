import React, { useState } from 'react';
import { Award, CheckCircle2, Copy, Gift, Truck } from 'lucide-react';

const rewardLabel=program=>program.reward_type==='free_delivery'?'frete grátis':program.reward_type==='percentage_discount'
  ? `${Number(program.reward_value)}% OFF`:`R$ ${Number(program.reward_value).toFixed(2).replace('.',',')} OFF`;
const couponLabel=reward=>reward.discount_type==='free_shipping'?'Frete grátis':reward.discount_type==='percentage'
  ? `${Number(reward.discount_value)}% de desconto`:`R$ ${Number(reward.discount_value).toFixed(2).replace('.',',')} de desconto`;

export default function LoyaltyProgressCard({program,progress,rewards=[]}){
 const[copied,setCopied]=useState('');
 if(!program?.active)return null;
 const current=Number(progress?.current_steps||0),required=Number(progress?.required_steps||program.required_steps||5);
 const active=rewards.filter(reward=>reward.status==='active');
 const copy=async value=>{await navigator.clipboard?.writeText(value);setCopied(value);setTimeout(()=>setCopied(''),2000)};
 return <section aria-label="Programa de fidelidade" className="border-t border-gray-100 bg-white px-4 py-5">
  <div className="rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50 to-white p-5 shadow-sm">
   <header className="mb-4 flex items-start justify-between gap-3"><div className="flex min-w-0 items-center gap-2"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-white"><Award size={21}/></span><div><h2 className="font-heading font-bold text-gray-900">{program.name}</h2><p className="text-xs text-gray-500">{current} de {required} pedidos</p></div></div><span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-bold text-emerald-700 shadow-sm">{Number(progress?.completed_cycles||0)} ciclo(s)</span></header>
   <p className="mb-4 text-sm text-gray-600">Complete <strong>{required} pedidos</strong> e ganhe <strong className="text-primary">{rewardLabel(program)}</strong>.</p>
   <div className="grid grid-cols-5 gap-2">{Array.from({length:required}).map((_,index)=><span key={index} aria-label={index<current?`Carimbo ${index+1} conquistado`:`Carimbo ${index+1} pendente`} className={`flex aspect-square min-h-10 items-center justify-center rounded-xl border-2 text-xs font-bold ${index<current?'border-primary bg-primary text-white shadow-sm':'border-dashed border-gray-200 bg-white text-gray-300'}`}>{index<current?<CheckCircle2 size={20}/>:index+1}</span>)}</div>
   {active.length>0&&<div className="mt-5 border-t border-emerald-100 pt-4"><h3 className="mb-2 flex items-center gap-2 text-sm font-bold text-gray-800"><Gift size={17} className="text-primary"/>Recompensas disponíveis</h3><div className="space-y-2">{active.map(reward=><article key={reward.id} className="flex items-center justify-between gap-3 rounded-xl border border-green-200 bg-green-50 p-3"><div className="min-w-0"><strong className="block truncate font-mono text-green-800">{reward.code}</strong><p className="flex items-center gap-1 text-xs text-green-700">{reward.discount_type==='free_shipping'&&<Truck size={13}/>} {couponLabel(reward)}</p></div><button type="button" onClick={()=>copy(reward.code)} className="flex min-h-10 shrink-0 items-center gap-1.5 rounded-lg bg-green-600 px-3 text-xs font-bold text-white"><Copy size={14}/>{copied===reward.code?'Copiado':'Copiar'}</button></article>)}</div></div>}
  </div>
 </section>;
}
