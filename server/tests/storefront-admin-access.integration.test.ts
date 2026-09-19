import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { app } from '../src/app.js';
import { query,closeDatabase } from '../src/db/client.js';

test('manager login rejects customer accounts and administrative APIs remain protected',async()=>{
  const business=(await query('INSERT INTO businesses(name,slug) VALUES($1,$2) RETURNING id',['Storefront permissions',`public-access-${crypto.randomUUID()}`])).rows[0].id;
  const server=app.listen(0,'127.0.0.1');await new Promise<void>(resolve=>server.once('listening',resolve));
  const address=server.address();assert.ok(address&&typeof address==='object');
  const base=`http://127.0.0.1:${address.port}/api/v1`;
  try {
    const store=(await query("INSERT INTO stores(business_id,name,slug) VALUES($1,'Storefront permissions','permissions') RETURNING id",[business])).rows[0].id;
    const password='PermissionTest@2026',hash=await bcrypt.hash(password,10);
    const users=[];
    for(const role of ['customer','manager','peddi_admin'])users.push((await query('INSERT INTO users(business_id,store_id,email,password_hash,name,role) VALUES($1,$2,$3,$4,$5,$6) RETURNING id,email,role',[business,store,`${crypto.randomUUID()}@integration.peddi.local`,hash,'Permission Test',role])).rows[0]);
    const login=async(email:string,context?:string)=>{
      const response=await fetch(base+'/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,password,context})});
      return {status:response.status,body:await response.json()};
    };
    const customer=users[0];
    assert.equal((await login(customer.email,'manager')).status,403);
    assert.equal((await query('SELECT count(*) FROM refresh_tokens WHERE user_id=$1',[customer.id])).rows[0].count,'0');
    const customerLogin=await login(customer.email,'customer');assert.equal(customerLogin.status,200);
    assert.equal((await fetch(base+'/admin/couriers',{headers:{Authorization:`Bearer ${customerLogin.body.accessToken}`}})).status,403);
    assert.equal((await fetch(base+'/admin/couriers')).status,401);
    for(const user of users.slice(1)){
      assert.equal((await login(user.email,'customer')).status,403);
      const result=await login(user.email,'manager');assert.equal(result.status,200);
      assert.equal((await fetch(base+'/admin/couriers',{headers:{Authorization:`Bearer ${result.body.accessToken}`}})).status,200);
    }
  }finally{await query('DELETE FROM businesses WHERE id=$1',[business]);await new Promise<void>((resolve,reject)=>server.close(error=>error?reject(error):resolve()));await closeDatabase();}
});
