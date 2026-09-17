import type { Pool } from 'pg';
import { addAccountEvent } from './data.js';

export async function classifyAssistance(db:Pool,id:string,mode:'human_assisted'|'extra_quote',eligible:boolean) {
  const client=await db.connect();
  try {
    await client.query('BEGIN');
    const initial=(await client.query('SELECT store_id FROM peddi_requests WHERE id=$1',[id])).rows[0];
    if(!initial)throw new Error('Chamado não encontrado.');
    await client.query('SELECT id FROM stores WHERE id=$1 FOR UPDATE',[initial.store_id]);
    const ticket=(await client.query('SELECT * FROM peddi_requests WHERE id=$1 FOR UPDATE',[id])).rows[0];
    if(ticket.status==='cancelled'||ticket.status==='completed')throw new Error('Chamado já finalizado.');
    const owner=(await client.query('SELECT email FROM users WHERE id=$1',[ticket.user_id])).rows[0];
    const demo=owner?.email==='gestor.demo@peddi.local';
    const consumes=eligible&&mode==='human_assisted'&&ticket.kind!=='bug'&&!demo;
    let periodId=ticket.support_period_id;
    if(consumes&&!ticket.consumes_support) {
      const period=(await client.query('SELECT * FROM peddi_support_periods WHERE store_id=$1 AND starts_at<=now() AND expires_at>now() ORDER BY starts_at DESC LIMIT 1',[ticket.store_id])).rows[0];
      if(!period)throw new Error('Sem período de Suporte Exclusivo ativo.');
      const used=Number((await client.query("SELECT count(*) AS used FROM peddi_requests WHERE support_period_id=$1 AND consumes_support=true AND status<>'cancelled'",[period.id])).rows[0].used);
      if(used>=period.request_limit)throw new Error('As 8 solicitações assistidas deste período já foram utilizadas.');
      periodId=period.id;
    }
    const result=(await client.query("UPDATE peddi_requests SET assistance_state=$2,consumes_support=$3,support_period_id=$4,status='in_progress' WHERE id=$1 RETURNING *",[id,mode,consumes,consumes?periodId:null])).rows[0];
    await addAccountEvent(client,ticket.store_id,'assistance_classified',`${ticket.subject}: ${mode==='extra_quote'?'orçamento separado':consumes?'atendimento humano elegível':'atendimento sem consumo de franquia'}.`);
    await client.query('COMMIT');return result;
  }catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}
}
