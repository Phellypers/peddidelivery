import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { env } from '../../config/env.js';
import { query } from '../../db/client.js';
import { pool } from '../../db/client.js';
import crypto from 'node:crypto';
import { z } from 'zod';
import { enqueueEmail } from '../email/service.js';
import { createAccessToken, createRefreshToken, hashToken } from '../../auth/tokens.js';
import { blockPresentationDemoWrites, requireAuth, type AuthRequest } from '../../auth/middleware.js';
import { courierHasAccess } from '../couriers/access.js';

export const authRouter = Router();

authRouter.post('/auth/login', async (request, response) => {
  const { email, password, context, storeId } = request.body ?? {};
  if (!email || !password) return response.status(400).json({ error: 'Email e senha sao obrigatorios.' });
  const result = await query<{ id: string; email: string; name: string; role: string; business_id: string | null; store_id: string | null; password_hash: string;email_verified_at:Date|null }>('SELECT id, email, name, role, business_id, store_id, password_hash,email_verified_at FROM users WHERE email = $1 AND active = true', [String(email).trim().toLowerCase()]);
  const user = result.rows[0];
  if (!user || !(await bcrypt.compare(String(password), user.password_hash))) return response.status(401).json({ error: 'Credenciais invalidas.' });
  if(!user.email_verified_at&&(await query("SELECT 1 FROM email_auth_tokens WHERE user_id=$1 AND purpose='verify_email' AND used_at IS NULL",[user.id])).rowCount)return response.status(403).json({error:'Confirme seu e-mail antes de entrar.'});
  if (['manager','peddi_admin'].includes(user.role) && context!=='manager') return response.status(403).json({error:'Use o acesso exclusivo do gestor para entrar nesta conta.'});
  if (user.role==='customer' && context!=='customer') return response.status(403).json({error:'Acesse sua conta pelo cardápio do estabelecimento.'});
  if (context==='manager' && user.email==='designer.demo@peddi.app') return response.status(403).json({error:'A demonstração pública permite testar somente o cardápio digital.'});
  if (context==='manager' && !['manager','peddi_admin'].includes(user.role)) return response.status(403).json({error:'Este acesso é exclusivo para gestores. Use o login do cliente ou do entregador.'});
  if (user.role==='courier' && !await courierHasAccess(user.id,user.store_id)) return response.status(403).json({error:'Cadastro de entregador não aprovado ou acesso desativado.'});
  if (context==='customer' && ['manager','peddi_admin'].includes(user.role)) return response.status(403).json({error:'Contas de gestor devem entrar pelo acesso exclusivo do painel.'});
  if (context==='customer' && user.role==='customer' && (!storeId || user.store_id!==String(storeId))) return response.status(403).json({error:'Esta conta não pertence ao estabelecimento acessado.'});
  const authUser = { id: user.id, email: user.email, name: user.name, role: user.role, businessId: user.business_id, storeId: user.store_id };
  const refreshToken = createRefreshToken();
  await query(`INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, CASE WHEN $3 THEN 'infinity'::timestamptz ELSE now() + interval '30 days' END)`, [user.id, hashToken(refreshToken), env.demoMode && user.email === 'gestor.demo@peddi.local' && user.role === 'manager']);
  response.json({ accessToken: createAccessToken(authUser), refreshToken, user: authUser });
});

const hashValue=(value:string)=>crypto.createHash('sha256').update(value).digest('hex');
authRouter.post('/auth/register',async(request,response)=>{
 const parsed=z.object({email:z.string().trim().email().transform(v=>v.toLowerCase()),password:z.string().min(8).max(128),name:z.string().trim().min(2).max(120).optional(),role:z.enum(['manager','customer']).default('customer'),storeRef:z.string().optional()}).safeParse(request.body);
 if(!parsed.success)return response.status(400).json({error:'Informe nome, e-mail válido e senha com pelo menos 8 caracteres.'});const input=parsed.data,client=await pool!.connect();
 try{await client.query('BEGIN');if((await client.query('SELECT 1 FROM users WHERE email=$1',[input.email])).rowCount){await client.query('ROLLBACK');return response.status(409).json({error:'Este e-mail já está cadastrado.'})}
  let store=(await client.query('SELECT id,business_id FROM stores WHERE active=true AND (id::text=$1 OR slug=$1) LIMIT 1',[input.storeRef||String(request.header('x-peddi-store')||'')])).rows[0];
  if(input.role==='manager'){const business=(await client.query('INSERT INTO businesses(name,slug) VALUES($1,$2) RETURNING id',[input.name||'Novo estabelecimento',`loja-${crypto.randomUUID()}`])).rows[0];store=(await client.query('INSERT INTO stores(business_id,name,slug) VALUES($1,$2,$3) RETURNING id,business_id',[business.id,input.name||'Nova loja',`loja-${crypto.randomUUID()}`])).rows[0]}
  if(!store){await client.query('ROLLBACK');return response.status(400).json({error:'Loja não encontrada.'})}const passwordHash=await bcrypt.hash(input.password,12);
  const user=(await client.query("INSERT INTO users(email,password_hash,name,role,business_id,store_id,email_verified_at) VALUES($1,$2,$3,$4,$5,$6,NULL) RETURNING id",[input.email,passwordHash,input.name||input.email,input.role,store.business_id,store.id])).rows[0];
  if(input.role==='customer')await client.query('INSERT INTO customers(user_id) VALUES($1)',[user.id]);const otp=String(crypto.randomInt(100000,1000000));
  await client.query("INSERT INTO email_auth_tokens(user_id,purpose,token_hash,expires_at) VALUES($1,'verify_email',$2,now()+interval '15 minutes')",[user.id,hashValue(otp)]);
  await enqueueEmail(client,{storeId:store.id,userId:user.id,template:'verify_email',to:input.email,subject:'Confirme seu e-mail — PEDDI',payload:{code:otp},idempotencyKey:`verify-email:${user.id}:${Date.now()}`});await client.query('COMMIT');response.status(201).json({message:'Enviamos um código de confirmação para seu e-mail.'});
 }catch(error){await client.query('ROLLBACK');throw error}finally{client.release()}
});
authRouter.post('/auth/verify-email',async(request,response)=>{const parsed=z.object({email:z.string().email(),code:z.string().regex(/^\d{6}$/)}).safeParse(request.body);if(!parsed.success)return response.status(400).json({error:'Código inválido.'});const client=await pool!.connect();try{await client.query('BEGIN');const row=(await client.query(`SELECT t.id,t.user_id,t.attempts,t.token_hash FROM email_auth_tokens t JOIN users u ON u.id=t.user_id WHERE lower(u.email)=lower($1) AND t.purpose='verify_email' AND t.used_at IS NULL AND t.expires_at>now() ORDER BY t.created_at DESC LIMIT 1 FOR UPDATE`,[parsed.data.email])).rows[0];if(!row||row.attempts>=5){await client.query('ROLLBACK');return response.status(400).json({error:'Código inválido ou expirado.'})}if(row.token_hash!==hashValue(parsed.data.code)){await client.query('UPDATE email_auth_tokens SET attempts=attempts+1 WHERE id=$1',[row.id]);await client.query('COMMIT');return response.status(400).json({error:'Código inválido ou expirado.'})}await client.query('UPDATE email_auth_tokens SET used_at=now() WHERE id=$1',[row.id]);await client.query('UPDATE users SET email_verified_at=now() WHERE id=$1',[row.user_id]);await client.query('COMMIT');response.json({message:'E-mail confirmado.'})}catch(error){await client.query('ROLLBACK');throw error}finally{client.release()}});
authRouter.post('/auth/resend-verification',async(request,response)=>{const email=String(request.body?.email||'').trim().toLowerCase(),client=await pool!.connect();try{await client.query('BEGIN');const user=(await client.query('SELECT id,store_id,email_verified_at FROM users WHERE email=$1',[email])).rows[0];if(user&&!user.email_verified_at){const recent=(await client.query("SELECT 1 FROM email_auth_tokens WHERE user_id=$1 AND purpose='verify_email' AND created_at>now()-interval '60 seconds'",[user.id])).rowCount;if(!recent){const otp=String(crypto.randomInt(100000,1000000));await client.query("UPDATE email_auth_tokens SET used_at=now() WHERE user_id=$1 AND purpose='verify_email' AND used_at IS NULL",[user.id]);await client.query("INSERT INTO email_auth_tokens(user_id,purpose,token_hash,expires_at) VALUES($1,'verify_email',$2,now()+interval '15 minutes')",[user.id,hashValue(otp)]);await enqueueEmail(client,{storeId:user.store_id,userId:user.id,template:'verify_email',to:email,subject:'Novo código de confirmação — PEDDI',payload:{code:otp},idempotencyKey:`verify-email:${user.id}:${Date.now()}`})}}await client.query('COMMIT');response.json({message:'Se o cadastro estiver pendente, enviaremos um novo código.'})}catch(error){await client.query('ROLLBACK');throw error}finally{client.release()}});
authRouter.post('/auth/password-reset/request',async(request,response)=>{const email=String(request.body?.email||'').trim().toLowerCase(),client=await pool!.connect();try{await client.query('BEGIN');const user=(await client.query('SELECT id,store_id FROM users WHERE email=$1 AND active=true',[email])).rows[0];if(user){const raw=crypto.randomBytes(32).toString('base64url');await client.query("UPDATE email_auth_tokens SET used_at=now() WHERE user_id=$1 AND purpose='password_reset' AND used_at IS NULL",[user.id]);await client.query("INSERT INTO email_auth_tokens(user_id,purpose,token_hash,expires_at) VALUES($1,'password_reset',$2,now()+interval '15 minutes')",[user.id,hashValue(raw)]);await enqueueEmail(client,{storeId:user.store_id,userId:user.id,template:'password_reset',to:email,subject:'Redefina sua senha — PEDDI',payload:{url:`${env.publicAppUrl}/reset-password?token=${encodeURIComponent(raw)}`},idempotencyKey:`password-reset:${user.id}:${Date.now()}`})}await client.query('COMMIT');response.json({message:'Se a conta existir, enviaremos as instruções por e-mail.'})}catch(error){await client.query('ROLLBACK');throw error}finally{client.release()}});
authRouter.post('/auth/password-reset/confirm',async(request,response)=>{const parsed=z.object({token:z.string().min(30),newPassword:z.string().min(8).max(128)}).safeParse(request.body);if(!parsed.success)return response.status(400).json({error:'Link ou senha inválidos.'});const client=await pool!.connect();try{await client.query('BEGIN');const token=(await client.query("SELECT * FROM email_auth_tokens WHERE token_hash=$1 AND purpose='password_reset' AND used_at IS NULL AND expires_at>now() FOR UPDATE",[hashValue(parsed.data.token)])).rows[0];if(!token){await client.query('ROLLBACK');return response.status(400).json({error:'Link inválido ou expirado.'})}await client.query('UPDATE users SET password_hash=$2 WHERE id=$1',[token.user_id,await bcrypt.hash(parsed.data.newPassword,12)]);await client.query('UPDATE email_auth_tokens SET used_at=now() WHERE id=$1',[token.id]);await client.query('UPDATE refresh_tokens SET revoked_at=now() WHERE user_id=$1 AND revoked_at IS NULL',[token.user_id]);await client.query('COMMIT');response.json({message:'Senha atualizada.'})}catch(error){await client.query('ROLLBACK');throw error}finally{client.release()}});

authRouter.post('/auth/refresh', async (request, response) => {
  const token = String(request.body?.refreshToken ?? '');
  const result = await query<{ id: string; email: string; name: string; role: string; business_id: string | null; store_id: string | null }>(`SELECT u.id, u.email, u.name, u.role, u.business_id, u.store_id FROM refresh_tokens r JOIN users u ON u.id = r.user_id WHERE r.token_hash = $1 AND r.revoked_at IS NULL AND r.expires_at > now() AND u.active=true`, [hashToken(token)]);
  const user = result.rows[0];
  if (!user || user.role==='courier' && !await courierHasAccess(user.id,user.store_id)) return response.status(401).json({ error: 'Refresh token invalido.' });
  response.json({ accessToken: createAccessToken({ id: user.id, email: user.email, name: user.name, role: user.role, businessId: user.business_id, storeId: user.store_id }) });
});

authRouter.get('/me', requireAuth, async (request: AuthRequest, response) => {
  const result = await query('SELECT id, email, name, role, business_id AS "businessId", store_id AS "storeId", preferences FROM users WHERE id = $1', [request.auth!.userId]);
  response.json({ user: { ...result.rows[0], ...(request.auth?.demoMode ? { demoMode: request.auth.demoMode } : {}) } });
});

authRouter.patch('/me/preferences', requireAuth, blockPresentationDemoWrites, async (request: AuthRequest, response) => {
  const managerOnboardingCompleted = request.body?.manager_onboarding_completed;
  const marketingEmailConsent=request.body?.marketing_email_consent;
  if (typeof managerOnboardingCompleted !== 'boolean'&&typeof marketingEmailConsent!=='boolean') {
    return response.status(400).json({ error: 'Preferência de onboarding inválida.' });
  }
  const result = await query(
    `UPDATE users
     SET preferences = preferences || $2::jsonb
     WHERE id = $1
     RETURNING preferences`,
    [request.auth!.userId, JSON.stringify({ ...(typeof managerOnboardingCompleted==='boolean'?{manager_onboarding_completed:managerOnboardingCompleted}:{}),...(typeof marketingEmailConsent==='boolean'?{marketing_email_consent:marketingEmailConsent}:{}) })],
  );
  if(typeof marketingEmailConsent==='boolean')await query('UPDATE users SET marketing_email_consent=$2 WHERE id=$1',[request.auth!.userId,marketingEmailConsent]);
  response.json({ preferences: result.rows[0]?.preferences ?? {} });
});
