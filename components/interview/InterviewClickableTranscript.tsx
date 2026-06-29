"use client";

import { useMemo, useState } from "react";
import type { InterviewTranscriptSegment } from "@/lib/analyze-interview-types";
import { resolveInterviewTranscriptSegments } from "@/lib/interviewTranscriptFeedback";
import {
  InterviewSegmentFeedbackDetail,
  InterviewSegmentTagLegend,
  segmentTags,
} from "@/components/interview/InterviewSegmentFeedbackDetail";

export interface InterviewClickableTranscriptProps {
  transcript: string;
  segments?: InterviewTranscriptSegment[];
  transcriptReview?: import("@/lib/analyze-interview-types").InterviewTranscriptSpan[];
  className?: string;
}

export function InterviewClickableTranscript({
  transcript,
  segments: segmentsProp,
  transcriptReview,
  className = "",
}: InterviewClickableTranscriptProps) {
  const segments = useMemo(
    () =>
      resolveInterviewTranscriptSegments({
        transcript,
        transcriptSegments: segmentsProp,
        transcriptReview,
      }),
    [transcript, segmentsProp, transcriptReview]
  );

  const issueIndices = useMemo(
    () =>
      segments
        .map((seg, i) => (seg.hasIssue ? i : -1))
        .filter((i) => i >= 0),
    [segments]
  );

  const [selectedIndex, setSelectedIndex] = useState<number | null>(
    issueIndices[0] ?? null
  );

  const selected =
    selectedIndex != null ? segments[selectedIndex] : undefined;

  return (
    <div className={className}>
      <h4 className="text-xs font-medium uppercase tracking-wide text-slate-500">
        What you said
      </h4>
      <p className="mt-2 text-[11px] text-slate-500">
        Tap a highlighted sentence to see detailed feedback.
      </p>

      <div className="mt-3 rounded-lg bg-slate-50 p-3 text-sm leading-relaxed text-slate-800">
        {segments.map((seg, i) => {
          const isIssue = seg.hasIssue;
          const isSelected = selectedIndex === i;
          const tags = segmentTags(seg);

          if (!isIssue) {
            return (
              <span key={`seg-${i}`} className="text-slate-800">
                {seg.text}{" "}
              </span>
            );
          }

          return (
            <button
              key={`seg-${i}`}
              type="button"
              onClick={() => setSelectedIndex(i)}
              className={`mx-0.5 inline rounded px-0.5 text-left underline decoration-amber-500 decoration-dotted underline-offset-2 transition-colors ${
                isSelected
                  ? "bg-amber-200/80 text-amber-950 ring-1 ring-amber-400"
                  : "bg-amber-100/90 text-amber-950 hover:bg-amber-200/70"
              }`}
              aria-pressed={isSelected}
              aria-label={`View feedback for: ${seg.text.slice(0, 60)}`}
            >
              {seg.text}
              {tags.length > 0 ? (
                <span className="ml-1 inline-flex gap-0.5 align-middle">
                  {tags.map((t) => (
                    <span
                      key={t}
                      className="inline-block h-1.5 w-1.5 rounded-full bg-amber-600/70"
                      aria-hidden
                    />
                  ))}
                </span>
              ) : null}{" "}
            </button>
          );
        })}
      </div>

      <div className="mt-2">
        <InterviewSegmentTagLegend />
      </div>

      {selected?.hasIssue ? (
        <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <InterviewSegmentFeedbackDetail segment={selected} />
        </div>
      ) : issueIndices.length === 0 ? (
        <p className="mt-3 text-sm text-slate-600">
          No sentence-level issues were flagged. Review pace and pronunciation notes
          above for whole-answer feedback.
        </p>
      ) : null}
    </div>
  );
}
