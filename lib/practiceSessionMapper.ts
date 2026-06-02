import type {
  PracticeSessionRecord,
  SessionStatus,
  ToeflTaskNumber,
  ToeflTaskType,
} from "@/lib/session-types";

export function mapPracticeSessionRow(
  row: Record<string, unknown>
): PracticeSessionRecord {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    taskNumber: String(row.task_number) as ToeflTaskNumber,
    taskType: String(row.task_type) as ToeflTaskType,
    promptText: String(row.prompt_text),
    readingPassage: (row.reading_passage as string | null) ?? null,
    listeningTranscript: (row.listening_transcript as string | null) ?? null,
    audioPromptUrl: (row.audio_prompt_url as string | null) ?? null,
    prepTimeSeconds: Number(row.prep_time_seconds),
    responseTimeSeconds: Number(row.response_time_seconds),
    status: String(row.status) as SessionStatus,
    prepStartedAt: (row.prep_started_at as string | null) ?? null,
    recordingStartedAt: (row.recording_started_at as string | null) ?? null,
    completedAt: (row.completed_at as string | null) ?? null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}
