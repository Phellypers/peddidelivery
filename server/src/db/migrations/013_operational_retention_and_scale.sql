-- Bounded operational history and shared controls that work across API instances.
CREATE TABLE IF NOT EXISTS api_rate_limits (
  identity_hash TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  window_start TIMESTAMPTZ NOT NULL,
  request_count INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY(identity_hash, endpoint, window_start)
);

CREATE TABLE IF NOT EXISTS api_request_metrics (
  endpoint TEXT NOT NULL,
  status_group SMALLINT NOT NULL,
  minute_start TIMESTAMPTZ NOT NULL,
  request_count BIGINT NOT NULL DEFAULT 0,
  latency_ms_sum BIGINT NOT NULL DEFAULT 0,
  PRIMARY KEY(endpoint, status_group, minute_start)
);

CREATE TABLE IF NOT EXISTS idempotency_keys (
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  actor_key TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  idempotency_key TEXT NOT NULL,
  response_status INTEGER,
  response_body JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT now() + interval '24 hours',
  PRIMARY KEY(store_id, actor_key, endpoint, idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_app_records_notification_retention
  ON app_records(entity_name, created_at)
  WHERE entity_name='Notification';

CREATE OR REPLACE FUNCTION peddi_purge_operational_history() RETURNS TABLE(notifications BIGINT, rate_windows BIGINT, metrics BIGINT, idempotency BIGINT)
LANGUAGE plpgsql AS $$
BEGIN
  DELETE FROM app_records
    WHERE entity_name='Notification' AND created_at < now() - interval '30 days'
      AND data->>'permanent' IS DISTINCT FROM 'true';
  GET DIAGNOSTICS notifications = ROW_COUNT;
  DELETE FROM api_rate_limits WHERE window_start < date_trunc('minute',now()) - interval '10 minutes';
  GET DIAGNOSTICS rate_windows = ROW_COUNT;
  DELETE FROM api_request_metrics WHERE minute_start < date_trunc('minute',now()) - interval '90 days';
  GET DIAGNOSTICS metrics = ROW_COUNT;
  DELETE FROM idempotency_keys WHERE expires_at < now();
  GET DIAGNOSTICS idempotency = ROW_COUNT;
  RETURN NEXT;
END $$;

REVOKE ALL ON FUNCTION peddi_purge_operational_history() FROM PUBLIC;
