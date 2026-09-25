CREATE TABLE IF NOT EXISTS loyalty_programs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL UNIQUE REFERENCES stores(id) ON DELETE CASCADE,
  active BOOLEAN NOT NULL DEFAULT true,
  name VARCHAR(255) NOT NULL DEFAULT 'Clube de Fidelidade',
  required_steps INTEGER NOT NULL DEFAULT 5 CHECK (required_steps > 0 AND required_steps <= 50),
  minimum_order_total NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (minimum_order_total >= 0),
  reward_type VARCHAR(32) NOT NULL DEFAULT 'percentage_discount'
    CHECK (reward_type IN ('fixed_discount','percentage_discount','free_delivery')),
  reward_value NUMERIC(12,2) NOT NULL DEFAULT 10
    CHECK ((reward_type = 'free_delivery' AND reward_value >= 0) OR reward_value > 0),
  reward_minimum_order NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (reward_minimum_order >= 0),
  reward_validity_days INTEGER NOT NULL DEFAULT 30 CHECK (reward_validity_days > 0 AND reward_validity_days <= 3650),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS user_loyalty_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  current_steps INTEGER NOT NULL DEFAULT 0 CHECK (current_steps >= 0),
  required_steps INTEGER NOT NULL DEFAULT 5 CHECK (required_steps > 0),
  completed_cycles INTEGER NOT NULL DEFAULT 0 CHECK (completed_cycles >= 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (store_id,user_id)
);

CREATE TABLE IF NOT EXISTS loyalty_order_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  cycle_number INTEGER NOT NULL CHECK (cycle_number >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (store_id,order_id)
);

CREATE TABLE IF NOT EXISTS loyalty_rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  loyalty_program_id UUID NOT NULL REFERENCES loyalty_programs(id) ON DELETE CASCADE,
  coupon_record_id UUID REFERENCES app_records(id) ON DELETE SET NULL,
  code VARCHAR(50) NOT NULL UNIQUE,
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active','redeemed','expired')),
  discount_type VARCHAR(20) NOT NULL CHECK (discount_type IN ('fixed','percentage','free_shipping')),
  discount_value NUMERIC(12,2) NOT NULL CHECK (discount_value >= 0),
  minimum_order_value NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (minimum_order_value >= 0),
  issued_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  redeemed_at TIMESTAMPTZ,
  redeemed_order_id UUID REFERENCES orders(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_user_loyalty_progress_user ON user_loyalty_progress(user_id,store_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_order_events_user ON loyalty_order_events(user_id,store_id,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_loyalty_rewards_user_store ON loyalty_rewards(user_id,store_id,status);
CREATE INDEX IF NOT EXISTS idx_loyalty_rewards_expiry ON loyalty_rewards(status,expires_at);

REVOKE ALL ON loyalty_programs,user_loyalty_progress,loyalty_order_events,loyalty_rewards FROM PUBLIC;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='anon') THEN
    REVOKE ALL ON loyalty_programs,user_loyalty_progress,loyalty_order_events,loyalty_rewards FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN
    REVOKE ALL ON loyalty_programs,user_loyalty_progress,loyalty_order_events,loyalty_rewards FROM authenticated;
  END IF;
END $$;
