import { Router } from 'express';
import { z } from 'zod';
import { query } from '../../db/client.js';
import { requireAuth, requireRoles, type AuthRequest } from '../../auth/middleware.js';

export const catalogRouter = Router();
catalogRouter.use(requireAuth, requireRoles('manager', 'peddi_admin'));
catalogRouter.use((request: AuthRequest, response, next) => {
  if (!request.auth?.storeId) return response.status(403).json({ error: 'Usuário sem loja.' });
  next();
});

const number = z.coerce.number().finite().nonnegative();
const daySchedule = z.object({ enabled: z.boolean(),
  start: z.string().regex(/^$|^([01]\d|2[0-3]):[0-5]\d$/),
  end: z.string().regex(/^$|^([01]\d|2[0-3]):[0-5]\d$/),
}).refine(day => !day.enabled || (!day.start && !day.end) || (Boolean(day.start && day.end) && day.start !== day.end));
const weeklySchedule = z.object({ seg: daySchedule, ter: daySchedule, qua: daySchedule,
  qui: daySchedule, sex: daySchedule, sab: daySchedule, dom: daySchedule });
const productSchema = z.object({
  name: z.string().trim().min(1), description: z.string().nullable().optional(),
  price: number, cost: number, stock: number,
  category_ids: z.array(z.string().uuid()).default([]),
  is_published: z.boolean().default(true), is_paused: z.boolean().default(false),
  promo_price: number.nullable().optional(),
  availability_by_day: weeklySchedule.optional(),
  recipe: z.array(z.object({ ingredient_id: z.string().uuid(), quantity: number.positive(),
    unit: z.enum(['unidade', 'pacote', 'grama', 'quilo', 'ml', 'litro']),
    ingredient_name: z.string().optional() })).default([]),
}).passthrough();
const ingredientSchema = z.object({
  name: z.string().trim().min(1),
  unit: z.enum(['unidade', 'pacote', 'grama', 'quilo', 'ml', 'litro']),
  pack_size: number.positive(), quantity_purchased: number, cost: number,
  current_stock: number, stock_min: number,
  movements: z.array(z.object({ type: z.enum(['entry', 'exit']), quantity: number.positive(),
    cost: number.default(0), date: z.string(), reason: z.string() })).default([]),
}).passthrough();

export function productView(row: Record<string, any>) {
  return { ...row.details, id: row.id, name: row.name, description: row.description ?? '',
    price: Number(row.price), cost: Number(row.cost), stock: Number(row.stock_quantity),
    category_ids: row.details?.category_ids ?? (row.category_id ? [row.category_id] : []),
    is_published: row.active, created_date: row.created_at };
}

catalogRouter.get('/catalog', async (request: AuthRequest, response) => {
  const storeId = request.auth!.storeId;
  const [products, categories] = await Promise.all([
    query('SELECT * FROM products WHERE store_id = $1 AND deleted_at IS NULL ORDER BY created_at DESC', [storeId]),
    query("SELECT id, name FROM categories WHERE store_id = $1 AND active = true AND COALESCE((details->>'deleted')::boolean,false)=false ORDER BY name", [storeId]),
  ]);
  response.json({ products: products.rows.map(productView), categories: categories.rows });
});

catalogRouter.get('/reports', async (request: AuthRequest, response) => {
  const result = await query(`SELECT o.*, u.name AS customer_name, u.email AS customer_email,
    COALESCE((SELECT jsonb_agg(jsonb_build_object('product_id', i.product_id,
      'product_name', i.product_name, 'unit_price', i.unit_price, 'quantity', i.quantity,
      'subtotal', i.subtotal)) FROM order_items i WHERE i.order_id=o.id), '[]'::jsonb) AS items
    FROM orders o JOIN customers c ON c.id=o.customer_id JOIN users u ON u.id=c.user_id
    WHERE o.store_id=$1 ORDER BY o.created_at DESC`, [request.auth!.storeId]);
  response.json({ orders: result.rows.map(row => ({ ...row, total: Number(row.total),
    subtotal: Number(row.subtotal), delivery_fee: Number(row.delivery_fee), discount: Number(row.discount),
    created_date: row.created_at, delivery_city: row.address?.city })) });
});

async function saveProduct(request: AuthRequest, response: import('express').Response) {
  const storeId = request.auth!.storeId;
  let previous: Record<string, any> = {};
  if (request.method === 'PATCH') {
    if (!z.string().uuid().safeParse(request.params.id).success) return response.status(400).json({ error: 'Produto inválido.' });
    const found = await query('SELECT * FROM products WHERE id = $1 AND store_id = $2 AND deleted_at IS NULL', [request.params.id, storeId]);
    if (!found.rowCount) return response.status(404).json({ error: 'Produto não encontrado.' });
    previous = productView(found.rows[0]);
  }
  const parsed = productSchema.safeParse({ ...previous, ...request.body });
  if (!parsed.success) return response.status(400).json({ error: parsed.error.issues.some(issue => issue.path[0] === 'availability_by_day')
    ? 'Revise os horários: preencha início e fim de cada dia ativo, ou deixe ambos vazios para o dia todo.'
    : 'Revise nome, preços, estoque e insumos da ficha técnica.' });
  const data = parsed.data;
  if (data.availability_by_day) {
    data.available_days = Object.entries(data.availability_by_day).filter(([, day]) => day.enabled).map(([day]) => day);
    data.availability_start = '';
    data.availability_end = '';
  }
  const categories = await query('SELECT id FROM categories WHERE store_id = $1 AND id = ANY($2::uuid[]) AND active = true', [storeId, data.category_ids]);
  if (new Set(data.category_ids).size !== categories.rowCount) return response.status(400).json({ error: 'Categoria não pertence à loja.' });
  if (data.recipe.length) {
    const result = await query('SELECT id, details FROM ingredients WHERE store_id = $1 AND id = ANY($2::uuid[])', [storeId, data.recipe.map(item => item.ingredient_id)]);
    const map = new Map(result.rows.map(row => [row.id, row.details]));
    let cost = 0;
    const baseUnit = (unit: string) => ['grama', 'quilo'].includes(unit) ? 'g' : ['ml', 'litro'].includes(unit) ? 'ml' : 'un';
    const factor = (unit: string, pack: number) => unit === 'pacote' ? pack : ['quilo', 'litro'].includes(unit) ? 1000 : 1;
    for (const item of data.recipe) {
      const ingredient = map.get(item.ingredient_id);
      if (!ingredient || baseUnit(item.unit) !== baseUnit(ingredient.unit) || !(ingredient.quantity_purchased > 0)) {
        return response.status(400).json({ error: 'Insumo inválido, sem quantidade comprada ou com unidade incompatível.' });
      }
      item.ingredient_name = ingredient.name;
      cost += ingredient.cost / (ingredient.quantity_purchased * factor(ingredient.unit, ingredient.pack_size)) * item.quantity * factor(item.unit, ingredient.pack_size);
    }
    data.cost = Math.round(cost * 100) / 100;
  }
  const { id: _id, created_date: _date, store_id: _store, ...details } = data;
  const values = [storeId, data.name, data.description ?? '', data.category_ids[0] ?? null, data.price, data.cost, data.stock, data.is_published, JSON.stringify(details)];
  const result = request.method === 'POST'
    ? await query('INSERT INTO products (store_id,name,description,category_id,price,cost,stock_quantity,active,details) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *', values)
    : await query('UPDATE products SET name=$2,description=$3,category_id=$4,price=$5,cost=$6,stock_quantity=$7,active=$8,details=$9 WHERE store_id=$1 AND id=$10 AND deleted_at IS NULL RETURNING *', [...values, request.params.id]);
  response.status(request.method === 'POST' ? 201 : 200).json({ product: productView(result.rows[0]) });
}
catalogRouter.post('/products', saveProduct);
catalogRouter.patch('/products/:id', saveProduct);
catalogRouter.delete('/products/:id', async (request: AuthRequest, response) => {
  if (!z.string().uuid().safeParse(request.params.id).success) return response.status(400).json({ error: 'Produto inválido.' });
  const result = await query('UPDATE products SET active=false,deleted_at=now() WHERE id=$1 AND store_id=$2 AND deleted_at IS NULL RETURNING id', [request.params.id, request.auth!.storeId]);
  if (!result.rowCount) return response.status(404).json({ error: 'Produto não encontrado.' });
  response.sendStatus(204);
});

catalogRouter.get('/ingredients', async (request: AuthRequest, response) => {
  const result = await query("SELECT id,details FROM ingredients WHERE store_id=$1 ORDER BY details->>'name'", [request.auth!.storeId]);
  response.json({ ingredients: result.rows.map(row => ({ ...row.details, id: row.id })) });
});
async function saveIngredient(request: AuthRequest, response: import('express').Response) {
  let previous = {};
  if (request.method === 'PATCH') {
    if (!z.string().uuid().safeParse(request.params.id).success) return response.status(400).json({ error: 'Insumo inválido.' });
    const found = await query('SELECT details FROM ingredients WHERE id=$1 AND store_id=$2', [request.params.id, request.auth!.storeId]);
    if (!found.rowCount) return response.status(404).json({ error: 'Insumo não encontrado.' });
    previous = found.rows[0].details;
  }
  const parsed = ingredientSchema.safeParse({ ...previous, ...request.body });
  if (!parsed.success) return response.status(400).json({ error: 'Revise nome, unidade, quantidades e custo do insumo.' });
  const { id: _id, ...details } = parsed.data;
  const result = request.method === 'POST'
    ? await query('INSERT INTO ingredients (store_id,details) VALUES ($1,$2) RETURNING id,details', [request.auth!.storeId, JSON.stringify(details)])
    : await query('UPDATE ingredients SET details=$3 WHERE id=$1 AND store_id=$2 RETURNING id,details', [request.params.id, request.auth!.storeId, JSON.stringify(details)]);
  response.status(request.method === 'POST' ? 201 : 200).json({ ingredient: { ...result.rows[0].details, id: result.rows[0].id } });
}
catalogRouter.post('/ingredients', saveIngredient);
catalogRouter.patch('/ingredients/:id', saveIngredient);
catalogRouter.delete('/ingredients/:id', async (request: AuthRequest, response) => {
  if (!z.string().uuid().safeParse(request.params.id).success) return response.status(400).json({ error: 'Insumo inválido.' });
  const linked = await query("SELECT id FROM products WHERE store_id=$1 AND deleted_at IS NULL AND details->'recipe' @> $2::jsonb", [request.auth!.storeId, JSON.stringify([{ ingredient_id: request.params.id }])]);
  if (linked.rowCount) return response.status(409).json({ error: 'Insumo vinculado a uma ficha técnica. Remova o vínculo antes de excluir.' });
  const result = await query('DELETE FROM ingredients WHERE id=$1 AND store_id=$2 RETURNING id', [request.params.id, request.auth!.storeId]);
  if (!result.rowCount) return response.status(404).json({ error: 'Insumo não encontrado.' });
  response.sendStatus(204);
});
