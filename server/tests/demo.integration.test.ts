import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { app } from '../src/app.js';
import { env } from '../src/config/env.js';
import { query,closeDatabase } from '../src/db/client.js';
import { createAccessToken, verifyAccessToken } from '../src/auth/tokens.js';
import { isProductAvailable } from '../../src/lib/productAvailability.js';
import jwt from 'jsonwebtoken';

test('somente o gestor demo local recebe token sem expiração',()=>{
  const original=env.demoMode;
  const user={id:crypto.randomUUID(),email:'gestor.demo@peddi.local',name:'Demo',role:'manager',businessId:null,storeId:null};
  const claims=(email=user.email)=>jwt.decode(createAccessToken({...user,email})) as jwt.JwtPayload;
  try {
    env.demoMode=true;
    assert.equal(claims().exp,undefined);
    const localDemoToken=createAccessToken(user);
    assert.ok(claims('cliente.demo@peddi.local').exp);
    env.demoMode=false;
    assert.throws(()=>verifyAccessToken(localDemoToken));
    assert.ok(claims().exp);
    assert.throws(()=>verifyAccessToken(jwt.sign({sub:user.id,purpose:'password-reset'},env.jwtSecret,{expiresIn:'15m'})));
  } finally { env.demoMode=original; }
});

test('horários por dia usam São Paulo e respeitam virada da madrugada',()=>{
  const weekly=Object.fromEntries(['seg','ter','qua','qui','sex','sab','dom'].map(day=>[day,{enabled:false,start:'',end:''}]));
  weekly.seg={enabled:true,start:'22:00',end:'02:00'};
  assert.equal(isProductAvailable({availability_by_day:weekly},new Date('2026-09-15T04:00:00Z')),true);
  assert.equal(isProductAvailable({availability_by_day:weekly},new Date('2026-09-15T06:00:00Z')),false);
  assert.equal(isProductAvailable({},new Date('2026-09-15T06:00:00Z')),true);
});

test('demo CRUD persiste cadastros, pedidos e isolamento entre lojas', {skip:process.env.RUN_DATABASE_TESTS!=='true'||!env.demoMode},async()=>{
  const business=(await query('INSERT INTO businesses(name,slug) VALUES($1,$2) RETURNING id',['Teste app',`app-${crypto.randomUUID()}`])).rows[0].id;
  const server=app.listen(0,'127.0.0.1');
  await new Promise<void>(resolve=>server.once('listening',resolve));
  const address=server.address();assert.ok(address&&typeof address==='object');
  const base=`http://127.0.0.1:${address.port}/api/v1`;
  let tenants:string[]=[];
  try{
    tenants=(await query("INSERT INTO stores(business_id,name,slug) VALUES($1,'App A','a'),($1,'App B','b') RETURNING id",[business])).rows.map(row=>row.id);
    const manager=(await query("INSERT INTO users(business_id,store_id,email,password_hash,name,role) VALUES($1,$2,$3,'test','Teste','manager') RETURNING id",[business,tenants[0],`test-${crypto.randomUUID()}@peddi.local`])).rows[0].id;
    const access=(tenant:string)=>createAccessToken({id:manager,email:'test@peddi.local',name:'Teste',role:'manager',businessId:business,storeId:tenant});
    const call=async(path:string,method='GET',data?:unknown,token=access(tenants[0]))=>{
      const response=await fetch(base+path,{method,headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json','X-Peddi-Visitor':crypto.randomUUID()},body:data===undefined?undefined:JSON.stringify(data)});
      return {status:response.status,body:response.status===204?{}:await response.json()};
    };
    const originalMode=env.demoMode;
    env.demoMode=false;
    assert.equal((await call('/demo/entities/Account')).status,404);
    env.demoMode=originalMode;
    for(const entity of ['Account','Campaign','CashbackRule','ChatMessage','City','Coupon','CustomerProfile','Deliverer','DelivererRating','LiveSession','Notification','PromoMessage','ReactivationCampaign','ReviewComment','SupportTicket','Table','UpsellGroup']){
      const created=await call(`/demo/entities/${entity}`,'POST',{name:`Teste ${entity}`,amount:12,code:'APPTEST',message:'Teste local'});
      assert.equal(created.status,201,`${entity}: ${JSON.stringify(created.body)}`);
      const id=created.body.id;
      assert.ok(id);
      const sql=await query(entity==='Deliverer'?'SELECT details AS data FROM couriers WHERE id=$1':'SELECT data FROM app_records WHERE id=$1',[id]);
      assert.equal(sql.rows[0].data.name,`Teste ${entity}`);
      const updated=await call(`/demo/entities/${entity}/${id}`,'PATCH',{name:`Editado ${entity}`,amount:15});
      assert.equal(updated.status,200);
      assert.equal(updated.body.name,`Editado ${entity}`);
      assert.equal((await call(`/demo/entities/${entity}`, 'GET',undefined,access(tenants[1]))).body.length,0);
      assert.equal((await call(`/demo/entities/${entity}/${id}`,'PATCH',{name:'Outra loja'},access(tenants[1]))).status,404);
      assert.equal((await call(`/demo/entities/${entity}/${id}`,'DELETE')).status,204);
      if(entity==='Deliverer') assert.equal((await query('SELECT details FROM couriers WHERE id=$1',[id])).rows[0].details.deleted,true);
      else assert.equal((await query('SELECT id FROM app_records WHERE id=$1',[id])).rowCount,0);
    }
    const category=await call('/demo/entities/Category','POST',{name:'Categoria app',sort_order:2,is_active:true});
    assert.equal(category.status,201);
    const product=await call('/admin/products','POST',{name:'Produto app',price:20,cost:4,stock:10,category_ids:[category.body.id],images:[],variations:[],recipe:[],custom_fields:[{label:'Mensagem',type:'text',required:true,options:[]}]});
    assert.equal(product.status,201);
    const order=await call('/demo/entities/Order','POST',{customer_name:'Cliente',customer_email:'test@peddi.local',items:[{product_id:product.body.product.id,quantity:2,unit_price:20,custom_fields:{Mensagem:'Parabéns'},notes:'Mensagem: Parabéns'}],delivery_fee:5,discount:2,total:1,status:'pending',sale_origin:'pdv_balcao'});
    assert.equal(order.status,201,JSON.stringify(order.body));
    assert.equal(order.body.total,43);
    const orderSql=(await query('SELECT total,details FROM orders WHERE id=$1',[order.body.id])).rows[0];
    assert.equal(Number(orderSql.total),43);
    assert.equal(orderSql.details.sale_origin,'pdv_balcao');
    assert.equal((await query('SELECT details FROM order_items WHERE order_id=$1',[order.body.id])).rows[0].details.custom_fields.Mensagem,'Parabéns');
    assert.equal(Number((await query('SELECT stock_quantity FROM products WHERE id=$1',[product.body.product.id])).rows[0].stock_quantity),8);
    assert.equal((await call(`/demo/entities/Order/${order.body.id}`,'PATCH',{status:'shipped'})).body.status,'shipped');
    assert.equal((await call(`/demo/entities/Order/${order.body.id}`,'PATCH',{items:[{product_id:product.body.product.id,quantity:1,unit_price:20,custom_fields:{Mensagem:'Parabéns'}}],delivery_fee:0,discount:0})).body.total,20);
    assert.equal(Number((await query('SELECT stock_quantity FROM products WHERE id=$1',[product.body.product.id])).rows[0].stock_quantity),9);
    assert.equal((await call(`/demo/entities/Order/${order.body.id}`,'PATCH',{status:'invalid'})).status,400);
    assert.equal((await call(`/demo/entities/Order/${order.body.id}`,'PATCH',{status:'confirmed'},access(tenants[1]))).status,404);
    const publicOrders=await fetch(base+'/demo/entities/Order');
    assert.equal((await publicOrders.json()).length,0);
    const store=await call(`/demo/entities/Store/${tenants[0]}`,'PATCH',{name:'Loja editada',description:'Persistido',flat_delivery_fee:7});
    assert.equal(store.body.name,'Loja editada');
    assert.equal((await query('SELECT details FROM stores WHERE id=$1',[tenants[0]])).rows[0].details.flat_delivery_fee,7);
    assert.equal((await call(`/demo/entities/Category/${category.body.id}`,'DELETE')).status,204);
    assert.equal((await call('/demo/entities/Category')).body.length,0);
    assert.equal((await call('/admin/catalog')).body.categories.length,0);
  }finally{
    await new Promise<void>(resolve=>server.close(()=>resolve()));
    if(tenants.length){
      const guests=(await query('SELECT DISTINCT c.id FROM customers c JOIN orders o ON o.customer_id=c.id WHERE c.user_id IS NULL AND o.store_id=ANY($1::uuid[])',[tenants])).rows.map(row=>row.id);
      await query('DELETE FROM order_items WHERE order_id IN(SELECT id FROM orders WHERE store_id=ANY($1::uuid[]))',[tenants]);
      await query('DELETE FROM orders WHERE store_id=ANY($1::uuid[])',[tenants]);
      await query('DELETE FROM customers WHERE id=ANY($1::uuid[]) AND user_id IS NULL AND NOT EXISTS(SELECT id FROM orders WHERE customer_id=customers.id)',[guests]);
    }
    await query('DELETE FROM businesses WHERE id=$1',[business]);
    await closeDatabase();
  }
});
