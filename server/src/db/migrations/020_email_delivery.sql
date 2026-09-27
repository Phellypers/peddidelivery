ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS marketing_email_consent BOOLEAN NOT NULL DEFAULT false;
UPDATE users SET email_verified_at=COALESCE(email_verified_at,created_at);

CREATE TABLE IF NOT EXISTS email_auth_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  purpose VARCHAR(32) NOT NULL CHECK (purpose IN ('verify_email','password_reset')),
  token_hash TEXT NOT NULL UNIQUE, attempts INTEGER NOT NULL DEFAULT 0, expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ, created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_email_auth_tokens_user ON email_auth_tokens(user_id,purpose,created_at DESC);

CREATE TABLE IF NOT EXISTS email_outbox (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL, order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  template VARCHAR(64) NOT NULL, recipient TEXT NOT NULL, subject TEXT NOT NULL, payload JSONB NOT NULL DEFAULT '{}',
  idempotency_key TEXT NOT NULL UNIQUE, status VARCHAR(24) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','processing','sent','delivered','retry','failed','bounced','complained','cancelled')),
  attempts INTEGER NOT NULL DEFAULT 0, next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  provider_id TEXT UNIQUE, last_error TEXT, sent_at TIMESTAMPTZ, delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_email_outbox_pending ON email_outbox(status,next_attempt_at);

CREATE TABLE IF NOT EXISTS email_suppressions (
  email TEXT PRIMARY KEY, reason VARCHAR(32) NOT NULL, provider_event_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

REVOKE ALL ON email_auth_tokens,email_outbox,email_suppressions FROM PUBLIC;
