import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { pool, query } from '../../db/client.js';
import { requireAuth, requireRoles, blockPresentationDemoWrites, type AuthRequest } from '../../auth/middleware.js';
import { courierView } from './data.js';
import { env } from '../../config/env.js';

export const courierApplicationRouter = Router();
const application = z.object({
  store_id: z.string().uuid(), name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(254).transform(value => value.toLowerCase()),
  phone: z.string().trim().max(30).refine(value => /^\d{10,13}$/.test(value.replace(/\D/g, ''))),
  vehicle: z.enum(['moto','bicicleta','carro','a_pe']), password: z.string().min(8).max(128),
});
const requests = new Map<string, { count: number; until: number }>();
courierApplicationRouter.post('/couriers/applications', async (request:AuthRequest,response,next)=>{
  if (request.headers.authorization) return requireAuth(request,response,()=>{blockPresentationDemoWrites(request,response,next);});
  next();
}, async (request, response) => {
  const parsed = application.safeParse(request.body);
  if (!parsed.success) return response.status(400).json({ error: 'Revise nome, e-mail, telefone, veículo e senha (mínimo de 8 caracteres).' });
  const now = Date.now();
  for (const [key,value] of requests) if (value.until < now) requests.delete(key);
  const key = request.ip || 'unknown';
  const rate = requests.get(key) || { count: 0, until: now + 3600000 };
  if (++rate.count > 30) return response.status(429).json({ error: 'Muitas solicitações. Tente novamente mais tarde.' });
  requests.set(key, rate);
  const input = parsed.data;
  const hash = await bcrypt.hash(input.password, 10);
  const client = await pool!.connect();
  try {
    await client.query('BEGIN');
    const store = (await client.query('SELECT id,business_id FROM stores WHERE id=$1 AND active=true', [input.store_id])).rows[0];
    if (!store) { await client.query('ROLLBACK'); return response.status(404).json({ error: 'Loja não encontrada.' }); }
    await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [input.email]);
    if ((await client.query('SELECT id FROM users WHERE lower(email)=$1', [input.email])).rowCount) {
      await client.query('ROLLBACK'); return response.status(409).json({ error: 'Este e-mail já possui cadastro ou solicitação. Aguarde a análise ou entre na sua conta.' });
    }
    const user = (await client.query("INSERT INTO users(business_id,store_id,email,password_hash,name,role,active) VALUES($1,$2,$3,$4,$5,'courier',false) RETURNING id", [store.business_id, store.id, input.email, hash, input.name])).rows[0];
    const details = { name: input.name, email: input.email, phone: input.phone, vehicle: input.vehicle, user_id: user.id, is_active: false, application_status: 'pending', applied_at: new Date().toISOString() };
    const invited = (await client.query("SELECT id FROM couriers WHERE store_id=$1 AND lower(details->>'email')=$2 AND user_id IS NULL AND COALESCE(details->>'deleted','false')<>'true' FOR UPDATE", [store.id, input.email])).rows[0];
    if (invited) await client.query('UPDATE couriers SET user_id=$2,vehicle=$3,available=false,details=details||$4::jsonb,updated_at=now() WHERE id=$1', [invited.id,user.id,input.vehicle,JSON.stringify(details)]);
    else await client.query('INSERT INTO couriers(store_id,user_id,vehicle,available,details) VALUES($1,$2,$3,false,$4)', [store.id,user.id,input.vehicle,JSON.stringify(details)]);
    await client.query('COMMIT');
    response.status(201).json({ status: 'pending', message: 'Solicitação enviada. Seu acesso será liberado após a aprovação da loja.' });
  } catch (error) {
    await client.query('ROLLBACK');
    if ((error as { code?: string }).code === '23505') return response.status(409).json({ error: 'Este e-mail já possui cadastro.' });
    throw error;
  } finally { client.release(); }
});

const managers = [requireAuth, requireRoles('manager','peddi_admin'), blockPresentationDemoWrites];
courierApplicationRouter.get('/admin/courier-applications', ...managers, async (request: AuthRequest,response) => {
  const result = await query("SELECT * FROM couriers WHERE store_id=$1 AND details->>'application_status' IN ('pending','rejected') AND COALESCE(details->>'deleted','false')<>'true' ORDER BY created_at DESC", [request.auth!.storeId]);
  response.json({ applications: result.rows.map(courierView) });
});
courierApplicationRouter.post('/admin/courier-applications/:id/decision', ...managers, async (request: AuthRequest,response) => {
  if (!z.string().uuid().safeParse(request.params.id).success || !['approved','rejected'].includes(request.body?.decision)) return response.status(400).json({ error: 'Decisão inválida.' });
  const client = await pool!.connect();
  try {
    await client.query('BEGIN');
    const row = (await client.query('SELECT * FROM couriers WHERE id=$1 AND store_id=$2 FOR UPDATE', [request.params.id,request.auth!.storeId])).rows[0];
    if (!row || row.details.deleted) { await client.query('ROLLBACK'); return response.sendStatus(404); }
    if (row.details.application_status !== 'pending') { await client.query('ROLLBACK'); return response.status(409).json({ error: 'Esta solicitação já foi analisada.' }); }
    const approved = request.body.decision === 'approved';
    const decision = { application_status: request.body.decision, is_active: approved, reviewed_at: new Date().toISOString(), reviewed_by: request.auth!.userId };
    await client.query('UPDATE couriers SET details=details||$2::jsonb,available=false,updated_at=now() WHERE id=$1', [row.id,JSON.stringify(decision)]);
    await client.query("UPDATE users SET active=$2 WHERE id=$1 AND store_id=$3 AND role='courier'", [row.user_id,approved,request.auth!.storeId]);
    await client.query('UPDATE refresh_tokens SET revoked_at=now() WHERE user_id=$1 AND revoked_at IS NULL', [row.user_id]);
    if (approved) {
      await client.query("INSERT INTO app_records(store_id,entity_name,owner_id,data) VALUES($1,'OutboundNotification',$2,$3)", [request.auth!.storeId,row.user_id,JSON.stringify({
        type:'courier_approved',channel:'email',status:env.resendApiKey && env.notificationEmailFrom ? 'queued' : 'pending_configuration',courier_id:row.id,
        to:row.details.email,subject:'Seu cadastro de entregador foi aprovado — PEDDI',
        text:`Olá, ${row.details.name}! Seu cadastro foi aprovado. Você já pode entrar com seu e-mail e senha para receber e acompanhar entregas: ${env.clientOrigin}/login?returnTo=/entregador`,
      })]);
    }
    await client.query('COMMIT');
    response.json({ status:request.body.decision,notification_status:approved ? (env.resendApiKey && env.notificationEmailFrom ? 'queued' : 'pending_configuration') : null });
  } catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }
});
