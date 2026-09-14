import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { app } from '../src/app.js';
import { query, closeDatabase } from '../src/db/client.js';
import { createAccessToken } from '../src/auth/tokens.js';

test('catálogo persiste ficha técnica e protege dados entre lojas', { skip: process.env.RUN_DATABASE_TESTS !== 'true' }, async () => {
  const business = await query("INSERT INTO businesses(name,slug) VALUES ('Teste catálogo',$1) RETURNING id", [`test-${crypto.randomUUID()}`]);
  const businessId = business.rows[0].id;
  const server = app.listen(0, '127.0.0.1');
  await new Promise<void>(resolve => server.once('listening', resolve));
  const address = server.address();
  assert.ok(address && typeof address === 'object');
  const url = `http://127.0.0.1:${address.port}`;
  try {
    const stores = await query("INSERT INTO stores(business_id,name,slug) VALUES ($1,'Teste A','a'),($1,'Teste B','b') RETURNING id", [businessId]);
    const [storeA, storeB] = stores.rows.map(row => row.id);
    const userId = crypto.randomUUID();
    const token = (storeId: string, role = 'manager') => createAccessToken({ id: userId, name: 'Teste', email: 'teste@peddi.local', role, businessId, storeId });
    const call = async (path: string, method = 'GET', data?: unknown, access = token(storeA)) => {
      const response = await fetch(`${url}/api/v1${path}`, { method,
        headers: { Authorization: `Bearer ${access}`, 'Content-Type': 'application/json' },
        body: data === undefined ? undefined : JSON.stringify(data) });
      return { status: response.status, body: response.status === 204 ? {} : await response.json() };
    };
    assert.equal((await call('/admin/catalog', 'GET', undefined, token(storeA, 'customer'))).status, 403);
    assert.equal((await fetch(`${url}/api/v1/admin/catalog`)).status, 401);
    const ingredient = await call('/admin/ingredients', 'POST', { name: 'Queijo', unit: 'quilo', pack_size: 1,
      quantity_purchased: 1, cost: 40, current_stock: 1, stock_min: 0, movements: [] });
    assert.equal(ingredient.status, 201);
    const ingredientId = ingredient.body.ingredient.id;
    const schedule = Object.fromEntries(['seg', 'ter', 'qua', 'qui', 'sex', 'sab', 'dom'].map(day => [day, { enabled: day !== 'dom', start: '', end: '' }]));
    schedule.seg = { enabled: true, start: '10:00', end: '14:00' };
    schedule.ter = { enabled: true, start: '18:00', end: '23:00' };
    schedule.sab = { enabled: true, start: '22:00', end: '02:00' };
    const created = await call('/admin/products', 'POST', { name: 'Produto integração', price: 20, cost: 999, stock: 0,
      images: ['https://example.com/image.png'], variations: [{ name: 'Tamanho', options: [{ label: 'P', price_modifier: 0 }] }],
      availability_by_day: schedule,
      recipe: [{ ingredient_id: ingredientId, quantity: 100, unit: 'grama' }] });
    assert.equal(created.status, 201);
    assert.equal(created.body.product.cost, 4);
    assert.equal(created.body.product.stock, 0);
    const productId = created.body.product.id;
    const persisted = await query('SELECT details,cost,stock_quantity FROM products WHERE id=$1', [productId]);
    assert.equal(persisted.rows[0].details.recipe[0].ingredient_id, ingredientId);
    assert.equal(Number(persisted.rows[0].cost), 4);
    assert.equal(persisted.rows[0].details.variations[0].name, 'Tamanho');
    assert.equal(persisted.rows[0].details.availability_by_day.seg.start, '10:00');
    assert.equal(persisted.rows[0].details.availability_by_day.ter.start, '18:00');
    assert.equal(persisted.rows[0].details.availability_by_day.sab.end, '02:00');
    assert.equal(persisted.rows[0].details.availability_by_day.dom.enabled, false);
    assert.ok(!persisted.rows[0].details.available_days.includes('dom'));
    assert.equal((await call(`/admin/products/${productId}`, 'PATCH', { availability_by_day: { ...schedule, seg: { enabled: true, start: '10:00', end: '' } } })).status, 400);
    assert.equal((await call(`/admin/products/${productId}`, 'PATCH', { availability_by_day: { ...schedule, seg: { enabled: true, start: '99:00', end: '12:00' } } })).status, 400);
    assert.equal((await call(`/admin/products/${productId}`, 'PATCH', { name: 'Outro' }, token(storeB))).status, 404);
    assert.equal((await call('/admin/catalog', 'GET', undefined, token(storeB))).body.products.length, 0);
    assert.equal((await call('/admin/products', 'POST', { name: 'Outra loja', price: 1, cost: 0, stock: 1,
      recipe: [{ ingredient_id: ingredientId, quantity: 1, unit: 'grama' }] }, token(storeB))).status, 400);
    const foreignCategory = await query("INSERT INTO categories(store_id,name) VALUES ($1,'Outra loja') RETURNING id", [storeB]);
    assert.equal((await call(`/admin/products/${productId}`, 'PATCH', { category_ids: [foreignCategory.rows[0].id] })).status, 400);
    assert.equal((await call(`/admin/products/${productId}`, 'PATCH', { stock: -1 })).status, 400);
    assert.equal((await call('/admin/products', 'POST', { name: 'Inválido', price: -1, cost: 0, stock: 0 })).status, 400);
    assert.equal((await call('/admin/products', 'POST', { name: 'Inválido', price: 1, cost: 0, stock: 1,
      recipe: [{ ingredient_id: ingredientId, quantity: 1, unit: 'litro' }] })).status, 400);
    assert.equal((await call(`/admin/ingredients/${ingredientId}`, 'DELETE')).status, 409);
    const updated = await call(`/admin/products/${productId}`, 'PATCH', { name: 'Editado', price: 25, is_paused: true });
    assert.equal(updated.status, 200);
    assert.equal(updated.body.product.recipe.length, 1);
    assert.equal((await call(`/stores/${storeA}/catalog`)).body.products.length, 0);
    assert.equal((await call(`/admin/products/${productId}`, 'PATCH', { is_paused: false })).status, 200);
    assert.equal((await call(`/stores/${storeA}/catalog`)).body.products[0].price, 25);
    assert.equal((await call(`/admin/products/${productId}`, 'PATCH', { is_published: false })).status, 200);
    assert.equal((await call('/admin/catalog')).body.products.length, 1);
    assert.equal((await call(`/stores/${storeA}/catalog`)).body.products.length, 0);
    assert.equal((await call('/admin/reports')).status, 200);
    assert.equal((await call(`/admin/products/${productId}`, 'DELETE')).status, 204);
    assert.equal((await call('/admin/catalog')).body.products.length, 0);
    assert.equal((await call(`/stores/${storeA}/catalog`)).body.products.length, 0);
  } finally {
    await new Promise<void>(resolve => server.close(() => resolve()));
    await query('DELETE FROM businesses WHERE id=$1', [businessId]);
    await closeDatabase();
  }
});
