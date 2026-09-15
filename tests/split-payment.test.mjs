import test from 'node:test';
import assert from 'node:assert/strict';
import { getSplitPaymentStatus, toCurrencyCents } from '../src/lib/splitPayment.js';

test('converts decimal money to integer cents safely', () => {
  assert.equal(toCurrencyCents(0.1 + 0.2), 30);
  assert.equal(toCurrencyCents('28.90'), 2890);
});

test('accepts split payment when the parts equal the order total', () => {
  const result = getSplitPaymentStatus(45.98, { pix: 20, cash: 25.98 });
  assert.equal(result.difference, 0);
  assert.equal(result.isValid, true);
});

test('reports missing and excess amounts in cents', () => {
  assert.equal(getSplitPaymentStatus(45.98, { pix: 40 }).difference, 5.98);
  assert.equal(getSplitPaymentStatus(45.98, { pix: 50 }).difference, -4.02);
});
