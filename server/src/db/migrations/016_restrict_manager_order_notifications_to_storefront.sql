CREATE OR REPLACE FUNCTION peddi_notify_managers_about_order() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  manager RECORD;
  event_title TEXT;
  event_message TEXT;
  public_status TEXT;
  order_origin TEXT;
  delivery_method TEXT;
BEGIN
  order_origin := COALESCE(NEW.details->>'sale_origin','');
  delivery_method := COALESCE(NEW.details->>'delivery_method','');

  -- Only customer delivery and pickup orders from the digital storefront
  -- belong in the manager bell. PDV orders remain in orders and reports.
  IF COALESCE(NEW.details->>'created_via_pdv','false') = 'true'
    OR order_origin LIKE 'pdv_%'
    OR order_origin <> 'catalog'
    OR delivery_method NOT IN ('delivery','pickup') THEN
    RETURN NEW;
  END IF;

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
      'reference_id',NEW.id::text,'reference_type','order','order_status',public_status,
      'order_origin',order_origin));
  END LOOP;
  RETURN NEW;
END $$;

DELETE FROM app_records
WHERE entity_name='Notification'
  AND data->>'audience'='manager'
  AND data->>'type'='manager_order'
  AND COALESCE(data->>'order_origin','') LIKE 'pdv_%';
