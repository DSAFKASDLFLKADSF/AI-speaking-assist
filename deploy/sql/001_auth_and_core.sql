-- =============================================================================
-- Self-hosted auth + practice data (run once on your PostgreSQL server)
--   psql "$DATABASE_URL" -f deploy/sql/001_auth_and_core.sql
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ---------------------------------------------------------------------------
-- Auth users (replaces Supabase auth.users + public.users)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS app_users (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email           TEXT NOT NULL UNIQUE,
  password_hash   TEXT NOT NULL,
  display_name    TEXT,
  avatar_url      TEXT,
  native_language TEXT NOT NULL DEFAULT 'zh-CN',
  target_score    SMALLINT NOT NULL DEFAULT 24
                  CHECK (target_score BETWEEN 0 AND 30),
  current_level   TEXT CHECK (current_level IN ('beginner', 'intermediate', 'advanced')),
  timezone        TEXT NOT NULL DEFAULT 'Asia/Shanghai',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE toefl_task_number AS ENUM ('1', '2', '3', '4');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE toefl_task_type AS ENUM (
    'independent',
    'integrated_campus',
    'integrated_academic',
    'integrated_lecture'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE session_status AS ENUM (
    'pending', 'preparing', 'recording', 'processing', 'completed', 'abandoned'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ---------------------------------------------------------------------------
-- Practice tables
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS practice_sessions (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                 UUID NOT NULL REFERENCES app_users (id) ON DELETE CASCADE,
  task_number             toefl_task_number NOT NULL,
  task_type               toefl_task_type NOT NULL,
  prompt_text             TEXT NOT NULL,
  reading_passage         TEXT,
  listening_transcript    TEXT,
  audio_prompt_url        TEXT,
  prep_time_seconds       SMALLINT NOT NULL CHECK (prep_time_seconds IN (15, 20, 30)),
  response_time_seconds   SMALLINT NOT NULL CHECK (response_time_seconds IN (45, 60)),
  status                  session_status NOT NULL DEFAULT 'pending',
  prep_started_at         TIMESTAMPTZ,
  recording_started_at    TIMESTAMPTZ,
  completed_at            TIMESTAMPTZ,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_task_number_type CHECK (
    (task_number = '1' AND task_type = 'independent'
      AND prep_time_seconds = 15 AND response_time_seconds = 45)
    OR (task_number = '2' AND task_type = 'integrated_campus'
      AND prep_time_seconds = 30 AND response_time_seconds = 60)
    OR (task_number = '3' AND task_type = 'integrated_academic'
      AND prep_time_seconds = 30 AND response_time_seconds = 60)
    OR (task_number = '4' AND task_type = 'integrated_lecture'
      AND prep_time_seconds = 20 AND response_time_seconds = 60)
  )
);

CREATE INDEX IF NOT EXISTS idx_practice_sessions_user_id
  ON practice_sessions (user_id);
CREATE INDEX IF NOT EXISTS idx_practice_sessions_created_at
  ON practice_sessions (created_at DESC);

CREATE TABLE IF NOT EXISTS audio_responses (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id          UUID NOT NULL REFERENCES practice_sessions (id) ON DELETE CASCADE,
  user_id             UUID NOT NULL REFERENCES app_users (id) ON DELETE CASCADE,
  storage_path        TEXT NOT NULL,
  audio_url           TEXT,
  mime_type           TEXT NOT NULL DEFAULT 'audio/webm'
                    CHECK (mime_type IN ('audio/webm', 'audio/wav', 'audio/mpeg', 'audio/mp4')),
  file_size_bytes     INTEGER CHECK (file_size_bytes > 0),
  duration_seconds    NUMERIC(6, 2) NOT NULL CHECK (duration_seconds > 0),
  transcript          TEXT,
  transcript_language TEXT NOT NULL DEFAULT 'en-US',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_audio_responses_session UNIQUE (session_id)
);

CREATE INDEX IF NOT EXISTS idx_audio_responses_user_id ON audio_responses (user_id);

CREATE TABLE IF NOT EXISTS scores (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audio_response_id         UUID NOT NULL REFERENCES audio_responses (id) ON DELETE CASCADE,
  session_id                UUID NOT NULL REFERENCES practice_sessions (id) ON DELETE CASCADE,
  user_id                   UUID NOT NULL REFERENCES app_users (id) ON DELETE CASCADE,
  delivery_score            NUMERIC(2, 1) NOT NULL CHECK (delivery_score BETWEEN 0 AND 4),
  language_use_score        NUMERIC(2, 1) NOT NULL CHECK (language_use_score BETWEEN 0 AND 4),
  topic_development_score   NUMERIC(2, 1) NOT NULL CHECK (topic_development_score BETWEEN 0 AND 4),
  raw_total_score           NUMERIC(3, 1) GENERATED ALWAYS AS (
                              delivery_score + language_use_score + topic_development_score
                            ) STORED,
  scaled_score              SMALLINT NOT NULL CHECK (scaled_score BETWEEN 0 AND 30),
  delivery_feedback         TEXT,
  language_use_feedback     TEXT,
  topic_development_feedback TEXT,
  overall_feedback          TEXT,
  ai_model                  TEXT NOT NULL DEFAULT 'gpt-4o',
  ai_model_version          TEXT,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_scores_audio_response UNIQUE (audio_response_id)
);

CREATE INDEX IF NOT EXISTS idx_scores_user_id ON scores (user_id);
CREATE INDEX IF NOT EXISTS idx_scores_created_at ON scores (created_at DESC);

-- ---------------------------------------------------------------------------
-- updated_at trigger
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_app_users_updated_at ON app_users;
CREATE TRIGGER trg_app_users_updated_at
  BEFORE UPDATE ON app_users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_practice_sessions_updated_at ON practice_sessions;
CREATE TRIGGER trg_practice_sessions_updated_at
  BEFORE UPDATE ON practice_sessions
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
