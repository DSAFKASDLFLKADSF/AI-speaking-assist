import { query } from "@/lib/db";
import type {
  PracticeHistoryAudio,
  PracticeHistoryItem,
  PracticeHistoryQuery,
  PracticeHistoryResponse,
  PracticeHistoryScore,
} from "@/lib/history-types";
import { mapPracticeSessionRow } from "@/lib/practiceSessionMapper";

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

interface HistoryRow extends Record<string, unknown> {
  ar_id: string | null;
  ar_transcript: string | null;
  ar_duration_seconds: string | number | null;
  ar_audio_url: string | null;
  ar_storage_path: string | null;
  ar_created_at: string | Date | null;
  sc_id: string | null;
  sc_scaled_score: number | null;
  sc_delivery_score: string | number | null;
  sc_language_use_score: string | number | null;
  sc_topic_development_score: string | number | null;
  sc_raw_total_score: string | number | null;
  sc_overall_feedback: string | null;
  sc_ai_model: string | null;
  sc_created_at: string | Date | null;
}

function mapAudioFromRow(row: HistoryRow): PracticeHistoryAudio | null {
  if (!row.ar_id) return null;
  return {
    id: row.ar_id,
    transcript: row.ar_transcript ?? null,
    durationSeconds: Number(row.ar_duration_seconds),
    audioUrl: row.ar_audio_url ?? null,
    storagePath: String(row.ar_storage_path),
    createdAt:
      row.ar_created_at instanceof Date
        ? row.ar_created_at.toISOString()
        : String(row.ar_created_at),
  };
}

function mapScoreFromRow(row: HistoryRow): PracticeHistoryScore | null {
  if (!row.sc_id) return null;
  return {
    id: row.sc_id,
    scaledScore: Number(row.sc_scaled_score),
    deliveryScore: Number(row.sc_delivery_score),
    languageUseScore: Number(row.sc_language_use_score),
    topicDevelopmentScore: Number(row.sc_topic_development_score),
    rawTotalScore:
      row.sc_raw_total_score !== undefined && row.sc_raw_total_score !== null
        ? Number(row.sc_raw_total_score)
        : null,
    overallFeedback: row.sc_overall_feedback ?? null,
    aiModel: String(row.sc_ai_model),
    createdAt:
      row.sc_created_at instanceof Date
        ? row.sc_created_at.toISOString()
        : String(row.sc_created_at),
  };
}

function mapHistoryRow(row: HistoryRow): PracticeHistoryItem {
  const session = mapPracticeSessionRow(row);
  return {
    session,
    audio: mapAudioFromRow(row),
    score: mapScoreFromRow(row),
  };
}

export function normalizeHistoryQuery(
  query: PracticeHistoryQuery
): Required<Pick<PracticeHistoryQuery, "limit" | "offset">> &
  Pick<PracticeHistoryQuery, "status" | "taskNumber"> {
  const limit = Math.min(
    MAX_LIMIT,
    Math.max(1, Math.floor(query.limit ?? DEFAULT_LIMIT))
  );
  const offset = Math.max(0, Math.floor(query.offset ?? 0));

  return {
    limit,
    offset,
    status: query.status,
    taskNumber: query.taskNumber,
  };
}

export async function getPracticeHistory(
  userId: string,
  queryInput: PracticeHistoryQuery = {}
): Promise<PracticeHistoryResponse> {
  const { limit, offset, status, taskNumber } =
    normalizeHistoryQuery(queryInput);

  const conditions = ["ps.user_id = $1"];
  const params: unknown[] = [userId];

  if (status) {
    params.push(status);
    conditions.push(`ps.status = $${params.length}`);
  }
  if (taskNumber) {
    params.push(taskNumber);
    conditions.push(`ps.task_number = $${params.length}`);
  }

  const whereClause = conditions.join(" AND ");

  const countRows = await query<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM practice_sessions ps WHERE ${whereClause}`,
    params
  );
  const total = Number(countRows[0]?.count ?? 0);

  params.push(limit, offset);
  const limitParam = params.length - 1;
  const offsetParam = params.length;

  const rows = await query<HistoryRow>(
    `SELECT
      ps.*,
      ar.id AS ar_id,
      ar.transcript AS ar_transcript,
      ar.duration_seconds AS ar_duration_seconds,
      ar.audio_url AS ar_audio_url,
      ar.storage_path AS ar_storage_path,
      ar.created_at AS ar_created_at,
      sc.id AS sc_id,
      sc.scaled_score AS sc_scaled_score,
      sc.delivery_score AS sc_delivery_score,
      sc.language_use_score AS sc_language_use_score,
      sc.topic_development_score AS sc_topic_development_score,
      sc.raw_total_score AS sc_raw_total_score,
      sc.overall_feedback AS sc_overall_feedback,
      sc.ai_model AS sc_ai_model,
      sc.created_at AS sc_created_at
    FROM practice_sessions ps
    LEFT JOIN audio_responses ar ON ar.session_id = ps.id
    LEFT JOIN scores sc ON sc.session_id = ps.id
    WHERE ${whereClause}
    ORDER BY ps.created_at DESC
    LIMIT $${limitParam} OFFSET $${offsetParam}`,
    params
  );

  const items = rows.map(mapHistoryRow);

  return {
    items,
    total,
    limit,
    offset,
  };
}
