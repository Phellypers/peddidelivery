-- Serialize message creation with closure and make retention dates server-owned.
CREATE FUNCTION peddi_guard_support_chat() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE ticket app_records;
BEGIN
  IF NEW.entity_name = 'SupportTicket' THEN
    IF TG_OP = 'UPDATE' AND OLD.data->>'status' = 'closed' THEN
      IF NEW.data IS DISTINCT FROM OLD.data THEN
        RAISE EXCEPTION 'Atendimento encerrado não pode ser reaberto ou alterado';
      END IF;
    ELSIF NEW.data->>'status' = 'closed' THEN
      NEW.data := NEW.data || jsonb_build_object('closed_at', now(), 'delete_after', now() + interval '30 days');
    ELSE
      NEW.data := NEW.data - 'closed_at' - 'delete_after';
    END IF;
  ELSIF NEW.entity_name = 'ChatMessage' AND NOT starts_with(COALESCE(NEW.data->>'conversation_id',''), 'deliverer_') THEN
    SELECT * INTO ticket FROM app_records WHERE store_id=NEW.store_id
      AND entity_name='SupportTicket' AND id::text=NEW.data->>'conversation_id' FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Protocolo não encontrado'; END IF;
    IF TG_OP='INSERT' OR NEW.data->>'message' IS DISTINCT FROM OLD.data->>'message'
      OR NEW.data->>'conversation_id' IS DISTINCT FROM OLD.data->>'conversation_id' THEN
      IF ticket.data->>'status'='closed' THEN RAISE EXCEPTION 'Atendimento encerrado. Inicie um novo protocolo'; END IF;
    END IF;
  END IF;
  RETURN NEW;
END $$;
UPDATE app_records SET data=data || jsonb_build_object('delete_after',
  COALESCE(NULLIF(data->>'closed_at','')::timestamptz,updated_at) + interval '30 days')
  WHERE entity_name='SupportTicket' AND data->>'status'='closed';


CREATE TRIGGER guard_support_chat BEFORE INSERT OR UPDATE ON app_records
  FOR EACH ROW WHEN (NEW.entity_name IN ('SupportTicket','ChatMessage')) EXECUTE FUNCTION peddi_guard_support_chat();

CREATE FUNCTION peddi_purge_expired_chats() RETURNS bigint LANGUAGE plpgsql AS $$
DECLARE removed bigint;
BEGIN
  WITH expired AS MATERIALIZED (
    SELECT id,store_id FROM app_records WHERE entity_name='SupportTicket' AND data->>'status'='closed'
      AND (data->>'delete_after')::timestamptz <= now() FOR UPDATE
  ), deleted AS (
    DELETE FROM app_records r USING expired e WHERE r.store_id=e.store_id
      AND (r.id=e.id OR (r.entity_name IN ('ChatMessage','Notification')
        AND (r.data->>'conversation_id'=e.id::text OR r.data->>'ticket_id'=e.id::text OR r.data->>'support_ticket_id'=e.id::text))) RETURNING r.id
  ) SELECT count(*) INTO removed FROM deleted;
  RETURN removed;
END $$;
REVOKE ALL ON FUNCTION peddi_purge_expired_chats() FROM PUBLIC;
