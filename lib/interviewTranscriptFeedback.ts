import type {
  InterviewTranscriptSegment,
  InterviewTranscriptSpan,
} from "@/lib/analyze-interview-types";

/** Split transcript into sentence-level segments when API returns none. */
export function splitTranscriptIntoSegments(transcript: string): InterviewTranscriptSegment[] {
  const trimmed = transcript.trim();
  if (!trimmed) return [];

  const parts = trimmed.match(/[^.!?]+[.!?]+|[^.!?]+$/g);
  if (!parts || parts.length <= 1) {
    return [{ text: trimmed, hasIssue: false }];
  }

  return parts
    .map((p) => p.trim())
    .filter(Boolean)
    .map((text) => ({ text, hasIssue: false }));
}

export function legacySpansToSegments(
  spans: InterviewTranscriptSpan[]
): InterviewTranscriptSegment[] {
  return spans.map((span) => {
    if (span.kind === "strong") {
      return { text: span.text, hasIssue: false };
    }
    const issue =
      span.kind === "grammar"
        ? {
            grammarVocabulary: {
              whatNeedsImprovement: span.note || "Review this phrase for grammar.",
              whyItMatters:
                "Grammar mistakes can make your meaning harder to follow.",
            },
          }
        : {
            topicDevelopment: {
              whatNeedsImprovement: span.note || "This part could be clearer.",
              whyItMatters:
                "Clearer development helps the listener follow your answer.",
            },
          };
    return {
      text: span.text,
      hasIssue: true,
      ...issue,
    };
  });
}

export function resolveInterviewTranscriptSegments(input: {
  transcript: string;
  transcriptSegments?: InterviewTranscriptSegment[];
  transcriptReview?: InterviewTranscriptSpan[];
}): InterviewTranscriptSegment[] {
  if (input.transcriptSegments?.length) {
    return input.transcriptSegments;
  }
  if (input.transcriptReview?.length) {
    return legacySpansToSegments(input.transcriptReview);
  }
  return splitTranscriptIntoSegments(input.transcript);
}
