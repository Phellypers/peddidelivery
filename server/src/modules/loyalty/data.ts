import crypto from 'node:crypto';
import type { PoolClient } from 'pg';
import type { LoyaltyDiscountType, LoyaltyProgram, ProcessLoyaltyResult, UserLoyaltyProgress } from './types.js';
import { enqueueEmail } from '../email/service.js';
import { dualWriteEntity } from '../dedicated-entities/service.js';

const code = () => `FID-${crypto.randomBytes(5).toString('hex').toUpperCase()}`;

export async function getOrCreateLoyaltyProgram(client: PoolClient, storeId: string): Promise<LoyaltyProgram> {
  const result=await client.query<LoyaltyProgram>('SELECT lp.*,p.name AS reward_product_name FROM loyalty_programs lp LEFT JOIN products p ON p.id=lp.reward_product_id WHERE lp.store_id=$1',[storeId]);
  if(result.rows[0]) return result.rows[0];
  return (await client.query<LoyaltyProgram>(`INSERT INTO loyalty_programs(store_id)
    VALUES($1) ON CONFLICT(store_id) DO UPDATE SET updated_at=loyalty_programs.updated_at RETURNING *`,[storeId])).rows[0];
}

export async function processOrderDeliveryLoyalty(client: PoolClient, orderId: string, storeId: string): Promise<ProcessLoyaltyResult> {
  const order=(await client.query<{id:string;status:string;total:string;user_id:string|null;details:Record<string,any>}>(`SELECT o.id,o.status,o.total,o.details,c.user_id
    FROM orders o JOIN customers c ON c.id=o.customer_id
    WHERE o.id=$1 AND o.store_id=$2 FOR UPDATE`,[orderId,storeId])).rows[0];
  if(!order) return {applied:false,reason:'Pedido não encontrado.'};
  if(order.status!=='delivered') return {applied:false,reason:'O pedido ainda não foi entregue.'};
  if(!order.user_id) return {applied:false,reason:'Pedido sem cliente cadastrado.'};
  if(order.details?.coupon_code){
    const usedReward=(await client.query(`SELECT 1 FROM app_records WHERE store_id=$1 AND entity_name='Coupon'
      AND upper(data->>'code')=upper($2) AND NULLIF(data->>'loyalty_reward_id','') IS NOT NULL LIMIT 1`,[storeId,String(order.details.coupon_code)])).rowCount;
    if(usedReward)return {applied:false,reason:'O 10º pedido utilizou o benefício e não gera novo carimbo.'};
  }

  const program=await getOrCreateLoyaltyProgram(client,storeId);
  if(!program.active) return {applied:false,reason:'Programa de fidelidade inativo.'};
  if(Number(order.total)<Number(program.minimum_order_total)) return {applied:false,reason:'Pedido abaixo do ticket mínimo.'};

  if(program.reward_mode){
    const pending=(await client.query(`SELECT 1 FROM loyalty_rewards WHERE store_id=$1 AND user_id=$2 AND status='active' AND expires_at>now() LIMIT 1`,[storeId,order.user_id])).rowCount;
    if(pending)return {applied:false,reason:'O cliente já possui um benefício disponível para o 10º pedido.'};
  }

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
    const configurable=Boolean(program.reward_mode);
    if(configurable)steps=program.required_steps;
    else {steps=0;cycles+=1;}
    rewardCode=code();
    const expiresAt=new Date(Date.now()+Number(program.reward_validity_days)*86400000);
    const discountType:LoyaltyDiscountType=configurable?'fixed':program.reward_type==='percentage_discount'?'percentage':program.reward_type==='free_delivery'?'free_shipping':'fixed';
    const product=program.reward_product_id?(await client.query<{name:string}>('SELECT name FROM products WHERE id=$1 AND store_id=$2',[program.reward_product_id,storeId])).rows[0]:undefined;
    const rewardValue=configurable?Number(program.reward_value_limit):Number(program.reward_value);
    const reward=configurable
      ?(await client.query<{id:string}>(`INSERT INTO loyalty_rewards(
        store_id,user_id,loyalty_program_id,code,discount_type,discount_value,minimum_order_value,expires_at,
        reward_mode,product_id,product_name,eligible_product_ids,value_limit,over_limit_behavior)
        VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING id`,[
        storeId,order.user_id,program.id,rewardCode,discountType,rewardValue,
        Number(program.reward_minimum_order),expiresAt,program.reward_mode,program.reward_product_id||null,
        product?.name||null,program.eligible_product_ids||[],rewardValue,program.over_limit_behavior||null
      ])).rows[0]
      :(await client.query<{id:string}>(`INSERT INTO loyalty_rewards(
        store_id,user_id,loyalty_program_id,code,discount_type,discount_value,minimum_order_value,expires_at)
        VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`,[
        storeId,order.user_id,program.id,rewardCode,discountType,rewardValue,Number(program.reward_minimum_order),expiresAt
      ])).rows[0];
    const couponData={
      promotion_type:'loyalty_reward',name:`Recompensa - ${program.name}`,code:rewardCode,
      type:discountType==='percentage'?'percentage':'fixed',discount_type:discountType,
      value:rewardValue,min_order_value:Number(program.reward_minimum_order),
      max_uses:1,uses_count:0,limit_per_customer:true,per_customer_limit:1,
      limit_total:true,total_usage_limit:1,usage_by_customer:{},limit_reached:false,
      allow_stacking:false,is_active:true,start_date:new Date().toISOString().slice(0,10),
      expires_at:expiresAt.toISOString().slice(0,10),restricted_user_id:order.user_id,
      loyalty_reward_id:reward.id,loyalty_reward_mode:program.reward_mode||null,
      loyalty_product_id:program.reward_product_id||null,loyalty_product_name:product?.name||null,
      loyalty_eligible_product_ids:program.eligible_product_ids||[],loyalty_value_limit:configurable?rewardValue:null,
      loyalty_over_limit_behavior:program.over_limit_behavior||null
    };
    const coupon=await dualWriteEntity(client,{storeId,entity:'Coupon',ownerId:order.user_id,data:couponData});
    await client.query('UPDATE loyalty_rewards SET coupon_record_id=$1 WHERE id=$2',[coupon.id,reward.id]);
    const recipient=(await client.query<{email:string}>('SELECT email FROM users WHERE id=$1',[order.user_id])).rows[0]?.email;
    if(recipient)await enqueueEmail(client,{storeId,userId:order.user_id,template:'loyalty_reward',to:recipient,subject:'Seu benefício de fidelidade chegou — PEDDI',payload:{code:rewardCode},idempotencyKey:`loyalty-reward:${reward.id}`});
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
