ALTER TABLE couriers ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE couriers ADD COLUMN store_id UUID REFERENCES stores(id) ON DELETE CASCADE;
ALTER TABLE couriers ADD COLUMN details JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE couriers ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT now();
UPDATE couriers c SET store_id=u.store_id FROM users u WHERE u.id=c.user_id;

-- Preserve the IDs referenced by the existing delivery screens.
INSERT INTO couriers(id,user_id,store_id,vehicle,available,details,created_at,updated_at)
SELECT r.id,u.id,r.store_id,COALESCE(r.data->>'vehicle',r.data->>'vehicle_type','moto'),
  COALESCE(r.data->>'current_status','')='available',r.data,r.created_at,r.updated_at
FROM app_records r LEFT JOIN LATERAL (
  SELECT id FROM users WHERE store_id=r.store_id AND role='courier'
    AND (id::text=r.data->>'user_id' OR email=r.data->>'email') LIMIT 1
) u ON true WHERE r.entity_name='Deliverer'
ON CONFLICT(user_id) DO UPDATE SET details=EXCLUDED.details,vehicle=EXCLUDED.vehicle,available=EXCLUDED.available;
DELETE FROM app_records WHERE entity_name='Deliverer';

ALTER TABLE couriers ALTER COLUMN store_id SET NOT NULL;
ALTER TABLE couriers ADD CONSTRAINT couriers_store_id_unique UNIQUE(store_id,id);
ALTER TABLE orders ADD CONSTRAINT orders_store_id_unique UNIQUE(store_id,id);
ALTER TABLE orders ADD CONSTRAINT orders_courier_same_store FOREIGN KEY(store_id,courier_id) REFERENCES couriers(store_id,id);

UPDATE orders o SET courier_id=c.id FROM couriers c
WHERE c.store_id=o.store_id AND c.user_id::text=o.details->>'deliverer_user_id';

CREATE TABLE deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  order_id UUID NOT NULL UNIQUE,
  courier_id UUID,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','assigned','accepted','out_for_delivery','delivered','cancelled')),
  assigned_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ,
  picked_up_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  FOREIGN KEY(store_id,order_id) REFERENCES orders(store_id,id) ON DELETE CASCADE,
  FOREIGN KEY(store_id,courier_id) REFERENCES couriers(store_id,id)
);
CREATE INDEX idx_deliveries_store_status ON deliveries(store_id,status);
CREATE INDEX idx_deliveries_courier ON deliveries(courier_id);

INSERT INTO deliveries(store_id,order_id,courier_id,status,assigned_at,accepted_at,picked_up_at,delivered_at)
SELECT store_id,id,courier_id,
  CASE WHEN status='cancelled' THEN 'cancelled' WHEN status='delivered' THEN 'delivered'
    WHEN status='out_for_delivery' THEN 'out_for_delivery'
    WHEN courier_id IS NOT NULL AND details->>'deliverer_accepted'='true' THEN 'accepted'
    WHEN courier_id IS NOT NULL THEN 'assigned' ELSE 'pending' END,
  CASE WHEN courier_id IS NOT NULL THEN updated_at END,
  CASE WHEN courier_id IS NOT NULL AND details->>'deliverer_accepted'='true' THEN updated_at END,
  CASE WHEN status='out_for_delivery' THEN updated_at END,
  CASE WHEN status='delivered' THEN updated_at END
FROM orders WHERE COALESCE(details->>'delivery_method','delivery')='delivery' OR courier_id IS NOT NULL;
