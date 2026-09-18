import test from 'node:test';
import assert from 'node:assert/strict';
import { deliveryActionEvent, newDeliveryAction } from '../../src/lib/deliveryEvents.js';

test('manual assignments and removals never impersonate courier actions', () => {
  const prior = { deliverer_user_id: 'courier', deliverer_accepted: false };
  for (const changes of [{ deliverer_user_id: '' }, { deliverer_user_id: 'other' }, { deliverer_accepted: true }, { status: 'shipped' }]) {
    assert.equal(deliveryActionEvent(prior, changes, { role: 'manager', userId: 'manager' }, 'event'), null);
  }
  assert.equal(newDeliveryAction(prior, { deliverer_user_id: '' }), null);
  assert.equal(deliveryActionEvent(prior, { deliverer_accepted: true }, { role: 'courier', userId: 'other' }, 'event'), null);
});

test('assigned courier acceptance and refusal produce distinct non-repeated events', () => {
  const prior = { deliverer_user_id: 'courier', deliverer_accepted: false };
  for (const [changes, type] of [[{ deliverer_accepted: true }, 'accepted'], [{ deliverer_user_id: '' }, 'refused']] as const) {
    const event = deliveryActionEvent(prior, changes, { role: 'courier', userId: 'courier' }, type);
    assert.equal(event?.type, type);
    const current = { delivery_action_event: event };
    assert.equal(newDeliveryAction(prior, current), type);
    assert.equal(newDeliveryAction(current, current), null);
    assert.equal(newDeliveryAction(current, { delivery_action_event: null }), null);
  }
});
