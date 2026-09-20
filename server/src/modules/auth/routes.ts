import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { env } from '../../config/env.js';
import { query } from '../../db/client.js';
import { createAccessToken, createRefreshToken, hashToken } from '../../auth/tokens.js';
import { blockPresentationDemoWrites, requireAuth, type AuthRequest } from '../../auth/middleware.js';
import { courierHasAccess } from '../couriers/access.js';

export const authRouter = Router();

authRouter.post('/auth/login', async (request, response) => {
  const { email, password, context } = request.body ?? {};
  if (!email || !password) return response.status(400).json({ error: 'Email e senha sao obrigatorios.' });
  const result = await query<{ id: string; email: string; name: string; role: string; business_id: string | null; store_id: string | null; password_hash: string }>('SELECT id, email, name, role, business_id, store_id, password_hash FROM users WHERE email = $1 AND active = true', [String(email).trim().toLowerCase()]);
  const user = result.rows[0];
  if (!user || !(await bcrypt.compare(String(password), user.password_hash))) return response.status(401).json({ error: 'Credenciais invalidas.' });
  if (context==='manager' && user.email==='designer.demo@peddi.app') return response.status(403).json({error:'A demonstração pública permite testar somente o cardápio digital.'});
  if (context==='manager' && !['manager','peddi_admin'].includes(user.role)) return response.status(403).json({error:'Este acesso é exclusivo para gestores. Use o login do cliente ou do entregador.'});
  if (user.role==='courier' && !await courierHasAccess(user.id,user.store_id)) return response.status(403).json({error:'Cadastro de entregador não aprovado ou acesso desativado.'});
  if (context==='customer' && ['manager','peddi_admin'].includes(user.role)) return response.status(403).json({error:'Contas de gestor devem entrar pelo acesso exclusivo do painel.'});
  const authUser = { id: user.id, email: user.email, name: user.name, role: user.role, businessId: user.business_id, storeId: user.store_id };
  const refreshToken = createRefreshToken();
  await query(`INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, CASE WHEN $3 THEN 'infinity'::timestamptz ELSE now() + interval '30 days' END)`, [user.id, hashToken(refreshToken), env.demoMode && user.email === 'gestor.demo@peddi.local' && user.role === 'manager']);
  response.json({ accessToken: createAccessToken(authUser), refreshToken, user: authUser });
});

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
  if (typeof managerOnboardingCompleted !== 'boolean') {
    return response.status(400).json({ error: 'Preferência de onboarding inválida.' });
  }
  const result = await query(
    `UPDATE users
     SET preferences = preferences || $2::jsonb
     WHERE id = $1
     RETURNING preferences`,
    [request.auth!.userId, JSON.stringify({ manager_onboarding_completed: managerOnboardingCompleted })],
  );
  response.json({ preferences: result.rows[0]?.preferences ?? {} });
});
