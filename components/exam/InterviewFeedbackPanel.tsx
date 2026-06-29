"use client";

import { FeedbackCard } from "@/components/FeedbackCard";
import { InterviewAnnotatedTranscript } from "@/components/InterviewAnnotatedTranscript";
import { InterviewScoreCard } from "@/components/InterviewScoreCard";
import { RecordingAudioPlayer } from "@/components/RecordingAudioPlayer";
import type { AnalyzeInterviewResponse } from "@/lib/analyze-interview-types";

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
  return (
    <details
      className="rounded-xl border border-slate-200 bg-white shadow-sm"
      open={defaultOpen}
    >
      <summary className="cursor-pointer list-none px-5 py-4 text-sm font-semibold text-slate-900 [&::-webkit-details-marker]:hidden">
        {title ?? "View detailed feedback"}
      </summary>
      <div className="space-y-4 border-t border-slate-100 px-5 pb-5 pt-4">
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

        <InterviewAnnotatedTranscript
          transcript={analysis.transcript}
          spans={analysis.transcriptReview}
        />

        <FeedbackCard
          summary={analysis.feedback.summary}
          sections={analysis.feedback.sections}
        />
      </div>
    </details>
  );
}
