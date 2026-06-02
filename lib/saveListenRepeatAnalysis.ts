import type { FeedbackSection } from "@/components/FeedbackCard";
import type { ListenRepeatScore } from "@/components/ScoreCard";
import type { TypedSupabaseClient } from "@/lib/supabase";

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
  supabase: TypedSupabaseClient,
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

  const { data: session, error: sessionError } = await supabase
    .from("practice_sessions")
    .insert({
      user_id: input.userId,
      task_number: "1",
      task_type: "independent",
      prompt_text: input.original,
      prep_time_seconds: 15,
      response_time_seconds: 45,
      status: "completed",
      completed_at: now,
    })
    .select("id")
    .single();

  if (sessionError || !session?.id) {
    throw new Error(
      `Failed to create practice session: ${sessionError?.message ?? "unknown"}`
    );
  }

  const sessionId = session.id as string;

  const { data: audioRow, error: audioError } = await supabase
    .from("audio_responses")
    .insert({
      session_id: sessionId,
      user_id: input.userId,
      storage_path: input.storagePath,
      audio_url: input.audioUrl,
      mime_type: input.mimeType ?? "audio/webm",
      file_size_bytes: input.fileSizeBytes ?? null,
      duration_seconds: Math.max(0.1, input.durationSeconds),
      transcript: input.transcript,
      transcript_language: "en-US",
    })
    .select("id")
    .single();

  if (audioError || !audioRow?.id) {
    throw new Error(
      `Failed to save audio response: ${audioError?.message ?? "unknown"}`
    );
  }

  const audioResponseId = audioRow.id as string;
  const { sections } = input.feedback;

  const { data: scoreRow, error: scoreError } = await supabase
    .from("scores")
    .insert({
      audio_response_id: audioResponseId,
      session_id: sessionId,
      user_id: input.userId,
      delivery_score: ets.delivery_score,
      language_use_score: ets.language_use_score,
      topic_development_score: ets.topic_development_score,
      scaled_score: ets.scaled_score,
      delivery_feedback:
        sectionContent(sections, "pronunciation", "delivery") ??
        input.scoreSummary,
      language_use_feedback:
        sectionContent(sections, "fluency", "language") ?? input.feedback.summary,
      topic_development_feedback:
        sectionContent(sections, "suggestion", "topic") ?? null,
      overall_feedback: input.feedback.summary,
      ai_model: input.aiModel ?? "python-api",
    })
    .select("id")
    .single();

  if (scoreError || !scoreRow?.id) {
    throw new Error(
      `Failed to save scores: ${scoreError?.message ?? "unknown"}`
    );
  }

  return {
    sessionId,
    audioResponseId,
    scoreId: scoreRow.id as string,
  };
}
