import type { FeedbackSection } from "@/components/FeedbackCard";
import type { InterviewScores } from "@/components/InterviewScoreCard";
import type { TypedSupabaseClient } from "@/lib/supabase";
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
  supabase: TypedSupabaseClient,
  input: SaveInterviewInput
): Promise<SavedInterviewRecord> {
  const ets = interviewToEts(input.scores);
  const now = new Date().toISOString();
  const prepSeconds = 15;
  const responseSeconds = input.responseSeconds === 60 ? 60 : 45;

  const { data: session, error: sessionError } = await supabase
    .from("practice_sessions")
    .insert({
      user_id: input.userId,
      task_number: "1",
      task_type: "independent",
      prompt_text: input.question,
      prep_time_seconds: prepSeconds,
      response_time_seconds: responseSeconds,
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
      mime_type: "audio/webm",
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
        sectionContent(sections, "delivery", "pace") ?? input.scoreSummary,
      language_use_feedback:
        sectionContent(sections, "language", "grammar") ?? input.feedback.summary,
      topic_development_feedback:
        sectionContent(sections, "topic") ?? null,
      overall_feedback: input.feedback.summary || input.scoreSummary,
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
