import crypto from 'node:crypto';
import type { PoolClient } from 'pg';
import { DedicatedEntityRepository, dedicatedEntityNames, type LegacyEntityName, type LegacyRecord } from './repository.js';

export const usesDedicatedStorage=(entity:string):entity is LegacyEntityName=>dedicatedEntityNames.has(entity as LegacyEntityName);

export async function dualWriteEntity(client:PoolClient,input:{id?:string;storeId:string;entity:LegacyEntityName;ownerId?:string|null;visitorId?:string|null;data:Record<string,any>}){
  const id=input.id||crypto.randomUUID();
  // TODO(legacy-removal): remove this app_records write only after the read switch
  // has remained stable and reconciliation reports zero differences.
  const result=input.id
    ?await client.query<LegacyRecord>('UPDATE app_records SET data=$4,updated_at=now() WHERE id=$1 AND store_id=$2 AND entity_name=$3 RETURNING *',[id,input.storeId,input.entity,JSON.stringify(input.data)])
    :await client.query<LegacyRecord>('INSERT INTO app_records(id,store_id,entity_name,owner_id,visitor_id,data) VALUES($1,$2,$3,$4,$5,$6) RETURNING *',[id,input.storeId,input.entity,input.ownerId||null,input.visitorId||null,JSON.stringify(input.data)]);
  if(!result.rows[0])throw new Error('Registro legado não encontrado durante a escrita dupla.');
  const repository=new DedicatedEntityRepository(client);
  await repository.upsert(result.rows[0]);
  // The legacy ChatMessage trigger changes its ticket after the INSERT. Mirror
  // that server-owned status in the same transaction so both models converge.
  if(input.entity==='ChatMessage'){
    const conversationId=String(input.data.conversation_id||'');
    if(/^[0-9a-f-]{36}$/i.test(conversationId)){
      const ticket=(await client.query<LegacyRecord>("SELECT * FROM app_records WHERE id=$1 AND store_id=$2 AND entity_name='SupportTicket'",[conversationId,input.storeId])).rows[0];
      if(ticket)await repository.upsert(ticket);
    }
  }
  return result.rows[0];
}

export async function dualDeleteEntity(client:PoolClient,entity:LegacyEntityName,id:string,storeId:string){
  await new DedicatedEntityRepository(client).delete(entity,id,storeId);
  // TODO(legacy-removal): remove this delete after app_records is retired.
  await client.query('DELETE FROM app_records WHERE id=$1 AND store_id=$2 AND entity_name=$3',[id,storeId,entity]);
}
