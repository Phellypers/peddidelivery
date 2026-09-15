import bcrypt from 'bcryptjs';
import { env } from '../config/env.js';
import { closeDatabase, query } from './client.js';

async function main() {
  if (!env.presentationDemoPassword) throw new Error('PRESENTATION_DEMO_PASSWORD precisa estar configurada no .env.');
  const store = await query<{ id: string; business_id: string }>("SELECT id,business_id FROM stores WHERE slug='loja-demo' AND active=true LIMIT 1");
  if (!store.rowCount) throw new Error('Loja de demonstração não encontrada. Execute o seed MVP primeiro.');
  const passwordHash = await bcrypt.hash(env.presentationDemoPassword, 12);
  await query(`INSERT INTO users(business_id,store_id,email,password_hash,name,role,active)
    VALUES($1,$2,'designer.demo@peddi.app',$3,'Designer Demo','manager',true)
    ON CONFLICT(email) DO UPDATE SET business_id=excluded.business_id,store_id=excluded.store_id,
      password_hash=excluded.password_hash,name=excluded.name,role=excluded.role,active=true`,
    [store.rows[0].business_id, store.rows[0].id, passwordHash]);
  console.log('Conta de apresentação criada ou atualizada; a senha não foi exibida.');
}

main().catch(error => { console.error(error); process.exitCode = 1; }).finally(closeDatabase);
