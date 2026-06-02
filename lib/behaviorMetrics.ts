import type { BehaviorMetrics } from "@/components/BehaviorMetricsCard";

const FILLER_PATTERN =
  /\b(um+|uh+|er+|ah+|em+|hmm+|like|you know|i mean|sort of|kind of)\b/gi;

/**
 * Estimate fluency metrics from transcript text and recording duration.
 */
export function computeBehaviorMetrics(
  transcript: string,
  durationMs: number
): BehaviorMetrics {
  const text = transcript.trim();
  const words = text.split(/\s+/).filter(Boolean);
  const wordCount = words.length;
  const durationSec = Math.max(durationMs / 1000, 0.1);
  const durationMin = durationSec / 60;

  const speakingRateWpm =
    durationMin > 0
      ? Math.round((wordCount / durationMin) * 10) / 10
      : 0;

  const fillerWordCount = (text.match(FILLER_PATTERN) ?? []).length;

  const punctuationPauses = (text.match(/[,;:.!?…]/g) ?? []).length;
  const avgSecPerWord = 0.35;
  const estimatedSpeechSec = wordCount * avgSecPerWord;
  const silenceSec = Math.max(0, durationSec - estimatedSpeechSec);
  const pauseCount = Math.max(
    1,
    punctuationPauses + fillerWordCount,
    Math.round(silenceSec / 1.2)
  );

  const longestPauseSeconds =
    Math.round(
      Math.min(
        durationSec * 0.4,
        silenceSec > 0 ? (silenceSec / pauseCount) * 2 : 0.8
      ) * 10
    ) / 10;

  return {
    speakingRateWpm,
    pauseCount,
    fillerWordCount,
    longestPauseSeconds: Math.max(0.3, longestPauseSeconds),
  };
}
