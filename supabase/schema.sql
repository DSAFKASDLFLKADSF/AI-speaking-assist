-- =============================================================================
-- AI Speaking Trainer — TOEFL Speaking Schema
-- Run in Supabase SQL Editor (Dashboard → SQL → New query)
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Extensions
-- ---------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ---------------------------------------------------------------------------
-- Enums (TOEFL-specific)
-- ---------------------------------------------------------------------------

-- Task 1: Independent | Task 2: Campus Integration | Task 3: Academic Integration | Task 4: Lecture Integration
CREATE TYPE toefl_task_number AS ENUM ('1', '2', '3', '4');

CREATE TYPE toefl_task_type AS ENUM (
  'independent',           -- Task 1: 15s prep / 45s response
  'integrated_campus',     -- Task 2: 30s prep / 60s response (read + conversation)
  'integrated_academic',   -- Task 3: 30s prep / 60s response (read + lecture)
  'integrated_lecture'     -- Task 4: 20s prep / 60s response (lecture only)
);

CREATE TYPE session_status AS ENUM (
  'pending',
  'preparing',
  'recording',
  'processing',
  'completed',
  'abandoned'
);

-- ETS rubric: 0–4 per dimension; speaking section total 0–30
CREATE TYPE score_dimension AS ENUM (
  'delivery',
  'language_use',
  'topic_development'
);

-- ---------------------------------------------------------------------------
-- 1. users — profile extending Supabase auth.users
-- ---------------------------------------------------------------------------
CREATE TABLE users (
  id              UUID        PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  email           TEXT        NOT NULL UNIQUE,
  display_name    TEXT,
  avatar_url      TEXT,
  native_language TEXT        NOT NULL DEFAULT 'zh-CN',
  target_score    SMALLINT    NOT NULL DEFAULT 24
                            CHECK (target_score BETWEEN 0 AND 30),
  current_level   TEXT        CHECK (current_level IN ('beginner', 'intermediate', 'advanced')),
  timezone        TEXT        NOT NULL DEFAULT 'Asia/Shanghai',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  users IS 'User profiles for TOEFL speaking practice';
COMMENT ON COLUMN users.target_score IS 'Target TOEFL speaking section score (0–30)';

-- ---------------------------------------------------------------------------
-- 2. practice_sessions — one TOEFL speaking attempt
-- ---------------------------------------------------------------------------
CREATE TABLE practice_sessions (
  id                      UUID              PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                 UUID              NOT NULL REFERENCES users (id) ON DELETE CASCADE,

  -- TOEFL task metadata
  task_number             toefl_task_number NOT NULL,
  task_type               toefl_task_type   NOT NULL,
  prompt_text             TEXT              NOT NULL,
  reading_passage         TEXT,             -- Tasks 2 & 3
  listening_transcript    TEXT,             -- Tasks 2, 3 & 4
  audio_prompt_url        TEXT,             -- listening audio for integrated tasks

  -- Timing (seconds) — matches official TOEFL limits
  prep_time_seconds       SMALLINT          NOT NULL
                        CHECK (prep_time_seconds IN (15, 20, 30)),
  response_time_seconds   SMALLINT          NOT NULL
                        CHECK (response_time_seconds IN (45, 60)),

  -- Session lifecycle
  status                  session_status    NOT NULL DEFAULT 'pending',
  prep_started_at         TIMESTAMPTZ,
  recording_started_at    TIMESTAMPTZ,
  completed_at            TIMESTAMPTZ,

  created_at              TIMESTAMPTZ       NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ       NOT NULL DEFAULT NOW(),

  -- Task number must align with task type
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

CREATE INDEX idx_practice_sessions_user_id    ON practice_sessions (user_id);
CREATE INDEX idx_practice_sessions_created_at ON practice_sessions (created_at DESC);
CREATE INDEX idx_practice_sessions_task       ON practice_sessions (task_number, task_type);

COMMENT ON TABLE practice_sessions IS 'Single TOEFL speaking practice attempt (Tasks 1–4)';

-- ---------------------------------------------------------------------------
-- 3. audio_responses — recorded speaking audio for a session
-- ---------------------------------------------------------------------------
CREATE TABLE audio_responses (
  id                  UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id          UUID          NOT NULL REFERENCES practice_sessions (id) ON DELETE CASCADE,
  user_id             UUID          NOT NULL REFERENCES users (id) ON DELETE CASCADE,

  storage_path        TEXT          NOT NULL,   -- Supabase Storage path
  audio_url           TEXT,                     -- public/signed URL cache
  mime_type           TEXT          NOT NULL DEFAULT 'audio/webm'
                    CHECK (mime_type IN ('audio/webm', 'audio/wav', 'audio/mpeg', 'audio/mp4')),
  file_size_bytes     INTEGER       CHECK (file_size_bytes > 0),
  duration_seconds    NUMERIC(6, 2) NOT NULL CHECK (duration_seconds > 0),

  -- Speech-to-text output
  transcript          TEXT,
  transcript_language TEXT          NOT NULL DEFAULT 'en-US',

  created_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  CONSTRAINT uq_audio_responses_session UNIQUE (session_id)
);

CREATE INDEX idx_audio_responses_user_id    ON audio_responses (user_id);
CREATE INDEX idx_audio_responses_session_id ON audio_responses (session_id);

COMMENT ON TABLE audio_responses IS 'User audio recording linked to a practice session';

-- ---------------------------------------------------------------------------
-- 4. scores — ETS-style rubric scores (Delivery / Language Use / Topic Development)
-- ---------------------------------------------------------------------------
CREATE TABLE scores (
  id                        UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  audio_response_id         UUID          NOT NULL REFERENCES audio_responses (id) ON DELETE CASCADE,
  session_id                UUID          NOT NULL REFERENCES practice_sessions (id) ON DELETE CASCADE,
  user_id                   UUID          NOT NULL REFERENCES users (id) ON DELETE CASCADE,

  -- Raw rubric scores (ETS 0–4 scale per dimension)
  delivery_score            NUMERIC(2, 1) NOT NULL CHECK (delivery_score BETWEEN 0 AND 4),
  language_use_score        NUMERIC(2, 1) NOT NULL CHECK (language_use_score BETWEEN 0 AND 4),
  topic_development_score   NUMERIC(2, 1) NOT NULL CHECK (topic_development_score BETWEEN 0 AND 4),

  -- Derived scores
  raw_total_score           NUMERIC(3, 1) GENERATED ALWAYS AS (
                              delivery_score + language_use_score + topic_development_score
                            ) STORED,
  scaled_score              SMALLINT      NOT NULL CHECK (scaled_score BETWEEN 0 AND 30),

  -- AI feedback per dimension
  delivery_feedback         TEXT,
  language_use_feedback     TEXT,
  topic_development_feedback TEXT,
  overall_feedback          TEXT,

  ai_model                  TEXT          NOT NULL DEFAULT 'gpt-4o',
  ai_model_version          TEXT,

  created_at                TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  CONSTRAINT uq_scores_audio_response UNIQUE (audio_response_id)
);

CREATE INDEX idx_scores_user_id    ON scores (user_id);
CREATE INDEX idx_scores_session_id ON scores (session_id);
CREATE INDEX idx_scores_created_at ON scores (created_at DESC);

COMMENT ON TABLE  scores IS 'TOEFL speaking rubric scores for an audio response';
COMMENT ON COLUMN scores.scaled_score IS 'Estimated TOEFL speaking score (0–30)';

-- ---------------------------------------------------------------------------
-- 5. behavior_metrics — quantitative speaking behavior analytics
-- ---------------------------------------------------------------------------
CREATE TABLE behavior_metrics (
  id                          UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  audio_response_id           UUID          NOT NULL REFERENCES audio_responses (id) ON DELETE CASCADE,
  session_id                  UUID          NOT NULL REFERENCES practice_sessions (id) ON DELETE CASCADE,
  user_id                     UUID          NOT NULL REFERENCES users (id) ON DELETE CASCADE,

  -- Fluency
  word_count                  INTEGER       NOT NULL DEFAULT 0 CHECK (word_count >= 0),
  unique_word_count           INTEGER       NOT NULL DEFAULT 0 CHECK (unique_word_count >= 0),
  speaking_rate_wpm           NUMERIC(5, 1) CHECK (speaking_rate_wpm >= 0),   -- words per minute
  speech_duration_seconds     NUMERIC(6, 2) NOT NULL CHECK (speech_duration_seconds >= 0),
  silence_duration_seconds    NUMERIC(6, 2) NOT NULL DEFAULT 0 CHECK (silence_duration_seconds >= 0),

  -- Pauses & disfluencies
  pause_count                 INTEGER       NOT NULL DEFAULT 0 CHECK (pause_count >= 0),
  long_pause_count            INTEGER       NOT NULL DEFAULT 0 CHECK (long_pause_count >= 0),  -- > 1s
  average_pause_duration_ms   INTEGER       CHECK (average_pause_duration_ms >= 0),
  filler_word_count           INTEGER       NOT NULL DEFAULT 0 CHECK (filler_word_count >= 0), -- um, uh, like
  repetition_count            INTEGER       NOT NULL DEFAULT 0 CHECK (repetition_count >= 0),
  self_correction_count       INTEGER       NOT NULL DEFAULT 0 CHECK (self_correction_count >= 0),

  -- Pronunciation & lexical richness
  pronunciation_error_count   INTEGER       NOT NULL DEFAULT 0 CHECK (pronunciation_error_count >= 0),
  lexical_diversity           NUMERIC(4, 3) CHECK (lexical_diversity BETWEEN 0 AND 1),  -- TTR

  -- Response completeness (vs. allotted time)
  response_time_limit_seconds SMALLINT      NOT NULL CHECK (response_time_limit_seconds IN (45, 60)),
  response_utilization_pct    NUMERIC(5, 2) CHECK (response_utilization_pct BETWEEN 0 AND 100),

  created_at                  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  CONSTRAINT uq_behavior_metrics_audio_response UNIQUE (audio_response_id)
);

CREATE INDEX idx_behavior_metrics_user_id    ON behavior_metrics (user_id);
CREATE INDEX idx_behavior_metrics_session_id ON behavior_metrics (session_id);

COMMENT ON TABLE behavior_metrics IS 'Quantitative fluency and delivery metrics for TOEFL speaking analysis';

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

CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_practice_sessions_updated_at
  BEFORE UPDATE ON practice_sessions
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security (RLS)
-- ---------------------------------------------------------------------------
ALTER TABLE users              ENABLE ROW LEVEL SECURITY;
ALTER TABLE practice_sessions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE audio_responses    ENABLE ROW LEVEL SECURITY;
ALTER TABLE scores             ENABLE ROW LEVEL SECURITY;
ALTER TABLE behavior_metrics   ENABLE ROW LEVEL SECURITY;

-- users
CREATE POLICY "users_select_own" ON users
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY "users_insert_own" ON users
  FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "users_update_own" ON users
  FOR UPDATE USING (auth.uid() = id);

-- practice_sessions
CREATE POLICY "sessions_select_own" ON practice_sessions
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "sessions_insert_own" ON practice_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "sessions_update_own" ON practice_sessions
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "sessions_delete_own" ON practice_sessions
  FOR DELETE USING (auth.uid() = user_id);

-- audio_responses
CREATE POLICY "audio_select_own" ON audio_responses
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "audio_insert_own" ON audio_responses
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "audio_update_own" ON audio_responses
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "audio_delete_own" ON audio_responses
  FOR DELETE USING (auth.uid() = user_id);

-- scores
CREATE POLICY "scores_select_own" ON scores
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "scores_insert_own" ON scores
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- behavior_metrics
CREATE POLICY "metrics_select_own" ON behavior_metrics
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "metrics_insert_own" ON behavior_metrics
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Auto-create user profile on sign-up
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, display_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'display_name', NEW.raw_user_meta_data ->> 'full_name'),
    NEW.raw_user_meta_data ->> 'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
