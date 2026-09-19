import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { app } from '../src/app.js';
import { query,closeDatabase } from '../src/db/client.js';
import { createAccessToken } from '../src/auth/tokens.js';

test('retention, idempotency, rate limits and private delivery tracking work together',async()=>{
  const business=(await query('INSERT INTO businesses(name,slug) VALUES($1,$2) RETURNING id',['Operational safeguards',`operations-${crypto.randomUUID()}`])).rows[0].id;
  const server=app.listen(0,'127.0.0.1');await new Promise<void>(resolve=>server.once('listening',resolve));
  const address=server.address();assert.ok(address&&typeof address==='object');const base=`http://127.0.0.1:${address.port}/api/v1`;
  try {
    const store=(await query("INSERT INTO stores(business_id,name,slug,details) VALUES($1,'Operations','operations','{\"pickup_enabled\":true}') RETURNING id",[business])).rows[0].id;
    const email=`${crypto.randomUUID()}@integration.peddi.local`;
    const user=(await query("INSERT INTO users(business_id,store_id,email,password_hash,name,role) VALUES($1,$2,$3,'unused','Customer','customer') RETURNING id",[business,store,email])).rows[0];
    const customer=(await query('INSERT INTO customers(user_id) VALUES($1) RETURNING id',[user.id])).rows[0];
    const courierUser=(await query("INSERT INTO users(business_id,store_id,email,password_hash,name,role) VALUES($1,$2,$3,'unused','Courier','courier') RETURNING id",[business,store,`${crypto.randomUUID()}@integration.peddi.local`])).rows[0];
    const courier=(await query("INSERT INTO couriers(store_id,user_id,details) VALUES($1,$2,'{\"name\":\"Rider Test\",\"lat\":-15.81,\"lng\":-48.03,\"application_status\":\"approved\"}') RETURNING id",[store,courierUser.id])).rows[0];
    const product=(await query("INSERT INTO products(store_id,name,price,stock_quantity) VALUES($1,'Idempotent item',12,5) RETURNING id",[store])).rows[0];
    const token=createAccessToken({id:user.id,email,name:'Customer',role:'customer',businessId:business,storeId:store});
    const key=crypto.randomUUID(),body={items:[{product_id:product.id,quantity:1}],customer_name:'Customer',customer_email:email,delivery_method:'pickup',payment_method:'cash'};
    const create=()=>fetch(`${base}/demo/entities/Order`,{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json','Idempotency-Key':key},body:JSON.stringify(body)});
    const first=await create(),second=await create();assert.equal(first.status,201);assert.equal(second.status,201);
    const firstOrder=await first.json(),secondOrder=await second.json();assert.equal(firstOrder.id,secondOrder.id);
    assert.equal(Number((await query('SELECT stock_quantity FROM products WHERE id=$1',[product.id])).rows[0].stock_quantity),4);

    await query("UPDATE orders SET status='out_for_delivery',courier_id=$2,details=details||'{\"delivery_address\":\"Test address\"}' WHERE id=$1",[firstOrder.id,courier.id]);
    const streamController=new AbortController();
    const stream=await fetch(`${base}/deliveries/${firstOrder.id}/tracking/stream`,{signal:streamController.signal,headers:{Authorization:`Bearer ${token}`}});assert.equal(stream.status,200);
    const reader=stream.body!.getReader(),chunk=await reader.read();streamController.abort();
    const event=new TextDecoder().decode(chunk.value);assert.match(event,/Rider Test/);assert.match(event,/-15.81/);

    const records=await query(`INSERT INTO app_records(store_id,entity_name,owner_id,data,created_at) VALUES
      ($1,'Notification',$2,'{}',now()-interval '31 days'),($1,'Notification',$2,'{"permanent":true}',now()-interval '31 days'),
      ($1,'Notification',$2,'{}',now()) RETURNING id`,[store,user.id]);
    await query('SELECT peddi_purge_operational_history()');
    const remaining=await query('SELECT id FROM app_records WHERE id=ANY($1::uuid[])',[records.rows.map(row=>row.id)]);assert.equal(remaining.rowCount,2);

    let status=0;for(let count=0;count<61;count++)status=(await fetch(`${base}/rate-limit-contract`)).status;
    assert.equal(status,429);
  } finally {server.closeAllConnections();server.close();await query('DELETE FROM orders WHERE store_id IN (SELECT id FROM stores WHERE business_id=$1)',[business]);await query('DELETE FROM businesses WHERE id=$1',[business]);await closeDatabase();}
});
