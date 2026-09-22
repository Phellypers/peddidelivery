import React, { useEffect, useState } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { Bike, ArrowLeft, ArrowRight, CheckCircle2, Loader2, Package, ShieldCheck, Eye, EyeOff } from 'lucide-react';
import { peddiApi } from '@/services/api/peddiApi';
import { useAuth } from '@/lib/AuthContext';
import peddiLogo from '../../Logo Peddi/logo3.png';

const inputClass='w-full min-h-12 rounded-xl border border-gray-200 bg-gray-50 px-4 text-sm text-[#111111] focus:outline-none focus:ring-2 focus:ring-[#22C55E]/30';
export default function DelivererRegister() {
  const { user }=useAuth();
  const location=useLocation();
  const params=new URLSearchParams(location.search);
  const isForm=location.pathname==='/entregador/cadastro';
  const [stores,setStores]=useState([]);
  const [form,setForm]=useState({store_id:params.get('store')||'',name:'',email:params.get('email')||'',phone:'',vehicle:'moto',password:'',confirmPassword:''});
  const [error,setError]=useState('');
  const [busy,setBusy]=useState(false);
  const [sent,setSent]=useState(false);
  const [showPassword,setShowPassword]=useState(false);
  const set=(key,value)=>setForm(previous=>({...previous,[key]:value}));
  useEffect(()=>{
    if (!isForm) return;
    let active=true;
    peddiApi.stores().then(result=>{
      if (!active) return;
      setStores(result.stores||[]);
      setForm(previous=>({...previous,store_id:previous.store_id||(result.stores||[]).find(store=>store.slug==='loja-demo')?.id||result.stores?.[0]?.id||''}));
    }).catch(()=>{if(active)setError('Não foi possível carregar as lojas. Tente novamente.');});
    return()=>{active=false;};
  },[isForm]);
  if (user?.role==='courier' && isForm) return <Navigate to="/entregador" replace/>;
  const submit=async event=>{
    event.preventDefault();setError('');
    if(form.password!==form.confirmPassword){setError('As senhas não coincidem.');return;}
    setBusy(true);
    try{
      const {confirmPassword:_confirm,...data}=form;
      await peddiApi.request('/api/v1/couriers/applications',{method:'POST',body:JSON.stringify(data)});
      setForm(previous=>({...previous,password:'',confirmPassword:''}));setSent(true);
    }catch(err){setError(err.message||'Não foi possível enviar sua solicitação.');}finally{setBusy(false);}
  };
  const query=params.get('store')?`?store=${encodeURIComponent(params.get('store'))}`:'';
  return <main className="min-h-[100dvh] bg-[#F3F4F6] px-5 py-6 text-[#111111] sm:py-12" style={{paddingBottom:'max(2rem, env(safe-area-inset-bottom))'}}>
    <div className="mx-auto max-w-4xl">
      <header className="mb-10 flex items-center justify-between gap-4"><div><img src={peddiLogo} alt="PEDDI" className="h-10 w-auto max-w-[150px] object-contain"/><span className="text-xs text-gray-500">Entregadores</span></div><Link to="/entregador/login" className="py-3 text-sm font-semibold text-gray-600">Já tenho conta</Link></header>
      {!isForm?<section className="grid items-center gap-10 rounded-3xl border border-gray-200 bg-white p-7 sm:p-12 md:grid-cols-2">
        <div><span className="mb-5 inline-flex rounded-full bg-green-50 px-3 py-2 text-xs font-semibold text-green-700">Sua próxima entrega começa aqui</span><h1 className="text-3xl font-bold leading-tight tracking-tight sm:text-5xl">Entregue com a PEDDI.</h1><p className="mt-5 text-base leading-relaxed text-[#6B7280]">Receba pedidos, acompanhe rotas e converse com a loja em um só lugar. Envie seu cadastro e aguarde a aprovação do gestor.</p><Link to={`/entregador/cadastro${query}`} className="mt-7 inline-flex min-h-12 items-center justify-center gap-3 rounded-xl bg-[#22C55E] px-6 py-3 font-semibold text-white hover:bg-green-600">Quero ser entregador<ArrowRight size={19}/></Link></div>
        <div className="space-y-3 rounded-3xl bg-green-50 p-6"><div className="mb-7 flex h-20 w-20 items-center justify-center rounded-2xl bg-[#22C55E] text-white"><Bike size={42}/></div>{[[Package,'Pedidos organizados','Todas as entregas atribuídas pela loja.'],[ShieldCheck,'Cadastro aprovado pela loja','Acesso exclusivo à operação de entregas.'],[CheckCircle2,'Tudo sincronizado','Aceite, recusa e status acompanhados pelo gestor.']].map(([Icon,title,text])=><div key={title} className="flex gap-3 rounded-xl bg-white p-4"><Icon className="mt-1 shrink-0 text-green-600" size={21}/><div><h2 className="text-sm font-semibold">{title}</h2><p className="mt-1 text-xs leading-relaxed text-gray-500">{text}</p></div></div>)}</div>
      </section>:<section className="mx-auto max-w-lg rounded-3xl border border-gray-200 bg-white p-6 sm:p-8">
        <Link to={`/entregador${query}`} className="mb-6 inline-flex min-h-10 items-center gap-2 text-sm text-gray-500"><ArrowLeft size={18}/>Voltar</Link>
        {sent?<div role="status" className="space-y-4 text-center"><CheckCircle2 size={54} className="mx-auto text-green-500"/><h1 className="text-2xl font-bold">Solicitação enviada!</h1><p className="leading-relaxed text-gray-500">O gestor da loja vai analisar seu cadastro. Seu acesso às entregas será liberado após a aprovação.</p><p className="text-sm text-gray-500">Use o e-mail e a senha que você cadastrou para entrar quando for aprovado.</p><Link to="/entregador/login" className="inline-flex min-h-12 items-center rounded-xl bg-green-500 px-5 font-semibold text-white">Ir para login do entregador</Link></div>:<>
          <h1 className="text-2xl font-bold">Quero ser entregador</h1><p className="mb-6 mt-2 text-sm leading-relaxed text-gray-500">Preencha seus dados. A loja aprova seu cadastro antes de liberar o acesso.</p>
          {error&&<p role="alert" className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-600">{error}</p>}
          <form onSubmit={submit} className="space-y-4">
            <label className="block text-sm font-medium">Loja<select required value={form.store_id} onChange={event=>set('store_id',event.target.value)} className={`${inputClass} mt-1`}><option value="">Selecione a loja</option>{stores.map(store=><option value={store.id} key={store.id}>{store.name}</option>)}</select></label>
            { [['name','Nome completo','text','name'],['phone','Telefone / WhatsApp','tel','tel'],['email','E-mail','email','email']].map(([key,label,type,autocomplete])=><label className="block text-sm font-medium" key={key}>{label}<input required minLength={key==='name'?2:undefined} maxLength={key==='name'?120:key==='phone'?30:254} type={type} autoComplete={autocomplete} value={form[key]} onChange={event=>set(key,event.target.value)} className={`${inputClass} mt-1`}/></label>) }
            <label className="block text-sm font-medium">Veículo<select value={form.vehicle} onChange={event=>set('vehicle',event.target.value)} className={`${inputClass} mt-1`}>{[['moto','Moto'],['bicicleta','Bicicleta'],['carro','Carro'],['a_pe','A pé']].map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>
            { [['password','Senha'],['confirmPassword','Confirmar senha']].map(([key,label])=><label className="block text-sm font-medium" key={key}>{label}<div className="relative mt-1"><input required minLength={8} maxLength={128} type={showPassword?'text':'password'} autoComplete="new-password" value={form[key]} onChange={event=>set(key,event.target.value)} placeholder="Mínimo de 8 caracteres" className={`${inputClass} pr-12`}/><button type="button" onClick={()=>setShowPassword(value=>!value)} aria-label={showPassword?'Ocultar senha':'Mostrar senha'} aria-pressed={showPassword} className="absolute right-0 top-0 flex h-12 w-12 items-center justify-center text-gray-500">{showPassword?<EyeOff size={19}/>:<Eye size={19}/>}</button></div></label>) }
            <button type="submit" disabled={busy||!form.store_id} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#22C55E] px-4 font-semibold text-white disabled:opacity-50">{busy?<Loader2 size={19} className="animate-spin"/>:null}{busy?'Enviando...':'Enviar solicitação'}</button>
          </form>
        </>}
      </section>}
      <p className="mt-7 text-center text-xs text-gray-400">PEDDI · Operação de entregas</p>
    </div>
  </main>;
}
