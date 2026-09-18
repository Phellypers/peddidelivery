import { pool } from '../../db/client.js';
import { env } from '../../config/env.js';

// Persistent outbox: an approval succeeds even when the mail provider is unavailable.
export async function processApprovalEmails() {
  if (!pool || !env.resendApiKey || !env.notificationEmailFrom) return;
  const client=await pool.connect();
  try {
    await client.query('BEGIN');
    const rows=(await client.query(`SELECT a.* FROM app_records a
      WHERE entity_name='OutboundNotification' AND data->>'type'='courier_approved'
        AND data->>'status' IN ('queued','pending_configuration','retry')
        AND COALESCE((data->>'next_attempt_at')::timestamptz,created_at)<=now()
      ORDER BY created_at LIMIT 5 FOR UPDATE SKIP LOCKED`)).rows;
    for (const row of rows) {
      const active=(await client.query(`SELECT c.id FROM couriers c JOIN users u ON u.id=c.user_id
        WHERE c.id=$1 AND c.store_id=$2 AND u.id=$3 AND u.active=true
          AND c.details->>'application_status'='approved' AND c.details->>'is_active'='true'
          AND COALESCE(c.details->>'deleted','false')<>'true'`,[row.data.courier_id,row.store_id,row.owner_id])).rowCount;
      let status='cancelled';
      const attempts=Number(row.data.attempts||0)+1;
      if (active) {
        try {
          const result=await fetch('https://api.resend.com/emails',{
            method:'POST',signal:AbortSignal.timeout(10000),
            headers:{Authorization:`Bearer ${env.resendApiKey}`,'Content-Type':'application/json','Idempotency-Key':`courier-approved-${row.id}`},
            body:JSON.stringify({from:env.notificationEmailFrom,to:[row.data.to],subject:row.data.subject,text:row.data.text}),
          });
          status=result.ok?'sent':attempts>=5?'failed':'retry';
        } catch { status=attempts>=5?'failed':'retry'; }
      }
      await client.query('UPDATE app_records SET data=data||$2::jsonb,updated_at=now() WHERE id=$1',[row.id,JSON.stringify({status,attempts,next_attempt_at:new Date(Date.now()+600000).toISOString(),...(status==='sent'?{sent_at:new Date().toISOString()}: {})})]);
    }
    await client.query('COMMIT');
  } catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }
}
