import { Router } from 'express';
import { pool, query } from '../../db/client.js';
import { blockPresentationDemoWrites, requireAuth, requireRoles, type AuthRequest } from '../../auth/middleware.js';
import { syncDelivery } from '../deliveries/data.js';

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
    const productIds = items.map((item: { productId: string }) => item.productId);
    const products = await client.query<{ id: string; name: string; price: string; stock_quantity: string }>('SELECT id, name, price, stock_quantity FROM products WHERE store_id = $1 AND id = ANY($2::uuid[]) AND active = true FOR UPDATE', [request.auth.storeId, productIds]);
    const productMap = new Map(products.rows.map(product => [product.id, product]));
    let subtotal = 0;
    const normalized = items.map((item: { productId: string; quantity: number }) => {
      const product = productMap.get(item.productId); const quantity = Number(item.quantity);
      if (!product || !Number.isFinite(quantity) || quantity <= 0 || Number(product.stock_quantity) < quantity) throw new Error('Produto inexistente ou estoque insuficiente.');
      const lineSubtotal = Number(product.price) * quantity; subtotal += lineSubtotal;
      return { product, quantity, lineSubtotal };
    });
    const deliveryFee = Number(request.body?.deliveryFee ?? 0); const discount = Math.max(0, Number(request.body?.discount ?? 0)); const total = Math.max(0, subtotal + deliveryFee - discount);
    const customer = await client.query<{ id: string }>('SELECT id FROM customers WHERE user_id = $1', [request.auth.userId]);
    let customerId = customer.rows[0]?.id;
    if (!customerId) { const created = await client.query<{ id: string }>('INSERT INTO customers (user_id) VALUES ($1) RETURNING id', [request.auth.userId]); customerId = created.rows[0].id; }
    const order = await client.query<{ id: string }>('INSERT INTO orders (store_id, customer_id, subtotal, delivery_fee, discount, total, address) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id', [request.auth.storeId, customerId, subtotal, deliveryFee, discount, total, request.body?.address ?? {}]);
    for (const item of normalized) {
      await client.query('INSERT INTO order_items (order_id, product_id, product_name, unit_price, quantity, subtotal) VALUES ($1, $2, $3, $4, $5, $6)', [order.rows[0].id, item.product.id, item.product.name, item.product.price, item.quantity, item.lineSubtotal]);
      await client.query('UPDATE products SET stock_quantity = stock_quantity - $1 WHERE id = $2', [item.quantity, item.product.id]);
    }
    await syncDelivery(client,request.auth.storeId,order.rows[0].id);
    const resultBody={ order: { id: order.rows[0].id, subtotal, deliveryFee, discount, total, status: 'pending' } };
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
