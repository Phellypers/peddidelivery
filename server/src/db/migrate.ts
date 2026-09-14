import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pool, closeDatabase } from './client.js';

const currentFile = fileURLToPath(import.meta.url);
const migrationsPath = path.join(path.dirname(currentFile), 'migrations');

async function main() {
  if (!pool) throw new Error('DATABASE_URL não configurada.');
  const client=await pool.connect();
  const query=(sql:string,values:unknown[]=[])=>client.query(sql,values);
  try {
  await query("SELECT pg_advisory_lock(hashtext('peddi_migrations'))");
  await query(`CREATE TABLE IF NOT EXISTS schema_migrations (version TEXT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT now())`);
  const files = (await fs.readdir(migrationsPath)).filter(file => file.endsWith('.sql')).sort();
  for (const file of files) {
    const applied = await query('SELECT version FROM schema_migrations WHERE version = $1', [file]);
    if (applied.rowCount) continue;
    const sql = await fs.readFile(path.join(migrationsPath, file), 'utf8');
    await query('BEGIN');
    try {
      await query(sql);
      await query('INSERT INTO schema_migrations (version) VALUES ($1)', [file]);
      await query('COMMIT');
      console.log(`Migration aplicada: ${file}`);
    } catch (error) {
      await query('ROLLBACK');
      throw error;
    }
  }
  } finally {
    try { await query("SELECT pg_advisory_unlock(hashtext('peddi_migrations'))"); }
    finally { client.release(); }
  }
}

main().catch(error => { console.error(error); process.exitCode = 1; }).finally(closeDatabase);
