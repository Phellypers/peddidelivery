import fs from 'node:fs';
import type pg from 'pg';

export function databaseOptions(settings: {
  databaseUrl: string; databaseSSLMode: string; databaseSSLCAFile: string; databasePoolMax: number;
  databaseSSLCA?: string;
}): pg.PoolConfig {
  let url:URL;
  try { url=new URL(settings.databaseUrl); }
  catch { throw new Error('DATABASE_URL inválida; valor omitido.'); }
  if (!['postgres:', 'postgresql:'].includes(url.protocol)) throw new Error('DATABASE_URL precisa apontar para PostgreSQL.');
  const local = ['localhost', '127.0.0.1', '::1', '[::1]', 'postgres'].includes(url.hostname);
  if (!['auto','disable','verify-full'].includes(settings.databaseSSLMode)) throw new Error('DATABASE_SSL_MODE inválido.');
  if (settings.databaseSSLMode === 'disable' && !local) throw new Error('Banco remoto precisa de TLS; use DATABASE_SSL_MODE=verify-full.');
  if (!Number.isInteger(settings.databasePoolMax) || settings.databasePoolMax < 1 || settings.databasePoolMax > 50) throw new Error('DATABASE_POOL_MAX deve estar entre 1 e 50.');
  const tls = settings.databaseSSLMode === 'verify-full' || !local;
  for (const key of ['sslmode','sslcert','sslkey','sslrootcert']) url.searchParams.delete(key);
  return { connectionString: url.toString(), max: settings.databasePoolMax,
    connectionTimeoutMillis: 10000, idleTimeoutMillis: 30000,
    ssl: tls ? { rejectUnauthorized: true,
      ...(settings.databaseSSLCAFile ? { ca: fs.readFileSync(settings.databaseSSLCAFile,'utf8') }
        : settings.databaseSSLCA ? { ca: settings.databaseSSLCA.replace(/\\n/g,'\n') } : {}) } : false };
}
