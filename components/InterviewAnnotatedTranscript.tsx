import type { ReactNode } from "react";
import type { InterviewTranscriptSpan } from "@/lib/analyze-interview-types";

export interface InterviewAnnotatedTranscriptProps {
  transcript: string;
  spans?: InterviewTranscriptSpan[];
  className?: string;
}

const KIND_CLASS: Record<InterviewTranscriptSpan["kind"], string> = {
  grammar: "bg-red-100 text-red-900 underline decoration-red-400 decoration-wavy",
  improvement:
    "bg-amber-100 text-amber-900 underline decoration-amber-500 decoration-dotted",
  strong: "bg-emerald-100 text-emerald-900",
};

function annotateTranscript(
  transcript: string,
  spans: InterviewTranscriptSpan[]
): ReactNode[] {
  if (!transcript.trim() || spans.length === 0) {
    return [transcript];
  }

  type Mark = { start: number; end: number; span: InterviewTranscriptSpan };
  const marks: Mark[] = [];

  for (const span of spans) {
    const needle = span.text.trim();
    if (!needle) continue;
    let from = 0;
    while (from < transcript.length) {
      const idx = transcript.indexOf(needle, from);
      if (idx === -1) break;
      marks.push({ start: idx, end: idx + needle.length, span });
      from = idx + needle.length;
    }
  }

  if (marks.length === 0) {
    return [transcript];
  }

  marks.sort((a, b) => a.start - b.start || b.end - a.end);
  const merged: Mark[] = [];
  for (const mark of marks) {
    const last = merged[merged.length - 1];
    if (last && mark.start < last.end) continue;
    merged.push(mark);
  }

  const nodes: ReactNode[] = [];
  let cursor = 0;
  merged.forEach((mark, i) => {
    if (mark.start > cursor) {
      nodes.push(transcript.slice(cursor, mark.start));
    }
    nodes.push(
      <mark
        key={`${mark.start}-${mark.end}-${i}`}
        title={mark.span.note}
        className={`rounded px-0.5 ${KIND_CLASS[mark.span.kind]}`}
      >
        {transcript.slice(mark.start, mark.end)}
      </mark>
    );
    cursor = mark.end;
  });
  if (cursor < transcript.length) {
    nodes.push(transcript.slice(cursor));
  }
  return nodes;
}

export function InterviewAnnotatedTranscript({
  transcript,
  spans = [],
  className = "",
}: InterviewAnnotatedTranscriptProps) {
  const hasSpans = spans.length > 0;

  return (
    <div className={className}>
      <h4 className="text-xs font-medium uppercase tracking-wide text-slate-500">
        What you said
      </h4>
      <p className="mt-2 rounded-lg bg-slate-50 p-3 text-sm leading-relaxed text-slate-800">
        {hasSpans ? annotateTranscript(transcript, spans) : transcript}
      </p>

      {hasSpans && (
        <>
          <ul className="mt-3 space-y-2 text-sm text-slate-700">
            {spans.map((span, i) => (
              <li
                key={`${span.text}-${i}`}
                className="rounded-lg border border-slate-100 bg-white px-3 py-2"
              >
                <span
                  className={`mr-2 inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                    span.kind === "grammar"
                      ? "bg-red-100 text-red-800"
                      : span.kind === "improvement"
                        ? "bg-amber-100 text-amber-800"
                        : "bg-emerald-100 text-emerald-800"
                  }`}
                >
                  {span.kind === "grammar"
                    ? "Grammar"
                    : span.kind === "improvement"
                      ? "Improve"
                      : "Strong"}
                </span>
                <span className="font-medium text-slate-900">
                  &ldquo;{span.text}&rdquo;
                </span>
                {span.note ? (
                  <span className="text-slate-600"> — {span.note}</span>
                ) : null}
              </li>
            ))}
          </ul>
          <p className="mt-2 text-[10px] text-slate-400">
            Highlighted text marks grammar issues (red), ideas to improve (amber),
            and strong phrasing (green).
          </p>
        </>
      )}
    </div>
  );
}
