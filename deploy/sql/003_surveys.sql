-- Survey responses (pre / post questionnaires)
--   psql "$DATABASE_URL" -f deploy/sql/003_surveys.sql

CREATE TABLE IF NOT EXISTS survey_responses (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES app_users (id) ON DELETE SET NULL,
  client_id   TEXT,
  survey_type TEXT NOT NULL CHECK (survey_type IN ('pre', 'post')),
  answers     JSONB NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT survey_responses_actor CHECK (
    user_id IS NOT NULL OR (client_id IS NOT NULL AND client_id <> '')
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_survey_responses_user_type
  ON survey_responses (user_id, survey_type)
  WHERE user_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_survey_responses_client_type
  ON survey_responses (client_id, survey_type)
  WHERE user_id IS NULL AND client_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_survey_responses_created
  ON survey_responses (created_at DESC);
