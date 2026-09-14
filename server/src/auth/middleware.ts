import type { NextFunction, Request, Response } from 'express';
import { verifyAccessToken } from './tokens.js';

export type AuthRequest = Request & { localStoreId?: string; auth?: { userId: string; email?: string; role: string; businessId: string | null; storeId: string | null } };

export function requireAuth(request: AuthRequest, response: Response, next: NextFunction) {
  const header = request.headers.authorization;
  if (!header?.startsWith('Bearer ')) return response.status(401).json({ error: 'Autenticacao necessaria.' });
  try {
    const payload = verifyAccessToken(header.slice(7));
    request.auth = { userId: String(payload.sub), email: String(payload.email), role: String(payload.role), businessId: payload.businessId ? String(payload.businessId) : null, storeId: payload.storeId ? String(payload.storeId) : null };
    next();
  } catch {
    return response.status(401).json({ error: 'Token invalido ou expirado.' });
  }
}

export function requireRoles(...roles: string[]) {
  return (request: AuthRequest, response: Response, next: NextFunction) => {
    if (!request.auth || !roles.includes(request.auth.role)) return response.status(403).json({ error: 'Perfil sem permissao.' });
    next();
  };
}
