import type { BehaviorMetrics } from "@/components/BehaviorMetricsCard";
import type { FeedbackSection } from "@/components/FeedbackCard";
import type { InterviewScores } from "@/components/InterviewScoreCard";

export type InterviewTranscriptSpanKind = "grammar" | "improvement" | "strong";

export interface InterviewTranscriptSpan {
  text: string;
  kind: InterviewTranscriptSpanKind;
  note: string;
}

export interface AnalyzeInterviewRequest {
  audioUrl: string;
  storagePath: string;
  prompt: string;
  questionId?: string;
  responseSeconds: number;
  durationMs: number;
}

export interface AnalyzeInterviewResponse {
  transcript: string;
  transcriptReview?: InterviewTranscriptSpan[];
  scores: InterviewScores;
  scoreSummary: string;
  metrics: BehaviorMetrics;
  feedback: {
    summary: string;
    sections: FeedbackSection[];
  };
  storagePath?: string;
  persisted?: boolean;
  sessionId?: string;
  persistError?: string;
}

export interface AnalyzeInterviewError {
  error: string;
}
