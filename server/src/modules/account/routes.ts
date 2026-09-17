import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, requireRoles, blockPresentationDemoWrites, type AuthRequest } from '../../auth/middleware.js';
import { pool, query } from '../../db/client.js';
import { PEDDI_SERVICES, canUsePeddiFeature } from '../../../../src/lib/peddiAccount.js';
import { accountAccess, addAccountEvent, supportRequestLimit } from './data.js';
import { classifyAssistance } from './assistance.js';

export const accountRouter=Router();
accountRouter.use(requireAuth,requireRoles('manager','peddi_admin'));
accountRouter.use((request:AuthRequest,response,next)=>{
  if(!request.auth!.storeId)return response.status(403).json({error:'Conta sem estabelecimento associado.'});
  if(request.auth!.email==='designer.demo@peddi.app'&&!['GET','HEAD','OPTIONS'].includes(request.method))return response.status(403).json({error:'Modo de visualização/teste: nenhuma alteração comercial foi salva.'});
  next();
});
accountRouter.use(blockPresentationDemoWrites);
accountRouter.get('/platform/requests',requireRoles('peddi_admin'),async(_request,response)=>response.json({requests:(await query('SELECT * FROM peddi_requests ORDER BY created_at DESC LIMIT 500')).rows}));
accountRouter.patch('/platform/requests/:id/assistance',requireRoles('peddi_admin'),async(request,response)=>{
  const parsed=z.object({mode:z.enum(['human_assisted','extra_quote']),eligible:z.boolean()}).safeParse(request.body);
  if(!parsed.success||!z.string().uuid().safeParse(request.params.id).success)return response.sendStatus(400);
  try {response.json({request:await classifyAssistance(pool!,String(request.params.id),parsed.data.mode,parsed.data.eligible)});}
  catch(error){response.status(409).json({error:error instanceof Error?error.message:'Não foi possível classificar o atendimento.'});}
});

// Central policy for future protected module endpoints. Existing modules remain untouched.
export const requirePeddiFeature=(feature:string)=>async(request:AuthRequest,response:any,next:any)=>{
  if(canUsePeddiFeature(await accountAccess(request),feature))return next();
  response.status(403).json({error:'Recurso não contratado.',feature});
};

accountRouter.get('/',async(request:AuthRequest,response)=>{
  const storeId=request.auth!.storeId;
  const [access,account,store,purchases,requests,events,credits,news,support]=await Promise.all([
    accountAccess(request),query('SELECT * FROM peddi_accounts WHERE store_id=$1',[storeId]),
    query('SELECT id,name,active FROM stores WHERE id=$1',[storeId]),
    query('SELECT * FROM peddi_purchases WHERE store_id=$1 ORDER BY created_at DESC LIMIT 200',[storeId]),
    query('SELECT * FROM peddi_requests WHERE store_id=$1 ORDER BY created_at DESC LIMIT 200',[storeId]),
    query('SELECT * FROM peddi_account_events WHERE store_id=$1 ORDER BY created_at DESC LIMIT 300',[storeId]),
    query('SELECT COALESCE(sum(credit_cents),0) AS balance FROM peddi_account_events WHERE store_id=$1',[storeId]),
    query('SELECT * FROM peddi_news WHERE published=true AND published_at<=now() ORDER BY published_at DESC LIMIT 50'),
    query("SELECT p.*, (SELECT count(*) FROM peddi_requests r WHERE r.support_period_id=p.id AND r.consumes_support=true AND r.status<>'cancelled')::integer AS used FROM peddi_support_periods p WHERE p.store_id=$1 ORDER BY p.starts_at DESC",[storeId]),
  ]);
  const activeSupport=support.rows.find(row=>new Date(row.starts_at).getTime()<=Date.now()&&new Date(row.expires_at).getTime()>Date.now());
  response.json({access,account:account.rows[0]||null,store:store.rows[0],services:PEDDI_SERVICES,purchases:purchases.rows,requests:requests.rows,events:events.rows,
    creditCents:Number(credits.rows[0].balance),news:news.rows,supportPeriods:support.rows,
    support:activeSupport?{...activeSupport,remaining:activeSupport.request_limit===null?null:Math.max(0,activeSupport.request_limit-activeSupport.used)}:null,
    payment:{available:false,message:'Pagamento online ainda não conectado. Solicitações de contratação ficam pendentes, sem cobrança ou ativação.'},supportLimitConfigured:supportRequestLimit()!==null});
});

accountRouter.post('/purchases',async(request:AuthRequest,response)=>{
  const parsed=z.object({serviceId:z.string(),idempotencyKey:z.string().uuid()}).safeParse(request.body);
  if(!parsed.success)return response.status(400).json({error:'Informe um serviço e uma chave de solicitação válidos.'});
  const service=PEDDI_SERVICES.find(item=>item.id===parsed.data.serviceId);
  if(!service)return response.status(400).json({error:'Serviço não encontrado.'});
  const client=await pool!.connect();
  try {
    await client.query('BEGIN');
    await client.query('SELECT id FROM stores WHERE id=$1 FOR UPDATE',[request.auth!.storeId]);
    const existing=(await client.query('SELECT * FROM peddi_purchases WHERE store_id=$1 AND idempotency_key=$2',[request.auth!.storeId,parsed.data.idempotencyKey])).rows[0];
    if(existing){await client.query('COMMIT');if(existing.service_id!==service.id)return response.status(409).json({error:'Chave utilizada para outro serviço.'});return response.json({purchase:existing,paymentAvailable:false});}
    if(service.id==='FOUNDER'&&(await client.query('SELECT founder_since FROM peddi_accounts WHERE store_id=$1',[request.auth!.storeId])).rows[0]?.founder_since){await client.query('ROLLBACK');return response.status(409).json({error:'Sua loja já possui o selo permanente de Fundador.'});}
    const purchase=(await client.query('INSERT INTO peddi_purchases(store_id,user_id,service_id,amount_cents,idempotency_key) VALUES($1,$2,$3,$4,$5) RETURNING *',[request.auth!.storeId,request.auth!.userId,service.id,service.priceCents,parsed.data.idempotencyKey])).rows[0];
    await addAccountEvent(client,request.auth!.storeId!,'purchase_requested',`Contratação solicitada: ${service.name}. Aguardando pagamento.`,purchase.id);
    await client.query('COMMIT');response.status(201).json({purchase,paymentAvailable:false});
  }catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}
});
accountRouter.post('/purchases/:id/cancel',async(request:AuthRequest,response)=>{
  if(!z.string().uuid().safeParse(request.params.id).success)return response.sendStatus(400);
  const client=await pool!.connect();
  try {
    await client.query('BEGIN');
    const purchase=(await client.query('SELECT * FROM peddi_purchases WHERE id=$1 AND store_id=$2 FOR UPDATE',[request.params.id,request.auth!.storeId])).rows[0];
    if(!purchase){await client.query('ROLLBACK');return response.sendStatus(404);}
    if(purchase.status==='cancelled'){await client.query('COMMIT');return response.sendStatus(204);}
    if(purchase.status!=='pending_payment'){await client.query('ROLLBACK');return response.status(409).json({error:'Somente solicitações sem pagamento podem ser canceladas aqui.'});}
    await client.query("UPDATE peddi_purchases SET status='cancelled' WHERE id=$1",[purchase.id]);
    await addAccountEvent(client,request.auth!.storeId!,'cancellation','Solicitação de contratação cancelada.',purchase.id);
    await client.query('COMMIT');response.sendStatus(204);
  }catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}
});
accountRouter.post('/support',async(request:AuthRequest,response)=>{
  const parsed=z.object({kind:z.enum(['bug','support']),subject:z.string().trim().min(3).max(160),description:z.string().trim().min(10).max(4000)}).safeParse(request.body);
  if(!parsed.success)return response.status(400).json({error:'Preencha o assunto e uma descrição com pelo menos 10 caracteres.'});
  const client=await pool!.connect();
  try {
    await client.query('BEGIN');
    await client.query('SELECT id FROM stores WHERE id=$1 FOR UPDATE',[request.auth!.storeId]);
    const result=(await client.query('INSERT INTO peddi_requests(store_id,user_id,kind,subject,description,consumes_support) VALUES($1,$2,$3,$4,$5,false) RETURNING *',[request.auth!.storeId,request.auth!.userId,parsed.data.kind,parsed.data.subject,parsed.data.description])).rows[0];
    await addAccountEvent(client,request.auth!.storeId!,'support_requested',`${parsed.data.kind==='bug'?'Bug reportado (não consome suporte)':'Chamado aberto (sem consumo de atendimento humano)'}: ${parsed.data.subject}.`);
    await client.query("INSERT INTO peddi_commercial_outbox(store_id,request_id,event_type,payload) VALUES($1,$2,'support_requested',$3)",[request.auth!.storeId,result.id,JSON.stringify({requestId:result.id,kind:result.kind,status:result.status})]);
    await client.query('COMMIT');response.status(201).json({request:result});
  }catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}
});
const newsSchema=z.object({title:z.string().trim().min(3).max(200),summary:z.string().trim().min(3).max(500),content:z.string().trim().min(3).max(12000),imageUrl:z.string().url().refine(value=>value.startsWith('https://')).nullable().optional(),published:z.boolean()});
accountRouter.get('/platform/news',requireRoles('peddi_admin'),async(_request,response)=>response.json({news:(await query('SELECT * FROM peddi_news ORDER BY created_at DESC')).rows}));
accountRouter.post('/platform/news',requireRoles('peddi_admin'),async(request:AuthRequest,response)=>{
  const parsed=newsSchema.safeParse(request.body);if(!parsed.success)return response.status(400).json({error:'Conteúdo da novidade inválido.'});
  const d=parsed.data;
  response.status(201).json({news:(await query('INSERT INTO peddi_news(title,summary,content,image_url,published,published_at) VALUES($1,$2,$3,$4,$5,CASE WHEN $5 THEN now() ELSE NULL END) RETURNING *',[d.title,d.summary,d.content,d.imageUrl||null,d.published])).rows[0]});
});
accountRouter.patch('/platform/news/:id',requireRoles('peddi_admin'),async(request:AuthRequest,response)=>{
  if(!z.string().uuid().safeParse(request.params.id).success)return response.sendStatus(400);
  const parsed=newsSchema.safeParse(request.body);if(!parsed.success)return response.status(400).json({error:'Conteúdo da novidade inválido.'});
  const d=parsed.data;
  const result=await query('UPDATE peddi_news SET title=$2,summary=$3,content=$4,image_url=$5,published=$6,published_at=CASE WHEN $6 THEN COALESCE(published_at,now()) ELSE NULL END WHERE id=$1 RETURNING *',[request.params.id,d.title,d.summary,d.content,d.imageUrl||null,d.published]);
  if(!result.rowCount)return response.sendStatus(404);response.json({news:result.rows[0]});
});
