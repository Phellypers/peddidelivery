import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { app } from '../src/app.js';
import { createAccessToken } from '../src/auth/tokens.js';
import { query, closeDatabase } from '../src/db/client.js';

test('account API preserves tenant isolation, published news, and role/demo guards',async()=>{
  const server=app.listen(0,'127.0.0.1');await new Promise<void>(resolve=>server.once('listening',resolve));
  const address=server.address();assert.ok(address&&typeof address!=='string');
  const base=`http://127.0.0.1:${address.port}/api/v1/my-peddi`;
  const store=(await query('SELECT id FROM stores LIMIT 1')).rows[0].id;
  const token=(role:string,email='fixture@peddi.local',storeId=store)=>createAccessToken({id:randomUUID(),email,name:'Fixture',role,businessId:null,storeId});
  const call=(path:string,bearer:string,method='GET',body?:unknown)=>fetch(base+path,{method,headers:{Authorization:`Bearer ${bearer}`,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined});
  try {
    assert.equal((await fetch(base)).status,401);
    assert.equal((await call('',token('customer'))).status,403);
    assert.equal((await call('/platform/requests',token('manager'))).status,403);
    assert.equal((await call('/platform/news',token('manager'))).status,403);
    assert.equal((await call('/support',token('manager','designer.demo@peddi.app'),'POST',{kind:'bug',subject:'Fixture',description:'Should never persist.'})).status,403);
    const result=await call('',token('manager'));assert.equal(result.status,200);
    const account=await result.json();
    assert.ok(account.purchases.every((p:{store_id:string})=>p.store_id===store));
    assert.ok(account.requests.every((r:{store_id:string})=>r.store_id===store));
    assert.ok(account.news.every((n:{published:boolean})=>n.published));
    assert.equal(account.payment.available,false);
    const empty=await (await call('',token('manager','fixture@peddi.local',randomUUID()))).json();
    assert.equal(empty.purchases.length,0);assert.equal(empty.requests.length,0);assert.equal(empty.events.length,0);
  }finally{await new Promise<void>((resolve,reject)=>server.close(error=>error?reject(error):resolve()));await closeDatabase();}
});
