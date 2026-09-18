import type { Pool, PoolClient } from 'pg';
import { z } from 'zod';

type Database=Pool|PoolClient;
export function courierView(row:Record<string,any>) {
  return {...row.details,id:row.id,user_id:row.user_id||'',vehicle:row.vehicle,
    available:row.available,created_date:row.created_at,updated_date:row.updated_at};
}
export async function saveCourier(database:Database,tenant:string,input:Record<string,any>,id?:string) {
  if (id) {
    const previous=(await database.query('SELECT details FROM couriers WHERE id=$1 AND store_id=$2',[id,tenant])).rows[0];
    if (previous?.details.application_status && previous.details.application_status !== 'approved') throw new Error('Use a área de solicitações para aprovar ou recusar este entregador.');
    if (previous?.details.application_status) input={...input,application_status:previous.details.application_status};
  }
  const name=String(input.name||'').trim();
  if (!name) throw new Error('Informe o nome do entregador.');
  let userId:string|null=null;
  if (input.user_id) {
    if (!z.string().uuid().safeParse(input.user_id).success) throw new Error('Conta de entregador inválida.');
    const user=await database.query("SELECT id FROM users WHERE id=$1 AND store_id=$2 AND role='courier' AND active=true",[input.user_id,tenant]);
    if (!user.rowCount) throw new Error('O entregador precisa de uma conta ativa nesta loja.');
    userId=user.rows[0].id;
  } else if (input.email) {
    const user=await database.query("SELECT id FROM users WHERE lower(email)=lower($1) AND store_id=$2 AND role='courier' AND active=true",[input.email,tenant]);
    userId=user.rows[0]?.id||null;
  }
  const {id:_id,created_date:_created,updated_date:_updated,store_id:_store,...details}=input;
  details.name=name;details.user_id=userId||'';
  const values=[tenant,userId,String(details.vehicle||details.vehicle_type||'moto'),details.current_status==='available'||details.available===true,JSON.stringify(details)];
  const result=id
    ?await database.query("UPDATE couriers SET user_id=$2,vehicle=$3,available=$4,details=$5,updated_at=now() WHERE store_id=$1 AND id=$6 AND COALESCE(details->>'deleted','false')<>'true' RETURNING *",[...values,id])
    :await database.query('INSERT INTO couriers(store_id,user_id,vehicle,available,details) VALUES($1,$2,$3,$4,$5) RETURNING *',values);
  if (!result.rowCount) throw new Error('Entregador não encontrado.');
  return courierView(result.rows[0]);
}
export async function archiveCourier(database:Database,tenant:string,id:string) {
  await database.query("UPDATE couriers SET available=false,details=details||'{\"is_active\":false,\"deleted\":true}'::jsonb,updated_at=now() WHERE store_id=$1 AND id=$2",[tenant,id]);
}
