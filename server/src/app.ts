import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import { env } from './config/env.js';
import { pool, query } from './db/client.js';
import { createAccessToken, createRefreshToken, hashToken } from './auth/tokens.js';
import { blockPresentationDemoWrites, requireAuth, requireRoles, type AuthRequest } from './auth/middleware.js';
import { catalogRouter, productView } from './modules/products/routes.js';
import { demoRouter, uploadPath } from './modules/demo/routes.js';
import { courierRouter } from './modules/couriers/routes.js';
import { syncDelivery } from './modules/deliveries/data.js';

export const app = express();
const clientOrigins = [env.clientOrigin];
if (process.env.NODE_ENV !== 'production') {
  const localOrigin = new URL(env.clientOrigin);
  if (['localhost', '127.0.0.1'].includes(localOrigin.hostname)) {
    localOrigin.hostname = localOrigin.hostname === 'localhost' ? '127.0.0.1' : 'localhost';
    clientOrigins.push(localOrigin.origin);
  }
}
app.use(cors({ origin: clientOrigins }));
app.use(express.json({ limit: '1mb' }));
app.use('/api/v1/admin', catalogRouter);
app.use('/api/v1',courierRouter);
app.use('/api/v1/demo', demoRouter);
app.use('/uploads', express.static(uploadPath, { dotfiles:'deny' }));

app.get('/health', async (_request, response) => {
  let database: 'connected' | 'not_configured' | 'unavailable' = 'not_configured';
  if (pool) {
    try { await query('SELECT 1'); database = 'connected'; } catch { database = 'unavailable'; }
  }
  response.status(database === 'unavailable' ? 503 : 200).json({ status: database === 'connected' ? 'ok' : 'degraded', service: 'peddi-api', database, demoMode: env.demoMode });
});

app.post('/api/v1/auth/login', async (request, response) => {
  const { email, password } = request.body ?? {};
  if (!email || !password) return response.status(400).json({ error: 'Email e senha sao obrigatorios.' });
  const result = await query<{ id: string; email: string; name: string; role: string; business_id: string | null; store_id: string | null; password_hash: string }>('SELECT id, email, name, role, business_id, store_id, password_hash FROM users WHERE email = $1 AND active = true', [String(email).trim().toLowerCase()]);
  const user = result.rows[0];
  if (!user || !(await bcrypt.compare(String(password), user.password_hash))) return response.status(401).json({ error: 'Credenciais invalidas.' });
  const authUser = { id: user.id, email: user.email, name: user.name, role: user.role, businessId: user.business_id, storeId: user.store_id };
  const refreshToken = createRefreshToken();
  await query(`INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, CASE WHEN $3 THEN 'infinity'::timestamptz ELSE now() + interval '30 days' END)`, [user.id, hashToken(refreshToken), env.demoMode && user.email === 'gestor.demo@peddi.local' && user.role === 'manager']);
  response.json({ accessToken: createAccessToken(authUser), refreshToken, user: authUser });
});

app.post('/api/v1/auth/refresh', async (request, response) => {
  const token = String(request.body?.refreshToken ?? '');
  const result = await query<{ id: string; email: string; name: string; role: string; business_id: string | null; store_id: string | null }>(`SELECT u.id, u.email, u.name, u.role, u.business_id, u.store_id FROM refresh_tokens r JOIN users u ON u.id = r.user_id WHERE r.token_hash = $1 AND r.revoked_at IS NULL AND r.expires_at > now()`, [hashToken(token)]);
  const user = result.rows[0];
  if (!user) return response.status(401).json({ error: 'Refresh token invalido.' });
  response.json({ accessToken: createAccessToken({ id: user.id, email: user.email, name: user.name, role: user.role, businessId: user.business_id, storeId: user.store_id }) });
});

app.get('/api/v1/me', requireAuth, async (request: AuthRequest, response) => {
  const result = await query('SELECT id, email, name, role, business_id AS "businessId", store_id AS "storeId" FROM users WHERE id = $1', [request.auth!.userId]);
  response.json({ user: { ...result.rows[0], ...(request.auth?.demoMode ? { demoMode: request.auth.demoMode } : {}) } });
});

app.get('/api/v1/stores/:storeId/catalog', async (request, response) => {
  const store = await query('SELECT id, name, slug, active, details FROM stores WHERE id = $1 AND active = true', [request.params.storeId]);
  if (!store.rowCount) return response.status(404).json({ error: 'Estabelecimento nao encontrado.' });
  const [categories, products] = await Promise.all([
    query('SELECT id, name, details FROM categories WHERE store_id = $1 AND active = true ORDER BY name', [request.params.storeId]),
    query("SELECT * FROM products WHERE store_id = $1 AND active = true AND deleted_at IS NULL AND COALESCE((details->>'is_paused')::boolean, false) = false ORDER BY name", [request.params.storeId]),
  ]);
  const { details, ...storeFields } = store.rows[0];
  response.json({ store: { ...details,...storeFields }, categories: categories.rows.map(({details,...row})=>({...details,...row})), products: products.rows.map(row => ({ ...productView(row), categoryId: row.category_id, stockQuantity: Number(row.stock_quantity) })) });
});

app.get('/api/v1/stores', async (_request, response) => {
  const result = await query('SELECT id, name, slug, active, details FROM stores WHERE active = true ORDER BY name');
  response.json({ stores: result.rows.map(({ details,...store }) => ({ ...details,...store })) });
});

app.post('/api/v1/orders', requireAuth, blockPresentationDemoWrites, async (request: AuthRequest, response) => {
  if (!request.auth?.storeId || !['customer', 'manager', 'peddi_admin'].includes(request.auth.role)) return response.status(403).json({ error: 'Perfil sem permissao para pedidos.' });
  const items = Array.isArray(request.body?.items) ? request.body.items : [];
  if (!items.length) return response.status(400).json({ error: 'O pedido precisa de itens.' });
  const client = await pool!.connect();
  try {
    await client.query('BEGIN');
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
    await client.query('COMMIT');
    response.status(201).json({ order: { id: order.rows[0].id, subtotal, deliveryFee, discount, total, status: 'pending' } });
  } catch (error) { await client.query('ROLLBACK'); response.status(400).json({ error: error instanceof Error ? error.message : 'Nao foi possivel criar o pedido.' }); } finally { client.release(); }
});

app.get('/api/v1/orders', requireAuth, requireRoles('manager', 'peddi_admin', 'courier', 'customer'), async (request: AuthRequest, response) => {
  if (!request.auth?.storeId) return response.status(403).json({error:'Usuário sem loja.'});
  const params: unknown[] = []; let sql = 'SELECT id, store_id AS "storeId", status, subtotal, delivery_fee AS "deliveryFee", discount, total, created_at AS "createdAt" FROM orders WHERE 1=1';
  if (request.auth!.storeId) { params.push(request.auth!.storeId); sql += ` AND store_id = $${params.length}`; }
  if (request.auth!.role === 'customer') { const customer = await query<{ id: string }>('SELECT id FROM customers WHERE user_id = $1', [request.auth!.userId]); if (!customer.rowCount) return response.json({ orders: [] }); params.push(customer.rows[0].id); sql += ` AND customer_id = $${params.length}`; }
  if (request.auth!.role === 'courier') { params.push(request.auth!.userId);sql += ` AND courier_id IN (SELECT id FROM couriers WHERE user_id=$${params.length})`; }
  sql += ' ORDER BY created_at DESC';
  const result = await query(sql, params); response.json({ orders: result.rows });
});

app.use((error: unknown, _request: express.Request, response: express.Response, _next: express.NextFunction) => { console.error(error); response.status(500).json({ error: 'Erro interno da API.' }); });
