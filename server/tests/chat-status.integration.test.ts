import test from 'node:test';
import assert from 'node:assert/strict';
import { pool, closeDatabase } from '../src/db/client.js';

test('chat status follows real messages and typing is cleared on send',async()=>{
  assert.ok(pool);const client=await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('CREATE TEMP TABLE app_records (LIKE public.app_records INCLUDING DEFAULTS) ON COMMIT DROP');
    await client.query('CREATE TEMP TABLE chat_presence (LIKE public.chat_presence INCLUDING DEFAULTS) ON COMMIT DROP');
    await client.query('SET LOCAL search_path TO pg_temp,public');
    await client.query('CREATE TRIGGER guard_chat BEFORE INSERT OR UPDATE ON app_records FOR EACH ROW EXECUTE FUNCTION public.peddi_guard_support_chat()');
    await client.query("CREATE TRIGGER message_status AFTER INSERT ON app_records FOR EACH ROW WHEN (NEW.entity_name='ChatMessage') EXECUTE FUNCTION public.peddi_update_chat_status()");
    const ticket=(await client.query("INSERT INTO app_records(store_id,entity_name,data) VALUES(gen_random_uuid(),'SupportTicket','{\"status\":\"open\"}') RETURNING *")).rows[0];
    const status=async()=>(await client.query("SELECT data->>'status' AS status FROM app_records WHERE id=$1",[ticket.id])).rows[0].status;
    const send=(sender:string)=>client.query("INSERT INTO app_records(store_id,entity_name,data) VALUES($1,'ChatMessage',jsonb_build_object('conversation_id',$2::text,'sender_type',$3::text,'message','test'))",[ticket.store_id,ticket.id,sender]);
    await send('customer');assert.equal(await status(),'open');
    await client.query("INSERT INTO chat_presence VALUES($1,'store',now()+interval '5 seconds')",[ticket.id]);
    assert.equal((await client.query('SELECT 1 FROM chat_presence WHERE expires_at>now()')).rowCount,1);
    await send('store');assert.equal(await status(),'waiting_response');
    assert.equal((await client.query('SELECT * FROM chat_presence')).rowCount,0);
    await send('customer');assert.equal(await status(),'in_progress');
    await client.query("INSERT INTO chat_presence VALUES($1,'customer',now()-interval '1 second')",[ticket.id]);
    assert.equal((await client.query('SELECT 1 FROM chat_presence WHERE expires_at>now()')).rowCount,0);
    await client.query("UPDATE app_records SET data=data||'{\"status\":\"closed\"}' WHERE id=$1",[ticket.id]);
    await client.query('SAVEPOINT closed_message');await assert.rejects(send('customer'),/encerrado/);
    await client.query('ROLLBACK TO SAVEPOINT closed_message');assert.equal(await status(),'closed');
  }finally{await client.query('ROLLBACK');client.release();await closeDatabase();}
});
