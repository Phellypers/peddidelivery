import crypto from 'node:crypto';
import type { PoolClient } from 'pg';
import { pool } from '../../db/client.js';
import { env } from '../../config/env.js';

type EmailInput={storeId?:string|null;userId?:string|null;orderId?:string|null;template:string;to:string;subject:string;payload?:Record<string,unknown>;idempotencyKey:string};
const escape=(value:unknown)=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]!));
const layouts:Record<string,(data:any)=>string>={
 verify_email:d=>`<h1>Confirme seu e-mail</h1><p>Seu código PEDDI é:</p><p style="font-size:32px;font-weight:700;letter-spacing:8px">${escape(d.code)}</p><p>Ele expira em 15 minutos.</p>`,
 password_reset:d=>`<h1>Redefinição de senha</h1><p>Recebemos uma solicitação para redefinir sua senha.</p><p><a href="${escape(d.url)}" style="background:#08b94e;color:white;padding:12px 20px;border-radius:8px;text-decoration:none">Criar nova senha</a></p><p>O link expira em 15 minutos.</p>`,
 courier_approved:d=>`<h1>Cadastro aprovado</h1><p>${escape(d.name||'Olá')}, seu cadastro de entregador foi aprovado. Você já pode entrar na PEDDI.</p>`,
 order_status:d=>`<h1>${escape(d.title)}</h1><p>Pedido #${escape(d.orderNumber)}: ${escape(d.label)}.</p>`,
 loyalty_reward:d=>`<h1>Seu benefício está disponível</h1><p>Você completou 9 pedidos. Use o código <strong>${escape(d.code)}</strong> no 10º pedido.</p>`,
 marketing:d=>`<h1>${escape(d.title)}</h1><p>${escape(d.message)}</p><p><a href="${escape(d.unsubscribeUrl)}">Cancelar recebimento</a></p>`,
};
function html(template:string,payload:any){const body=(layouts[template]||((d:any)=>`<h1>${escape(d.title||'PEDDI')}</h1><p>${escape(d.message||'')}</p>`))(payload);return `<!doctype html><html><body style="font-family:Arial,sans-serif;color:#111;max-width:620px;margin:auto;padding:24px"><div style="font-weight:800;color:#08b94e;font-size:22px">PEDDI</div>${body}<hr style="border:0;border-top:1px solid #eee"><small>Mensagem automática da PEDDI.</small></body></html>`}

export async function enqueueEmail(client:PoolClient,input:EmailInput){
 if(!input.to)return;
 await client.query(`INSERT INTO email_outbox(store_id,user_id,order_id,template,recipient,subject,payload,idempotency_key)
  VALUES($1,$2,$3,$4,lower($5),$6,$7,$8) ON CONFLICT(idempotency_key) DO NOTHING`,[input.storeId||null,input.userId||null,input.orderId||null,input.template,input.to,input.subject,JSON.stringify(input.payload||{}),input.idempotencyKey]);
}

export async function processEmailOutbox(){
 if(!pool||!env.resendApiKey||!env.notificationEmailFrom)return;
 const client=await pool.connect();
 try{await client.query('BEGIN');const rows=(await client.query(`SELECT * FROM email_outbox e WHERE status IN ('pending','retry') AND next_attempt_at<=now()
   AND NOT EXISTS(SELECT 1 FROM email_suppressions s WHERE lower(s.email)=lower(e.recipient)) ORDER BY created_at LIMIT 10 FOR UPDATE SKIP LOCKED`)).rows;
  for(const row of rows){const attempts=Number(row.attempts)+1;await client.query("UPDATE email_outbox SET status='processing',attempts=$2,updated_at=now() WHERE id=$1",[row.id,attempts]);
   try{const result=await fetch('https://api.resend.com/emails',{method:'POST',signal:AbortSignal.timeout(12000),headers:{Authorization:`Bearer ${env.resendApiKey}`,'Content-Type':'application/json','Idempotency-Key':row.idempotency_key},body:JSON.stringify({from:env.notificationEmailFrom,to:[row.recipient],subject:row.subject,html:html(row.template,row.payload)})});const body:any=await result.json().catch(()=>({}));if(!result.ok)throw new Error(body.message||`Resend ${result.status}`);await client.query("UPDATE email_outbox SET status='sent',provider_id=$2,sent_at=now(),last_error=NULL,updated_at=now() WHERE id=$1",[row.id,body.id]);}
   catch(error){await client.query("UPDATE email_outbox SET status=$2,last_error=$3,next_attempt_at=now()+($4||' minutes')::interval,updated_at=now() WHERE id=$1",[row.id,attempts>=5?'failed':'retry',String(error instanceof Error?error.message:error).slice(0,1000),String(Math.min(60,2**attempts))]);}
  }await client.query('COMMIT');
 }catch(error){await client.query('ROLLBACK');throw error}finally{client.release()}
}

export function verifyResendSignature(raw:string,headers:Record<string,unknown>){
 if(!env.resendWebhookSecret)return false;const id=String(headers['svix-id']||''),timestamp=String(headers['svix-timestamp']||''),provided=String(headers['svix-signature']||'');
 if(!id||!timestamp||Math.abs(Date.now()/1000-Number(timestamp))>300)return false;const secret=env.resendWebhookSecret.replace(/^whsec_/,'');
 const expected=crypto.createHmac('sha256',Buffer.from(secret,'base64')).update(`${id}.${timestamp}.${raw}`).digest('base64');
 return provided.split(' ').some(part=>part.replace(/^v1,/,'')===expected);
}
