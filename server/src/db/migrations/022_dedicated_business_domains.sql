-- Dedicated relational storage for domains previously persisted only in app_records.
-- legacy_record_id is intentionally unique: it makes backfill and dual-write idempotent.

CREATE TABLE IF NOT EXISTS campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  legacy_record_id UUID UNIQUE REFERENCES app_records(id) ON DELETE SET NULL,
  name TEXT NOT NULL CHECK (btrim(name) <> ''),
  campaign_type TEXT NOT NULL DEFAULT 'cart_value',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive','draft','archived')),
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  sort_order INTEGER NOT NULL DEFAULT 0 CHECK (sort_order >= 0),
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (ends_at IS NULL OR starts_at IS NULL OR ends_at >= starts_at)
);
CREATE INDEX IF NOT EXISTS idx_campaigns_store_status_period ON campaigns(store_id,status,starts_at,ends_at);
CREATE INDEX IF NOT EXISTS idx_campaigns_store_sort ON campaigns(store_id,sort_order,id);

CREATE TABLE IF NOT EXISTS promotions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  legacy_record_id UUID UNIQUE REFERENCES app_records(id) ON DELETE SET NULL,
  name TEXT NOT NULL CHECK (btrim(name) <> ''),
  code TEXT,
  promotion_type TEXT NOT NULL DEFAULT 'coupon',
  discount_type TEXT NOT NULL DEFAULT 'fixed' CHECK (discount_type IN ('fixed','percentage','free_shipping','product','combo')),
  discount_value NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (discount_value >= 0),
  minimum_order_value NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (minimum_order_value >= 0),
  total_usage_limit INTEGER CHECK (total_usage_limit IS NULL OR total_usage_limit > 0),
  per_customer_limit INTEGER CHECK (per_customer_limit IS NULL OR per_customer_limit > 0),
  usage_count INTEGER NOT NULL DEFAULT 0 CHECK (usage_count >= 0),
  active BOOLEAN NOT NULL DEFAULT true,
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (ends_at IS NULL OR starts_at IS NULL OR ends_at >= starts_at)
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_promotions_store_code ON promotions(store_id,upper(code)) WHERE code IS NOT NULL AND btrim(code) <> '';
CREATE INDEX IF NOT EXISTS idx_promotions_store_active_period ON promotions(store_id,active,starts_at,ends_at);

CREATE TABLE IF NOT EXISTS promotion_usages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  promotion_id UUID NOT NULL REFERENCES promotions(id) ON DELETE RESTRICT,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  customer_key TEXT,
  discount_amount NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (discount_amount >= 0),
  status TEXT NOT NULL DEFAULT 'applied' CHECK (status IN ('reserved','applied','reversed')),
  legacy_record_id UUID UNIQUE REFERENCES app_records(id) ON DELETE SET NULL,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_promotion_usage_order ON promotion_usages(promotion_id,order_id) WHERE order_id IS NOT NULL AND status <> 'reversed';
CREATE INDEX IF NOT EXISTS idx_promotion_usages_store_customer ON promotion_usages(store_id,customer_key,created_at DESC);

CREATE TABLE IF NOT EXISTS financial_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('income','expense','refund','fee','adjustment','transfer')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid','completed','cancelled','failed','refunded')),
  amount NUMERIC(14,2) NOT NULL CHECK (amount >= 0),
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  description TEXT NOT NULL DEFAULT '',
  legacy_record_id UUID UNIQUE REFERENCES app_records(id) ON DELETE SET NULL,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_financial_transactions_store_period ON financial_transactions(store_id,occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_financial_transactions_store_status ON financial_transactions(store_id,status,transaction_type);

CREATE TABLE IF NOT EXISTS payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  amount NUMERIC(14,2) NOT NULL CHECK (amount > 0),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processing','paid','cancelled','failed')),
  scheduled_for TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  provider_reference TEXT,
  legacy_record_id UUID UNIQUE REFERENCES app_records(id) ON DELETE SET NULL,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (status <> 'paid' OR paid_at IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS idx_payouts_store_status_schedule ON payouts(store_id,status,scheduled_for);

CREATE TABLE IF NOT EXISTS tables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (btrim(name) <> ''),
  code TEXT,
  capacity INTEGER NOT NULL DEFAULT 1 CHECK (capacity > 0),
  status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available','occupied','reserved','inactive')),
  sort_order INTEGER NOT NULL DEFAULT 0 CHECK (sort_order >= 0),
  legacy_record_id UUID UNIQUE REFERENCES app_records(id) ON DELETE SET NULL,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(store_id,name)
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_tables_store_code ON tables(store_id,code) WHERE code IS NOT NULL AND btrim(code) <> '';
CREATE INDEX IF NOT EXISTS idx_tables_store_status_sort ON tables(store_id,status,sort_order);

CREATE TABLE IF NOT EXISTS table_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  table_id UUID NOT NULL REFERENCES tables(id) ON DELETE RESTRICT,
  opened_by UUID REFERENCES users(id) ON DELETE SET NULL,
  closed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','closing','closed','cancelled')),
  guest_count INTEGER NOT NULL DEFAULT 1 CHECK (guest_count > 0),
  opened_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  closed_at TIMESTAMPTZ,
  legacy_record_id UUID UNIQUE REFERENCES app_records(id) ON DELETE SET NULL,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (status NOT IN ('closed','cancelled') OR closed_at IS NOT NULL)
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_table_open_session ON table_sessions(table_id) WHERE status IN ('open','closing');
CREATE INDEX IF NOT EXISTS idx_table_sessions_store_status ON table_sessions(store_id,status,opened_at DESC);

CREATE TABLE IF NOT EXISTS reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  title TEXT,
  comment TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  legacy_record_id UUID UNIQUE REFERENCES app_records(id) ON DELETE SET NULL,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_reviews_product_status_created ON reviews(product_id,status,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reviews_store_user ON reviews(store_id,user_id,created_at DESC);

CREATE TABLE IF NOT EXISTS review_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  review_id UUID NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  message TEXT NOT NULL CHECK (btrim(message) <> ''),
  is_store_response BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'approved' CHECK (status IN ('pending','approved','rejected')),
  legacy_record_id UUID UNIQUE REFERENCES app_records(id) ON DELETE SET NULL,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_review_responses_review_created ON review_responses(review_id,created_at);

CREATE TABLE IF NOT EXISTS support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  visitor_id TEXT,
  subject TEXT NOT NULL CHECK (btrim(subject) <> ''),
  description TEXT NOT NULL DEFAULT '',
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low','normal','high','urgent')),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','in_progress','waiting_response','resolved','closed')),
  closed_at TIMESTAMPTZ,
  delete_after TIMESTAMPTZ,
  legacy_record_id UUID UNIQUE REFERENCES app_records(id) ON DELETE SET NULL,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (status <> 'closed' OR (closed_at IS NOT NULL AND delete_after IS NOT NULL))
);
CREATE INDEX IF NOT EXISTS idx_support_tickets_store_status_updated ON support_tickets(store_id,status,updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_support_tickets_retention ON support_tickets(delete_after) WHERE status='closed';

CREATE TABLE IF NOT EXISTS ticket_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  ticket_id UUID REFERENCES support_tickets(id) ON DELETE CASCADE,
  conversation_key TEXT NOT NULL CHECK (btrim(conversation_key) <> ''),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  visitor_id TEXT,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('customer','store','deliverer','system')),
  message TEXT NOT NULL CHECK (btrim(message) <> ''),
  legacy_record_id UUID UNIQUE REFERENCES app_records(id) ON DELETE SET NULL,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ticket_messages_conversation_created ON ticket_messages(store_id,conversation_key,created_at);

ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE promotion_usages ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE table_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_messages ENABLE ROW LEVEL SECURITY;
