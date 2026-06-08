"use client";

import { formatHintExamples } from "@/lib/interviewHintContent";
import type { InterviewPrompt } from "@/lib/interviewPrompts";

export interface InterviewHintPanelProps {
  question: InterviewPrompt;
  visible: boolean;
  className?: string;
}

export function InterviewHintPanel({
  question,
  visible,
  className = "",
}: InterviewHintPanelProps) {
  if (!visible) return null;

  const bullets = question.hints;

  return (
    <aside
      className={`rounded-lg border border-violet-200 bg-violet-50/80 p-4 ${className}`}
      aria-label="Answer talking points"
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-violet-800">
        Hint — talking points
      </p>
      <p className="mt-1 text-[11px] text-violet-700">
        Pick one bullet, state the claim, then add your own example.
      </p>
      <ul className="mt-3 space-y-2.5">
        {bullets.map(({ claim, examples }) => (
          <li key={claim} className="flex gap-2 text-sm leading-relaxed">
            <span className="mt-0.5 shrink-0 text-violet-400" aria-hidden="true">
              •
            </span>
            <span className="text-violet-950">
              <span className="font-medium">{claim}</span>
              {examples.length > 0 && (
                <span className="text-violet-800">
                  {" "}
                  — {formatHintExamples(examples)}
                </span>
              )}
            </span>
          </li>
        ))}
      </ul>
    </aside>
  );
}
