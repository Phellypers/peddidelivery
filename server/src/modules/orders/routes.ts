import { Router } from 'express';
import { pool, query } from '../../db/client.js';
import { blockPresentationDemoWrites, requireAuth, requireRoles, type AuthRequest } from '../../auth/middleware.js';
import { syncDelivery } from '../deliveries/data.js';
import { readOrders, writeOrder } from '../demo/data.js';

export const orderRouter = Router();

orderRouter.post('/orders', requireAuth, blockPresentationDemoWrites, async (request: AuthRequest, response) => {
  if (!request.auth?.storeId || !['customer', 'manager', 'peddi_admin'].includes(request.auth.role)) return response.status(403).json({ error: 'Perfil sem permissao para pedidos.' });
  const items = Array.isArray(request.body?.items) ? request.body.items : [];
  if (!items.length) return response.status(400).json({ error: 'O pedido precisa de itens.' });
  const idempotencyKey=String(request.get('Idempotency-Key')||'');
  if(idempotencyKey.length<16||idempotencyKey.length>128)return response.status(428).json({error:'Informe uma chave de idempotência válida para criar o pedido.'});
  const client = await pool!.connect();
  try {
    await client.query('BEGIN');
    const reserved=await client.query(`INSERT INTO idempotency_keys(store_id,actor_key,endpoint,idempotency_key)
      VALUES($1,$2,'POST /orders',$3) ON CONFLICT DO NOTHING RETURNING idempotency_key`,[request.auth.storeId,request.auth.userId,idempotencyKey]);
    if(!reserved.rowCount){const previous=(await client.query(`SELECT response_status,response_body FROM idempotency_keys
      WHERE store_id=$1 AND actor_key=$2 AND endpoint='POST /orders' AND idempotency_key=$3 FOR UPDATE`,[request.auth.storeId,request.auth.userId,idempotencyKey])).rows[0];
      await client.query('COMMIT');return previous?.response_body?response.status(previous.response_status||201).json(previous.response_body):response.status(409).json({error:'Este pedido já está sendo processado.'});}
    request.localStoreId=request.auth.storeId;
    const address=request.body?.address||{};
    const savedId=await writeOrder(client,request.auth.storeId,{
      items:items.map((item:Record<string,unknown>)=>({product_id:item.productId||item.product_id,quantity:item.qty||item.quantity,variation:item.variation,addons:item.addons,custom_fields:item.customFields||item.custom_fields,notes:item.notes})),
      coupon_code:request.body?.couponCode||request.body?.coupon_code||'',
      customer_name:request.body?.customerName||request.body?.customer_name,
      customer_phone:request.body?.customerPhone||request.body?.customer_phone,
      customer_email:request.auth.email,
      customer_user_id:request.auth.userId,
      delivery_method:request.body?.deliveryMethod||request.body?.delivery_method||'delivery',
      delivery_address:address.address||address.street||request.body?.delivery_address,
      delivery_city:address.city||request.body?.delivery_city,
      delivery_neighborhood:address.neighborhood||request.body?.delivery_neighborhood,
      delivery_state:address.state||request.body?.delivery_state,
      delivery_zip:address.zip||address.postalCode||request.body?.delivery_zip,
      delivery_notes:request.body?.deliveryNotes||request.body?.delivery_notes,
      payment_method:request.body?.paymentMethod||request.body?.payment_method,
      split_payments:request.body?.splitPayments||request.body?.split_payments,
      sale_origin:'catalog',status:'pending',payment_status:'pending'
    },request);
    await syncDelivery(client,request.auth.storeId,savedId);
    const saved=(await readOrders(request.auth.storeId,client)).find(order=>order.id===savedId)!;
    const resultBody={order:saved};
    await client.query(`UPDATE idempotency_keys SET response_status=201,response_body=$4
      WHERE store_id=$1 AND actor_key=$2 AND endpoint='POST /orders' AND idempotency_key=$3`,[request.auth.storeId,request.auth.userId,idempotencyKey,JSON.stringify(resultBody)]);
    await client.query('COMMIT');
    response.status(201).json(resultBody);
  } catch (error) { await client.query('ROLLBACK'); response.status(400).json({ error: error instanceof Error ? error.message : 'Nao foi possivel criar o pedido.' }); } finally { client.release(); }
});

orderRouter.get('/orders', requireAuth, requireRoles('manager', 'peddi_admin', 'courier', 'customer'), async (request: AuthRequest, response) => {
  if (!request.auth?.storeId) return response.status(403).json({error:'Usuário sem loja.'});
  const params: unknown[] = []; let sql = 'SELECT id, store_id AS "storeId", status, subtotal, delivery_fee AS "deliveryFee", discount, total, created_at AS "createdAt" FROM orders WHERE 1=1';
  if (request.auth!.storeId) { params.push(request.auth!.storeId); sql += ` AND store_id = $${params.length}`; }
  if (request.auth!.role === 'customer') { const customer = await query<{ id: string }>('SELECT id FROM customers WHERE user_id = $1', [request.auth!.userId]); if (!customer.rowCount) return response.json({ orders: [] }); params.push(customer.rows[0].id); sql += ` AND customer_id = $${params.length}`; }
  if (request.auth!.role === 'courier') { params.push(request.auth!.userId);sql += ` AND courier_id IN (SELECT id FROM couriers WHERE user_id=$${params.length})`; }
  const limit=Math.min(200,Math.max(1,Number(request.query.limit)||100));
  const offset=Math.max(0,Number(request.query.offset)||0);
  params.push(limit,offset);sql += ` ORDER BY created_at DESC LIMIT $${params.length-1} OFFSET $${params.length}`;
  const result = await query(sql, params); response.json({ orders: result.rows });
});
