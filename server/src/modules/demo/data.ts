import fs from 'node:fs';
import path from 'node:path';
import type { PoolClient } from 'pg';
import { query } from '../../db/client.js';
import { productView } from '../products/routes.js';
import type { AuthRequest } from '../../auth/middleware.js';
import { isProductAvailable } from '../../../../src/lib/productAvailability.js';
import { courierView } from '../couriers/data.js';

export const entityNames = new Set(['Account','Campaign','CashbackRule','Category','ChatMessage','City','Coupon','CustomerProfile','Deliverer','DelivererRating','Ingredient','LiveSession','Notification','Order','Product','PromoMessage','ReactivationCampaign','Review','ReviewComment','Store','SupportTicket','Table','UpsellGroup','User']);
const schemaCache = new Map<string, Record<string, any>>();
export function defaults(entity: string) {
  if (!schemaCache.has(entity)) {
    const file = path.join(process.cwd(), 'src/config/entities', `${entity}.jsonc`);
    const schema = JSON.parse(fs.readFileSync(file, 'utf8'));
    const values: Record<string, any> = {};
    for (const [name, definition] of Object.entries(schema.properties) as [string, any][]) {
      if (definition.default !== undefined) values[name] = definition.default;
      else if (definition.type === 'array') values[name] = [];
      else if (definition.type === 'object') values[name] = {};
    }
    schemaCache.set(entity, values);
  }
  return structuredClone(schemaCache.get(entity)!);
}
export const isManager = (request: AuthRequest) => ['manager','peddi_admin'].includes(request.auth?.role ?? '');
export const storeId = (request: AuthRequest) => request.localStoreId!;
export function recordView(row: Record<string, any>) {
  return { ...defaults(row.entity_name), ...row.data, id: row.id, created_date: row.created_at, updated_date: row.updated_at };
}
export function matches(value: Record<string, any>, filter: Record<string, any>) {
  return Object.entries(filter).every(([key, expected]) => {
    const actual = value[key];
    if (expected && typeof expected === 'object' && !Array.isArray(expected)) {
      return Object.entries(expected).every(([operator, compare]) => {
        switch (operator) {
          case '$in': return Array.isArray(compare) && compare.includes(actual);
          case '$nin': return Array.isArray(compare) && !compare.includes(actual);
          case '$ne': return actual !== compare;
          case '$gte': return actual >= (compare as any);
          case '$gt': return actual > (compare as any);
          case '$lte': return actual <= (compare as any);
          case '$lt': return actual < (compare as any);
          case '$exists': return compare ? actual !== undefined && actual !== null : actual === undefined || actual === null;
          default: return false;
        }
      });
    }
    return Array.isArray(actual) && !Array.isArray(expected) ? actual.includes(expected) : actual === expected;
  });
}
export async function readOrders(tenant: string) {
  const result = await query(`SELECT o.*,r.user_id AS deliverer_user_id, COALESCE(o.details->>'customer_name',c.guest_details->>'name',u.name) AS customer_name,
    COALESCE(o.details->>'customer_email',c.guest_details->>'email',u.email) AS customer_email,
    COALESCE((SELECT jsonb_agg(i.details || jsonb_build_object('product_id',i.product_id,'product_name',i.product_name,
      'unit_price',i.unit_price,'quantity',i.quantity,'subtotal',i.subtotal) ORDER BY i.id) FROM order_items i WHERE i.order_id=o.id),'[]'::jsonb) AS items
    FROM orders o JOIN customers c ON c.id=o.customer_id LEFT JOIN users u ON u.id=c.user_id LEFT JOIN couriers r ON r.id=o.courier_id
    WHERE o.store_id=$1 ORDER BY o.created_at DESC`, [tenant]);
  return result.rows.map(row => ({ ...defaults('Order'), ...row.details, id: row.id, order_number: row.details.order_number || row.id.slice(0,8),
    customer_name: row.customer_name, customer_email: row.customer_email, items: row.items,
    courier_id:row.courier_id,deliverer_user_id:row.deliverer_user_id||'',
    status: row.status === 'out_for_delivery' ? 'shipped' : row.status,
    subtotal: Number(row.subtotal), total: Number(row.total), discount: Number(row.discount), delivery_fee: Number(row.delivery_fee),
    created_date: row.created_at, updated_date: row.updated_at }));
}
export async function readEntities(entity: string, request: AuthRequest) {
  const tenant = storeId(request);
  const manager = isManager(request);
  switch (entity) {
    case 'Product': {
      const result = await query('SELECT * FROM products WHERE store_id=$1 AND deleted_at IS NULL', [tenant]);
      return result.rows.filter(row => manager || (row.active && !row.details.is_paused)).map(row => ({ ...defaults(entity), ...productView(row) }));
    }
    case 'Category': {
      const result = await query('SELECT * FROM categories WHERE store_id=$1', [tenant]);
      return result.rows.filter(row => !row.details.deleted && (manager || row.active)).map(row => ({ ...defaults(entity), ...row.details, id: row.id, name: row.name, is_active: row.active, created_date: row.created_at }));
    }
    case 'Store': {
      const result = await query('SELECT * FROM stores WHERE id=$1', [tenant]);
      return result.rows.map(row => ({ ...defaults(entity), delivery_enabled:true,pickup_enabled:true,pix_enabled:true,card_enabled:true,cash_enabled:true,
        primary_color:'#F97316', business_type:'menu', ...row.details, id: row.id,name:row.name,slug:row.slug,created_date:row.created_at }));
    }
    case 'Ingredient': {
      if (!manager) return [];
      const result = await query('SELECT * FROM ingredients WHERE store_id=$1', [tenant]);
      return result.rows.map(row => ({ ...defaults(entity), ...row.details, id:row.id,created_date:row.created_at }));
    }
    case 'Deliverer': {
      const result=await query("SELECT * FROM couriers WHERE store_id=$1 AND COALESCE(details->>'deleted','false')<>'true'",[tenant]);
      const assigned=manager?new Set<string>():new Set((await readOrders(tenant)).filter(order=>order.customer_email===request.auth?.email).map(order=>order.courier_id));
      return result.rows.filter(row=>manager||row.user_id===request.auth?.userId||(!row.user_id&&row.details.email===request.auth?.email)||assigned.has(row.id))
        .map(row=>{const view={...defaults(entity),...courierView(row)};
          return !manager&&request.auth?.role==='customer'?{id:view.id,user_id:view.user_id,name:view.name,vehicle:view.vehicle,photo_url:view.photo_url}:view;});
    }
    case 'Order': {
      const orders = await readOrders(tenant);
      return manager ? orders : orders.filter(row => request.auth ? row.customer_email === request.auth.email || row.deliverer_user_id === request.auth.userId : Boolean(request.headers['x-peddi-visitor']) && row.visitor_id === request.headers['x-peddi-visitor']);
    }
    case 'User': {
      if (!request.auth) return [];
      const result = await query('SELECT id,email,name,role,active FROM users WHERE store_id=$1', [tenant]);
      return result.rows.filter(row => manager || row.id === request.auth!.userId).map(row => ({ ...row,full_name:row.name }));
    }
    case 'CustomerProfile': {
      const result = await query(`SELECT a.* FROM app_records a
        WHERE a.entity_name='CustomerProfile' AND a.store_id=$1
          AND NOT EXISTS (SELECT 1 FROM couriers c WHERE c.store_id=$1
            AND (c.user_id=a.owner_id OR c.user_id::text=a.data->>'user_id'))`, [tenant]);
      return result.rows.filter(row => row.data.role !== 'courier' && row.data.user_role !== 'courier').map(recordView);
    }
    default: {
      const result = await query('SELECT * FROM app_records WHERE entity_name=$1 AND store_id=$2', [entity,tenant]);
      const ownConversations = new Set(result.rows.filter(row => request.auth ? row.owner_id === request.auth.userId : row.visitor_id === request.headers['x-peddi-visitor']).map(row => row.data.conversation_id));
      return result.rows.filter(row => {
        if (manager) return true;
        if (['City','Campaign','Coupon','PromoMessage','UpsellGroup','CashbackRule'].includes(entity)) return row.data.is_active !== false;
        if (entity === 'Review') return row.data.is_approved === true || row.owner_id === request.auth?.userId;
        if (entity === 'ReviewComment') return row.data.is_approved !== false || row.owner_id === request.auth?.userId;
        if (entity === 'Deliverer') return row.owner_id === request.auth?.userId || row.data.user_id === request.auth?.userId;
        if (entity === 'ChatMessage' && row.data.conversation_id) return ownConversations.has(row.data.conversation_id);
        return request.auth ? row.owner_id === request.auth.userId || row.data.user_id === request.auth.userId : row.visitor_id === request.headers['x-peddi-visitor'];
      }).map(recordView);
    }
  }
}

export async function writeOrder(client: PoolClient, tenant: string, data: Record<string, any>, request: AuthRequest, orderId?: string) {
  if (!Array.isArray(data.items) || !data.items.length) throw new Error('O pedido precisa de itens.');
  const quantityMap = new Map<string, number>();
  for (const item of data.items) {
    if (!item.product_id || !Number.isFinite(Number(item.quantity)) || Number(item.quantity) <= 0) throw new Error('Produto ou quantidade inválida.');
    quantityMap.set(item.product_id, (quantityMap.get(item.product_id) || 0) + Number(item.quantity));
  }
  const productResult = await client.query('SELECT * FROM products WHERE store_id=$1 AND id=ANY($2::uuid[]) AND deleted_at IS NULL FOR UPDATE', [tenant,[...quantityMap.keys()]]);
  const products = new Map(productResult.rows.map(row => [row.id,row]));
  const oldItems = orderId ? await client.query('SELECT product_id,quantity FROM order_items WHERE order_id=$1', [orderId]) : { rows:[] };
  const oldQuantity = new Map<string,number>();
  for (const item of oldItems.rows) oldQuantity.set(item.product_id,(oldQuantity.get(item.product_id)||0)+Number(item.quantity));
  for (const [id,quantity] of quantityMap) {
    const product = products.get(id);
    if (!product || (!isManager(request) && (!product.active || product.details.is_paused || !isProductAvailable(product.details))) || Number(product.stock_quantity)+(oldQuantity.get(id)||0)<quantity) throw new Error('Produto inexistente, indisponível ou estoque insuficiente.');
  }
  let subtotal=0;
  const normalized = data.items.map((item: Record<string, any>) => {
    const product=products.get(item.product_id)!;
    for (const field of product.details.custom_fields || []) {
      const value=item.custom_fields?.[field.label];
      if (field.required && !String(value ?? '').trim()) throw new Error(`Preencha ${field.label}.`);
      if (value !== undefined && value !== '' && ((field.type==='number' && !Number.isFinite(Number(value))) || (field.type==='select' && !field.options?.includes(value)))) throw new Error(`Resposta inválida para ${field.label}.`);
    }
    let price=Number(product.details.promo_price || product.price);
    if (price>Number(product.price)) price=Number(product.price);
    if (item.variation) {
      const labels=String(item.variation).split(',').map(label=>label.trim());
      for (const variation of product.details.variations || []) {
        const option=variation.options?.find((option: any)=>labels.includes(option.label));
        if (option) price+=Number(option.price_modifier)||0;
      }
    }
    for (const name of item.addons || []) {
      const addon=(product.details.addons || []).find((addon: any)=>addon.name === (typeof name==='string'?name:name.name));
      if (!addon) throw new Error('Complemento inválido.');
      price+=Number(addon.price)||0;
    }
    if (isManager(request) && Number.isFinite(Number(item.unit_price)) && Number(item.unit_price)>=0) price=Number(item.unit_price);
    price=Math.round(price*100)/100;
    const quantity=Number(item.quantity);
    subtotal+=price*quantity;
    return {...item,product_id:item.product_id,product_name:product.name,unit_price:price,quantity,subtotal:Math.round(price*quantity*100)/100};
  });
  subtotal=Math.round(subtotal*100)/100;
  const deliveryFee=Number(data.delivery_fee||0),discount=Number(data.discount||0);
  if (![deliveryFee,discount].every(n=>Number.isFinite(n)&&n>=0)) throw new Error('Frete ou desconto inválido.');
  const total=Math.max(0,Math.round((subtotal+deliveryFee-discount)*100)/100);
  const status=data.status==='shipped'?'out_for_delivery':data.status||'pending';
  if (!['pending','confirmed','preparing','ready','assigned','out_for_delivery','delivered','cancelled'].includes(status)) throw new Error('Status inválido.');
  let customerId;
  if (!orderId) {
    let customerUserId=request.auth&&!isManager(request)?request.auth.userId:null;
    if (isManager(request)&&data.customer_email) {
      customerUserId=(await client.query("SELECT id FROM users WHERE email=$1 AND store_id=$2 AND role='customer'",[data.customer_email,tenant])).rows[0]?.id||null;
    }
    const customer=customerUserId ? await client.query('SELECT id FROM customers WHERE user_id=$1',[customerUserId]) : {rows:[]};
    customerId=customer.rows[0]?.id;
    if (!customerId) {
      const created=await client.query('INSERT INTO customers (user_id,guest_details) VALUES ($1,$2) RETURNING id',[customerUserId,JSON.stringify({name:data.customer_name,email:data.customer_email,phone:data.customer_phone})]);
      customerId=created.rows[0].id;
    }
  }
  const details: Record<string,any>={...data,visitor_id:request.headers['x-peddi-visitor'],customer_email:request.auth && !isManager(request) ? request.auth.email : data.customer_email};
  delete details.id; delete details.items;
  const saved=orderId
    ? await client.query('UPDATE orders SET subtotal=$3,delivery_fee=$4,discount=$5,total=$6,status=$7,details=$8,updated_at=now() WHERE id=$1 AND store_id=$2 RETURNING id',[orderId,tenant,subtotal,deliveryFee,discount,total,status,JSON.stringify(details)])
    : await client.query('INSERT INTO orders(store_id,customer_id,subtotal,delivery_fee,discount,total,status,details) VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id',[tenant,customerId,subtotal,deliveryFee,discount,total,status,JSON.stringify(details)]);
  const id=saved.rows[0].id;
  if (orderId) {
    for (const [productId,quantity] of oldQuantity) await client.query('UPDATE products SET stock_quantity=stock_quantity+$2 WHERE id=$1',[productId,quantity]);
    await client.query('DELETE FROM order_items WHERE order_id=$1',[id]);
  }
  for (const item of normalized) {
    await client.query('INSERT INTO order_items(order_id,product_id,product_name,unit_price,quantity,subtotal,details) VALUES($1,$2,$3,$4,$5,$6,$7)',[id,item.product_id,item.product_name,item.unit_price,item.quantity,item.subtotal,JSON.stringify(item)]);
    await client.query('UPDATE products SET stock_quantity=stock_quantity-$2 WHERE id=$1',[item.product_id,item.quantity]);
  }
  return id;
}
