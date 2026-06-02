import type { TypedSupabaseClient } from "@/lib/supabase";
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

function firstRelation<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function mapAudio(row: Record<string, unknown>): PracticeHistoryAudio {
  return {
    id: String(row.id),
    transcript: (row.transcript as string | null) ?? null,
    durationSeconds: Number(row.duration_seconds),
    audioUrl: (row.audio_url as string | null) ?? null,
    storagePath: String(row.storage_path),
    createdAt: String(row.created_at),
  };
}

function mapScore(row: Record<string, unknown>): PracticeHistoryScore {
  return {
    id: String(row.id),
    scaledScore: Number(row.scaled_score),
    deliveryScore: Number(row.delivery_score),
    languageUseScore: Number(row.language_use_score),
    topicDevelopmentScore: Number(row.topic_development_score),
    rawTotalScore:
      row.raw_total_score !== undefined && row.raw_total_score !== null
        ? Number(row.raw_total_score)
        : null,
    overallFeedback: (row.overall_feedback as string | null) ?? null,
    aiModel: String(row.ai_model),
    createdAt: String(row.created_at),
  };
}

function mapHistoryRow(row: Record<string, unknown>): PracticeHistoryItem {
  const audioRow = firstRelation(
    row.audio_responses as Record<string, unknown> | Record<string, unknown>[]
  );
  const scoreRow = firstRelation(
    row.scores as Record<string, unknown> | Record<string, unknown>[]
  );

  const session = mapPracticeSessionRow(row);

  return {
    session,
    audio: audioRow ? mapAudio(audioRow) : null,
    score: scoreRow ? mapScore(scoreRow) : null,
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
  supabase: TypedSupabaseClient,
  userId: string,
  query: PracticeHistoryQuery = {}
): Promise<PracticeHistoryResponse> {
  const { limit, offset, status, taskNumber } = normalizeHistoryQuery(query);

  let builder = supabase
    .from("practice_sessions")
    .select(
      `
        *,
        audio_responses (
          id,
          transcript,
          duration_seconds,
          audio_url,
          storage_path,
          created_at
        ),
        scores (
          id,
          scaled_score,
          delivery_score,
          language_use_score,
          topic_development_score,
          raw_total_score,
          overall_feedback,
          ai_model,
          created_at
        )
      `,
      { count: "exact" }
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (status) {
    builder = builder.eq("status", status);
  }
  if (taskNumber) {
    builder = builder.eq("task_number", taskNumber);
  }

  const { data, error, count } = await builder;

  if (error) {
    throw new Error(`Failed to load practice history: ${error.message}`);
  }

  const items = (data ?? []).map((row) =>
    mapHistoryRow(row as Record<string, unknown>)
  );

  return {
    items,
    total: count ?? items.length,
    limit,
    offset,
  };
}
