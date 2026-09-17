CREATE TABLE chat_presence (
  ticket_id UUID NOT NULL REFERENCES app_records(id) ON DELETE CASCADE,
  sender TEXT NOT NULL CHECK (sender IN ('store','customer')),
  expires_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY(ticket_id,sender)
);
CREATE FUNCTION peddi_update_chat_status() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NOT starts_with(COALESCE(NEW.data->>'conversation_id',''),'deliverer_') THEN
    UPDATE app_records SET data=data || jsonb_build_object('status',
      CASE WHEN NEW.data->>'sender_type'='store' THEN 'waiting_response'
        WHEN data->>'status'='open' THEN 'open' ELSE 'in_progress' END),updated_at=now()
      WHERE id::text=NEW.data->>'conversation_id' AND store_id=NEW.store_id AND entity_name='SupportTicket' AND data->>'status'<>'closed';
    DELETE FROM chat_presence WHERE ticket_id::text=NEW.data->>'conversation_id'
      AND sender=CASE WHEN NEW.data->>'sender_type'='store' THEN 'store' ELSE 'customer' END;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER update_chat_status AFTER INSERT ON app_records FOR EACH ROW
  WHEN (NEW.entity_name='ChatMessage') EXECUTE FUNCTION peddi_update_chat_status();
