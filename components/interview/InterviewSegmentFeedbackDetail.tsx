"use client";

import type { InterviewTranscriptSegment } from "@/lib/analyze-interview-types";

const TAG_STYLE: Record<string, string> = {
  topic: "bg-sky-100 text-sky-800",
  grammar: "bg-red-100 text-red-800",
  wordy: "bg-amber-100 text-amber-800",
};

function segmentTags(seg: InterviewTranscriptSegment): string[] {
  const tags: string[] = [];
  if (seg.topicDevelopment) tags.push("topic");
  if (seg.grammarVocabulary) tags.push("grammar");
  if (seg.conciseness) tags.push("wordy");
  return tags;
}

export interface InterviewSegmentFeedbackDetailProps {
  segment: InterviewTranscriptSegment;
  className?: string;
}

function IssueBlock({
  label,
  tagKey,
  issue,
  showKnowledgePoint,
}: {
  label: string;
  tagKey: string;
  issue: { whatNeedsImprovement: string; whyItMatters: string; knowledgePoint?: string };
  showKnowledgePoint?: boolean;
}) {
  return (
    <div className="rounded-lg border border-slate-100 bg-slate-50/80 p-3">
      <span
        className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${TAG_STYLE[tagKey]}`}
      >
        {label}
      </span>
      <p className="mt-2 text-sm font-medium text-slate-900">What needs improvement</p>
      <p className="mt-1 text-sm leading-relaxed text-slate-700">
        {issue.whatNeedsImprovement}
      </p>
      {issue.whyItMatters ? (
        <>
          <p className="mt-3 text-sm font-medium text-slate-900">Why it matters</p>
          <p className="mt-1 text-sm leading-relaxed text-slate-600">
            {issue.whyItMatters}
          </p>
        </>
      ) : null}
      {showKnowledgePoint && issue.knowledgePoint ? (
        <>
          <p className="mt-3 text-sm font-medium text-slate-900">Knowledge point</p>
          <p className="mt-1 text-sm leading-relaxed text-slate-600">
            {issue.knowledgePoint}
          </p>
        </>
      ) : null}
    </div>
  );
}

export function InterviewSegmentFeedbackDetail({
  segment,
  className = "",
}: InterviewSegmentFeedbackDetailProps) {
  return (
    <div className={`space-y-4 ${className}`}>
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
          Original
        </p>
        <p className="mt-1 rounded-lg border border-slate-200 bg-white p-3 text-sm leading-relaxed text-slate-900">
          &ldquo;{segment.text}&rdquo;
        </p>
      </div>

      {segment.topicDevelopment ? (
        <IssueBlock
          label="Topic Development"
          tagKey="topic"
          issue={segment.topicDevelopment}
        />
      ) : null}

      {segment.grammarVocabulary ? (
        <IssueBlock
          label="Grammar & Vocabulary"
          tagKey="grammar"
          issue={segment.grammarVocabulary}
          showKnowledgePoint
        />
      ) : null}

      {segment.conciseness ? (
        <IssueBlock
          label="Too Wordy"
          tagKey="wordy"
          issue={segment.conciseness}
        />
      ) : null}

      {segment.improvedVersion ? (
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Improved version
          </p>
          <p className="mt-1 rounded-lg border border-emerald-200 bg-emerald-50/60 p-3 text-sm leading-relaxed text-emerald-950">
            &ldquo;{segment.improvedVersion}&rdquo;
          </p>
        </div>
      ) : null}
    </div>
  );
}

export function InterviewSegmentTagLegend() {
  return (
    <p className="text-[11px] text-slate-500">
      Click highlighted sentences to see feedback. Only segments with real issues are
      marked — clear parts are left as-is.
    </p>
  );
}

export { segmentTags };
