import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { app } from '../src/app.js';
import { env } from '../src/config/env.js';
import { query,closeDatabase } from '../src/db/client.js';
import { createAccessToken } from '../src/auth/tokens.js';

test('MVP persiste entregador, cliente, itens e ciclo de entrega com isolamento',{
  skip:process.env.RUN_DATABASE_TESTS!=='true'||!env.demoMode,
},async()=>{
  const business=(await query('INSERT INTO businesses(name,slug) VALUES($1,$2) RETURNING id',['Teste entregas',`delivery-${crypto.randomUUID()}`])).rows[0].id;
  const server=app.listen(0,'127.0.0.1');await new Promise<void>(resolve=>server.once('listening',resolve));
  const address=server.address();assert.ok(address&&typeof address==='object');
  const base=`http://127.0.0.1:${address.port}/api/v1`;
  const tenants=(await query("INSERT INTO stores(business_id,name,slug) VALUES($1,'Entrega A','a'),($1,'Entrega B','b') RETURNING id",[business])).rows.map(row=>row.id);
  try{
    const addUser=async(role:string,tenant=tenants[0])=>{
      const email=`${crypto.randomUUID()}@peddi.local`;
      const user=(await query("INSERT INTO users(business_id,store_id,email,password_hash,name,role) VALUES($1,$2,$3,'test','Teste',$4) RETURNING id",[business,tenant,email,role])).rows[0];
      return {id:user.id,email,token:createAccessToken({id:user.id,email,name:'Teste',role,businessId:business,storeId:tenant})};
    };
    const manager=await addUser('manager'),customer=await addUser('customer'),courier=await addUser('courier');
    const other=await addUser('manager',tenants[1]),otherCourier=await addUser('courier',tenants[1]);
    const call=async(path:string,method='GET',body?:unknown,token=manager.token)=>{
      const response=await fetch(base+path,{method,headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});
      return {status:response.status,body:response.status===204?{}:await response.json()};
    };
    const rider=await call('/admin/couriers','POST',{name:'Entregador teste',user_id:courier.id,email:courier.email,vehicle:'moto',current_status:'available'});
    assert.equal(rider.status,201);const riderId=rider.body.courier.id;
    assert.equal((await query('SELECT user_id FROM couriers WHERE id=$1',[riderId])).rows[0].user_id,courier.id);
    assert.equal((await call('/couriers/me','GET',undefined,courier.token)).body.courier.id,riderId);
    assert.equal((await call('/admin/couriers','GET',undefined,customer.token)).status,403);
    assert.equal((await call('/admin/couriers','GET',undefined,other.token)).body.couriers.length,0);
    assert.equal((await call(`/admin/couriers/${riderId}`,'PATCH',{name:'Outra loja'},other.token)).status,404);
    assert.equal((await call('/admin/couriers','POST',{name:'Conta de outra loja',user_id:otherCourier.id})).status,400);
    const product=(await call('/admin/products','POST',{name:'Produto entrega',price:20,cost:4,stock:10})).body.product;
    const created=await call('/demo/entities/Order','POST',{items:[{product_id:product.id,quantity:2}],customer_name:'Cliente teste',status:'delivered',deliverer_user_id:courier.id,delivery_method:'delivery',delivery_address:'Rua Teste, 1',delivery_city:'Cidade Teste',delivery_zip:'01001000',payment_method:'cash',delivery_fee:5,discount:0,total:1},customer.token);
    assert.equal(created.status,201,JSON.stringify(created.body));const orderId=created.body.id;
    assert.equal(created.body.status,'pending');assert.equal(created.body.total,45);
    const customerSql=(await query('SELECT c.user_id FROM orders o JOIN customers c ON c.id=o.customer_id WHERE o.id=$1',[orderId])).rows[0];
    assert.equal(customerSql.user_id,customer.id);
    const delivery=async()=>(await query('SELECT * FROM deliveries WHERE order_id=$1',[orderId])).rows[0];
    assert.equal((await delivery()).status,'pending');assert.equal((await delivery()).courier_id,null);
    assert.equal((await call('/deliveries','GET',undefined,customer.token)).body.deliveries.length,1);
    assert.equal((await call('/orders','GET',undefined,customer.token)).body.orders.length,1);
    assert.equal((await call('/deliveries','GET',undefined,other.token)).body.deliveries.length,0);
    assert.equal((await call(`/demo/entities/Order/${orderId}`,'PATCH',{status:'preparing',deliverer_user_id:courier.id})).status,200);
    assert.equal((await delivery()).status,'assigned');assert.equal((await delivery()).courier_id,riderId);
    assert.equal((await query('SELECT courier_id FROM orders WHERE id=$1',[orderId])).rows[0].courier_id,riderId);
    assert.equal((await call('/deliveries','GET',undefined,courier.token)).body.deliveries.length,1);
    assert.equal((await call('/orders','GET',undefined,courier.token)).body.orders.length,1);
    assert.equal((await call('/orders','GET',undefined,otherCourier.token)).body.orders.length,0);
    assert.equal((await call(`/demo/entities/Order/${orderId}`,'PATCH',{deliverer_user_id:otherCourier.id})).status,400);
    assert.equal((await delivery()).courier_id,riderId);
    assert.equal((await call(`/demo/entities/Order/${orderId}`,'PATCH',{status:'delivered'},customer.token)).status,400);
    assert.equal((await call(`/demo/entities/Order/${orderId}`,'PATCH',{status:'delivered'},courier.token)).status,400);
    assert.equal((await call(`/demo/entities/Order/${orderId}`,'PATCH',{deliverer_accepted:true},courier.token)).status,200);
    assert.equal((await delivery()).status,'accepted');assert.ok((await delivery()).accepted_at);
    assert.equal((await call(`/demo/entities/Order/${orderId}`,'PATCH',{status:'shipped'},courier.token)).status,200);
    assert.equal((await delivery()).status,'out_for_delivery');assert.ok((await delivery()).picked_up_at);
    assert.equal((await call(`/demo/entities/Order/${orderId}`,'PATCH',{status:'delivered'},courier.token)).status,200);
    assert.equal((await delivery()).status,'delivered');assert.ok((await delivery()).delivered_at);
    assert.equal((await call(`/demo/entities/Order/${orderId}`,'PATCH',{deliverer_user_id:''},courier.token)).status,400);
    assert.equal((await query('SELECT status FROM orders WHERE id=$1',[orderId])).rows[0].status,'delivered');
    assert.equal((await call(`/admin/couriers/${riderId}`,'DELETE')).status,204);
    assert.equal((await call('/admin/couriers')).body.couriers.length,0);
    assert.equal((await delivery()).courier_id,riderId);
    assert.equal((await call(`/demo/entities/Order/${orderId}`,'DELETE')).status,204);
    assert.equal((await delivery()).status,'cancelled');
    const rls=(await query("SELECT count(*)::int AS count FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname=ANY($1::text[]) AND c.relrowsecurity",[['users','couriers','orders','deliveries','refresh_tokens']])).rows[0].count;
    assert.equal(rls,5);
    // Checkout uses the same real API and isolated store as the delivery lifecycle.
    const region=await call('/demo/entities/City','POST',{name:'Riacho Fundo II',state:'DF',is_active:true,delivery_fee_type:'fixed',delivery_fee_value:5});
    assert.equal(region.status,201);
    const checkout={items:[{product_id:product.id,quantity:1}],customer_name:'Cliente teste',delivery_method:'delivery',delivery_address:'QN 7, casa 4',delivery_city:'Brasília',delivery_neighborhood:'Riacho Fundo 2',delivery_state:'DF',delivery_zip:'71880000',delivery_fee:0,payment_method:'split',split_payments:{pix:10,cash:15},payment_status:'paid'};
    assert.equal((await call('/demo/entities/Order','POST',{...checkout,delivery_neighborhood:'Outra região'},customer.token)).status,400);
    assert.equal((await call('/demo/entities/Order','POST',{...checkout,split_payments:{pix:24.99}},customer.token)).status,400);
    const simulated=await call('/demo/entities/Order','POST',checkout,customer.token);
    assert.equal(simulated.status,201,JSON.stringify(simulated.body));
    assert.equal(simulated.body.total,25);
    assert.equal(simulated.body.delivery_fee,5);
    assert.equal(simulated.body.delivery_area_id,region.body.id);
    assert.equal(simulated.body.payment_status,'pending');
    assert.equal(simulated.body.status,'pending');
    const history=await call('/demo/entities/Order','GET',undefined,customer.token);
    assert.ok(history.body.some((order:any)=>order.id===simulated.body.id));
    assert.equal((await query('SELECT count(*)::int AS count FROM order_items WHERE order_id=$1',[simulated.body.id])).rows[0].count,1);
    await call(`/demo/entities/City/${region.body.id}`,'PATCH',{is_active:false});
    assert.equal((await call('/demo/entities/Order','POST',checkout,customer.token)).status,400);
    const storeView=await call('/demo/entities/Store','GET',undefined,customer.token);
    assert.equal(storeView.body[0].delivery_areas_configured,true);
  }finally{
    await new Promise<void>(resolve=>server.close(()=>resolve()));
    await query('DELETE FROM orders WHERE store_id=ANY($1::uuid[])',[tenants]);
    await query('DELETE FROM businesses WHERE id=$1',[business]);await closeDatabase();
  }
});
