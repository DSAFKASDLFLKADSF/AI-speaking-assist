import { randomUUID } from "crypto";
import { newDb, type IMemoryDb } from "pg-mem";
import type { Pool, PoolClient } from "pg";

const globalForDevDb = globalThis as unknown as {
  devDb?: IMemoryDb;
  devPool?: Pool;
  devSchemaReady?: Promise<void>;
  devSchemaInitialized?: boolean;
};

export function isDevDatabaseEnabled(): boolean {
  return (
    process.env.NODE_ENV === "development" &&
    !process.env.DATABASE_URL?.trim()
  );
}

function getDevDb(): IMemoryDb {
  if (!globalForDevDb.devDb) {
    const db = newDb({ autoCreateForeignKeyIndices: true });
    db.public.registerFunction({
      name: "gen_random_uuid",
      returns: "uuid" as never,
      implementation: () => randomUUID(),
      impure: true,
    });
    db.public.registerFunction({
      name: "now",
      returns: "timestamptz" as never,
      implementation: () => new Date(),
      impure: true,
    });
    globalForDevDb.devDb = db;
  }
  return globalForDevDb.devDb;
}

/** Minimal schema for local dev (pg-mem compatible — no triggers/enums). */
const DEV_SCHEMA_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS app_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    display_name TEXT,
    avatar_url TEXT,
    native_language TEXT NOT NULL DEFAULT 'zh-CN',
    target_score SMALLINT NOT NULL DEFAULT 24,
    current_level TEXT,
    timezone TEXT NOT NULL DEFAULT 'Asia/Shanghai',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
  `CREATE TABLE IF NOT EXISTS practice_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
    task_number TEXT NOT NULL,
    task_type TEXT NOT NULL,
    prompt_text TEXT NOT NULL,
    reading_passage TEXT,
    listening_transcript TEXT,
    audio_prompt_url TEXT,
    prep_time_seconds SMALLINT NOT NULL,
    response_time_seconds SMALLINT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    prep_started_at TIMESTAMPTZ,
    recording_started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
  `CREATE TABLE IF NOT EXISTS audio_responses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES practice_sessions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
    storage_path TEXT NOT NULL,
    audio_url TEXT,
    mime_type TEXT NOT NULL DEFAULT 'audio/webm',
    file_size_bytes INTEGER,
    duration_seconds NUMERIC(6, 2) NOT NULL,
    transcript TEXT,
    transcript_language TEXT NOT NULL DEFAULT 'en-US',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_audio_responses_session UNIQUE (session_id)
  )`,
  `CREATE TABLE IF NOT EXISTS scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    audio_response_id UUID NOT NULL REFERENCES audio_responses(id) ON DELETE CASCADE,
    session_id UUID NOT NULL REFERENCES practice_sessions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
    delivery_score NUMERIC(2, 1) NOT NULL,
    language_use_score NUMERIC(2, 1) NOT NULL,
    topic_development_score NUMERIC(2, 1) NOT NULL,
    raw_total_score NUMERIC(3, 1),
    scaled_score SMALLINT NOT NULL,
    delivery_feedback TEXT,
    language_use_feedback TEXT,
    topic_development_feedback TEXT,
    overall_feedback TEXT,
    ai_model TEXT NOT NULL DEFAULT 'gpt-4o',
    ai_model_version TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_scores_audio_response UNIQUE (audio_response_id)
  )`,
];

async function ensureDevSchema(): Promise<void> {
  if (globalForDevDb.devSchemaInitialized) return;

  if (!globalForDevDb.devSchemaReady) {
    globalForDevDb.devSchemaReady = (async () => {
      const db = getDevDb();
      for (const statement of DEV_SCHEMA_STATEMENTS) {
        db.public.none(statement);
      }
      globalForDevDb.devSchemaInitialized = true;
    })();
  }
  await globalForDevDb.devSchemaReady;
}

export async function getDevPool(): Promise<Pool> {
  if (globalForDevDb.devPool) {
    return globalForDevDb.devPool;
  }
  await ensureDevSchema();
  const db = getDevDb();
  const { Pool: MemPool } = db.adapters.createPg();
  const pool = new MemPool();
  globalForDevDb.devPool = pool;
  return pool;
}

export async function devQuery<T extends Record<string, unknown>>(
  text: string,
  params?: unknown[]
): Promise<T[]> {
  const pool = await getDevPool();
  const result = await pool.query<T>(text, params);
  return result.rows;
}

export async function devWithTransaction<T>(
  fn: (client: PoolClient) => Promise<T>
): Promise<T> {
  const pool = await getDevPool();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}
