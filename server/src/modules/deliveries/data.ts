import type { PoolClient } from 'pg';
import { z } from 'zod';

export async function syncDelivery(client:PoolClient,tenant:string,orderId:string) {
  const order=(await client.query('SELECT * FROM orders WHERE store_id=$1 AND id=$2',[tenant,orderId])).rows[0];
  if (!order) throw new Error('Pedido não encontrado.');
  const assigned=order.details.deliverer_user_id;
  let courierId:string|null=null;
  if (assigned) {
    if (!z.string().uuid().safeParse(assigned).success) throw new Error('Entregador inválido.');
    const courier=await client.query("SELECT c.id FROM couriers c JOIN users u ON u.id=c.user_id WHERE c.store_id=$1 AND c.user_id=$2 AND ((u.active=true AND COALESCE(c.details->>'is_active','true')='true' AND COALESCE(c.details->>'deleted','false')<>'true') OR (c.id=$3 AND $4 IN ('delivered','cancelled')))",[tenant,assigned,order.courier_id,order.status]);
    if (!courier.rowCount) throw new Error('Entregador não está ativo nesta loja.');
    courierId=courier.rows[0].id;
  }
  const delivery=(order.details.delivery_method||'delivery')==='delivery';
  if (!delivery) courierId=null;
  await client.query('UPDATE orders SET courier_id=$3 WHERE store_id=$1 AND id=$2',[tenant,orderId,courierId]);
  if (!delivery) {
    await client.query("UPDATE deliveries SET courier_id=null,status='cancelled',updated_at=now() WHERE store_id=$1 AND order_id=$2",[tenant,orderId]);
    return;
  }
  const status=order.status==='cancelled'?'cancelled':order.status==='delivered'?'delivered'
    :order.status==='out_for_delivery'?'out_for_delivery':courierId?(order.details.deliverer_accepted===true?'accepted':'assigned'):'pending';
  await client.query(`INSERT INTO deliveries(store_id,order_id,courier_id,status,assigned_at,accepted_at,picked_up_at,delivered_at)
    VALUES($1,$2,$3,$4,CASE WHEN $3::uuid IS NOT NULL THEN now() END,
      CASE WHEN $4 IN ('accepted','out_for_delivery','delivered') THEN now() END,
      CASE WHEN $4 IN ('out_for_delivery','delivered') THEN now() END,CASE WHEN $4='delivered' THEN now() END)
    ON CONFLICT(order_id) DO UPDATE SET courier_id=EXCLUDED.courier_id,status=EXCLUDED.status,
      assigned_at=CASE WHEN deliveries.courier_id IS DISTINCT FROM EXCLUDED.courier_id THEN EXCLUDED.assigned_at ELSE COALESCE(deliveries.assigned_at,EXCLUDED.assigned_at) END,
      accepted_at=CASE WHEN deliveries.courier_id IS DISTINCT FROM EXCLUDED.courier_id THEN EXCLUDED.accepted_at ELSE COALESCE(deliveries.accepted_at,EXCLUDED.accepted_at) END,
      picked_up_at=CASE WHEN deliveries.courier_id IS DISTINCT FROM EXCLUDED.courier_id THEN EXCLUDED.picked_up_at ELSE COALESCE(deliveries.picked_up_at,EXCLUDED.picked_up_at) END,
      delivered_at=COALESCE(deliveries.delivered_at,EXCLUDED.delivered_at),updated_at=now()`,[tenant,orderId,courierId,status]);
}
