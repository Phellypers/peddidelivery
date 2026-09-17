export const PEDDI_FEATURES = [
  ['ADVANCED_INVENTORY','Estoque Avançado'],['MARKETING_AUTOMATION','Marketing e Automação'],
  ['ADVANCED_FINANCE','Financeiro Avançado'],['ADVANCED_ANALYTICS','Analytics Avançado'],
  ['POS_AND_TABLES','PDV, Mesas e Comandas'],['DELIVERY_MANAGEMENT','Entregadores e Mapa'],
];
export const PEDDI_SUPPORT_REQUEST_LIMIT = 8;
export const PEDDI_SERVICES = [
  {id:'FOUNDER',name:'Base Fundador',priceCents:2500,durationDays:30,description:'Acesso aos módulos internos por 30 dias e selo permanente de Fundador.',benefit:'Após o período, sua loja continua no PEDDI Grátis.'},
  {id:'TRAINING',name:'Treinamento PEDDI',priceCents:2990,description:'Orientação para aprender a usar a PEDDI na rotina da sua loja.'},
  {id:'STORE_SETUP',name:'Loja Pronta',priceCents:6990,description:'Ajuda para preparar o cadastro e a apresentação da sua loja.'},
  {id:'EXCLUSIVE_SUPPORT',name:'Suporte Exclusivo',priceCents:9890,durationDays:30,description:'Até 8 solicitações assistidas por atendimento humano durante 30 dias. Chamados pelo sistema e bugs são ilimitados.'},
  {id:'QUICK_HELP',name:'Atendimento rápido',priceCents:990,description:'Ajuda pontual para uma dúvida de uso da plataforma.'},
  {id:'ASSISTED_SETUP',name:'Configuração assistida',priceCents:1990,description:'Orientação para configurar os recursos da sua loja.'},
  {id:'ADVANCED_HELP',name:'Atendimento avançado',priceCents:2990,description:'Orientação para uma necessidade mais detalhada da operação.'},
];
export function resolvePeddiAccess({email,founderSince,founderExpiresAt,entitlements=[],enforce=false,now=Date.now()}) {
  const designer=email==='designer.demo@peddi.app';
  const demo=email==='gestor.demo@peddi.local';
  const founderActive=Boolean(founderExpiresAt)&&new Date(founderExpiresAt).getTime()>now;
  const active=new Set(entitlements.filter(e=>!e.expires_at||new Date(e.expires_at).getTime()>now).map(e=>e.feature));
  const state=founderActive?'FOUNDER_TRIAL':active.size?'FREE_WITH_ADDONS':'FREE';
  return {state,founderBadge:Boolean(founderSince),founderActive,demo,designer,enforcementEnabled:enforce,
    canMutateCommercial:!designer,founderDaysRemaining:founderActive?Math.ceil((new Date(founderExpiresAt).getTime()-now)/86400000):0,
    features:PEDDI_FEATURES.map(([id,name])=>({id,name,contracted:founderActive||active.has(id),accessible:demo||designer||!enforce||founderActive||active.has(id)}))};
}
export function canUsePeddiFeature(access,feature) {return access.features.some(item=>item.id===feature&&item.accessible);}
