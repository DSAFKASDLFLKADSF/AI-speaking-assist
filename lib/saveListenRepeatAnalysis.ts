import type { FeedbackSection } from "@/components/FeedbackCard";
import type { ListenRepeatScore } from "@/components/ScoreCard";
import { withTransaction } from "@/lib/db";
import type { PoolClient } from "pg";

export interface SaveListenRepeatInput {
  userId: string;
  audioUrl: string;
  storagePath: string;
  original: string;
  promptId?: string;
  transcript: string;
  score: ListenRepeatScore;
  scoreSummary: string;
  feedback: {
    summary: string;
    sections: FeedbackSection[];
  };
  durationSeconds: number;
  mimeType?: string;
  fileSizeBytes?: number;
  aiModel?: string;
  deliveryScore?: number;
  languageUseScore?: number;
  topicDevelopmentScore?: number;
}

export interface SavedListenRepeatRecord {
  sessionId: string;
  audioResponseId: string;
  scoreId: string;
}

function clampEtsScore(value: number): number {
  return Math.min(4, Math.max(0, Math.round(value * 10) / 10));
}

function listenRepeatToEts(score: ListenRepeatScore) {
  const normalized = clampEtsScore((score / 5) * 4);
  return {
    delivery_score: normalized,
    language_use_score: normalized,
    topic_development_score: normalized,
    scaled_score: Math.round((score / 5) * 30),
  };
}

function sectionContent(
  sections: FeedbackSection[],
  ...titles: string[]
): string | null {
  const lowerTitles = titles.map((t) => t.toLowerCase());
  const match = sections.find((s) =>
    lowerTitles.some((t) => s.title.toLowerCase().includes(t))
  );
  return match?.content ?? null;
}

export async function saveListenRepeatAnalysis(
  input: SaveListenRepeatInput
): Promise<SavedListenRepeatRecord> {
  const ets =
    input.deliveryScore !== undefined &&
    input.languageUseScore !== undefined &&
    input.topicDevelopmentScore !== undefined
      ? {
          delivery_score: clampEtsScore(input.deliveryScore),
          language_use_score: clampEtsScore(input.languageUseScore),
          topic_development_score: clampEtsScore(input.topicDevelopmentScore),
          scaled_score: Math.round(
            ((input.deliveryScore +
              input.languageUseScore +
              input.topicDevelopmentScore) /
              12) *
              30
          ),
        }
      : listenRepeatToEts(input.score);

  const now = new Date().toISOString();
  const { sections } = input.feedback;

  return withTransaction(async (client: PoolClient) => {
    const sessionResult = await client.query<{ id: string }>(
      `INSERT INTO practice_sessions (
        user_id, task_number, task_type, prompt_text,
        prep_time_seconds, response_time_seconds, status, completed_at
      ) VALUES ($1, '1', 'independent', $2, 15, 45, 'completed', $3)
      RETURNING id`,
      [input.userId, input.original, now]
    );
    const sessionId = sessionResult.rows[0]?.id;
    if (!sessionId) {
      throw new Error("Failed to create practice session.");
    }

    const audioResult = await client.query<{ id: string }>(
      `INSERT INTO audio_responses (
        session_id, user_id, storage_path, audio_url, mime_type,
        file_size_bytes, duration_seconds, transcript, transcript_language
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'en-US')
      RETURNING id`,
      [
        sessionId,
        input.userId,
        input.storagePath,
        input.audioUrl,
        input.mimeType ?? "audio/webm",
        input.fileSizeBytes ?? null,
        Math.max(0.1, input.durationSeconds),
        input.transcript,
      ]
    );
    const audioResponseId = audioResult.rows[0]?.id;
    if (!audioResponseId) {
      throw new Error("Failed to save audio response.");
    }

    const scoreResult = await client.query<{ id: string }>(
      `INSERT INTO scores (
        audio_response_id, session_id, user_id,
        delivery_score, language_use_score, topic_development_score,
        scaled_score, delivery_feedback, language_use_feedback,
        topic_development_feedback, overall_feedback, ai_model
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING id`,
      [
        audioResponseId,
        sessionId,
        input.userId,
        ets.delivery_score,
        ets.language_use_score,
        ets.topic_development_score,
        ets.scaled_score,
        sectionContent(sections, "pronunciation", "delivery") ??
          input.scoreSummary,
        sectionContent(sections, "fluency", "language") ??
          input.feedback.summary,
        sectionContent(sections, "suggestion", "topic") ?? null,
        input.feedback.summary,
        input.aiModel ?? "python-api",
      ]
    );
    const scoreId = scoreResult.rows[0]?.id;
    if (!scoreId) {
      throw new Error("Failed to save scores.");
    }

    return { sessionId, audioResponseId, scoreId };
  });
}
