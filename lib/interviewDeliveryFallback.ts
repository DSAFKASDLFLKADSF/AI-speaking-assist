import type {
  BehaviorMetrics,
  InterviewDeliveryFeedback,
} from "@/lib/analyze-interview-types";

/** Basic pace feedback when GLM omits paceFeedback but metrics exist. */
export function buildPaceFeedbackFallback(
  metrics: BehaviorMetrics
): InterviewDeliveryFeedback | undefined {
  const { speakingRateWpm, pauseCount, fillerWordCount, longestPauseSeconds } =
    metrics;

  const parts: string[] = [];
  let suggestion = "";

  if (speakingRateWpm > 0) {
    if (speakingRateWpm < 90) {
      parts.push(
        `Your pace was about ${Math.round(speakingRateWpm)} words per minute, which is slower than typical conversational speech.`
      );
      suggestion =
        "Try answering one point at a time without long pauses between clauses — practice saying your main idea in the first 5 seconds.";
    } else if (speakingRateWpm > 190) {
      parts.push(
        `Your pace was about ${Math.round(speakingRateWpm)} words per minute, which may sound rushed.`
      );
      suggestion =
        "Slow down slightly after your main point and before your example so the listener can follow.";
    } else {
      parts.push(
        `Your pace was about ${Math.round(speakingRateWpm)} words per minute, which is in a natural range.`
      );
    }
  }

  if (longestPauseSeconds >= 2.5) {
    parts.push(
      `Your longest pause was about ${longestPauseSeconds.toFixed(1)} seconds, which can break the flow of your answer.`
    );
    if (!suggestion) {
      suggestion =
        "When you need thinking time, use a short phrase like \"One reason is…\" instead of staying silent.";
    }
  } else if (pauseCount >= 8) {
    parts.push(
      `You had ${pauseCount} noticeable pauses, which may make the answer sound choppy.`
    );
  }

  if (fillerWordCount >= 4) {
    parts.push(
      `You used about ${fillerWordCount} filler words (like "um" or "uh"), which can distract from your message.`
    );
    if (!suggestion) {
      suggestion =
        "Pause silently for half a second instead of using a filler when you need to think.";
    }
  }

  if (parts.length === 0) return undefined;

  return {
    summary: parts.join(" "),
    suggestion:
      suggestion ||
      "Record yourself again and aim for one clear point, one example, and a brief wrap-up within 45 seconds.",
  };
}
