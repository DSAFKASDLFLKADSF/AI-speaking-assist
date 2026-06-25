import type { FeedbackSection } from "@/components/FeedbackCard";
import type { InterviewScores } from "@/components/InterviewScoreCard";
import { withTransaction } from "@/lib/db";
import type { PoolClient } from "pg";
import type { PythonBehaviorMetrics } from "@/lib/pythonSpeechApi";

export interface SaveInterviewInput {
  userId: string;
  audioUrl: string;
  storagePath: string;
  question: string;
  questionId?: string;
  transcript: string;
  scores: InterviewScores;
  scoreSummary: string;
  feedback: {
    summary: string;
    sections: FeedbackSection[];
  };
  metrics: PythonBehaviorMetrics;
  durationSeconds: number;
  responseSeconds: number;
  aiModel?: string;
}

export interface SavedInterviewRecord {
  sessionId: string;
  audioResponseId: string;
  scoreId: string;
}

function clampEts(value: number): number {
  return Math.min(4, Math.max(0, Math.round(value * 10) / 10));
}

function interviewToEts(scores: InterviewScores) {
  const delivery = clampEts(((scores.pace + scores.pronunciation) / 2 / 5) * 4);
  const language = clampEts((scores.grammar / 5) * 4);
  const topic = clampEts((scores.topic / 5) * 4);
  const avg = (scores.topic + scores.pace + scores.pronunciation + scores.grammar) / 4;
  return {
    delivery_score: delivery,
    language_use_score: language,
    topic_development_score: topic,
    scaled_score: Math.round((avg / 5) * 30),
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

export async function saveInterviewAnalysis(
  input: SaveInterviewInput
): Promise<SavedInterviewRecord> {
  const ets = interviewToEts(input.scores);
  const now = new Date().toISOString();
  const prepSeconds = 15;
  const responseSeconds = input.responseSeconds === 60 ? 60 : 45;
  const { sections } = input.feedback;

  return withTransaction(async (client: PoolClient) => {
    const sessionResult = await client.query<{ id: string }>(
      `INSERT INTO practice_sessions (
        user_id, task_number, task_type, prompt_text,
        prep_time_seconds, response_time_seconds, status, completed_at
      ) VALUES ($1, '1', 'independent', $2, $3, $4, 'completed', $5)
      RETURNING id`,
      [input.userId, input.question, prepSeconds, responseSeconds, now]
    );
    const sessionId = sessionResult.rows[0]?.id;
    if (!sessionId) {
      throw new Error("Failed to create practice session.");
    }

    const audioResult = await client.query<{ id: string }>(
      `INSERT INTO audio_responses (
        session_id, user_id, storage_path, audio_url, mime_type,
        duration_seconds, transcript, transcript_language
      ) VALUES ($1, $2, $3, $4, 'audio/webm', $5, $6, 'en-US')
      RETURNING id`,
      [
        sessionId,
        input.userId,
        input.storagePath,
        input.audioUrl,
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
        sectionContent(sections, "delivery", "pace") ?? input.scoreSummary,
        sectionContent(sections, "language", "grammar") ?? input.feedback.summary,
        sectionContent(sections, "topic") ?? null,
        input.feedback.summary || input.scoreSummary,
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
