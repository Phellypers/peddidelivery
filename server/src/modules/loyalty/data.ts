import crypto from 'node:crypto';
import type { PoolClient } from 'pg';
import type { LoyaltyDiscountType, LoyaltyProgram, ProcessLoyaltyResult, UserLoyaltyProgress } from './types.js';

const code = () => `FID-${crypto.randomBytes(5).toString('hex').toUpperCase()}`;

export async function getOrCreateLoyaltyProgram(client: PoolClient, storeId: string): Promise<LoyaltyProgram> {
  const result=await client.query<LoyaltyProgram>('SELECT * FROM loyalty_programs WHERE store_id=$1',[storeId]);
  if(result.rows[0]) return result.rows[0];
  return (await client.query<LoyaltyProgram>(`INSERT INTO loyalty_programs(store_id)
    VALUES($1) ON CONFLICT(store_id) DO UPDATE SET updated_at=loyalty_programs.updated_at RETURNING *`,[storeId])).rows[0];
}

export async function processOrderDeliveryLoyalty(client: PoolClient, orderId: string, storeId: string): Promise<ProcessLoyaltyResult> {
  const order=(await client.query<{id:string;status:string;total:string;user_id:string|null}>(`SELECT o.id,o.status,o.total,c.user_id
    FROM orders o JOIN customers c ON c.id=o.customer_id
    WHERE o.id=$1 AND o.store_id=$2 FOR UPDATE`,[orderId,storeId])).rows[0];
  if(!order) return {applied:false,reason:'Pedido não encontrado.'};
  if(order.status!=='delivered') return {applied:false,reason:'O pedido ainda não foi entregue.'};
  if(!order.user_id) return {applied:false,reason:'Pedido sem cliente cadastrado.'};

  const program=await getOrCreateLoyaltyProgram(client,storeId);
  if(!program.active) return {applied:false,reason:'Programa de fidelidade inativo.'};
  if(Number(order.total)<Number(program.minimum_order_total)) return {applied:false,reason:'Pedido abaixo do ticket mínimo.'};

  await client.query(`INSERT INTO user_loyalty_progress(store_id,user_id,required_steps)
    VALUES($1,$2,$3) ON CONFLICT(store_id,user_id) DO NOTHING`,[storeId,order.user_id,program.required_steps]);
  const progress=(await client.query<UserLoyaltyProgress>(`SELECT * FROM user_loyalty_progress
    WHERE store_id=$1 AND user_id=$2 FOR UPDATE`,[storeId,order.user_id])).rows[0];
  const event=await client.query(`INSERT INTO loyalty_order_events(store_id,user_id,order_id,cycle_number)
    VALUES($1,$2,$3,$4) ON CONFLICT(store_id,order_id) DO NOTHING RETURNING id`,
    [storeId,order.user_id,orderId,progress.completed_cycles]);
  if(!event.rowCount) return {applied:false,reason:'Carimbo já concedido para este pedido.'};

  let steps=progress.current_steps+1;
  let cycles=progress.completed_cycles;
  let rewardCode:string|undefined;
  const completed=steps>=program.required_steps;
  if(completed){
    steps=0;cycles+=1;rewardCode=code();
    const expiresAt=new Date(Date.now()+Number(program.reward_validity_days)*86400000);
    const discountType:LoyaltyDiscountType=program.reward_type==='percentage_discount'?'percentage':program.reward_type==='free_delivery'?'free_shipping':'fixed';
    const reward=(await client.query<{id:string}>(`INSERT INTO loyalty_rewards(
      store_id,user_id,loyalty_program_id,code,discount_type,discount_value,minimum_order_value,expires_at)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`,[
      storeId,order.user_id,program.id,rewardCode,discountType,Number(program.reward_value),
      Number(program.reward_minimum_order),expiresAt
    ])).rows[0];
    const couponData={
      promotion_type:'loyalty_reward',name:`Recompensa - ${program.name}`,code:rewardCode,
      type:discountType==='percentage'?'percentage':'fixed',discount_type:discountType,
      value:Number(program.reward_value),min_order_value:Number(program.reward_minimum_order),
      max_uses:1,uses_count:0,limit_per_customer:true,per_customer_limit:1,
      limit_total:true,total_usage_limit:1,usage_by_customer:{},limit_reached:false,
      allow_stacking:false,is_active:true,start_date:new Date().toISOString().slice(0,10),
      expires_at:expiresAt.toISOString().slice(0,10),restricted_user_id:order.user_id,
      loyalty_reward_id:reward.id
    };
    const coupon=(await client.query<{id:string}>(`INSERT INTO app_records(store_id,entity_name,owner_id,data)
      VALUES($1,'Coupon',$2,$3) RETURNING id`,[storeId,order.user_id,JSON.stringify(couponData)])).rows[0];
    await client.query('UPDATE loyalty_rewards SET coupon_record_id=$1 WHERE id=$2',[coupon.id,reward.id]);
  }
  await client.query(`UPDATE user_loyalty_progress SET current_steps=$3,required_steps=$4,
    completed_cycles=$5,updated_at=now() WHERE store_id=$1 AND user_id=$2`,
    [storeId,order.user_id,steps,program.required_steps,cycles]);
  return {applied:true,new_steps:steps,cycle_completed:completed,reward_code:rewardCode};
}

export async function expireLoyaltyRewards(client: PoolClient, storeId: string, userId?: string) {
  await client.query(`UPDATE loyalty_rewards SET status='expired'
    WHERE store_id=$1 AND status='active' AND expires_at<=now() AND ($2::uuid IS NULL OR user_id=$2)`,[storeId,userId||null]);
}
