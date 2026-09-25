import test from 'node:test';
import assert from 'node:assert/strict';
import { pool, closeDatabase } from '../src/db/client.js';
import { processOrderDeliveryLoyalty } from '../src/modules/loyalty/data.js';

test('loyalty grants one stamp per delivered order and creates one private reward per cycle',async()=>{
  assert.ok(pool);
  const client=await pool.connect();
  try{
    await client.query('BEGIN');
    await client.query('CREATE TEMP TABLE loyalty_programs(id uuid DEFAULT gen_random_uuid(),store_id uuid UNIQUE,active boolean,name text,required_steps int,minimum_order_total numeric,reward_type text,reward_value numeric,reward_minimum_order numeric,reward_validity_days int,created_at timestamptz DEFAULT now(),updated_at timestamptz DEFAULT now()) ON COMMIT DROP');
    await client.query('CREATE TEMP TABLE user_loyalty_progress(id uuid DEFAULT gen_random_uuid(),store_id uuid,user_id uuid,current_steps int DEFAULT 0,required_steps int,completed_cycles int DEFAULT 0,updated_at timestamptz DEFAULT now(),UNIQUE(store_id,user_id)) ON COMMIT DROP');
    await client.query('CREATE TEMP TABLE loyalty_order_events(id uuid DEFAULT gen_random_uuid(),store_id uuid,user_id uuid,order_id uuid,cycle_number int,created_at timestamptz DEFAULT now(),UNIQUE(store_id,order_id)) ON COMMIT DROP');
    await client.query('CREATE TEMP TABLE loyalty_rewards(id uuid DEFAULT gen_random_uuid(),store_id uuid,user_id uuid,loyalty_program_id uuid,coupon_record_id uuid,code text UNIQUE,status text DEFAULT \'active\',discount_type text,discount_value numeric,minimum_order_value numeric,issued_at timestamptz DEFAULT now(),expires_at timestamptz,redeemed_at timestamptz,redeemed_order_id uuid) ON COMMIT DROP');
    await client.query('CREATE TEMP TABLE customers(id uuid,user_id uuid) ON COMMIT DROP');
    await client.query('CREATE TEMP TABLE orders(id uuid,store_id uuid,customer_id uuid,status text,total numeric) ON COMMIT DROP');
    await client.query('CREATE TEMP TABLE app_records(id uuid DEFAULT gen_random_uuid(),store_id uuid,entity_name text,owner_id uuid,data jsonb) ON COMMIT DROP');
    await client.query('SET LOCAL search_path TO pg_temp,public');
    const ids=(await client.query('SELECT gen_random_uuid() store,gen_random_uuid() customer,gen_random_uuid() owner,gen_random_uuid() first_order,gen_random_uuid() second_order')).rows[0];
    await client.query('INSERT INTO customers VALUES($1,$2)',[ids.customer,ids.owner]);
    await client.query("INSERT INTO orders VALUES($1,$2,$3,'delivered',30),($4,$2,$3,'delivered',40)",[ids.first_order,ids.store,ids.customer,ids.second_order]);
    await client.query("INSERT INTO loyalty_programs(store_id,active,name,required_steps,minimum_order_total,reward_type,reward_value,reward_minimum_order,reward_validity_days) VALUES($1,true,'Clube',2,20,'percentage_discount',10,0,30)",[ids.store]);
    const first=await processOrderDeliveryLoyalty(client,ids.first_order,ids.store);
    assert.equal(first.applied,true);assert.equal(first.new_steps,1);assert.equal(first.cycle_completed,false);
    const duplicate=await processOrderDeliveryLoyalty(client,ids.first_order,ids.store);
    assert.equal(duplicate.applied,false);
    const second=await processOrderDeliveryLoyalty(client,ids.second_order,ids.store);
    assert.equal(second.applied,true);assert.equal(second.new_steps,0);assert.equal(second.cycle_completed,true);assert.match(second.reward_code||'',/^FID-[A-F0-9]{10}$/);
    const progress=(await client.query('SELECT * FROM user_loyalty_progress')).rows[0];
    assert.equal(progress.current_steps,0);assert.equal(progress.completed_cycles,1);
    assert.equal(Number((await client.query('SELECT count(*) FROM loyalty_order_events')).rows[0].count),2);
    const reward=(await client.query('SELECT * FROM loyalty_rewards')).rows[0];
    const coupon=(await client.query('SELECT * FROM app_records')).rows[0];
    assert.equal(reward.user_id,ids.owner);assert.equal(coupon.owner_id,ids.owner);
    assert.equal(coupon.entity_name,'Coupon');assert.equal(coupon.data.restricted_user_id,ids.owner);
    assert.equal(coupon.data.loyalty_reward_id,reward.id);
  }finally{await client.query('ROLLBACK');client.release();await closeDatabase();}
});
