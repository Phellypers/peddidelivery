import pg from 'pg';
import { env } from '../config/env.js';
import { databaseOptions } from './options.js';

async function main() {
  const connection=process.env.SUPABASE_DATABASE_URL;
  if (!connection || /YOUR-PASSWORD|\[.*PASSWORD.*\]|%5B.*PASSWORD.*%5D/i.test(connection)) {
    throw new Error('Preencha SUPABASE_DATABASE_URL no .env com a senha PostgreSQL do projeto; valor não será exibido.');
  }
  let url:URL;
  try {url=new URL(connection);}catch{throw new Error('SUPABASE_DATABASE_URL inválida; valor omitido.');}
  const ref=process.env.SUPABASE_PROJECT_REF;
  const direct=ref && url.hostname===`db.${ref}.supabase.co`;
  const pooled=ref && url.hostname.endsWith('.pooler.supabase.com') && decodeURIComponent(url.username).endsWith(`.${ref}`);
  if ((!direct&&!pooled)||url.port!=='5432') throw new Error('Use a conexão direta ou Session pooler, porta 5432, do projeto configurado.');
  const pool=new pg.Pool(databaseOptions({...env,databaseUrl:connection,databaseSSLMode:'verify-full'}));
  try {
    await pool.query('SELECT 1');
    const tables=(await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE' ORDER BY table_name")).rows.map(row=>row.table_name);
    const hasMigrations=tables.includes('schema_migrations');
    const versions=hasMigrations?(await pool.query('SELECT version FROM public.schema_migrations ORDER BY version')).rows.map(row=>row.version):[];
    console.log(JSON.stringify({status:'ok',sqlAuthenticated:true,tlsCertificateVerified:true,publicTables:tables,appliedMigrations:versions,
      activeBackendChanged:false,migrationsExecuted:false,seedExecuted:false},null,2));
  } finally {await pool.end();}
}
main().catch(error=>{
  const code=error?.code;
  const message=code==='28P01'?'Senha PostgreSQL não aceita.'
    :code==='SELF_SIGNED_CERT_IN_CHAIN'||code==='UNABLE_TO_VERIFY_LEAF_SIGNATURE'?'Configure DATABASE_SSL_CA_FILE com o certificado CA obtido no painel Supabase.'
    :code?`Falha na verificação SQL (${code}); detalhes privados omitidos.`
    :error instanceof Error&&!error.message.includes('postgresql://')&&!error.message.includes('postgres://')?error.message:'Verificação SQL não concluída; detalhes privados omitidos.';
  console.error(message);process.exitCode=1;
});
