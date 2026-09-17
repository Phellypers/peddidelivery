CREATE TABLE peddi_accounts (
  store_id UUID PRIMARY KEY REFERENCES stores(id) ON DELETE CASCADE,
  founder_since TIMESTAMPTZ,
  founder_expires_at TIMESTAMPTZ
);
CREATE TABLE peddi_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),
  service_id TEXT NOT NULL,
  amount_cents INTEGER NOT NULL CHECK(amount_cents>0),
  status TEXT NOT NULL DEFAULT 'pending_payment' CHECK(status IN ('pending_payment','paid','cancelled','refunded')),
  idempotency_key UUID NOT NULL,
  provider TEXT,
  payment_reference TEXT,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(store_id,idempotency_key),
  UNIQUE(provider,payment_reference)
);
CREATE TABLE peddi_entitlements (
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  feature TEXT NOT NULL,
  expires_at TIMESTAMPTZ,
  purchase_id UUID REFERENCES peddi_purchases(id),
  PRIMARY KEY(store_id,feature)
);
CREATE TABLE peddi_support_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  purchase_id UUID NOT NULL UNIQUE REFERENCES peddi_purchases(id),
  starts_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  request_limit INTEGER CHECK(request_limit>0)
);
CREATE TABLE peddi_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),
  purchase_id UUID UNIQUE REFERENCES peddi_purchases(id),
  support_period_id UUID REFERENCES peddi_support_periods(id),
  kind TEXT NOT NULL CHECK(kind IN ('service','support','bug')),
  subject TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open','in_progress','completed','cancelled')),
  consumes_support BOOLEAN NOT NULL DEFAULT false,
  assistance_state TEXT NOT NULL DEFAULT 'system' CHECK(assistance_state IN ('system','human_assisted','extra_quote')),
  CHECK(kind<>'bug' OR consumes_support=false),
  CHECK(NOT consumes_support OR (assistance_state='human_assisted' AND support_period_id IS NOT NULL)),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE peddi_account_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  purchase_id UUID REFERENCES peddi_purchases(id),
  kind TEXT NOT NULL,
  description TEXT NOT NULL,
  credit_cents INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE peddi_commercial_outbox (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  purchase_id UUID UNIQUE REFERENCES peddi_purchases(id),
  request_id UUID UNIQUE REFERENCES peddi_requests(id),
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE peddi_news (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  content TEXT NOT NULL,
  image_url TEXT,
  published BOOLEAN NOT NULL DEFAULT false,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK(NOT published OR published_at IS NOT NULL)
);
CREATE INDEX ON peddi_purchases(store_id,created_at DESC);
CREATE INDEX ON peddi_requests(store_id,created_at DESC);
CREATE INDEX ON peddi_account_events(store_id,created_at DESC);
CREATE UNIQUE INDEX peddi_one_founder ON peddi_purchases(store_id) WHERE service_id='FOUNDER' AND status='paid';
ALTER TABLE peddi_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE peddi_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE peddi_entitlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE peddi_support_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE peddi_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE peddi_account_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE peddi_commercial_outbox ENABLE ROW LEVEL SECURITY;
ALTER TABLE peddi_news ENABLE ROW LEVEL SECURITY;
