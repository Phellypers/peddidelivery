-- Keep retention atomic while support is dual-written. This replaces the
-- legacy-only cleanup from migration 008. Remove the app_records branch after
-- the legacy adapter is retired.
CREATE OR REPLACE FUNCTION peddi_purge_expired_chats() RETURNS bigint LANGUAGE plpgsql AS $$
DECLARE removed bigint;
BEGIN
  WITH expired AS MATERIALIZED (
    SELECT id,store_id FROM app_records WHERE entity_name='SupportTicket'
      AND data->>'status'='closed' AND (data->>'delete_after')::timestamptz <= now()
      FOR UPDATE
  ), dedicated_deleted AS (
    DELETE FROM support_tickets s USING expired e
      WHERE s.id=e.id AND s.store_id=e.store_id RETURNING s.id
  ), legacy_deleted AS (
    DELETE FROM app_records r USING expired e WHERE r.store_id=e.store_id
      AND (r.id=e.id OR (r.entity_name IN ('ChatMessage','Notification')
        AND (r.data->>'conversation_id'=e.id::text OR r.data->>'ticket_id'=e.id::text
          OR r.data->>'support_ticket_id'=e.id::text))) RETURNING r.id
  ) SELECT count(*) INTO removed FROM legacy_deleted;
  RETURN removed;
END $$;

REVOKE ALL ON FUNCTION peddi_purge_expired_chats() FROM PUBLIC;
