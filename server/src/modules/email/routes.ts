import { Router } from 'express';
import { pool } from '../../db/client.js';
import { verifyResendSignature } from './service.js';
import { enqueueEmail } from './service.js';
import { requireAuth, requireRoles, type AuthRequest } from '../../auth/middleware.js';
import { env } from '../../config/env.js';
import crypto from 'node:crypto';
import { z } from 'zod';

export const emailRouter=Router();
emailRouter.post('/webhooks/resend',async(request,response)=>{
 const raw=String((request as any).rawBody||JSON.stringify(request.body||{}));
 if(!verifyResendSignature(raw,request.headers))return response.status(401).json({error:'Assinatura inválida.'});
 const event=request.body||{},providerId=event.data?.email_id,type=String(event.type||''),eventId=String(request.header('svix-id')||'');
 if(!providerId)return response.sendStatus(204);const client=await pool!.connect();
 try{await client.query('BEGIN');const status=type==='email.delivered'?'delivered':type==='email.bounced'?'bounced':type==='email.complained'?'complained':type==='email.delivery_delayed'?'retry':null;
  if(status)await client.query(`UPDATE email_outbox SET status=$2,delivered_at=CASE WHEN $2='delivered' THEN now() ELSE delivered_at END,updated_at=now() WHERE provider_id=$1`,[providerId,status]);
  if(['bounced','complained'].includes(status||'')){const email=event.data?.to?.[0];if(email)await client.query('INSERT INTO email_suppressions(email,reason,provider_event_id) VALUES(lower($1),$2,$3) ON CONFLICT(email) DO UPDATE SET reason=EXCLUDED.reason,provider_event_id=EXCLUDED.provider_event_id',[email,status,eventId]);}
  await client.query('COMMIT');response.sendStatus(204);
 }catch(error){await client.query('ROLLBACK');throw error}finally{client.release()}
});

const unsubscribeSignature=(userId:string)=>crypto.createHmac('sha256',env.jwtSecret).update(`unsubscribe:${userId}`).digest('hex');
emailRouter.get('/email/unsubscribe',async(request,response)=>{const userId=String(request.query.user||''),signature=String(request.query.signature||'');if(!userId||signature!==unsubscribeSignature(userId))return response.status(400).send('Link inválido.');await pool!.query('UPDATE users SET marketing_email_consent=false WHERE id=$1',[userId]);response.type('html').send('<h1>Descadastro concluído</h1><p>Você não receberá novos e-mails promocionais da PEDDI.</p>')});
emailRouter.post('/admin/email/campaigns/send',requireAuth,requireRoles('manager','peddi_admin'),async(request:AuthRequest,response)=>{const parsed=z.object({title:z.string().min(2).max(150),message:z.string().min(2).max(5000)}).safeParse(request.body);if(!parsed.success)return response.status(400).json({error:'Informe título e mensagem.'});const client=await pool!.connect();try{await client.query('BEGIN');const users=(await client.query("SELECT id,email FROM users WHERE store_id=$1 AND role='customer' AND active=true AND email_verified_at IS NOT NULL AND marketing_email_consent=true",[request.auth!.storeId])).rows;const campaignId=crypto.randomUUID();for(const user of users){const signature=unsubscribeSignature(user.id);await enqueueEmail(client,{storeId:request.auth!.storeId,userId:user.id,template:'marketing',to:user.email,subject:parsed.data.title,payload:{...parsed.data,unsubscribeUrl:`${env.publicApiUrl}/api/v1/email/unsubscribe?user=${user.id}&signature=${signature}`},idempotencyKey:`marketing:${campaignId}:${user.id}`})}await client.query('COMMIT');response.status(202).json({queued:users.length,campaignId})}catch(error){await client.query('ROLLBACK');throw error}finally{client.release()}});
