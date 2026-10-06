import { pool, closeDatabase } from './client.js';
import type { LegacyEntityName } from '../modules/dedicated-entities/repository.js';

const mappings:Record<LegacyEntityName,string>={Campaign:'campaigns',Coupon:'promotions',PromotionUsage:'promotion_usages',FinancialTransaction:'financial_transactions',Payout:'payouts',Table:'tables',TableSession:'table_sessions',Review:'reviews',ReviewComment:'review_responses',SupportTicket:'support_tickets',ChatMessage:'ticket_messages'};

async function main(){
  if(!pool)throw new Error('DATABASE_URL não configurada.');
  let failures=0;
  for(const [entity,table] of Object.entries(mappings)){
    const result=(await pool.query(`SELECT
      (SELECT count(*)::int FROM app_records WHERE entity_name=$1) AS legacy_count,
      (SELECT count(*)::int FROM ${table}) AS dedicated_count,
      (SELECT count(*)::int FROM app_records l FULL JOIN ${table} d ON d.id=l.id
        WHERE (l.entity_name=$1 OR l.id IS NULL) AND (l.id IS NULL OR d.id IS NULL OR l.store_id<>d.store_id OR l.data IS DISTINCT FROM d.data)) AS differences`,[entity])).rows[0];
    const ok=result.legacy_count===result.dedicated_count&&result.differences===0;
    if(!ok)failures++;
    console.log(`[reconcile] ${entity}: legacy=${result.legacy_count} dedicada=${result.dedicated_count} diferenças=${result.differences} ${ok?'OK':'FALHA'}`);
  }
  if(failures)throw new Error(`Conciliação encontrou divergências em ${failures} domínio(s). Não habilite PEDDI_DEDICATED_READS.`);
  console.log('[reconcile] consistência 100% confirmada.');
}

main().catch(error=>{console.error(error);process.exitCode=1;}).finally(closeDatabase);
