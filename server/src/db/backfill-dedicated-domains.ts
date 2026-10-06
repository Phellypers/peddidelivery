import { pool, closeDatabase } from './client.js';
import { DedicatedEntityRepository, dedicatedEntityNames, type LegacyEntityName, type LegacyRecord } from '../modules/dedicated-entities/repository.js';

const batchSize=Math.max(10,Math.min(1000,Number(process.env.BACKFILL_BATCH_SIZE||250)));
const order:LegacyEntityName[]=['Campaign','Coupon','Table','Review','SupportTicket','PromotionUsage','FinancialTransaction','Payout','TableSession','ReviewComment','ChatMessage'];

async function main(){
  if(!pool)throw new Error('DATABASE_URL não configurada.');
  let migrated=0;
  for(const entity of order){
    if(!dedicatedEntityNames.has(entity))continue;
    let cursor='00000000-0000-0000-0000-000000000000',entityCount=0;
    for(;;){
      const client=await pool.connect();
      try{
        await client.query('BEGIN');
        const records=(await client.query<LegacyRecord>(`SELECT * FROM app_records WHERE entity_name=$1 AND id>$2 ORDER BY id LIMIT $3 FOR UPDATE`,[entity,cursor,batchSize])).rows;
        if(!records.length){await client.query('COMMIT');break;}
        const repository=new DedicatedEntityRepository(client);
        for(const record of records)await repository.upsert(record);
        cursor=records.at(-1)!.id;entityCount+=records.length;migrated+=records.length;
        await client.query('COMMIT');
      }catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}
    }
    console.log(`[backfill] ${entity}: ${entityCount}`);
  }
  console.log(`[backfill] concluído: ${migrated} registros`);
}

main().catch(error=>{console.error('[backfill] falhou:',error);process.exitCode=1;}).finally(closeDatabase);
