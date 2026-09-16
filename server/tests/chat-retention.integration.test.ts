import test from 'node:test';
import assert from 'node:assert/strict';
import { pool, closeDatabase } from '../src/db/client.js';

test('closed protocols reject messages and purge after retention', async () => {
  assert.ok(pool);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('CREATE TEMP TABLE app_records (LIKE public.app_records INCLUDING DEFAULTS) ON COMMIT DROP');
    await client.query('SET LOCAL search_path TO pg_temp, public');
    await client.query('CREATE TRIGGER guard_support_chat BEFORE INSERT OR UPDATE ON app_records FOR EACH ROW EXECUTE FUNCTION public.peddi_guard_support_chat()');
    const ticket=(await client.query("INSERT INTO app_records(store_id,entity_name,data) VALUES(gen_random_uuid(),'SupportTicket','{\"status\":\"open\"}') RETURNING *")).rows[0];
    const message=()=>client.query("INSERT INTO app_records(store_id,entity_name,data) VALUES($1,'ChatMessage',jsonb_build_object('conversation_id',$2::text,'message','test'))",[ticket.store_id,ticket.id]);
    await message();
    const closed=(await client.query("UPDATE app_records SET data=data||'{\"status\":\"closed\"}' WHERE id=$1 RETURNING data",[ticket.id])).rows[0].data;
    assert.equal(new Date(closed.delete_after).getTime()-new Date(closed.closed_at).getTime(),30*86400000);
    await client.query('SAVEPOINT rejection');
    await assert.rejects(message(),/encerrado/);
    await client.query('ROLLBACK TO SAVEPOINT rejection');
    await assert.rejects(client.query("UPDATE app_records SET data=data||'{\"status\":\"open\"}' WHERE id=$1",[ticket.id]),/reaberto/);
    await client.query('ROLLBACK TO SAVEPOINT rejection');
    assert.equal(Number((await client.query('SELECT public.peddi_purge_expired_chats() AS count')).rows[0].count),0);
    await client.query('DROP TRIGGER guard_support_chat ON pg_temp.app_records');
    await client.query("UPDATE app_records SET data=data||jsonb_build_object('delete_after',now()-interval '1 second') WHERE id=$1",[ticket.id]);
    assert.equal(Number((await client.query('SELECT public.peddi_purge_expired_chats() AS count')).rows[0].count),2);
    assert.equal((await client.query('SELECT * FROM app_records')).rowCount,0);
    assert.equal((await client.query("SELECT active FROM cron.job WHERE jobname='peddi-chat-retention'")).rows[0].active,true);
  } finally {await client.query('ROLLBACK');client.release();await closeDatabase();}
});
