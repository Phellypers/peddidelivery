import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveChatSender } from '../src/modules/demo/chat-sender.js';

test('manager storefront messages and admin replies have opposite senders', () => {
  assert.equal(resolveChatSender(true, 'customer', true), 'customer');
  assert.equal(resolveChatSender(true, 'store', true), 'store');
  assert.equal(resolveChatSender(true, undefined, true), 'store');
});
test('customers cannot impersonate stores and managers cannot impersonate other customers', () => {
  assert.equal(resolveChatSender(false, 'store', true), 'customer');
  assert.throws(() => resolveChatSender(true, 'customer', false), /outro cliente/);
  assert.equal(resolveChatSender(true, 'store', false), 'store');
});
