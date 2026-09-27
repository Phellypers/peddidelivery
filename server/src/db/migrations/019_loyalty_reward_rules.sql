ALTER TABLE loyalty_programs
  ADD COLUMN IF NOT EXISTS reward_mode VARCHAR(40) NOT NULL DEFAULT 'participating_products_limit',
  ADD COLUMN IF NOT EXISTS reward_product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS eligible_product_ids UUID[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS reward_value_limit NUMERIC(12,2) NOT NULL DEFAULT 25,
  ADD COLUMN IF NOT EXISTS over_limit_behavior VARCHAR(30) NOT NULL DEFAULT 'pay_difference';

ALTER TABLE loyalty_programs DROP CONSTRAINT IF EXISTS loyalty_programs_reward_mode_check;
ALTER TABLE loyalty_programs ADD CONSTRAINT loyalty_programs_reward_mode_check
  CHECK (reward_mode IN ('specific_product','value_limit','participating_products_limit'));
ALTER TABLE loyalty_programs DROP CONSTRAINT IF EXISTS loyalty_programs_over_limit_behavior_check;
ALTER TABLE loyalty_programs ADD CONSTRAINT loyalty_programs_over_limit_behavior_check
  CHECK (over_limit_behavior IN ('cap_discount','pay_difference'));
ALTER TABLE loyalty_programs DROP CONSTRAINT IF EXISTS loyalty_programs_reward_value_limit_check;
ALTER TABLE loyalty_programs ADD CONSTRAINT loyalty_programs_reward_value_limit_check CHECK (reward_value_limit > 0);

ALTER TABLE loyalty_programs ALTER COLUMN required_steps SET DEFAULT 9;
UPDATE loyalty_programs SET required_steps=9;
ALTER TABLE user_loyalty_progress ALTER COLUMN required_steps SET DEFAULT 9;
UPDATE user_loyalty_progress SET required_steps=9;

ALTER TABLE loyalty_rewards
  ADD COLUMN IF NOT EXISTS reward_mode VARCHAR(40),
  ADD COLUMN IF NOT EXISTS product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS product_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS eligible_product_ids UUID[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS value_limit NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS over_limit_behavior VARCHAR(30);
