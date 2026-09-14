import { execFileSync } from 'node:child_process';
import { env } from '../config/env.js';
import { pool,closeDatabase } from './client.js';
import { writeOrder } from '../modules/demo/data.js';
import { syncDelivery } from '../modules/deliveries/data.js';

async function main(){
  if (!env.demoMode) throw new Error('O seed demo requer PEDDI_DEMO_MODE=true no ambiente de desenvolvimento.');
  for (const file of ['seed.ts','seed-environments.ts']) execFileSync(process.execPath,['--import','tsx',`server/src/db/${file}`],{stdio:'inherit'});
  const client=await pool!.connect();
  try{
    await client.query('BEGIN');
    const store=(await client.query("SELECT s.id,s.business_id FROM stores s JOIN businesses b ON b.id=s.business_id WHERE s.slug='loja-demo' AND b.slug='peddi-demo' FOR UPDATE OF s")).rows[0];
    const existing=await client.query("SELECT id FROM orders WHERE store_id=$1 AND details->>'seed_key'='peddi-demo-order'",[store.id]);
    if(!existing.rowCount){
      const product=(await client.query("SELECT * FROM products WHERE store_id=$1 AND name='Combo PEDDI' AND deleted_at IS NULL LIMIT 1",[store.id])).rows[0];
      const courier=(await client.query("SELECT u.id FROM users u JOIN couriers c ON c.user_id=u.id WHERE u.store_id=$1 AND u.email='entregador.demo@peddi.local'",[store.id])).rows[0];
      const manager=(await client.query("SELECT id FROM users WHERE email='gestor.demo@peddi.local' AND store_id=$1",[store.id])).rows[0];
      const customer=(await client.query("SELECT id,name,email FROM users WHERE email='cliente.demo@peddi.local' AND store_id=$1",[store.id])).rows[0];
      if(!product||!courier||!customer) throw new Error('Cadastros demo necessários não estão disponíveis.');
      const id=await writeOrder(client,store.id,{seed_key:'peddi-demo-order',order_number:'DEMO-001',customer_name:customer.name,customer_email:customer.email,
        customer_phone:'',status:'confirmed',items:[{product_id:product.id,quantity:1,unit_price:Number(product.price)}],delivery_fee:5,discount:0,
        delivery_method:'delivery',delivery_address:'Endereço de demonstração',delivery_city:'São Paulo Demo',deliverer_user_id:courier.id,
        deliverer_accepted:false,payment_method:'cash',payment_status:'pending',sale_origin:'catalog'},
        {auth:{userId:manager.id,email:'gestor.demo@peddi.local',role:'manager',businessId:store.business_id,storeId:store.id},headers:{}} as any);
      await syncDelivery(client,store.id,id);
    }
    await client.query('COMMIT');
    console.log('Seed MVP concluído: usuários, loja, produto, pedido e entrega persistidos sem duplicação.');
  }catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}
}
main().catch(error=>{console.error(error);process.exitCode=1}).finally(closeDatabase);
