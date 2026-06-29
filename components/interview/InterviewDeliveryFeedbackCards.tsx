"use client";

import type { InterviewDeliveryFeedback } from "@/lib/analyze-interview-types";

export interface InterviewDeliveryFeedbackCardsProps {
  pace?: InterviewDeliveryFeedback;
  pronunciation?: InterviewDeliveryFeedback;
  className?: string;
}

function DeliveryCard({
  title,
  rubric,
  data,
  accent,
}: {
  title: string;
  rubric: string;
  data: InterviewDeliveryFeedback;
  accent: string;
}) {
  return (
    <div className={`rounded-lg border p-4 ${accent}`}>
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-700">
        {title}
      </p>
      <p className="mt-1 text-[11px] italic text-slate-500">{rubric}</p>
      <p className="mt-3 text-sm leading-relaxed text-slate-800">{data.summary}</p>
      {data.suggestion ? (
        <p className="mt-3 rounded-md bg-white/80 px-3 py-2 text-sm text-slate-700">
          <span className="font-medium text-slate-900">Try this: </span>
          {data.suggestion}
        </p>
      ) : null}
    </div>
  );
}

export function InterviewDeliveryFeedbackCards({
  pace,
  pronunciation,
  className = "",
}: InterviewDeliveryFeedbackCardsProps) {
  if (!pace && !pronunciation) return null;

  return (
    <div className={`grid gap-4 sm:grid-cols-2 ${className}`}>
      {pace ? (
        <DeliveryCard
          title="Pace & Pauses"
          rubric="Good conversational speaking pace is maintained with appropriate and natural use of pauses."
          data={pace}
          accent="border-blue-100 bg-blue-50/50"
        />
      ) : null}
      {pronunciation ? (
        <DeliveryCard
          title="Pronunciation, Rhythm & Intelligibility"
          rubric="Pronunciation is easily intelligible; rhythm and intonation effectively convey meaning."
          data={pronunciation}
          accent="border-violet-100 bg-violet-50/50"
        />
      ) : null}
    </div>
  );
}
