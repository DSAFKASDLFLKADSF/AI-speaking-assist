"use client";

import { ComparisonText } from "@/components/ComparisonText";
import { ScoreCard } from "@/components/ScoreCard";
import type { AnalyzeSpeechResponse } from "@/lib/analyze-speech-types";

export interface ListenRepeatFeedbackPanelProps {
  original: string;
  analysis: AnalyzeSpeechResponse;
  title?: string;
  defaultOpen?: boolean;
}

export function ListenRepeatFeedbackPanel({
  original,
  analysis,
  title,
  defaultOpen = false,
}: ListenRepeatFeedbackPanelProps) {
  return (
    <details
      className="rounded-xl border border-slate-200 bg-white shadow-sm"
      open={defaultOpen}
    >
      <summary className="cursor-pointer list-none px-5 py-4 text-sm font-semibold text-slate-900 [&::-webkit-details-marker]:hidden">
        {title ?? "View detailed feedback"}
      </summary>
      <div className="space-y-4 border-t border-slate-100 px-5 pb-5 pt-4">
        <ScoreCard score={analysis.score} feedback={analysis.scoreSummary} />

        <div>
          <h4 className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Original prompt
          </h4>
          <p className="mt-1 text-sm text-slate-800">{original}</p>
        </div>

        <div>
          <h4 className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Your transcript
          </h4>
          <p className="mt-1 text-sm text-slate-800">{analysis.transcript}</p>
        </div>

        <ComparisonText
          original={original}
          user={analysis.transcript}
          words={analysis.words}
          showLegend
        />

        {analysis.feedback.sections.length > 0 && (
          <div className="rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
            <p className="font-medium text-slate-900">{analysis.feedback.summary}</p>
            <ul className="mt-2 space-y-2">
              {analysis.feedback.sections.map((s) => (
                <li key={s.title}>
                  <span className="font-medium">{s.title}: </span>
                  {s.content}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </details>
  );
}
