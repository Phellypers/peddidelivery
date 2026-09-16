CREATE EXTENSION IF NOT EXISTS pg_cron;
SELECT cron.schedule('peddi-chat-retention', '*/15 * * * *', 'SELECT public.peddi_purge_expired_chats()');
