import bcrypt from 'bcryptjs';
import { env } from '../config/env.js';
import { closeDatabase, query } from './client.js';
import { defaults } from '../modules/demo/data.js';

async function main(){
  if (!env.demoMode || !env.seedTestPassword) throw new Error('Configure PEDDI_DEMO_MODE e SEED_TEST_PASSWORD no ambiente local.');
  const stores=await query("SELECT id,business_id FROM stores WHERE slug='loja-demo' LIMIT 1");
  if (!stores.rowCount) throw new Error('Execute o seed inicial antes de criar os ambientes demo.');
  const store=stores.rows[0],hash=await bcrypt.hash(env.seedTestPassword,12);
  for (const [email,name,role] of [['cliente.demo@peddi.local','Cliente Demo','customer'],['entregador.demo@peddi.local','Entregador Demo','courier']]){
    await query('INSERT INTO users(business_id,store_id,email,password_hash,name,role) VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(email) DO NOTHING',[store.business_id,store.id,email,hash,name,role]);
    const user=(await query('SELECT id FROM users WHERE email=$1 AND store_id=$2 AND role=$3',[email,store.id,role])).rows[0];
    if(!user) throw new Error('Conta demo existente fora da loja ou perfil esperado; dados preservados.');
    await query('INSERT INTO customers(user_id) VALUES($1) ON CONFLICT(user_id) DO NOTHING',[user.id]);
    const profile={...defaults('CustomerProfile'),user_id:user.id,name,email};
    await query("INSERT INTO app_records(store_id,entity_name,owner_id,data) SELECT $1,'CustomerProfile',$2,$3 WHERE NOT EXISTS(SELECT id FROM app_records WHERE store_id=$1 AND entity_name='CustomerProfile' AND data->>'user_id'=$4)",[store.id,user.id,JSON.stringify(profile),user.id]);
    if(role==='courier'){
      const deliverer={...defaults('Deliverer'),user_id:user.id,email,name,is_active:true,current_status:'available',vehicle_type:'motorcycle'};
      await query("INSERT INTO couriers(store_id,user_id,vehicle,available,details) VALUES($1,$2,'moto',true,$3) ON CONFLICT(user_id) DO NOTHING",[store.id,user.id,JSON.stringify({...deliverer,vehicle:'moto'})]);
    }
  }
  const city={...defaults('City'),name:'São Paulo Demo',state:'SP',is_active:true,delivery_fee:5,lat:-23.5505,lng:-46.6333};
  await query("INSERT INTO app_records(store_id,entity_name,data) SELECT $1,'City',$2 WHERE NOT EXISTS(SELECT id FROM app_records WHERE store_id=$1 AND entity_name='City')",[store.id,JSON.stringify(city)]);
  console.log('Ambientes demo de cliente e entregador preparados. Credenciais permanecem no .env.');
}
main().catch(error=>{console.error(error);process.exitCode=1}).finally(closeDatabase);
