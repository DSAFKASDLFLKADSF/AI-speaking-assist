"use client";

import { InterviewClickableTranscript } from "@/components/interview/InterviewClickableTranscript";
import { InterviewDeliveryFeedbackCards } from "@/components/interview/InterviewDeliveryFeedbackCards";
import { InterviewScoreCard } from "@/components/InterviewScoreCard";
import { RecordingAudioPlayer } from "@/components/RecordingAudioPlayer";
import type { AnalyzeInterviewResponse } from "@/lib/analyze-interview-types";
import { buildPaceFeedbackFallback } from "@/lib/interviewDeliveryFallback";

export interface InterviewFeedbackPanelProps {
  question: string;
  analysis: AnalyzeInterviewResponse;
  audioUrl?: string;
  title?: string;
  defaultOpen?: boolean;
}

export function InterviewFeedbackPanel({
  question,
  analysis,
  audioUrl,
  title,
  defaultOpen = false,
}: InterviewFeedbackPanelProps) {
  const paceFeedback =
    analysis.paceFeedback ?? buildPaceFeedbackFallback(analysis.metrics);

  return (
    <details
      className="rounded-xl border border-slate-200 bg-white shadow-sm"
      open={defaultOpen}
    >
      <summary className="cursor-pointer list-none px-5 py-4 text-sm font-semibold text-slate-900 [&::-webkit-details-marker]:hidden">
        {title ?? "View detailed feedback"}
      </summary>
      <div className="space-y-5 border-t border-slate-100 px-5 pb-5 pt-4">
        <InterviewScoreCard
          scores={analysis.scores}
          feedback={analysis.scoreSummary}
        />

        {audioUrl ? <RecordingAudioPlayer src={audioUrl} /> : null}

        <div>
          <h4 className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Question
          </h4>
          <p className="mt-1 text-sm text-slate-800">{question}</p>
        </div>

        <InterviewDeliveryFeedbackCards
          pace={paceFeedback}
          pronunciation={analysis.pronunciationFeedback}
        />

        <InterviewClickableTranscript
          transcript={analysis.transcript}
          segments={analysis.transcriptSegments}
          transcriptReview={analysis.transcriptReview}
        />

        {analysis.feedback.summary &&
        !paceFeedback &&
        !analysis.pronunciationFeedback ? (
          <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
            {analysis.feedback.summary}
          </p>
        ) : null}
      </div>
    </details>
  );
}
