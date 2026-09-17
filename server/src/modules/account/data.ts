import type { Pool, PoolClient } from 'pg';
import { PEDDI_SERVICES, PEDDI_SUPPORT_REQUEST_LIMIT, resolvePeddiAccess } from '../../../../src/lib/peddiAccount.js';
import type { AuthRequest } from '../../auth/middleware.js';
import { query } from '../../db/client.js';

export const featureEnforcementEnabled=process.env.PEDDI_ENFORCE_FEATURES==='true';
export function supportRequestLimit() {
  return PEDDI_SUPPORT_REQUEST_LIMIT;
}
export async function accountAccess(request:AuthRequest) {
  const [account,entitlements]=await Promise.all([
    query('SELECT * FROM peddi_accounts WHERE store_id=$1',[request.auth!.storeId]),
    query<{feature:string;expires_at:string}>('SELECT * FROM peddi_entitlements WHERE store_id=$1',[request.auth!.storeId]),
  ]);
  const data=account.rows[0];
  return resolvePeddiAccess({email:request.auth!.email,founderSince:data?.founder_since,founderExpiresAt:data?.founder_expires_at,entitlements:entitlements.rows,enforce:featureEnforcementEnabled});
}
export async function addAccountEvent(client:PoolClient,storeId:string,kind:string,description:string,purchaseId:string|null=null) {
  await client.query('INSERT INTO peddi_account_events(store_id,purchase_id,kind,description) VALUES($1,$2,$3,$4)',[storeId,purchaseId,kind,description]);
}
// Only a future payment adapter with a verified provider receipt may call this.
// There is deliberately no public "approve payment" endpoint.
export async function applyVerifiedPayment(db:Pool,purchaseId:string,receipt:{provider:string;reference:string;amountCents:number}) {
  if(!receipt.provider.trim()||!receipt.reference.trim())throw new Error('Comprovante do provedor obrigatório.');
  const client=await db.connect();
  try {
    await client.query('BEGIN');
    const purchase=(await client.query('SELECT * FROM peddi_purchases WHERE id=$1 FOR UPDATE',[purchaseId])).rows[0];
    if(!purchase)throw new Error('Contratação não encontrada.');
    const owner=(await client.query('SELECT email FROM users WHERE id=$1',[purchase.user_id])).rows[0];
    if(owner?.email==='designer.demo@peddi.app')throw new Error('Conta de apresentação não pode ativar contratações reais.');
    await client.query('SELECT id FROM stores WHERE id=$1 FOR UPDATE',[purchase.store_id]);
    if(purchase.amount_cents!==receipt.amountCents)throw new Error('Valor aprovado diferente da contratação.');
    if(purchase.status==='paid') {
      if(purchase.provider!==receipt.provider||purchase.payment_reference!==receipt.reference)throw new Error('Comprovante diferente do pagamento registrado.');
      await client.query('COMMIT');return;
    }
    if(purchase.status!=='pending_payment')throw new Error('Contratação não está aguardando pagamento.');
    const service=PEDDI_SERVICES.find(item=>item.id===purchase.service_id);
    if(!service)throw new Error('Serviço inválido.');
    if(service.id==='FOUNDER') {
      const founder=(await client.query('SELECT founder_since FROM peddi_accounts WHERE store_id=$1',[purchase.store_id])).rows[0];
      if(founder?.founder_since)throw new Error('O selo de Fundador já pertence a esta loja.');
      await client.query("INSERT INTO peddi_accounts(store_id,founder_since,founder_expires_at) VALUES($1,now(),now()+interval '30 days') ON CONFLICT(store_id) DO UPDATE SET founder_since=EXCLUDED.founder_since,founder_expires_at=EXCLUDED.founder_expires_at",[purchase.store_id]);
      await addAccountEvent(client,purchase.store_id,'activation','Base Fundador ativada por 30 dias; selo permanente.',purchase.id);
    }
    if(service.id==='EXCLUSIVE_SUPPORT') {
      await client.query("INSERT INTO peddi_support_periods(store_id,purchase_id,starts_at,expires_at,request_limit) SELECT $1,$2,GREATEST(now(),COALESCE(max(expires_at),now())),GREATEST(now(),COALESCE(max(expires_at),now()))+interval '30 days',$3 FROM peddi_support_periods WHERE store_id=$1",[purchase.store_id,purchase.id,supportRequestLimit()]);
      await addAccountEvent(client,purchase.store_id,'activation','Suporte Exclusivo contratado por 30 dias.',purchase.id);
    }
    await client.query("UPDATE peddi_purchases SET status='paid',provider=$2,payment_reference=$3,paid_at=now() WHERE id=$1",[purchase.id,receipt.provider,receipt.reference]);
    const request=(await client.query("INSERT INTO peddi_requests(store_id,user_id,purchase_id,kind,subject) VALUES($1,$2,$3,'service',$4) RETURNING id",[purchase.store_id,purchase.user_id,purchase.id,service.name])).rows[0];
    await addAccountEvent(client,purchase.store_id,'payment',`Pagamento aprovado: ${service.name}.`,purchase.id);
    await client.query("INSERT INTO peddi_commercial_outbox(store_id,purchase_id,event_type,payload) VALUES($1,$2,'service_paid',$3)",[purchase.store_id,purchase.id,JSON.stringify({storeId:purchase.store_id,purchaseId:purchase.id,requestId:request.id,serviceId:service.id,amountCents:purchase.amount_cents,status:'paid'})]);
    await client.query('COMMIT');
  }catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}
}
