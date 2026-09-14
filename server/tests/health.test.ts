import test from 'node:test';
import assert from 'node:assert/strict';
import { app } from '../src/app.js';
import { closeDatabase } from '../src/db/client.js';

const server = app.listen(0);
const address = server.address();
const port = typeof address === 'object' && address ? address.port : 0;

 test('health check informa estado da API', async () => {
  const response = await fetch(`http://127.0.0.1:${port}/health`);
  const body = await response.json() as { service: string; status: string };
  assert.equal(response.status, 200);
  assert.equal(body.service, 'peddi-api');
  assert.ok(['ok', 'degraded'].includes(body.status));
});

test.after(async () => {
  await new Promise<void>(resolve => server.close(() => resolve()));
  await closeDatabase();
});
