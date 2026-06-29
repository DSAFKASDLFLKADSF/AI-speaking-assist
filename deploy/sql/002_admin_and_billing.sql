-- Admin flag + billing prep (run after 001_auth_and_core.sql)
--   psql "$DATABASE_URL" -f deploy/sql/002_admin_and_billing.sql

ALTER TABLE app_users
  ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT false;

UPDATE app_users
SET is_admin = true
WHERE LOWER(email) = LOWER('sunzhangyi415@163.com');

-- Future paid credits (unused until checkout ships)
CREATE TABLE IF NOT EXISTS user_entitlements (
  user_id UUID PRIMARY KEY REFERENCES app_users (id) ON DELETE CASCADE,
  credits_remaining INT NOT NULL DEFAULT 0,
  plan_id TEXT,
  expires_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS user_entitlements_expires_idx
  ON user_entitlements (expires_at)
  WHERE expires_at IS NOT NULL;
