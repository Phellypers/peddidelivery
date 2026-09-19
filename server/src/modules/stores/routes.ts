import { Router } from 'express';
import { query } from '../../db/client.js';
import { productView } from '../products/routes.js';

export const storefrontRouter = Router();

storefrontRouter.get('/stores/:storeId/catalog', async (request, response) => {
  response.setHeader('Cache-Control','public, max-age=30, stale-while-revalidate=120');
  const store = await query('SELECT id, name, slug, active, details FROM stores WHERE id = $1 AND active = true', [request.params.storeId]);
  if (!store.rowCount) return response.status(404).json({ error: 'Estabelecimento nao encontrado.' });
  const [categories, products] = await Promise.all([
    query('SELECT id, name, details FROM categories WHERE store_id = $1 AND active = true ORDER BY name', [request.params.storeId]),
    query(`SELECT p.*, COALESCE(s.orders_count, 0) AS orders_count
      FROM products p
      LEFT JOIN (
        SELECT i.product_id, count(DISTINCT i.order_id) AS orders_count
        FROM order_items i JOIN orders o ON o.id = i.order_id
        WHERE o.store_id = $1 AND o.status <> 'cancelled'
        GROUP BY i.product_id
      ) s ON s.product_id = p.id
      WHERE p.store_id = $1 AND p.active = true AND p.deleted_at IS NULL
      AND COALESCE((p.details->>'is_paused')::boolean, false) = false ORDER BY p.name`, [request.params.storeId]),
  ]);
  const { details, ...storeFields } = store.rows[0];
  response.json({ store: { ...details,...storeFields }, categories: categories.rows.map(({details,...row})=>({...details,...row})), products: products.rows.map(row => ({ ...productView(row), categoryId: row.category_id, stockQuantity: Number(row.stock_quantity), orders_count: Number(row.orders_count) })) });
});

storefrontRouter.get('/stores', async (_request, response) => {
  response.setHeader('Cache-Control','public, max-age=30, stale-while-revalidate=120');
  const result = await query('SELECT id, name, slug, active, details FROM stores WHERE active = true ORDER BY name');
  response.json({ stores: result.rows.map(({ details,...store }) => ({ ...details,...store })) });
});
