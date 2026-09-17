import React, { useEffect, useRef, useState } from 'react';
import { ShieldCheck, Clock, ChevronRight, Loader2, Check, ArrowUpRight } from 'lucide-react';
import MyPeddiOverview from '@/components/admin/MyPeddiOverview';
import { peddiApi } from '@/services/api/peddiApi';
import { isPresentationDemo } from '@/lib/presentationDemo';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

const money=cents=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(Number(cents||0)/100);
const date=value=>value?new Date(value).toLocaleDateString('pt-BR'):'—';
const labels={pending_payment:'Aguardando pagamento',paid:'Pago',cancelled:'Cancelado',refunded:'Reembolsado',open:'Aberta',in_progress:'Em atendimento',completed:'Concluída'};
const card='rounded-2xl border border-gray-200 bg-white p-4 sm:p-5';
const input='min-h-11 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-base text-[#111111] outline-none focus:border-[#22C55E]';
export default function MyPeddi() {
  const [data,setData]=useState(null);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');
  const [notice,setNotice]=useState('');
  const [tab,setTab]=useState('overview');
  const [service,setService]=useState(null);
  const [accountOpen,setAccountOpen]=useState(false);
  const [requestOpen,setRequestOpen]=useState(false);
  const [request,setRequest]=useState({kind:'bug',subject:'',description:''});
  const [news,setNews]=useState(null);
  const [busy,setBusy]=useState(false);
  const keyRef=useRef(null);
  const headers=()=>({Authorization:`Bearer ${localStorage.getItem('peddi_access_token')||''}`});
  const load=async()=>{try{setData(await peddiApi.request('/api/v1/my-peddi',{headers:headers()}));setError('');}catch(err){setError(err.message);}finally{setLoading(false);}};
  useEffect(()=>{void load();},[]);
  const preview=()=>{
    if(!isPresentationDemo()&&data?.access.canMutateCommercial)return false;
    setNotice('Modo de visualização/teste. Nenhuma contratação, pagamento ou solicitação foi salva.');return true;
  };
  const purchase=async()=>{
    if(busy||!service)return;
    if(preview()){setService(null);return;}
    setBusy(true);setError('');
    try {
      await peddiApi.request('/api/v1/my-peddi/purchases',{method:'POST',headers:headers(),body:JSON.stringify({serviceId:service.id,idempotencyKey:keyRef.current})});
      setService(null);setNotice('Solicitação registrada. Nenhuma cobrança foi realizada. A contratação permanece aguardando pagamento.');await load();
    }catch(err){setError(err.message);}finally{setBusy(false);}
  };
  const cancel=async id=>{
    if(busy)return;if(preview())return;setBusy(true);
    try{await peddiApi.request(`/api/v1/my-peddi/purchases/${id}/cancel`,{method:'POST',headers:headers()});setNotice('Solicitação cancelada.');await load();}catch(err){setError(err.message);}finally{setBusy(false);}
  };
  const sendRequest=async event=>{
    event.preventDefault();if(busy)return;
    if(preview()){setRequestOpen(false);return;}
    setBusy(true);setError('');
    try{await peddiApi.request('/api/v1/my-peddi/support',{method:'POST',headers:headers(),body:JSON.stringify(request)});setRequestOpen(false);setRequest({kind:'bug',subject:'',description:''});setNotice('Solicitação registrada. Bugs da PEDDI não consomem solicitações de suporte.');await load();}catch(err){setError(err.message);}finally{setBusy(false);}
  };
  if(loading)return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-[#22C55E]" size={30}/></div>;
  if(!data)return <div className={card}><p role="alert" className="text-red-600">{error||'Não foi possível carregar sua conta.'}</p><button onClick={load} className="mt-3 min-h-11 font-semibold text-green-600">Tentar novamente</button></div>;
  const {access,account,support}=data;
  const serviceName=id=>data.services.find(item=>item.id===id)?.name||id;
  const chooseService=item=>{setService(item);keyRef.current=crypto.randomUUID();setError('');};
  return <div className="mp-page pb-safe">
    <div className="mp-page-title"><h1>Minha PEDDI</h1><p className="mt-1 text-sm text-[#6B7280]">Sua conta, recursos e serviços em um só lugar.</p></div>
    {notice&&<div role="status" className="rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-800">{notice}</div>}
    {error&&<p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-600">{error}</p>}
    <section className="mp-plan" aria-label={`Plano da ${data.store.name}`}>
      <div className="mp-plan-info"><span className="mp-plan-icon"><ShieldCheck size={38}/></span><div className="min-w-0"><p className="mp-plan-kicker">Plano atual</p><h2>{access.founderActive?'Fundador PEDDI':access.state==='FREE_WITH_ADDONS'?'PEDDI Grátis + recursos':'PEDDI Grátis'}</h2><p>{access.founderActive?`Acesso completo ativo por mais ${access.founderDaysRemaining} dias. Expira em ${date(account.founder_expires_at)}.`:'Loja funcionando sem mensalidade e sem taxa por pedido.'}</p>{access.founderBadge&&!access.founderActive&&<p>O período Fundador terminou. Seu selo é permanente e a loja continua no PEDDI Grátis.</p>}</div></div>
      <div className="mp-plan-actions"><span className={`inline-flex items-center gap-1 rounded-full px-3 py-2 text-[11px] font-medium ${data.store.active?'bg-green-50 text-green-700':'bg-gray-100 text-gray-600'}`}><Check size={13}/>{data.store.active?'Conta ativa':'Loja inativa'}</span>{access.founderBadge&&<span className="rounded-full bg-amber-50 px-3 py-2 text-[11px] font-medium text-amber-700">Fundador</span>}{access.demo&&<span className="rounded-full bg-blue-50 px-3 py-2 text-[11px] font-medium text-blue-600">Demo interna · acesso total</span>}{access.designer&&<span className="rounded-full bg-gray-100 px-3 py-2 text-[11px] font-medium text-gray-600">Visualização/teste</span>}<button className="mp-account-button" onClick={()=>setAccountOpen(true)}>Gerenciar conta<ChevronRight size={16}/></button></div>
    </section>


    {tab==='overview'&&<MyPeddiOverview data={data} chooseService={chooseService} setTab={setTab} setNews={setNews}/>}
    <nav aria-label="Áreas da Minha PEDDI" className="mp-secondary-nav">{[['overview','Visão geral'],['support','Meu suporte'],['history','Histórico'],['news','Novidades']].map(([key,label])=><button key={key} aria-pressed={tab===key} onClick={()=>setTab(key)} className={`min-h-11 rounded-xl px-4 text-sm font-semibold ${tab===key?'bg-[#22C55E] text-white':'border border-gray-200 bg-white text-gray-600'}`}>{label}</button>)}</nav>
    {tab==='support'&&<>
      <section className={card}><h2 className="text-lg font-bold">Meu suporte</h2>{support?<><p className="mt-2 text-sm text-gray-600">Suporte Exclusivo ativo de {date(support.starts_at)} até {date(support.expires_at)}.</p><div className="mt-3 flex flex-wrap gap-5"><p className="text-sm"><strong>{support.used}</strong> atendimentos humanos utilizados</p><p className="text-sm"><strong>{support.remaining===null?'Limite não configurado':support.remaining}</strong>{support.remaining!==null?' restantes':''}</p></div></>:<p className="mt-2 text-sm text-gray-500">Nenhum período de Suporte Exclusivo ativo.{access.demo?' A conta demo pode testar solicitações sem limite.':''}</p>}<p className="mt-3 text-xs text-gray-500">Chamados pelo sistema são ilimitados. A franquia de 8 atendimentos humanos por 30 dias só é consumida quando a equipe marca o atendimento como assistido/elegível. Bugs da PEDDI não consomem a franquia. Tarefas extensas podem exigir orçamento separado.</p><div className="mt-4 flex flex-wrap gap-2"><button onClick={()=>{setRequest({kind:'bug',subject:'',description:''});setRequestOpen(true);setError('');}} className="min-h-11 rounded-xl bg-[#22C55E] px-4 text-sm font-semibold text-white">Reportar bug</button><button onClick={()=>{setRequest({kind:'support',subject:'',description:''});setRequestOpen(true);setError('');}}  className="min-h-11 rounded-xl border border-gray-200 px-4 text-sm font-semibold disabled:text-gray-400">Abrir nova solicitação</button></div></section>
      <section className={card}><h2 className="mb-3 font-bold">Solicitações</h2>{data.requests.length===0?<p className="text-sm text-gray-500">Nenhuma solicitação registrada.</p>:data.requests.map(item=><div key={item.id} className="border-t border-gray-100 py-3"><div className="flex flex-wrap justify-between gap-2"><p className="text-sm font-semibold">{item.subject}</p><span className="text-xs text-gray-500">{labels[item.status]} · {date(item.created_at)}</span></div><p className="mt-1 text-xs text-gray-500">{item.kind==='bug'?'Bug · não consome suporte':item.kind==='service'?'Serviço contratado':item.consumes_support?'Atendimento humano assistido · consome 1 da franquia':item.assistance_state==='extra_quote'?'Tarefa extensa · orçamento separado':'Chamado pelo sistema · sem consumo'}</p>{item.description&&<p className="mt-2 whitespace-pre-wrap break-words text-sm text-gray-600">{item.description}</p>}</div>)}</section>
    </>}
    {tab==='history'&&<>
      <section className={card}><h2 className="mb-3 font-bold">Contratações e pagamentos</h2>{!data.purchases.length?<p className="text-sm text-gray-500">Nenhuma contratação registrada.</p>:data.purchases.map(item=><div key={item.id} className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 py-3"><div><p className="text-sm font-semibold">{serviceName(item.service_id)}</p><p className="mt-1 text-xs text-gray-500">{date(item.created_at)} · {labels[item.status]}</p></div><div className="flex items-center gap-3"><span className="text-sm font-bold">{money(item.amount_cents)}</span>{item.status==='pending_payment'&&<button disabled={busy} onClick={()=>void cancel(item.id)} className="min-h-11 rounded-xl border border-gray-200 px-3 text-xs">Cancelar solicitação</button>}</div></div>)}</section>
      <section className={card}><h2 className="mb-3 font-bold">Ativações e vencimentos</h2>{!account?.founder_since&&!data.supportPeriods.length?<p className="text-sm text-gray-500">Nenhuma ativação registrada.</p>:<>{account?.founder_since&&<p className="border-t py-3 text-sm text-gray-600">Base Fundador: {date(account.founder_since)} até {date(account.founder_expires_at)} · selo permanente.</p>}{data.supportPeriods.map(period=><p key={period.id} className="border-t py-3 text-sm text-gray-600">Suporte Exclusivo: {date(period.starts_at)} até {date(period.expires_at)}.</p>)}</>}</section>
      <section className={card}><h2 className="mb-3 font-bold">Movimentações da conta</h2>{!data.events.length?<p className="text-sm text-gray-500">Nenhuma movimentação registrada.</p>:data.events.map(event=><div key={event.id} className="flex gap-3 border-t border-gray-100 py-3"><Clock size={17} className="mt-0.5 shrink-0 text-gray-400"/><div><p className="text-sm text-gray-600">{event.description}{event.credit_cents!==0?` · ${money(event.credit_cents)}`:''}</p><p className="mt-1 text-xs text-gray-400">{date(event.created_at)}</p></div></div>)}</section>
    </>}
    {tab==='news'&&<section><h2 className="mb-3 text-lg font-bold">Novidades da PEDDI</h2>{!data.news.length?<div className={card}><p className="text-sm text-gray-500">Nenhuma novidade publicada ainda.</p></div>:<div className="grid gap-3 sm:grid-cols-2">{data.news.map(item=><article key={item.id} className={card}>{item.image_url&&<img src={item.image_url} alt="" className="mb-3 aspect-video w-full rounded-xl object-cover"/>}<p className="text-xs text-gray-400">{date(item.published_at)}</p><h3 className="mt-1 font-bold">{item.title}</h3><p className="mt-2 text-sm text-gray-500">{item.summary}</p><button onClick={()=>setNews(item)} className="mt-3 flex min-h-11 items-center gap-2 text-sm font-semibold text-green-600">Ler novidade<ArrowUpRight size={16}/></button></article>)}</div>}</section>}
    <Dialog open={accountOpen} onOpenChange={setAccountOpen}><DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-3xl"><DialogHeader><DialogTitle>Gerenciar conta</DialogTitle><DialogDescription>{data.store.name}</DialogDescription></DialogHeader>{!access.enforcementEnabled&&<p className="flex items-center gap-2 text-xs text-gray-500"><Check size={16} className="shrink-0 text-green-600"/>Durante o desenvolvimento, todos os módulos continuam liberados para testes.</p>}      <section><h2 className="mb-3 text-lg font-bold">Seus recursos</h2><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{access.features.map(feature=><div key={feature.id} className={card}><div className="flex items-start justify-between gap-2"><h3 className="text-sm font-semibold">{feature.name}</h3><Check size={17} className="shrink-0 text-green-600"/></div><p className="mt-2 text-xs font-medium text-green-600">{access.demo?'Acesso total da conta demo':feature.contracted?'Ativo na sua conta':feature.accessible?'Liberado para testes':'Disponível'}</p><p className="mt-1 text-xs text-gray-500">{feature.contracted?'Incluído no seu acesso atual.':'Ainda não contratado. Contratação individual em breve.'}</p></div>)}</div></section>
</DialogContent></Dialog>
    <Dialog open={Boolean(service)} onOpenChange={open=>{if(!open&&!busy)setService(null);}}><DialogContent className="max-h-[85dvh] overflow-y-auto"><DialogHeader><DialogTitle>{service?.name}</DialogTitle><DialogDescription>Confira o serviço antes de solicitar a contratação.</DialogDescription></DialogHeader>{service&&<div className="space-y-4"><p className="text-sm text-gray-600">{service.description}</p>{service.benefit&&<p className="text-sm text-gray-600">{service.benefit}</p>}<div className="rounded-xl bg-gray-50 p-4"><p className="text-sm text-gray-500">Valor</p><p className="text-2xl font-bold">{money(service.priceCents)}</p>{service.durationDays&&<p className="mt-1 text-xs text-gray-500">Período: {service.durationDays} dias após pagamento aprovado.</p>}</div><p className="text-sm text-gray-500">{data.payment.message}</p>{service.id==='EXCLUSIVE_SUPPORT'&&!data.supportLimitConfigured&&<p className="text-xs text-gray-500">O limite de solicitações deste serviço ainda precisa ser definido.</p>}{error&&<p role="alert" className="text-sm text-red-600">{error}</p>}<button onClick={()=>void purchase()} disabled={busy} className="min-h-12 w-full rounded-xl bg-[#22C55E] px-4 font-semibold text-white disabled:opacity-50">{busy?'Registrando...':access.designer?'Testar fluxo de contratação':'Solicitar contratação'}</button><p className="text-xs text-gray-400">Esta ação registra uma intenção de contratação. Não aprova pagamentos nem libera acesso pago.</p></div>}</DialogContent></Dialog>
    <Dialog open={requestOpen} onOpenChange={open=>{if(!busy)setRequestOpen(open);}}><DialogContent className="max-h-[85dvh] overflow-y-auto"><DialogHeader><DialogTitle>{request.kind==='bug'?'Reportar bug da PEDDI':'Nova solicitação de suporte'}</DialogTitle><DialogDescription>{request.kind==='bug'?'Não consome solicitações do Suporte Exclusivo.':'Descreva a ajuda que sua loja precisa. Abrir o chamado não consome a franquia de atendimento humano.'}</DialogDescription></DialogHeader><form onSubmit={sendRequest} className="space-y-3"><label className="block text-sm text-gray-600">Assunto<input required minLength={3} maxLength={160} value={request.subject} onChange={e=>setRequest(p=>({...p,subject:e.target.value}))} className={`mt-1 ${input}`}/></label><label className="block text-sm text-gray-600">Descrição<textarea required minLength={10} maxLength={4000} rows={4} value={request.description} onChange={e=>setRequest(p=>({...p,description:e.target.value}))} className={`mt-1 ${input}`}/></label>{error&&<p role="alert" className="text-sm text-red-600">{error}</p>}<button disabled={busy} className="min-h-12 w-full rounded-xl bg-[#22C55E] font-semibold text-white disabled:opacity-50">{busy?'Registrando...':access.designer?'Testar solicitação':'Enviar solicitação'}</button></form></DialogContent></Dialog>
    <Dialog open={Boolean(news)} onOpenChange={open=>{if(!open)setNews(null);}}><DialogContent className="max-h-[85dvh] overflow-y-auto"><DialogHeader><DialogTitle>{news?.title}</DialogTitle><DialogDescription>{news?.summary}</DialogDescription></DialogHeader>{news?.image_url&&<img src={news.image_url} alt="" className="w-full rounded-xl"/>}<p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-gray-600">{news?.content}</p><p className="text-xs text-gray-400">{date(news?.published_at)}</p></DialogContent></Dialog>
  </div>;
}
