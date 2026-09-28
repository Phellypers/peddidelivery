CREATE TABLE IF NOT EXISTS inventory_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  ingredient_id UUID NOT NULL REFERENCES ingredients(id) ON DELETE RESTRICT,
  order_id UUID REFERENCES orders(id) ON DELETE RESTRICT,
  movement_type TEXT NOT NULL CHECK (movement_type IN ('purchase_entry','manual_exit','sale_consumption','stock_adjustment','waste')),
  quantity_delta NUMERIC(14,4) NOT NULL CHECK (quantity_delta <> 0),
  unit TEXT NOT NULL CHECK (unit IN ('unidade','pacote','grama','quilo','ml','litro')),
  unit_cost NUMERIC(14,6) NOT NULL DEFAULT 0 CHECK (unit_cost >= 0),
  total_cost NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (total_cost >= 0),
  stock_before NUMERIC(14,4) NOT NULL,
  stock_after NUMERIC(14,4) NOT NULL,
  reason TEXT NOT NULL DEFAULT '',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_inventory_sale_per_order_ingredient
  ON inventory_movements(order_id, ingredient_id)
  WHERE movement_type = 'sale_consumption';
CREATE INDEX IF NOT EXISTS idx_inventory_movements_store_date ON inventory_movements(store_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_ingredient_date ON inventory_movements(ingredient_id, created_at DESC);

CREATE TABLE IF NOT EXISTS order_item_cost_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE RESTRICT,
  order_item_id UUID NOT NULL REFERENCES order_items(id) ON DELETE RESTRICT,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  product_name TEXT NOT NULL,
  quantity NUMERIC(12,3) NOT NULL CHECK (quantity > 0),
  unit_cogs NUMERIC(14,4) NOT NULL DEFAULT 0 CHECK (unit_cogs >= 0),
  total_cogs NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (total_cogs >= 0),
  recipe_snapshot JSONB NOT NULL DEFAULT '[]'::jsonb,
  costed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_order_item_cost_snapshot UNIQUE (order_item_id)
);

CREATE INDEX IF NOT EXISTS idx_order_item_costs_store_date ON order_item_cost_snapshots(store_id, costed_at DESC);
CREATE INDEX IF NOT EXISTS idx_order_item_costs_order ON order_item_cost_snapshots(order_id);

ALTER TABLE inventory_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_item_cost_snapshots ENABLE ROW LEVEL SECURITY;
