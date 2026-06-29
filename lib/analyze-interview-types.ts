import type { BehaviorMetrics } from "@/components/BehaviorMetricsCard";
import type { FeedbackSection } from "@/components/FeedbackCard";
import type { InterviewScores } from "@/components/InterviewScoreCard";

/** @deprecated Legacy span format — use transcriptSegments */
export type InterviewTranscriptSpanKind = "grammar" | "improvement" | "strong";

/** @deprecated Legacy span format */
export interface InterviewTranscriptSpan {
  text: string;
  kind: InterviewTranscriptSpanKind;
  note: string;
}

export interface InterviewSegmentIssue {
  whatNeedsImprovement: string;
  whyItMatters: string;
  knowledgePoint?: string;
}

export interface InterviewTranscriptSegment {
  text: string;
  hasIssue: boolean;
  topicDevelopment?: InterviewSegmentIssue;
  grammarVocabulary?: InterviewSegmentIssue;
  conciseness?: InterviewSegmentIssue;
  improvedVersion?: string;
}

export interface InterviewDeliveryFeedback {
  summary: string;
  suggestion: string;
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
  /** Sentence / idea-group segments with optional click feedback */
  transcriptSegments?: InterviewTranscriptSegment[];
  /** @deprecated Use transcriptSegments */
  transcriptReview?: InterviewTranscriptSpan[];
  paceFeedback?: InterviewDeliveryFeedback;
  pronunciationFeedback?: InterviewDeliveryFeedback;
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
