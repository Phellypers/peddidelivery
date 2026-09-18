import { query } from './db/client.js';
import { app } from './app.js';
import { env } from './config/env.js';
import { processApprovalEmails } from './modules/notifications/approval-email.js';

app.listen(env.port, () => {
  console.log(`PEDDI API em http://localhost:${env.port}`);
});

const purgeChats = () => query('SELECT peddi_purge_expired_chats()').catch(() => console.error('Não foi possível executar a retenção do chat; uma nova tentativa será feita.'));
void purgeChats();
setInterval(() => { void purgeChats(); }, 60 * 60 * 1000).unref();
const sendApprovalEmails=()=>processApprovalEmails().catch(()=>console.error('Envio de aprovação pendente; a fila tentará novamente.'));
void sendApprovalEmails();
setInterval(()=>{void sendApprovalEmails();},60000).unref();
