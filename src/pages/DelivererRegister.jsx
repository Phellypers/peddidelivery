import React, { useEffect, useState } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Bike, CheckCircle2, ChevronDown, CircleDollarSign, Eye, EyeOff, Handshake, Loader2, MapPin, Package, Route, ShieldCheck, Smartphone, Truck } from 'lucide-react';
import { peddiApi } from '@/services/api/peddiApi';
import { useAuth } from '@/lib/AuthContext';
import peddiLogo from '../../Logo Peddi/logo3.png';
import './DelivererRegister.css';

const inputClass='w-full min-h-12 rounded-xl border border-gray-200 bg-gray-50 px-4 text-sm text-[#111111] focus:outline-none focus:ring-2 focus:ring-[#22C55E]/30';
const earningOptions=[
  [CircleDollarSign,'Por valor por entrega','A loja pode oferecer um valor fixo para cada entrega realizada.'],
  [MapPin,'Por quilômetro','A remuneração pode considerar a distância percorrida na entrega.'],
  [Route,'Por rota','Aceite rotas e entregas oferecidas de acordo com a sua disponibilidade.'],
];
const deliverySteps=[
  ['01','Cadastre-se','Informe seus dados e envie seu cadastro.'],
  ['02','Aguarde a aprovação','As lojas analisam e aprovam os entregadores parceiros.'],
  ['03','Receba oportunidades','Veja os pedidos e entregas disponibilizados para você.'],
  ['04','Faça a entrega','Aceite, realize a entrega e atualize o status pelo celular.'],
  ['05','Receba pelo combinado','Ganhe conforme a modalidade e o valor definido para aquela entrega.'],
];
const courierBenefits=[
  [Package,'Mais oportunidades','Conecte-se a estabelecimentos que precisam de entregadores.'],
  [CircleDollarSign,'Ganhe por entrega','Tenha diferentes possibilidades de remuneração.'],
  [Smartphone,'Tudo pelo celular','Pedidos, informações e status das entregas em um só lugar.'],
  [Handshake,'Seja parceiro das lojas','Construa uma relação direta com os estabelecimentos da sua região.'],
];
const courierFaq=[
  ['Como faço meu cadastro?','Clique em “Quero ser entregador PEDDI”, informe seus dados e selecione a loja para a qual deseja enviar sua solicitação.'],
  ['Preciso ser aprovado por uma loja?','Sim. Cada loja analisa o cadastro antes de liberar o acesso às entregas.'],
  ['Como recebo os pedidos?','Depois da aprovação, as entregas atribuídas a você aparecem na área do entregador.'],
  ['Como funciona o pagamento?','A modalidade e o valor são definidos pela loja para a operação ou entrega. O repasse segue o combinado diretamente com o estabelecimento.'],
  ['Posso trabalhar com mais de uma loja?','Você pode solicitar parceria às lojas disponíveis. Cada estabelecimento avalia e aprova o cadastro separadamente.'],
  ['Posso recusar uma entrega?','Sim. Você pode analisar a oportunidade antes de aceitar, conforme as regras combinadas com a loja.'],
  ['Quais veículos posso usar?','O cadastro aceita moto, bicicleta, carro ou entrega a pé. A disponibilidade depende da operação de cada loja.'],
];
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
  return <main className={isForm?'min-h-[100dvh] bg-[#F3F4F6] px-5 py-6 text-[#111111] sm:py-12':'deliverer-entry-page'} style={{paddingBottom:'max(2rem, env(safe-area-inset-bottom))'}}>
    <div className={isForm?'mx-auto max-w-4xl':'deliverer-entry-shell'}>
      <header className={isForm?'mb-10 flex items-center justify-between gap-4':'deliverer-entry-header'}><div className={isForm?'':'deliverer-entry-brand'}><img src={peddiLogo} alt="PEDDI" className={isForm?'h-10 w-auto max-w-[150px] object-contain':'deliverer-entry-logo'}/><span className={isForm?'text-xs text-gray-500':'deliverer-entry-section-name'}>Entregadores</span></div><div className={isForm?'':'deliverer-entry-login'}><span className="deliverer-entry-login-label">Já tenho conta</span><Link to="/entregador/login" className={isForm?'py-3 text-sm font-semibold text-gray-600':'deliverer-entry-login-button'}>Entrar<ArrowRight size={19}/></Link></div></header>
      {!isForm?<><section className="deliverer-entry-card">
        <div className="deliverer-entry-copy">
          <span className="deliverer-entry-badge"><Truck size={20}/>Seja um entregador PEDDI</span>
          <h1>Faça entregas.<br/><strong>Ganhe do seu jeito.</strong></h1>
          <p className="deliverer-entry-description">Receba pedidos das lojas parceiras e encontre a melhor forma de trabalhar: por rota, por quilômetro ou por valor fixo por entrega.</p>
          <Link to={`/entregador/cadastro${query}`} className="deliverer-entry-cta">Quero ser entregador PEDDI<ArrowRight size={24}/></Link>
          <p className="deliverer-entry-cta-note">Cadastre-se gratuitamente e aguarde a aprovação das lojas.</p>
        </div>
        <div className="deliverer-entry-benefit-panel" aria-label="Recursos para entregadores">{[[Package,'Pedidos organizados','Entregas atribuídas pela loja reunidas em um só lugar.'],[ShieldCheck,'Parceria aprovada','Cada loja analisa o cadastro antes de liberar as oportunidades.'],[CheckCircle2,'Tudo sincronizado','Aceite, recusa e status acompanhados em tempo real.']].map(([Icon,title,text])=><article key={title} className="deliverer-entry-benefit"><Icon aria-hidden="true"/><div><h2>{title}</h2><p>{text}</p></div></article>)}</div>
        <div className="deliverer-entry-driver-wrap" aria-hidden="true"><img src="/Deliverer/entregador-hero.png" alt="" className="deliverer-entry-driver"/></div>
      </section>
      <section className="deliverer-info-section deliverer-opportunity">
        <div className="deliverer-section-heading"><span>Liberdade para combinar</span><h2>Você escolhe como quer trabalhar</h2><p>Na PEDDI, você tem mais liberdade para combinar com as lojas a melhor forma de fazer suas entregas. As modalidades disponíveis dependem do que cada estabelecimento oferece.</p></div>
        <div className="deliverer-card-grid deliverer-card-grid--three">{earningOptions.map(([Icon,title,text])=><article className="deliverer-info-card" key={title}><span className="deliverer-info-icon"><Icon aria-hidden="true"/></span><h3>{title}</h3><p>{text}</p></article>)}</div>
      </section>
      <section className="deliverer-info-section deliverer-how">
        <div className="deliverer-section-heading"><span>Como funciona</span><h2>Comece a entregar com a PEDDI</h2></div>
        <div className="deliverer-steps">{deliverySteps.map(([number,title,text])=><article key={number}><strong>{number}</strong><div><h3>{title}</h3><p>{text}</p></div></article>)}</div>
      </section>
      <section className="deliverer-info-section">
        <div className="deliverer-section-heading"><span>Vantagens da parceria</span><h2>Por que ser entregador PEDDI?</h2></div>
        <div className="deliverer-card-grid deliverer-card-grid--four">{courierBenefits.map(([Icon,title,text])=><article className="deliverer-info-card" key={title}><span className="deliverer-info-icon"><Icon aria-hidden="true"/></span><h3>{title}</h3><p>{text}</p></article>)}</div>
      </section>
      <section className="deliverer-info-section deliverer-faq">
        <div className="deliverer-section-heading"><span>Perguntas frequentes</span><h2>Tem alguma dúvida? A gente explica.</h2></div>
        <div className="deliverer-faq-list">{courierFaq.map(([question,answer])=><details key={question}><summary>{question}<ChevronDown aria-hidden="true"/></summary><p>{answer}</p></details>)}</div>
        <div className="deliverer-final-cta"><Bike aria-hidden="true"/><div><h2>Pronto para começar?</h2><p>Envie seu cadastro gratuitamente e conecte-se às lojas parceiras.</p></div><Link to={`/entregador/cadastro${query}`}>Quero ser entregador PEDDI<ArrowRight size={20}/></Link></div>
      </section>
      </>:<section className="mx-auto max-w-lg rounded-3xl border border-gray-200 bg-white p-6 sm:p-8">
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
      <p className={isForm?'mt-7 text-center text-xs text-gray-400':'deliverer-entry-footer'}>PEDDI · Operação de entregas</p>
    </div>
  </main>;
}
