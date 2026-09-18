import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { pool, closeDatabase } from '../src/db/client.js';

test('order status notifications are atomic, scoped to the owner and emitted once per transition', async () => {
  assert.ok(pool);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('CREATE TEMP TABLE users(id uuid, store_id uuid, email text, active boolean) ON COMMIT DROP');
    await client.query('CREATE TEMP TABLE customers(id uuid, user_id uuid) ON COMMIT DROP');
    await client.query('CREATE TEMP TABLE orders(id uuid, store_id uuid, customer_id uuid, status text, details jsonb) ON COMMIT DROP');
    await client.query("CREATE TEMP TABLE app_records(id uuid DEFAULT gen_random_uuid(),store_id uuid,entity_name text,owner_id uuid,data jsonb) ON COMMIT DROP");
    await client.query('SET LOCAL search_path TO pg_temp,public');
    const sql=await fs.readFile('server/src/db/migrations/012_order_status_notifications.sql','utf8');
    await client.query(sql.replaceAll('peddi_notify_order_status','pg_temp.peddi_notify_order_status'));
    const ids=(await client.query('SELECT gen_random_uuid() AS store,gen_random_uuid() AS other_store,gen_random_uuid() AS owner,gen_random_uuid() AS other,gen_random_uuid() AS customer,gen_random_uuid() AS order_id')).rows[0];
    await client.query("INSERT INTO users VALUES($1,$2,'owner@peddi.test',true),($3,$4,'other@peddi.test',true)",[ids.owner,ids.store,ids.other,ids.other_store]);
    await client.query('INSERT INTO customers VALUES($1,$2)',[ids.customer,ids.owner]);
    await client.query("INSERT INTO orders VALUES($1,$2,$3,'pending','{\"order_number\":\"TEST-21\",\"customer_email\":\"other@peddi.test\"}')",[ids.order_id,ids.store,ids.customer]);
    const count=async ()=>(await client.query('SELECT count(*)::int AS count FROM app_records')).rows[0].count;
    assert.equal(await count(),0);
    for (const status of ['confirmed','preparing','out_for_delivery','delivered','cancelled']) {
      await client.query('UPDATE orders SET status=$1 WHERE id=$2',[status,ids.order_id]);
      const before=await count();
      await client.query('UPDATE orders SET status=$1 WHERE id=$2',[status,ids.order_id]);
      assert.equal(await count(),before);
    }
    assert.equal(await count(),5);
    const notifications=(await client.query('SELECT * FROM app_records')).rows;
    assert.ok(notifications.every(n=>n.owner_id===ids.owner && n.store_id===ids.store && n.data.user_id===ids.owner && n.data.reference_id===ids.order_id && n.data.is_read===false));
    await client.query('SAVEPOINT rollback_event');
    await client.query("UPDATE orders SET status='confirmed'");
    assert.equal(await count(),6);
    await client.query('ROLLBACK TO SAVEPOINT rollback_event');
    assert.equal(await count(),5);
    await client.query('UPDATE customers SET user_id=NULL');
    await client.query("UPDATE orders SET status='confirmed'");
    assert.equal(await count(),5,'Email in another store must not receive an event');
    await client.query("UPDATE orders SET details=details||'{\"customer_email\":\"OWNER@peddi.test\"}',status='preparing'");
    assert.equal(await count(),6,'An account without CustomerProfile is resolved by its store-scoped email');
  } finally {
    await client.query('ROLLBACK');client.release();await closeDatabase();
  }
});
