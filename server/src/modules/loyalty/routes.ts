import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../../db/client.js';
import { blockPresentationDemoWrites, requireAuth, requireRoles, type AuthRequest } from '../../auth/middleware.js';
import { expireLoyaltyRewards, getOrCreateLoyaltyProgram } from './data.js';

export const loyaltyRouter=Router();
const authorization=(request:AuthRequest,response:any)=>{
  if(!request.auth?.storeId||!request.auth.userId){response.status(403).json({error:'Usuário sem loja.'});return false;}
  return true;
};

loyaltyRouter.get('/loyalty/progress',requireAuth,requireRoles('customer'),async(request:AuthRequest,response)=>{
  if(!authorization(request,response))return;
  const client=await pool!.connect();
  try{
    const program=await getOrCreateLoyaltyProgram(client,request.auth!.storeId!);
    const progress=(await client.query(`SELECT * FROM user_loyalty_progress WHERE store_id=$1 AND user_id=$2`,
      [request.auth!.storeId,request.auth!.userId])).rows[0]||{current_steps:0,required_steps:program.required_steps,completed_cycles:0};
    response.json({program,progress});
  }finally{client.release();}
});

loyaltyRouter.get('/loyalty/rewards',requireAuth,requireRoles('customer'),async(request:AuthRequest,response)=>{
  if(!authorization(request,response))return;
  const client=await pool!.connect();
  try{
    await expireLoyaltyRewards(client,request.auth!.storeId!,request.auth!.userId);
    const rewards=(await client.query(`SELECT * FROM loyalty_rewards WHERE store_id=$1 AND user_id=$2 ORDER BY issued_at DESC`,
      [request.auth!.storeId,request.auth!.userId])).rows;
    response.json({rewards});
  }finally{client.release();}
});

loyaltyRouter.get('/admin/loyalty/program',requireAuth,requireRoles('manager','peddi_admin'),async(request:AuthRequest,response)=>{
  if(!authorization(request,response))return;
  const client=await pool!.connect();
  try{response.json({program:await getOrCreateLoyaltyProgram(client,request.auth!.storeId!)});}
  finally{client.release();}
});

const programSchema=z.object({
  active:z.boolean(),name:z.string().trim().min(2).max(255),required_steps:z.number().int().min(1).max(50),
  minimum_order_total:z.number().min(0),reward_type:z.enum(['fixed_discount','percentage_discount','free_delivery']),
  reward_value:z.number().min(0),reward_minimum_order:z.number().min(0),reward_validity_days:z.number().int().min(1).max(3650)
}).superRefine((value,context)=>{
  if(value.reward_type!=='free_delivery'&&value.reward_value<=0)context.addIssue({code:'custom',path:['reward_value'],message:'Informe um valor de recompensa maior que zero.'});
  if(value.reward_type==='percentage_discount'&&value.reward_value>100)context.addIssue({code:'custom',path:['reward_value'],message:'O percentual não pode ultrapassar 100%.'});
});
loyaltyRouter.put('/admin/loyalty/program',requireAuth,requireRoles('manager','peddi_admin'),blockPresentationDemoWrites,async(request:AuthRequest,response)=>{
  if(!authorization(request,response))return;
  const parsed=programSchema.safeParse(request.body);
  if(!parsed.success)return response.status(400).json({error:parsed.error.issues[0]?.message||'Configuração inválida.'});
  const value=parsed.data,client=await pool!.connect();
  try{
    const program=(await client.query(`INSERT INTO loyalty_programs(store_id,active,name,required_steps,minimum_order_total,
      reward_type,reward_value,reward_minimum_order,reward_validity_days)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT(store_id) DO UPDATE SET active=EXCLUDED.active,
      name=EXCLUDED.name,required_steps=EXCLUDED.required_steps,minimum_order_total=EXCLUDED.minimum_order_total,
      reward_type=EXCLUDED.reward_type,reward_value=EXCLUDED.reward_value,reward_minimum_order=EXCLUDED.reward_minimum_order,
      reward_validity_days=EXCLUDED.reward_validity_days,updated_at=now() RETURNING *`,[
      request.auth!.storeId,value.active,value.name,value.required_steps,value.minimum_order_total,value.reward_type,
      value.reward_value,value.reward_minimum_order,value.reward_validity_days
    ])).rows[0];
    response.json({program});
  }finally{client.release();}
});
