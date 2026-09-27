import { query } from './db/client.js';
import { app } from './app.js';
import { env } from './config/env.js';
import { processEmailOutbox } from './modules/email/service.js';
import { flushRateLimitMetrics } from './middleware/rate-limit.js';

app.listen(env.port, () => {
  console.log(`PEDDI API em http://localhost:${env.port}`);
});

const purgeChats = () => query('SELECT peddi_purge_expired_chats()').catch(() => console.error('Não foi possível executar a retenção do chat; uma nova tentativa será feita.'));
void purgeChats();
setInterval(() => { void purgeChats(); }, 60 * 60 * 1000).unref();
const purgeOperationalHistory = () => query('SELECT peddi_purge_operational_history()').catch(() => console.error('Falha na retenção operacional; uma nova tentativa será feita.'));
void purgeOperationalHistory();
setInterval(() => { void purgeOperationalHistory(); }, 24 * 60 * 60 * 1000).unref();
const sendEmails=()=>processEmailOutbox().catch(()=>console.error('Envio de email pendente; a fila tentará novamente.'));
void sendEmails();
setInterval(()=>{void sendEmails();},30000).unref();
setInterval(()=>{void flushRateLimitMetrics();},60000).unref();
