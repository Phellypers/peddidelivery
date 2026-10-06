import type { PoolClient, QueryResultRow } from 'pg';

export type LegacyEntityName = 'Campaign'|'Coupon'|'PromotionUsage'|'FinancialTransaction'|'Payout'|'Table'|'TableSession'|'Review'|'ReviewComment'|'SupportTicket'|'ChatMessage';
export type LegacyRecord = {id:string;store_id:string;entity_name:LegacyEntityName;owner_id:string|null;visitor_id:string|null;data:Record<string,any>;created_at:Date;updated_at:Date};

export const dedicatedEntityNames = new Set<LegacyEntityName>(['Campaign','Coupon','PromotionUsage','FinancialTransaction','Payout','Table','TableSession','Review','ReviewComment','SupportTicket','ChatMessage']);
const uuidPattern=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const uuid=(value:any)=>uuidPattern.test(String(value||''))?String(value):null;
const text=(value:any,fallback='')=>String(value??fallback).trim();
const number=(value:any,fallback=0)=>Number.isFinite(Number(value))?Number(value):fallback;
const date=(value:any)=>value?new Date(value):null;
const activeStatus=(data:Record<string,any>)=>data.is_active===false?'inactive':text(data.status,'active');

type Database={query<T extends QueryResultRow=any>(sql:string,values?:any[]):Promise<{rows:T[];rowCount?:number|null}>};

/**
 * Dedicated persistence adapter. The public entity controllers stay unchanged.
 * Remove the app_records branch in service.ts only after reconciliation has been
 * clean in production and PEDDI_DEDICATED_READS has completed its observation period.
 */
export class DedicatedEntityRepository {
  constructor(private readonly db:Database) {}

  async upsert(record:LegacyRecord):Promise<void>{
    const d=record.data||{},common=[record.id,record.store_id,record.id,JSON.stringify(d),record.created_at,record.updated_at];
    switch(record.entity_name){
      case 'Campaign': await this.db.query(`INSERT INTO campaigns(id,store_id,legacy_record_id,name,campaign_type,status,starts_at,ends_at,sort_order,data,created_at,updated_at)
        VALUES($1,$2,$3,$7,$8,$9,$10,$11,$12,$4,$5,$6) ON CONFLICT(id) DO UPDATE SET name=EXCLUDED.name,campaign_type=EXCLUDED.campaign_type,status=EXCLUDED.status,starts_at=EXCLUDED.starts_at,ends_at=EXCLUDED.ends_at,sort_order=EXCLUDED.sort_order,data=EXCLUDED.data,updated_at=EXCLUDED.updated_at`,
        [...common,text(d.name,'Campanha sem nome'),text(d.type||d.campaign_type,'cart_value'),activeStatus(d),date(d.start_date||d.starts_at),date(d.end_date||d.expires_at||d.ends_at),Math.max(0,number(d.sort_order))]);break;
      case 'Coupon': await this.db.query(`INSERT INTO promotions(id,store_id,legacy_record_id,name,code,promotion_type,discount_type,discount_value,minimum_order_value,total_usage_limit,per_customer_limit,usage_count,active,starts_at,ends_at,data,created_at,updated_at)
        VALUES($1,$2,$3,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$4,$5,$6) ON CONFLICT(id) DO UPDATE SET name=EXCLUDED.name,code=EXCLUDED.code,promotion_type=EXCLUDED.promotion_type,discount_type=EXCLUDED.discount_type,discount_value=EXCLUDED.discount_value,minimum_order_value=EXCLUDED.minimum_order_value,total_usage_limit=EXCLUDED.total_usage_limit,per_customer_limit=EXCLUDED.per_customer_limit,usage_count=EXCLUDED.usage_count,active=EXCLUDED.active,starts_at=EXCLUDED.starts_at,ends_at=EXCLUDED.ends_at,data=EXCLUDED.data,updated_at=EXCLUDED.updated_at`,
        [...common,text(d.name||d.code,'Promoção sem nome'),text(d.code)||null,text(d.promotion_type,'coupon'),normalizeDiscountType(d.discount_type||d.type),Math.max(0,number(d.value||d.discount_value)),Math.max(0,number(d.min_order_value)),positiveInt(d.total_usage_limit||d.max_uses),positiveInt(d.per_customer_limit),Math.max(0,number(d.uses_count)),d.is_active!==false,date(d.start_date||d.starts_at),date(d.expires_at||d.end_date||d.ends_at)]);break;
      case 'PromotionUsage': await this.db.query(`INSERT INTO promotion_usages(id,store_id,promotion_id,order_id,user_id,customer_key,discount_amount,status,legacy_record_id,data,created_at,updated_at)
        VALUES($1,$2,$7,$8,$9,$10,$11,$12,$3,$4,$5,$6) ON CONFLICT(id) DO UPDATE SET promotion_id=EXCLUDED.promotion_id,order_id=EXCLUDED.order_id,user_id=EXCLUDED.user_id,customer_key=EXCLUDED.customer_key,discount_amount=EXCLUDED.discount_amount,status=EXCLUDED.status,data=EXCLUDED.data,updated_at=EXCLUDED.updated_at`,
        [...common,requiredUuid(d.promotion_id,'promotion_id'),uuid(d.order_id),uuid(d.user_id||record.owner_id),text(d.customer_key)||null,Math.max(0,number(d.discount_amount)),allowed(text(d.status,'applied'),['reserved','applied','reversed'],'applied')]);break;
      case 'FinancialTransaction': await this.db.query(`INSERT INTO financial_transactions(id,store_id,order_id,user_id,transaction_type,status,amount,occurred_at,description,legacy_record_id,data,created_at,updated_at)
        VALUES($1,$2,$7,$8,$9,$10,$11,$12,$13,$3,$4,$5,$6) ON CONFLICT(id) DO UPDATE SET order_id=EXCLUDED.order_id,user_id=EXCLUDED.user_id,transaction_type=EXCLUDED.transaction_type,status=EXCLUDED.status,amount=EXCLUDED.amount,occurred_at=EXCLUDED.occurred_at,description=EXCLUDED.description,data=EXCLUDED.data,updated_at=EXCLUDED.updated_at`,
        [...common,uuid(d.order_id),uuid(d.user_id||record.owner_id),allowed(text(d.transaction_type||d.type,'adjustment'),['income','expense','refund','fee','adjustment','transfer'],'adjustment'),allowed(text(d.status,'pending'),['pending','paid','completed','cancelled','failed','refunded'],'pending'),Math.max(0,number(d.amount)),date(d.occurred_at||d.date)||record.created_at,text(d.description)]);break;
      case 'Payout': {const status=allowed(text(d.status,'pending'),['pending','processing','paid','cancelled','failed'],'pending');await this.db.query(`INSERT INTO payouts(id,store_id,user_id,amount,status,scheduled_for,paid_at,provider_reference,legacy_record_id,data,created_at,updated_at)
        VALUES($1,$2,$7,$8,$9,$10,$11,$12,$3,$4,$5,$6) ON CONFLICT(id) DO UPDATE SET user_id=EXCLUDED.user_id,amount=EXCLUDED.amount,status=EXCLUDED.status,scheduled_for=EXCLUDED.scheduled_for,paid_at=EXCLUDED.paid_at,provider_reference=EXCLUDED.provider_reference,data=EXCLUDED.data,updated_at=EXCLUDED.updated_at`,
        [...common,uuid(d.user_id||record.owner_id),Math.max(.01,number(d.amount,.01)),status,date(d.scheduled_for),status==='paid'?(date(d.paid_at)||record.updated_at):date(d.paid_at),text(d.provider_reference)||null]);break;}
      case 'Table': await this.db.query(`INSERT INTO tables(id,store_id,name,code,capacity,status,sort_order,legacy_record_id,data,created_at,updated_at)
        VALUES($1,$2,$7,$8,$9,$10,$11,$3,$4,$5,$6) ON CONFLICT(id) DO UPDATE SET name=EXCLUDED.name,code=EXCLUDED.code,capacity=EXCLUDED.capacity,status=EXCLUDED.status,sort_order=EXCLUDED.sort_order,data=EXCLUDED.data,updated_at=EXCLUDED.updated_at`,
        [...common,text(d.name||d.number,'Mesa sem nome'),text(d.code)||null,Math.max(1,Math.trunc(number(d.capacity,1))),allowed(text(d.status,d.is_active===false?'inactive':'available'),['available','occupied','reserved','inactive'],'available'),Math.max(0,Math.trunc(number(d.sort_order)))]);break;
      case 'TableSession': {const status=allowed(text(d.status,'open'),['open','closing','closed','cancelled'],'open');await this.db.query(`INSERT INTO table_sessions(id,store_id,table_id,opened_by,closed_by,status,guest_count,opened_at,closed_at,legacy_record_id,data,created_at,updated_at)
        VALUES($1,$2,$7,$8,$9,$10,$11,$12,$13,$3,$4,$5,$6) ON CONFLICT(id) DO UPDATE SET table_id=EXCLUDED.table_id,opened_by=EXCLUDED.opened_by,closed_by=EXCLUDED.closed_by,status=EXCLUDED.status,guest_count=EXCLUDED.guest_count,opened_at=EXCLUDED.opened_at,closed_at=EXCLUDED.closed_at,data=EXCLUDED.data,updated_at=EXCLUDED.updated_at`,
        [...common,requiredUuid(d.table_id,'table_id'),uuid(d.opened_by||record.owner_id),uuid(d.closed_by),status,Math.max(1,Math.trunc(number(d.guest_count,1))),date(d.opened_at)||record.created_at,['closed','cancelled'].includes(status)?(date(d.closed_at)||record.updated_at):date(d.closed_at)]);break;}
      case 'Review': await this.db.query(`INSERT INTO reviews(id,store_id,product_id,order_id,user_id,rating,title,comment,status,legacy_record_id,data,created_at,updated_at)
        VALUES($1,$2,$7,$8,$9,$10,$11,$12,$13,$3,$4,$5,$6) ON CONFLICT(id) DO UPDATE SET product_id=EXCLUDED.product_id,order_id=EXCLUDED.order_id,user_id=EXCLUDED.user_id,rating=EXCLUDED.rating,title=EXCLUDED.title,comment=EXCLUDED.comment,status=EXCLUDED.status,data=EXCLUDED.data,updated_at=EXCLUDED.updated_at`,
        [...common,uuid(d.product_id),uuid(d.order_id),uuid(d.user_id||record.owner_id),Math.min(5,Math.max(1,Math.trunc(number(d.rating,1)))),text(d.title)||null,text(d.comment||d.message),d.is_approved===true?'approved':d.is_approved===false?'pending':allowed(text(d.status,'pending'),['pending','approved','rejected'],'pending')]);break;
      case 'ReviewComment': await this.db.query(`INSERT INTO review_responses(id,store_id,review_id,user_id,message,is_store_response,status,legacy_record_id,data,created_at,updated_at)
        VALUES($1,$2,$7,$8,$9,$10,$11,$3,$4,$5,$6) ON CONFLICT(id) DO UPDATE SET review_id=EXCLUDED.review_id,user_id=EXCLUDED.user_id,message=EXCLUDED.message,is_store_response=EXCLUDED.is_store_response,status=EXCLUDED.status,data=EXCLUDED.data,updated_at=EXCLUDED.updated_at`,
        [...common,requiredUuid(d.review_id,'review_id'),uuid(d.user_id||record.owner_id),text(d.message||d.comment||d.content,'Comentário sem conteúdo'),Boolean(d.is_store_reply),d.is_approved===false?'pending':allowed(text(d.status,'approved'),['pending','approved','rejected'],'approved')]);break;
      case 'SupportTicket': {const status=allowed(text(d.status,'open'),['open','in_progress','waiting_response','resolved','closed'],'open');await this.db.query(`INSERT INTO support_tickets(id,store_id,user_id,visitor_id,subject,description,priority,status,closed_at,delete_after,legacy_record_id,data,created_at,updated_at)
        VALUES($1,$2,$7,$8,$9,$10,$11,$12,$13,$14,$3,$4,$5,$6) ON CONFLICT(id) DO UPDATE SET user_id=EXCLUDED.user_id,visitor_id=EXCLUDED.visitor_id,subject=EXCLUDED.subject,description=EXCLUDED.description,priority=EXCLUDED.priority,status=EXCLUDED.status,closed_at=EXCLUDED.closed_at,delete_after=EXCLUDED.delete_after,data=EXCLUDED.data,updated_at=EXCLUDED.updated_at`,
        [...common,uuid(d.customer_user_id||d.user_id||record.owner_id),record.visitor_id,text(d.subject||d.title,'Atendimento'),text(d.description||d.message),allowed(text(d.priority,'normal'),['low','normal','high','urgent'],'normal'),status,status==='closed'?(date(d.closed_at)||record.updated_at):date(d.closed_at),status==='closed'?(date(d.delete_after)||new Date(record.updated_at.getTime()+30*86400000)):date(d.delete_after)]);break;}
      case 'ChatMessage': {const key=text(d.conversation_id||d.ticket_id);await this.db.query(`INSERT INTO ticket_messages(id,store_id,ticket_id,conversation_key,user_id,visitor_id,sender_type,message,legacy_record_id,data,created_at,updated_at)
        VALUES($1,$2,$7,$8,$9,$10,$11,$12,$3,$4,$5,$6) ON CONFLICT(id) DO UPDATE SET ticket_id=EXCLUDED.ticket_id,conversation_key=EXCLUDED.conversation_key,user_id=EXCLUDED.user_id,visitor_id=EXCLUDED.visitor_id,sender_type=EXCLUDED.sender_type,message=EXCLUDED.message,data=EXCLUDED.data,updated_at=EXCLUDED.updated_at`,
        [...common,uuid(key),key||record.id,uuid(d.user_id||record.owner_id),record.visitor_id,allowed(text(d.sender_type,'system'),['customer','store','deliverer','system'],'system'),text(d.message,'Mensagem sem conteúdo')]);break;}
    }
  }

  async delete(entity:LegacyEntityName,id:string,storeId:string){
    const table=tableFor(entity);
    await this.db.query(`DELETE FROM ${table} WHERE id=$1 AND store_id=$2`,[id,storeId]);
  }

  async list(entity:LegacyEntityName,storeId:string):Promise<LegacyRecord[]>{
    const table=tableFor(entity);
    const ownerColumn=['Review','ReviewComment','SupportTicket','ChatMessage'].includes(entity)?'user_id':'NULL::uuid';
    const visitorColumn=['SupportTicket','ChatMessage'].includes(entity)?'visitor_id':'NULL::text';
    const rows=(await this.db.query(`SELECT id,store_id,$1::text AS entity_name,${ownerColumn} AS owner_id,${visitorColumn} AS visitor_id,
      data,created_at,updated_at FROM ${table} WHERE store_id=$2`,[entity,storeId])).rows;
    return rows as LegacyRecord[];
  }
}

function tableFor(entity:LegacyEntityName){return ({Campaign:'campaigns',Coupon:'promotions',PromotionUsage:'promotion_usages',FinancialTransaction:'financial_transactions',Payout:'payouts',Table:'tables',TableSession:'table_sessions',Review:'reviews',ReviewComment:'review_responses',SupportTicket:'support_tickets',ChatMessage:'ticket_messages'} as const)[entity];}
function requiredUuid(value:any,field:string){const result=uuid(value);if(!result)throw new Error(`${field} inválido para persistência dedicada.`);return result;}
function positiveInt(value:any){const result=Math.trunc(number(value));return result>0?result:null;}
function allowed<T extends string>(value:string,values:readonly T[],fallback:T):T{return values.includes(value as T)?value as T:fallback;}
function normalizeDiscountType(value:any){return ({fixed_amount:'fixed',percent:'percentage'} as Record<string,string>)[text(value)]||allowed(text(value,'fixed'),['fixed','percentage','free_shipping','product','combo'],'fixed');}
