CREATE FUNCTION peddi_notify_order_status() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  recipient UUID;
  label TEXT;
BEGIN
  IF NEW.status IS NOT DISTINCT FROM OLD.status THEN RETURN NEW; END IF;
  label := CASE NEW.status::text
    WHEN 'confirmed' THEN 'Pedido aceito'
    WHEN 'preparing' THEN 'Em preparo'
    WHEN 'ready' THEN 'Pedido pronto'
    WHEN 'assigned' THEN 'Entregador atribuído'
    WHEN 'out_for_delivery' THEN 'Saiu para entrega'
    WHEN 'delivered' THEN 'Entregue'
    WHEN 'cancelled' THEN 'Cancelado'
    ELSE NULL END;
  IF label IS NULL THEN RETURN NEW; END IF;
  SELECT u.id INTO recipient FROM customers c JOIN users u ON u.id=c.user_id
    WHERE c.id=NEW.customer_id AND u.store_id=NEW.store_id AND u.active=true;
  IF recipient IS NULL AND NOT EXISTS (
    SELECT 1 FROM customers WHERE id=NEW.customer_id AND user_id IS NOT NULL
  ) THEN
    SELECT u.id INTO recipient FROM users u WHERE u.store_id=NEW.store_id
      AND lower(u.email)=lower(NEW.details->>'customer_email') AND u.active=true LIMIT 1;
  END IF;
  IF recipient IS NOT NULL THEN
    INSERT INTO app_records(store_id,entity_name,owner_id,data)
      VALUES(NEW.store_id,'Notification',recipient,jsonb_build_object(
        'user_id',recipient::text,'type','order_status','title',label,
        'message','Pedido #'||COALESCE(NEW.details->>'order_number',NEW.id::text)||' — '||label,
        'is_read',false,'reference_id',NEW.id::text,'reference_type','order',
        'order_status',NEW.status::text));
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER notify_order_status AFTER UPDATE OF status ON orders
  FOR EACH ROW EXECUTE FUNCTION peddi_notify_order_status();
