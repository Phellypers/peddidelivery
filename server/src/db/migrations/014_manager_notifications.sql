CREATE OR REPLACE FUNCTION peddi_notify_managers_about_order() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  manager RECORD;
  event_title TEXT;
  event_message TEXT;
  public_status TEXT;
BEGIN
  public_status := CASE NEW.status::text
    WHEN 'out_for_delivery' THEN 'shipped'
    ELSE NEW.status::text
  END;
  IF TG_OP = 'INSERT' THEN
    event_title := 'Novo pedido recebido #' || COALESCE(NEW.details->>'order_number', NEW.id::text);
    event_message := COALESCE(NEW.details->>'customer_name','Cliente') || ' fez um pedido no valor de R$ ' || replace(to_char(NEW.total,'FM999999990D00'),'.',',') || '.';
  ELSIF NEW.status IS DISTINCT FROM OLD.status THEN
    event_title := CASE NEW.status::text
      WHEN 'cancelled' THEN 'Pedido cancelado'
      WHEN 'out_for_delivery' THEN 'Entregador saiu para entrega'
      WHEN 'delivered' THEN 'Pedido entregue'
      ELSE 'Status do pedido atualizado'
    END;
    event_message := 'Pedido #' || COALESCE(NEW.details->>'order_number',NEW.id::text) || ' • ' || public_status;
  ELSE
    RETURN NEW;
  END IF;
  FOR manager IN SELECT id FROM users WHERE store_id=NEW.store_id AND role IN ('manager','peddi_admin') AND active=true LOOP
    INSERT INTO app_records(store_id,entity_name,owner_id,data)
    VALUES(NEW.store_id,'Notification',manager.id,jsonb_build_object(
      'user_id',manager.id::text,'audience','manager','type','manager_order',
      'title',event_title,'message',event_message,'is_read',false,
      'reference_id',NEW.id::text,'reference_type','order','order_status',public_status));
  END LOOP;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS notify_managers_about_order ON orders;
CREATE TRIGGER notify_managers_about_order AFTER INSERT OR UPDATE OF status ON orders
  FOR EACH ROW EXECUTE FUNCTION peddi_notify_managers_about_order();
