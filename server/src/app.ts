import { authRouter } from './modules/auth/routes.js';
import { storefrontRouter } from './modules/stores/routes.js';
import { orderRouter } from './modules/orders/routes.js';
import { rateLimit } from './middleware/rate-limit.js';
import express from 'express';
import cors from 'cors';
import { env } from './config/env.js';
import { pool, query } from './db/client.js';
import { catalogRouter } from './modules/products/routes.js';
import { demoRouter, uploadPath } from './modules/demo/routes.js';
import { courierRouter } from './modules/couriers/routes.js';
import { courierApplicationRouter } from './modules/couriers/applications.js';
import { accountRouter } from './modules/account/routes.js';

export const app = express();
app.set('trust proxy', 1);
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
app.use(rateLimit);
app.use((request, response, next) => {
  if (request.header('x-peddi-demo') === 'ephemeral' && !['GET', 'HEAD', 'OPTIONS'].includes(request.method)) {
    return response.status(403).json({ error: 'O modo demonstração não grava dados reais.' });
  }
  next();
});
app.use('/api/v1/admin', catalogRouter);
app.use('/api/v1',courierRouter);
app.use('/api/v1',courierApplicationRouter);
app.use('/api/v1/demo', demoRouter);
app.use('/api/v1/my-peddi',accountRouter);
app.use('/uploads', express.static(uploadPath, { dotfiles:'deny' }));

app.get('/health', async (_request, response) => {
  let database: 'connected' | 'not_configured' | 'unavailable' = 'not_configured';
  if (pool) {
    try { await query('SELECT 1'); database = 'connected'; } catch { database = 'unavailable'; }
  }
  response.status(database === 'unavailable' ? 503 : 200).json({ status: database === 'connected' ? 'ok' : 'degraded', service: 'peddi-api', database, demoMode: env.demoMode });
});

app.use('/api/v1', authRouter);

app.use('/api/v1', storefrontRouter);

app.use('/api/v1', orderRouter);

app.use((error: unknown, _request: express.Request, response: express.Response, _next: express.NextFunction) => { console.error(error); response.status(500).json({ error: 'Erro interno da API.' }); });
