import test from 'node:test';
import assert from 'node:assert/strict';
import { isPdvOrder } from '../src/lib/orderOrigin.js';

test('identifica pedidos criados pelo PDV sem confundir pedidos do cardápio', () => {
  assert.equal(isPdvOrder({ created_via_pdv: true, sale_origin: 'pdv_quick' }), true);
  assert.equal(isPdvOrder({ sale_origin: 'pdv_table' }), true);
  assert.equal(isPdvOrder({ sale_origin: 'pdv_delivery' }), true);
  assert.equal(isPdvOrder({ sale_origin: 'catalog' }), false);
  assert.equal(isPdvOrder({}), false);
});
