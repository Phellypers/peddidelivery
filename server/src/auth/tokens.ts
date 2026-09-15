import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

export type AuthUser = { id: string; email: string; name: string; role: string; businessId: string | null; storeId: string | null; demoMode?: 'presentation' };

export function createAccessToken(user: AuthUser) {
  const demoUser = env.demoMode && user.email === 'gestor.demo@peddi.local' && user.role === 'manager';
  const presentationDemo = user.email === 'designer.demo@peddi.app';
  return jwt.sign({ sub: user.id, email: user.email, role: user.role, businessId: user.businessId, storeId: user.storeId, ...(presentationDemo ? { demoMode: 'presentation' } : {}) }, env.jwtSecret,
    demoUser ? {} : { expiresIn: env.jwtExpiresIn as jwt.SignOptions['expiresIn'] });
}

export function createRefreshToken() {
  return crypto.randomBytes(48).toString('hex');
}

export function hashToken(token: string) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function verifyAccessToken(token: string) {
  const payload=jwt.verify(token, env.jwtSecret);
  if (typeof payload==='string' || payload.purpose || typeof payload.sub!=='string'
    || typeof payload.email!=='string' || typeof payload.role!=='string'
    || (!env.demoMode && typeof payload.exp!=='number')) {
    throw new Error('Token de acesso inválido.');
  }
  return payload as jwt.JwtPayload & AuthUser;
}
