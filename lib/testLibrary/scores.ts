import type { TestQuestionProgress } from "@/lib/testLibrary/types";

export const SCORE_MAX = 5;

export type ScoreBand = "none" | "low" | "mid" | "high";

export function normalizeScore(value: unknown): number | null {
  if (value == null) return null;
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return null;
  return n;
}

export function getScoreBand(score: number | null | undefined): ScoreBand {
  const n = normalizeScore(score);
  if (n == null) return "none";
  if (n >= 4) return "high";
  if (n >= 3) return "mid";
  return "low";
}

export const SCORE_BAND_BAR: Record<ScoreBand, string> = {
  none: "bg-slate-200",
  low: "bg-orange-500",
  mid: "bg-blue-500",
  high: "bg-emerald-500",
};

/** Hex fills for progress bars (Tailwind dynamic classes in lib/ are not always compiled). */
export const SCORE_BAND_FILL: Record<ScoreBand, string> = {
  none: "#e2e8f0",
  low: "#f97316",
  mid: "#3b82f6",
  high: "#10b981",
};

export const SCORE_BAND_TEXT: Record<ScoreBand, string> = {
  none: "text-slate-400",
  low: "text-orange-600",
  mid: "text-blue-600",
  high: "text-emerald-600",
};

export function formatScore(score: number | null | undefined): string {
  const n = normalizeScore(score);
  if (n == null) return "0.0";
  return n.toFixed(1);
}

export function averageScores(questions: TestQuestionProgress[]): number | null {
  const completed = questions
    .map((q) => normalizeScore(q.score))
    .filter((s): s is number => s != null);
  if (completed.length === 0) return null;
  const sum = completed.reduce((a, b) => a + b, 0);
  return Math.round((sum / completed.length) * 10) / 10;
}

export function sectionHasProgress(questions: TestQuestionProgress[]): boolean {
  return questions.some((q) => q.status !== "not_started");
}

export function progressPercent(score: number | null, max = SCORE_MAX): number {
  const n = normalizeScore(score);
  if (n == null) return 0;
  return Math.min(100, Math.max(0, (n / max) * 100));
}
