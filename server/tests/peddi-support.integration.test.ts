import test from 'node:test';
import assert from 'node:assert/strict';
import type { Pool } from 'pg';
import { pool, closeDatabase } from '../src/db/client.js';
import { classifyAssistance } from '../src/modules/account/assistance.js';
import { applyVerifiedPayment } from '../src/modules/account/data.js';

test('real PostgreSQL: tickets are free, team consumption is capped, bugs exempt, payment idempotent',async()=>{
  assert.ok(pool);const client=await pool.connect();
  try {
    await client.query('BEGIN');
    for(const table of ['stores','users','peddi_accounts','peddi_purchases','peddi_support_periods','peddi_requests','peddi_account_events','peddi_commercial_outbox']) {
      await client.query(`CREATE TEMP TABLE ${table} (LIKE public.${table} INCLUDING ALL) ON COMMIT DROP`);
    }
    await client.query('SET LOCAL search_path TO pg_temp,public');
    // Temporary fixture copies preserve required existing store/user fields without changing real records.
    await client.query('INSERT INTO stores SELECT * FROM public.stores LIMIT 1');
    await client.query('INSERT INTO users SELECT * FROM public.users LIMIT 1');
    const store=(await client.query('SELECT id FROM stores')).rows[0].id;
    const user=(await client.query('SELECT id FROM users')).rows[0].id;
    await client.query("UPDATE users SET email='quota.fixture@peddi.local'");
    const db={connect:async()=>({release:()=>{},query:async(sql:string,values?:unknown[])=>{
      if(sql==='BEGIN')return client.query('SAVEPOINT operation');
      if(sql==='COMMIT')return client.query('RELEASE SAVEPOINT operation');
      if(sql==='ROLLBACK'){await client.query('ROLLBACK TO SAVEPOINT operation');return client.query('RELEASE SAVEPOINT operation');}
      return client.query(sql,values);
    }})} as unknown as Pool;
    const buy=async(service:string,cents:number)=>(await client.query('INSERT INTO peddi_purchases(store_id,user_id,service_id,amount_cents,idempotency_key) VALUES($1,$2,$3,$4,gen_random_uuid()) RETURNING id',[store,user,service,cents])).rows[0].id;
    const support=await buy('EXCLUSIVE_SUPPORT',9890);
    const receipt={provider:'test-only',reference:'isolated-support',amountCents:9890};
    await assert.rejects(applyVerifiedPayment(db,support,{...receipt,amountCents:1}));
    assert.equal((await client.query('SELECT status FROM peddi_purchases WHERE id=$1',[support])).rows[0].status,'pending_payment');
    await applyVerifiedPayment(db,support,receipt);await applyVerifiedPayment(db,support,receipt);
    assert.equal((await client.query('SELECT * FROM peddi_support_periods')).rowCount,1);
    const open=async(kind:string)=>(await client.query('INSERT INTO peddi_requests(store_id,user_id,kind,subject) VALUES($1,$2,$3,\'Fixture\') RETURNING id',[store,user,kind])).rows[0].id;
    const tickets=[];for(let i=0;i<10;i++)tickets.push(await open('support'));
    assert.equal((await client.query('SELECT * FROM peddi_requests WHERE consumes_support')).rowCount,0);
    for(const id of tickets.slice(0,8))await classifyAssistance(db,id,'human_assisted',true);
    await classifyAssistance(db,tickets[0],'human_assisted',true);
    assert.equal((await client.query('SELECT * FROM peddi_requests WHERE consumes_support')).rowCount,8);
    await assert.rejects(classifyAssistance(db,tickets[8],'human_assisted',true),/8 solicitações/);
    assert.equal((await classifyAssistance(db,await open('bug'),'human_assisted',true)).consumes_support,false);
    assert.equal((await classifyAssistance(db,tickets[9],'extra_quote',true)).consumes_support,false);
    const founder=await buy('FOUNDER',2500);
    await applyVerifiedPayment(db,founder,{provider:'test-only',reference:'isolated-founder',amountCents:2500});
    assert.ok((await client.query('SELECT founder_since FROM peddi_accounts')).rows[0].founder_since);
    assert.equal((await client.query('SELECT * FROM peddi_commercial_outbox')).rowCount,2);
  }finally{await client.query('ROLLBACK');client.release();await closeDatabase();}
});
