/** TOEFL iBT Speaking (Jan 2026): reported band 1–6 in 0.5 steps. */
export const SPEAKING_BAND_MAX = 6;

/** Internal rubric per item (unchanged scoring engine). */
export const RAW_SCORE_MAX = 5;

export function roundToNearestHalf(value: number): number {
  return Math.round(value * 2) / 2;
}

/** Format band for display (always one decimal, e.g. 5.0, 5.5). */
export function formatSpeakingBand(band: number): string {
  return roundToNearestHalf(band).toFixed(1);
}

/**
 * Convert a rubric score (1–5, may be fractional) to the 2026 Speaking band.
 * Existing stored 1–5 scores are mapped linearly: 1→1.0, 5→6.0, 0.5 steps.
 */
export function rawScoreToSpeakingBand(score: number): number {
  const clamped = Math.max(1, Math.min(RAW_SCORE_MAX, score));
  const t = (clamped - 1) / (RAW_SCORE_MAX - 1);
  const band = 1 + t * 5;
  return roundToNearestHalf(Math.max(1, Math.min(SPEAKING_BAND_MAX, band)));
}

/**
 * Map per-item scores (each 1–5 from rubric) to the 2026 Speaking band.
 * Item scores are summed and normalized to 1–6 in 0.5 steps.
 * Works for any item count (7 LR, 4 IV, or 11 full).
 */
export function itemScoresToSpeakingBand(scores: number[]): number {
  if (scores.length === 0) return 1;
  const sum = scores.reduce((a, b) => a + b, 0);
  const n = scores.length;
  const minSum = n;
  const maxSum = n * RAW_SCORE_MAX;
  const t = (sum - minSum) / (maxSum - minSum);
  const band = 1 + t * 5;
  return roundToNearestHalf(Math.max(1, Math.min(SPEAKING_BAND_MAX, band)));
}
