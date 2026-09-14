import test from 'node:test';
import assert from 'node:assert/strict';
import { summarizeLiveSessions as summarize } from '../src/lib/liveFunnel.js';

const now = new Date(2026, 8, 14, 14).getTime();
const at = offset => new Date(now - offset).toISOString();
const session = { id: 'one', session_id: 'one', stage: 'navegando', last_event_at: at(0) };

test('one session belongs to one active stage; stale sessions are offline', () => {
  const result = summarize([session, { ...session, stage: 'checkout' }], now);
  assert.equal(result.activeCount, 1);
  assert.equal(result.stageCounts.checkout, 1);
  assert.equal(result.stageCounts.navegando, 0);
  assert.equal(summarize([{ ...session, last_event_at: at(181000) }], now).activeCount, 0);
});

test('timeout abandonment survives reload and is excluded from online and purchase counts', () => {
  const rows = [{ ...session, stage: 'carrinho', last_event_at: at(301000), customer_name: 'Unverified name' }];
  for (const result of [summarize(rows, now), summarize(JSON.parse(JSON.stringify(rows)), now + 10000)]) {
    assert.equal(result.activeCount, 0);
    assert.equal(result.buyingCount, 0);
    assert.equal(result.abandonments, 1);
    assert.equal(result.events[0].name, 'Visitante');
  }
});

test('daily conversions and abandonments survive later transitions without becoming online', () => {
  const result = summarize([{ ...session, stage: 'concluida', event_history: [
    { stage: 'navegando', at: at(900000) },
    { stage: 'carrinho', at: at(500000) },
    { stage: 'abandonou', at: at(200000) },
    { stage: 'checkout', at: at(100000) },
    { stage: 'concluida', at: at(0) },
  ] }], now);
  assert.equal(result.conversions, 1);
  assert.equal(result.abandonments, 1);
  assert.equal(result.activeCount, 0);
  assert.equal(result.conversionRate, 100);
  assert.equal(result.events.length, 5);
  assert.equal(summarize([{ ...session, stage: 'concluida', last_event_at: at(86400000) }], now).conversions, 0);
});

test('legacy sessions with empty history use the same denominator as conversions', () => {
  const result = summarize([
    { ...session, stage: 'concluida', event_history: [] },
    { ...session, id: 'two', session_id: 'two', stage: 'concluida' },
  ], now);
  assert.equal(result.conversions, 2);
  assert.equal(result.conversionRate, 100);
});
