import { Router } from 'express';
import { z } from 'zod';
import { blockPresentationDemoWrites, requireAuth, requireRoles, type AuthRequest } from '../../auth/middleware.js';
import { query, pool } from '../../db/client.js';
import { archiveCourier, courierView, saveCourier } from './data.js';

export const courierRouter=Router();
const managers=[requireAuth,requireRoles('manager','peddi_admin'),blockPresentationDemoWrites];
courierRouter.get('/admin/couriers',...managers,async(request:AuthRequest,response)=>{
  if (!request.auth?.storeId) return response.status(403).json({error:'Usuário sem loja.'});
  const rows=await query("SELECT * FROM couriers WHERE store_id=$1 AND COALESCE(details->>'deleted','false')<>'true' ORDER BY created_at DESC",[request.auth.storeId]);
  response.json({couriers:rows.rows.map(courierView)});
});
async function save(request:AuthRequest,response:import('express').Response){
  if (!request.auth?.storeId) return response.status(403).json({error:'Usuário sem loja.'});
  const id=request.params.id as string|undefined;
  if (id&&!z.string().uuid().safeParse(id).success) return response.status(400).json({error:'Entregador inválido.'});
  if (!request.body || typeof request.body!=='object' || Array.isArray(request.body)) return response.status(400).json({error:'Dados inválidos.'});
  let previous={};
  if (id) {
    const row=await query("SELECT * FROM couriers WHERE store_id=$1 AND id=$2 AND COALESCE(details->>'deleted','false')<>'true'",[request.auth.storeId,id]);
    if (!row.rowCount) return response.status(404).json({error:'Entregador não encontrado.'});
    previous=courierView(row.rows[0]);
  }
  try {response.status(id?200:201).json({courier:await saveCourier(pool!,request.auth.storeId,{is_active:true,...previous,...request.body},id)});}
  catch {response.status(400).json({error:'Revise os dados e a conta do entregador da loja.'});}
}
courierRouter.post('/admin/couriers',...managers,save);
courierRouter.patch('/admin/couriers/:id',...managers,save);
courierRouter.delete('/admin/couriers/:id',...managers,async(request:AuthRequest,response)=>{
  if (!request.auth?.storeId) return response.status(403).json({error:'Usuário sem loja.'});
  if (!z.string().uuid().safeParse(request.params.id).success) return response.status(400).json({error:'Entregador inválido.'});
  const found=await query('SELECT id FROM couriers WHERE id=$1 AND store_id=$2',[request.params.id,request.auth.storeId]);
  if (!found.rowCount) return response.status(404).json({error:'Entregador não encontrado.'});
  await archiveCourier(pool!,request.auth.storeId,request.params.id as string);
  response.sendStatus(204);
});
courierRouter.get('/couriers/me',requireAuth,requireRoles('courier'),async(request:AuthRequest,response)=>{
  const result=await query("SELECT * FROM couriers WHERE store_id=$1 AND user_id=$2 AND COALESCE(details->>'deleted','false')<>'true'",[request.auth!.storeId,request.auth!.userId]);
  response.json({courier:result.rows[0]?courierView(result.rows[0]):null});
});
courierRouter.get('/deliveries',requireAuth,requireRoles('manager','peddi_admin','courier','customer'),async(request:AuthRequest,response)=>{
  if (!request.auth?.storeId) return response.status(403).json({error:'Usuário sem loja.'});
  const auth=request.auth;
  const result=await query(`SELECT d.* FROM deliveries d JOIN orders o ON o.id=d.order_id
    LEFT JOIN couriers r ON r.id=d.courier_id LEFT JOIN customers c ON c.id=o.customer_id
    WHERE d.store_id=$1 AND ($2 IN ('manager','peddi_admin') OR ($2='courier' AND r.user_id=$3)
      OR ($2='customer' AND (c.user_id=$3 OR o.details->>'customer_email'=$4))) ORDER BY d.created_at DESC`,[auth.storeId,auth.role,auth.userId,auth.email]);
  response.json({deliveries:result.rows});
});
