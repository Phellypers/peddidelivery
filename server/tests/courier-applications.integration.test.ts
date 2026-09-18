import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
process.env.PEDDI_MVP_MODE='true';
process.env.RESEND_API_KEY=''; // Never send external messages from integration fixtures.
const { app }=await import('../src/app.js');
const { query,closeDatabase }=await import('../src/db/client.js');
const { createAccessToken }=await import('../src/auth/tokens.js');

test('courier applications require store approval and revoke pending, rejected and archived access',async()=>{
  const business=(await query('INSERT INTO businesses(name,slug) VALUES($1,$2) RETURNING id',['Test courier applications',`courier-app-${crypto.randomUUID()}`])).rows[0].id;
  const server=app.listen(0,'127.0.0.1');
  await new Promise<void>(resolve=>server.once('listening',resolve));
  const address=server.address();assert.ok(address&&typeof address==='object');
  const base=`http://127.0.0.1:${address.port}/api/v1`;
  const stores=(await query("INSERT INTO stores(business_id,name,slug) VALUES($1,'Application A','application-a'),($1,'Application B','application-b') RETURNING id",[business])).rows;
  const managerToken=(storeId:string)=>createAccessToken({id:crypto.randomUUID(),name:'Manager test',email:'manager@integration.local',role:'manager',businessId:business,storeId});
  const manager=managerToken(stores[0].id),other=managerToken(stores[1].id);
  const call=async(path:string,method='GET',body?:unknown,token?:string)=>{
    const response=await fetch(base+path,{method,headers:{'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{})},...(body?{body:JSON.stringify(body)}:{})});
    return {status:response.status,body:await response.json().catch(()=>({}))};
  };
  try{
    const password='CourierTest@2026';
    const demoToken=createAccessToken({id:crypto.randomUUID(),name:'Demo',email:'designer.demo@peddi.app',role:'manager',businessId:business,storeId:stores[0].id});
    assert.equal((await call('/couriers/applications','POST',{store_id:stores[0].id,name:'Demo',email:'demo-signup@integration.peddi.local',phone:'61999999999',vehicle:'moto',password},demoToken)).status,403);
    const apply=async()=>{
      const email=`courier-${crypto.randomUUID()}@integration.peddi.local`;
      const response=await call('/couriers/applications','POST',{store_id:stores[0].id,name:'Courier Integration',email,phone:'61999999999',vehicle:'moto',password,role:'manager'});
      assert.equal(response.status,201,JSON.stringify(response.body));
      const user=(await query('SELECT * FROM users WHERE email=$1',[email])).rows[0];
      assert.equal(user.active,false);assert.equal(user.role,'courier');assert.notEqual(user.password_hash,password);
      const courier=(await query('SELECT * FROM couriers WHERE user_id=$1',[user.id])).rows[0];
      assert.equal(courier.details.application_status,'pending');assert.equal(courier.details.is_active,false);
      return {email,user,courier};
    };
    const approved=await apply();
    const oldToken=createAccessToken({id:approved.user.id,name:'Courier test',email:approved.email,role:'courier',businessId:business,storeId:stores[0].id});
    assert.equal((await call('/me','GET',undefined,oldToken)).status,403);
    assert.equal((await call('/auth/login','POST',{email:approved.email,password})).status,401);
    assert.equal((await call('/admin/courier-applications','GET',undefined,manager)).body.applications.length,1);
    assert.equal((await call(`/admin/courier-applications/${approved.courier.id}/decision`,'POST',{decision:'approved'},other)).status,404);
    const decision=await call(`/admin/courier-applications/${approved.courier.id}/decision`,'POST',{decision:'approved'},manager);
    assert.equal(decision.status,200);assert.equal(decision.body.notification_status,'pending_configuration');
    assert.equal((await call(`/admin/courier-applications/${approved.courier.id}/decision`,'POST',{decision:'approved'},manager)).status,409);
    const login=await call('/auth/login','POST',{email:approved.email,password});
    assert.equal(login.status,200);assert.equal(login.body.user.role,'courier');
    const token=login.body.accessToken;
    assert.equal((await call('/couriers/me','GET',undefined,token)).body.courier.id,approved.courier.id);
    assert.equal((await call(`/demo/entities/Deliverer/${approved.courier.id}`,'PATCH',{is_active:true,application_status:'approved'},token)).status,403);
    assert.equal((await call(`/demo/entities/Deliverer/${approved.courier.id}`,'PATCH',{lat:-15.8,lng:-48,location_updated_at:new Date().toISOString()},token)).status,200);
    assert.equal((await call('/demo/entities/Order','POST',{items:[]},token)).status,400);
    const outbox=(await query("SELECT * FROM app_records WHERE store_id=$1 AND entity_name='OutboundNotification'",[stores[0].id])).rows;
    assert.equal(outbox.length,1);assert.equal(outbox[0].owner_id,approved.user.id);assert.equal(outbox[0].data.to,approved.email);
    assert.equal((await call(`/admin/couriers/${approved.courier.id}`,'DELETE',undefined,manager)).status,204);
    assert.equal((await call('/me','GET',undefined,token)).status,403);
    assert.equal((await call('/deliveries','GET',undefined,token)).status,403);
    assert.equal((await call('/auth/refresh','POST',{refreshToken:login.body.refreshToken})).status,401);
    assert.equal((await call('/auth/login','POST',{email:approved.email,password})).status,403);
    const rejected=await apply();
    assert.equal((await call(`/admin/courier-applications/${rejected.courier.id}/decision`,'POST',{decision:'rejected'},manager)).status,200);
    assert.equal((await call('/auth/login','POST',{email:rejected.email,password})).status,401);
    assert.equal((await query('SELECT active FROM users WHERE id=$1',[rejected.user.id])).rows[0].active,false);
    assert.equal((await query("SELECT count(*) FROM app_records WHERE store_id=$1 AND entity_name='OutboundNotification'",[stores[0].id])).rows[0].count,'1');
  }finally{
    await query('DELETE FROM businesses WHERE id=$1',[business]);
    await new Promise<void>((resolve,reject)=>server.close(error=>error?reject(error):resolve()));
    await closeDatabase();
  }
});
