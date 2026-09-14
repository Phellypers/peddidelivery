import bcrypt from 'bcryptjs';
import { env } from '../config/env.js';
import { query, closeDatabase } from './client.js';

async function main() {
  if (!env.seedTestPassword) throw new Error('SEED_TEST_PASSWORD precisa ser configurada para criar a conta de testes.');
  const passwordHash = await bcrypt.hash(env.seedTestPassword, 12);
  await query(`INSERT INTO businesses (name, slug) VALUES ('PEDDI Demo', 'peddi-demo') ON CONFLICT (slug) DO NOTHING`);
  const business=await query<{id:string}>("SELECT id FROM businesses WHERE slug='peddi-demo'");
  const businessId = business.rows[0].id;
  await query(`INSERT INTO stores (business_id, name, slug) VALUES ($1, 'Loja PEDDI Demo', 'loja-demo') ON CONFLICT (business_id, slug) DO NOTHING`,[businessId]);
  const store=await query<{id:string}>("SELECT id FROM stores WHERE business_id=$1 AND slug='loja-demo'",[businessId]);
  const storeId = store.rows[0].id;
  await query(`INSERT INTO users (business_id, store_id, email, password_hash, name, role) VALUES ($1, $2, 'gestor.demo@peddi.local', $3, 'Gestor Demo', 'manager') ON CONFLICT (email) DO NOTHING`,[businessId,storeId,passwordHash]);
  const manager=await query<{id:string}>("SELECT id FROM users WHERE email='gestor.demo@peddi.local' AND store_id=$1 AND role='manager'",[storeId]);
  if(!manager.rowCount) throw new Error('A conta demo existente não pertence à loja esperada; cadastro preservado.');
  await query(`INSERT INTO customers (user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING`, [manager.rows[0].id]);
  await query(`INSERT INTO categories (store_id, name) VALUES ($1, 'Destaques') ON CONFLICT (store_id, name) DO NOTHING`,[storeId]);
  const category=await query<{id:string}>("SELECT id FROM categories WHERE store_id=$1 AND name='Destaques'",[storeId]);
  await query(`INSERT INTO products (store_id, category_id, name, description, price, cost, stock_quantity)
    SELECT $1,$2,'Combo PEDDI','Produto de demonstracao',29.90,10,100
    WHERE NOT EXISTS(SELECT id FROM products WHERE store_id=$1 AND name='Combo PEDDI')`,[storeId,category.rows[0].id]);
  console.log('Seed base concluído. Credenciais não são exibidas; cadastros existentes preservados.');
}

main().catch(error => { console.error(error); process.exitCode = 1; }).finally(closeDatabase);
