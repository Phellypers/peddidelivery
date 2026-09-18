import express, { Router } from 'express';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { env } from '../../config/env.js';
import { pool, query } from '../../db/client.js';
import { blockPresentationDemoWrites, requireAuth, requireRoles, type AuthRequest } from '../../auth/middleware.js';
import { defaults, entityNames, isManager, matches, readEntities, readOrders, recordView, storeId, writeOrder } from './data.js';
import { saveCourier, archiveCourier } from '../couriers/data.js';
import { syncDelivery } from '../deliveries/data.js';
import { resolveChatSender } from './chat-sender.js';
import { deliveryActionEvent } from '../../../../src/lib/deliveryEvents.js';
import { storageConfigured, uploadImage, StorageUploadError } from '../storage/client.js';

export const demoRouter=Router();
demoRouter.use((request,response,next)=>(env.demoMode || env.mvpMode) ? next() : response.status(404).json({error:'Adaptador de entidades desativado.'}));
demoRouter.use((request,response,next)=>{
  if (!env.demoMode && ['/email','/register','/reset-request','/reset-password'].includes(request.path)) {
    return response.status(503).json({error:'Funcao de teste local indisponivel online. A integracao real ainda precisa ser configurada.'});
  }
  if (!env.demoMode && request.path==='/upload' && !storageConfigured()) {
    return response.status(503).json({error:'Configure o Supabase Storage no backend para enviar fotos.'});
  }
  next();
});
demoRouter.use('/upload',requireAuth,requireRoles('manager','peddi_admin','customer','courier'),(request:AuthRequest,response,next)=>{
  if(!request.auth?.storeId || !z.string().uuid().safeParse(request.auth.storeId).success
    || !z.string().uuid().safeParse(request.auth.userId).success)return response.status(403).json({error:'Usuario sem loja valida para enviar fotos.'});
  next();
});
demoRouter.use(async (request:AuthRequest,response,next)=>{
  if (request.headers.authorization) {
    let accepted=false;
    requireAuth(request,response,()=>{accepted=true});
    if (!accepted) return;
  }
  if (request.auth?.storeId) request.localStoreId=request.auth.storeId;
  else {
    const result=await query("SELECT id FROM stores WHERE slug='loja-demo' AND active=true LIMIT 1");
    if (!result.rowCount) return response.status(503).json({error:'Loja demo não encontrada. Execute o seed.'});
    request.localStoreId=result.rows[0].id;
  }
  next();
});
demoRouter.use(blockPresentationDemoWrites);

demoRouter.all('/chat/:ticketId/typing',requireAuth,async(request:AuthRequest,response)=>{
  if(!['GET','POST'].includes(request.method))return response.sendStatus(405);
  const id=String(request.params.ticketId);
  if(!z.string().uuid().safeParse(id).success)return response.sendStatus(400);
  const client=await pool!.connect();
  try {
    await client.query('BEGIN');
    const result=await client.query("SELECT * FROM app_records WHERE id=$1 AND store_id=$2 AND entity_name='SupportTicket' FOR UPDATE",[id,storeId(request)]);
    const ticket=result.rows[0];
    if(!ticket||(!isManager(request)&&ticket.owner_id!==request.auth!.userId)){await client.query('ROLLBACK');return response.sendStatus(404);}
    const sender=isManager(request)?'store':'customer';
    if(request.method==='POST'){
      if(typeof request.body.typing!=='boolean'){await client.query('ROLLBACK');return response.sendStatus(400);}
      if(request.body.typing && ticket.data.status!=='closed')await client.query("INSERT INTO chat_presence(ticket_id,sender,expires_at) VALUES($1,$2,now()+interval '5 seconds') ON CONFLICT(ticket_id,sender) DO UPDATE SET expires_at=EXCLUDED.expires_at",[id,sender]);
      else await client.query('DELETE FROM chat_presence WHERE ticket_id=$1 AND sender=$2',[id,sender]);
      await client.query('COMMIT');return response.sendStatus(204);
    }
    const presence=await client.query('SELECT 1 FROM chat_presence WHERE ticket_id=$1 AND sender<>$2 AND expires_at>now()',[id,sender]);
    await client.query('COMMIT');response.json({typing:ticket.data.status!=='closed'&&Boolean(presence.rowCount)});
  }catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}
});
demoRouter.delete('/live-sessions/history', requireAuth, requireRoles('manager', 'peddi_admin'), async (request:AuthRequest, response) => {
  const result = await query("DELETE FROM app_records WHERE store_id=$1 AND entity_name='LiveSession'", [storeId(request)]);
  response.json({ deleted: result.rowCount ?? 0 });
});
const publicReads=new Set(['Product','Category','Store','City','Campaign','Coupon','PromoMessage','UpsellGroup','Review','ReviewComment','Order','ChatMessage','LiveSession','SupportTicket']);
const publicWrites=new Set(['Order','LiveSession','ChatMessage','SupportTicket','Review','ReviewComment']);
const customerWrites=new Set(['Order','LiveSession','ChatMessage','SupportTicket','Review','ReviewComment','CustomerProfile','Deliverer','DelivererRating','Notification','User']);
const bodyObject=z.record(z.string(),z.unknown());
demoRouter.use('/entities/:entity',(request:AuthRequest,response,next)=>{
  const entity=String(request.params.entity);
  if (!entityNames.has(entity)) return response.status(404).json({error:'Entidade não encontrada.'});
  if (!request.auth && !(request.method==='GET'?publicReads:publicWrites).has(entity)) return response.status(401).json({error:'Autenticação necessária.'});
  if (!request.auth && request.method!=='GET' && !z.string().uuid().safeParse(request.headers['x-peddi-visitor']).success) return response.status(400).json({error:'Sessão de visitante inválida.'});
  if (request.method!=='GET' && request.auth && !isManager(request) && !customerWrites.has(entity)) return response.status(403).json({error:'Perfil sem permissão.'});
  if (request.method!=='GET' && !bodyObject.safeParse(request.body??{}).success) return response.status(400).json({error:'Dados inválidos.'});
  next();
});
demoRouter.get('/entities/:entity',async(request:AuthRequest,response)=>{
  let filter={};
  try {filter=request.query.filter?JSON.parse(String(request.query.filter)):{};}catch{return response.status(400).json({error:'Filtro inválido.'});}
  if (!bodyObject.safeParse(filter).success) return response.status(400).json({error:'Filtro inválido.'});
  let rows=(await readEntities(String(request.params.entity),request)).filter(row=>matches(row,filter));
  const sort=String(request.query.sort||'-created_date'),descending=sort.startsWith('-'),key=descending?sort.slice(1):sort;
  rows.sort((a,b)=>(a[key]===b[key]?0:a[key]>b[key]?1:-1)*(descending?-1:1));
  const limit=Math.min(2000,Math.max(1,Number(request.query.limit)||1000));
  const skip=Math.max(0,Number(request.query.skip)||0);
  response.json(rows.slice(skip,skip+limit));
});

async function saveEntity(request:AuthRequest,response:express.Response){
  const entity=String(request.params.entity),tenant=storeId(request),id=request.params.id;
  if (id && !z.string().uuid().safeParse(id).success) return response.status(400).json({error:'Identificador inválido.'});
  const prior=id?(await readEntities(entity,request)).find(row=>row.id===id):undefined;
  if (id && !prior) return response.status(404).json({error:'Registro não encontrado.'});
  const {id:_id,created_date:_created,updated_date:_updated,created_by_id:_by,...data}={...defaults(entity),...prior,...request.body};
  if (!isManager(request) && ['CustomerProfile','Deliverer'].includes(entity)) {
    data.user_id=request.auth!.userId;
    if(entity==='CustomerProfile') data.email=request.auth!.email;
  }
  if(entity==='SupportTicket' && !isManager(request)) {
    if(id) return response.status(403).json({error:'Somente o gestor pode alterar o atendimento.'});
    data.status='open';delete data.closed_at;delete data.delete_after;
    data.customer_email=request.auth?.email || '';data.customer_user_id=request.auth?.userId || '';
  }
  if(entity==='ChatMessage' && !String(data.conversation_id || '').startsWith('deliverer_')) {
    const ticket=(await readEntities('SupportTicket',request)).find(row=>row.id===data.conversation_id);
    if(!ticket) return response.status(403).json({error:'Sem acesso ao protocolo.'});
    if(!id && ticket.status==='closed') return response.status(409).json({error:'Atendimento encerrado. Inicie um novo protocolo.'});
    if(id && ['message','conversation_id','sender_type'].some(key=>request.body[key]!==undefined && request.body[key]!==prior?.[key]))
      return response.status(403).json({error:'Mensagens enviadas não podem ser alteradas.'});
    if(!id) {
      try { data.sender_type=resolveChatSender(isManager(request),request.body.sender_type,ticket.customer_email===request.auth?.email); }
      catch(error) { return response.status(403).json({error:error instanceof Error?error.message:'Remetente inválido.'}); }
    }
  }
  switch(entity){
    case 'Deliverer': {
      try { response.status(id?200:201).json(await saveCourier(pool!,tenant,data,id as string|undefined)); }
      catch(error){response.status(400).json({error:error instanceof Error?error.message:'Não foi possível salvar o entregador.'});}
      return;
    }
    case 'Category': {
      if(!String(data.name||'').trim()) return response.status(400).json({error:'Informe o nome da categoria.'});
      const values=[tenant,String(data.name).trim(),data.is_active!==false,JSON.stringify(data)];
      const result=id?await query('UPDATE categories SET name=$2,active=$3,details=$4 WHERE store_id=$1 AND id=$5 RETURNING id', [...values,id])
        :await query('INSERT INTO categories(store_id,name,active,details) VALUES($1,$2,$3,$4) RETURNING id',values);
      response.status(id?200:201).json((await readEntities(entity,request)).find(row=>row.id===result.rows[0].id));return;
    }
    case 'Store': {
      if(!String(data.name||'').trim()) return response.status(400).json({error:'Informe o nome da loja.'});
      if(id && id!==tenant) return response.status(404).json({error:'Loja não encontrada.'});
      await query('UPDATE stores SET name=$2,details=$3 WHERE id=$1',[tenant,String(data.name).trim(),JSON.stringify(data)]);
      response.json((await readEntities(entity,request))[0]);return;
    }
    case 'Order': {
      const client=await pool!.connect();
      try{
        await client.query('BEGIN');
        let savedId=id;
        if (!isManager(request)) {
          if (!id) {
            if (request.auth?.role==='courier') throw new Error('Entregador não pode criar pedidos.');
            data.status='pending';data.deliverer_user_id='';data.deliverer_accepted=false;
          } else if (request.auth?.role==='courier') {
            if (prior!.deliverer_user_id!==request.auth.userId) throw new Error('Entrega não atribuída a esta conta.');
            if (['delivered','cancelled'].includes(prior!.status)) throw new Error('Entrega já encerrada.');
            const allowed=['status','deliverer_accepted','deliverer_user_id','tracking_code'];
            if (Object.keys(request.body).some(key=>!allowed.includes(key))) throw new Error('Entregador só pode atualizar sua entrega.');
            if (request.body.deliverer_user_id && request.body.deliverer_user_id!==request.auth.userId) throw new Error('Somente o gestor pode atribuir entregadores.');
            if (request.body.status && !(request.body.status==='shipped'&&prior!.deliverer_accepted&& !['delivered','cancelled'].includes(prior!.status))
              && !(request.body.status==='delivered'&&prior!.status==='shipped')) throw new Error('Transição de entrega inválida.');
          } else {
            const allowed=['items','subtotal','total','order_notes','edited_by_customer','status'];
            if (Object.keys(request.body).some(key=>!allowed.includes(key)) || !['pending','confirmed'].includes(prior!.status)
              || (request.body.status && request.body.status!=='cancelled')) throw new Error('Cliente só pode editar ou cancelar um pedido ainda não preparado.');
          }
        }
        if (id) {
          await client.query('SELECT id FROM orders WHERE id=$1 AND store_id=$2 FOR UPDATE',[id,tenant]);
          if (!isManager(request) && prior!.customer_email!==request.auth?.email && prior!.deliverer_user_id!==request.auth?.userId && prior!.visitor_id!==request.headers['x-peddi-visitor']) throw new Error('Sem permissão para editar o pedido.');
        }
        data.delivery_action_event=deliveryActionEvent(prior,request.body,{role:request.auth?.role,userId:request.auth?.userId},crypto.randomUUID());
        if (!id || request.body.items) savedId=await writeOrder(client,tenant,data,request,id as string|undefined);
        else {
          const status=data.status==='shipped'?'out_for_delivery':data.status;
          if (!['pending','confirmed','preparing','ready','assigned','out_for_delivery','delivered','cancelled'].includes(status)) throw new Error('Status inválido.');
          delete data.subtotal;delete data.total;delete data.delivery_fee;delete data.discount;delete data.items;
          await client.query('UPDATE orders SET status=$3,details=details||$4::jsonb,updated_at=now() WHERE id=$1 AND store_id=$2',[id,tenant,status,JSON.stringify(data)]);
        }
        await syncDelivery(client,tenant,savedId as string);
        await client.query('COMMIT');
        response.status(id?200:201).json((await readOrders(tenant)).find(row=>row.id===savedId));
      }catch(error){await client.query('ROLLBACK');response.status(400).json({error:error instanceof Error?error.message:'Não foi possível salvar o pedido.'});}finally{client.release();}
      return;
    }
    case 'User': {
      if (!id) return response.status(400).json({error:'Use o cadastro de conta.'});
      const name=String(data.full_name||data.name||prior!.name);
      await query('UPDATE users SET name=$3 WHERE id=$1 AND store_id=$2',[id,tenant,name]);
      response.json((await readEntities(entity,request)).find(row=>row.id===id));return;
    }
    case 'Product': case 'Ingredient': return response.status(400).json({error:'Use as rotas de catálogo para este registro.'});
    default:{
      if(!isManager(request) && ['Review','ReviewComment'].includes(entity)) {data.is_approved=false;data.is_store_reply=false;}
      if(entity==='Review' && (!z.string().uuid().safeParse(data.product_id).success || !Number.isFinite(Number(data.rating)) || Number(data.rating)<1 || Number(data.rating)>5)) return response.status(400).json({error:'Informe produto válido e uma nota entre 1 e 5.'});
      const result=id
        ?await query('UPDATE app_records SET data=$4,updated_at=now() WHERE id=$1 AND store_id=$2 AND entity_name=$3 RETURNING *',[id,tenant,entity,JSON.stringify(data)])
        :await query('INSERT INTO app_records(store_id,entity_name,owner_id,visitor_id,data) VALUES($1,$2,$3,$4,$5) RETURNING *',[tenant,entity,request.auth?.userId||null,request.headers['x-peddi-visitor']||null,JSON.stringify(data)]);
      if(entity==='Review') await updateRating(tenant,data.product_id);
      response.status(id?200:201).json(recordView(result.rows[0]));
    }
  }
}
demoRouter.post('/entities/:entity',saveEntity);
demoRouter.patch('/entities/:entity/:id',saveEntity);
demoRouter.delete('/entities/:entity/:id',async(request:AuthRequest,response)=>{
  const entity=String(request.params.entity),id=request.params.id,tenant=storeId(request);
  if(!z.string().uuid().safeParse(id).success)return response.status(400).json({error:'Identificador inválido.'});
  const prior=(await readEntities(entity,request)).find(row=>row.id===id);
  if(!prior)return response.status(404).json({error:'Registro não encontrado.'});
  if (!isManager(request) && ['Order','Store','Category'].includes(entity)) return response.status(403).json({error:'Perfil sem permissão.'});
  if(['SupportTicket','ChatMessage'].includes(entity)) return response.status(403).json({error:'O histórico é excluído automaticamente após 30 dias do encerramento.'});
  if(entity==='Category')await query('UPDATE categories SET active=false,details=details||\'{"deleted":true}\'::jsonb WHERE id=$1 AND store_id=$2',[id,tenant]);
  else if(entity==='User')await query('UPDATE users SET active=false WHERE id=$1 AND store_id=$2',[id,tenant]);
  else if(entity==='Order'){
    const client=await pool!.connect();
    try {await client.query('BEGIN');await client.query("UPDATE orders SET status='cancelled',updated_at=now() WHERE id=$1 AND store_id=$2",[id,tenant]);await syncDelivery(client,tenant,id as string);await client.query('COMMIT');}
    catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}
  }
  else if(entity==='Deliverer')await archiveCourier(pool!,tenant,id as string);
  else if(entity==='Store')return response.status(400).json({error:'A loja demo deve permanecer disponível.'});
  else await query('DELETE FROM app_records WHERE id=$1 AND store_id=$2 AND entity_name=$3',[id,tenant,entity]);
  if(entity==='Review')await updateRating(tenant,prior.product_id);
  response.sendStatus(204);
});

async function updateRating(tenant:string,productId:string){
  const result=await query("SELECT COALESCE(avg((data->>'rating')::numeric),0) AS rating,count(*) AS count FROM app_records WHERE store_id=$1 AND entity_name='Review' AND data->>'product_id'=$2 AND data->>'is_approved'='true'",[tenant,productId]);
  await query('UPDATE products SET details=details||$3::jsonb WHERE store_id=$1 AND id=$2',[tenant,productId,JSON.stringify({rating_avg:Math.round(Number(result.rows[0].rating)*10)/10,rating_count:Number(result.rows[0].count)})]);
}

export const uploadPath=path.join(process.cwd(),'server/uploads');
demoRouter.post('/upload',express.raw({type:['image/png','image/jpeg','image/webp'],limit:'8mb'}),async(request:AuthRequest,response)=>{
  const buffer=request.body;
  if(!Buffer.isBuffer(buffer))return response.status(400).json({error:'Envie uma foto PNG, JPEG ou WebP.'});
  const type=buffer.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))?'png'
    :buffer[0]===255&&buffer[1]===216&&buffer[2]===255?'jpg'
    :buffer.toString('ascii',0,4)==='RIFF'&&buffer.toString('ascii',8,12)==='WEBP'?'webp':null;
  if(!type)return response.status(400).json({error:'Arquivo de imagem inválido.'});
  const mime=type==='jpg'?'image/jpeg':type==='png'?'image/png':'image/webp';
  if(request.get('Content-Type')?.split(';')[0].trim()!==mime)return response.status(400).json({error:'O tipo informado nao corresponde ao arquivo da foto.'});
  if(storageConfigured()){
    try {
      const objectPath=`stores/${request.auth!.storeId}/users/${request.auth!.userId}/${crypto.randomUUID()}.${type}`;
      const file_url=await uploadImage(buffer,objectPath,mime);
      return response.status(201).json({file_url});
    } catch(error) {
      return response.status(error instanceof StorageUploadError?error.status:502).json({error:error instanceof StorageUploadError?error.message:'Nao foi possivel enviar a foto.'});
    }
  }
  if(!env.demoMode)return response.status(503).json({error:'Configure o Supabase Storage no backend para enviar fotos.'});
  await fs.mkdir(uploadPath,{recursive:true});
  const name=`${crypto.randomUUID()}.${type}`;
  await fs.writeFile(path.join(uploadPath,name),buffer);
  response.status(201).json({file_url:`http://localhost:${env.port}/uploads/${name}`});
});
demoRouter.post('/email',requireAuth,async(request:AuthRequest,response)=>{
  await query("INSERT INTO app_records(store_id,entity_name,owner_id,data) VALUES($1,'DemoEmail',$2,$3)",[storeId(request),request.auth!.userId,JSON.stringify({...request.body,simulated:true})]);
  response.json({simulated:true,message:'Email registrado no simulador local; nenhum envio externo foi realizado.'});
});
demoRouter.post('/register',async(request:AuthRequest,response)=>{
  const input=z.object({email:z.string().email(),password:z.string().min(6),role:z.enum(['manager','customer','courier']).default('customer')}).safeParse(request.body);
  if(!input.success)return response.status(400).json({error:'Informe email válido e senha com pelo menos 6 caracteres.'});
  if((await query('SELECT id FROM users WHERE email=$1',[input.data.email.trim().toLowerCase()])).rowCount)return response.status(409).json({error:'Este email já está cadastrado. Faça login.'});
  let tenant=storeId(request);
  let store=await query('SELECT business_id FROM stores WHERE id=$1',[tenant]);
  if(input.data.role==='manager'){
    const business=await query("INSERT INTO businesses(name,slug) VALUES('Estabelecimento de testes',$1) RETURNING id",[`demo-${crypto.randomUUID()}`]);
    const created=await query("INSERT INTO stores(business_id,name,slug) VALUES($1,'Nova loja de testes',$2) RETURNING id,business_id",[business.rows[0].id,`demo-${crypto.randomUUID()}`]);
    tenant=created.rows[0].id;store=created;
  }
  const hash=await bcrypt.hash(input.data.password,12);
  const result=await query('INSERT INTO users(email,password_hash,name,role,business_id,store_id) VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(email) DO NOTHING RETURNING id',[input.data.email.trim().toLowerCase(),hash,input.data.email,input.data.role,store.rows[0].business_id,tenant]);
  if(!result.rowCount)return response.status(409).json({error:'Este email já está cadastrado. Faça login.'});
  response.status(201).json({demo:true,message:'Conta local criada. Código de confirmação de teste: 000000.'});
});

demoRouter.post('/reset-request',async(request,response)=>{
  const result=await query('SELECT id FROM users WHERE email=$1 AND active=true',[String(request.body.email||'').trim().toLowerCase()]);
  let demoResetUrl;
  if(result.rowCount){
    const token=jwt.sign({purpose:'password-reset',sub:result.rows[0].id},env.jwtSecret,{expiresIn:'15m'});
    demoResetUrl=`/reset-password?token=${encodeURIComponent(token)}`;
  }
  response.json({demo:true,demoResetUrl,message:'Link de redefinição local gerado; nenhum email foi enviado.'});
});
demoRouter.post('/reset-password',async(request,response)=>{
  const input=z.object({resetToken:z.string(),newPassword:z.string().min(6)}).safeParse(request.body);
  if(!input.success)return response.status(400).json({error:'Senha deve ter pelo menos 6 caracteres.'});
  try{
    const payload=jwt.verify(input.data.resetToken,env.jwtSecret) as jwt.JwtPayload;
    if(payload.purpose!=='password-reset')throw new Error('Token inválido.');
    const hash=await bcrypt.hash(input.data.newPassword,12);
    await query('UPDATE users SET password_hash=$2 WHERE id=$1 AND active=true',[payload.sub,hash]);
    response.json({message:'Senha atualizada no ambiente local.'});
  }catch{return response.status(400).json({error:'Link inválido ou expirado.'});}
});
