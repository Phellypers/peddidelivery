import pg from 'pg';
import { env } from '../config/env.js';
import { databaseOptions } from './options.js';

const { Pool } = pg;

export const pool = env.databaseUrl
  ? new Pool(databaseOptions(env))
  : null;

pool?.on('error',()=>console.error('Conexão ociosa com PostgreSQL interrompida; novas solicitações tentarão reconectar.'));

export async function query<T extends pg.QueryResultRow = pg.QueryResultRow>(text: string, values: unknown[] = []) {
  if (!pool) throw new Error('DATABASE_URL nao configurada.');
  return pool.query<T>(text, values);
}

export async function closeDatabase() {
  await pool?.end();
}
