import type { TestQuestionProgress } from "@/lib/testLibrary/types";

import {

  formatSpeakingBand,

  rawScoreToSpeakingBand,

  SPEAKING_BAND_MAX,

} from "@/lib/toeflSpeakingBand";



/** Display scale (2026 TOEFL Speaking band). */

export const SCORE_MAX = SPEAKING_BAND_MAX;



export type ScoreBand = "none" | "low" | "mid" | "high";



export function normalizeScore(value: unknown): number | null {

  if (value == null) return null;

  const n = typeof value === "number" ? value : Number(value);

  if (!Number.isFinite(n)) return null;

  return n;

}



/** Raw rubric score (1–5) → display band (1–6). */

export function toDisplayScore(raw: number | null | undefined): number | null {

  const n = normalizeScore(raw);

  if (n == null) return null;

  return rawScoreToSpeakingBand(n);

}



export function formatDisplayScore(raw: number | null | undefined): string {

  const band = toDisplayScore(raw);

  if (band == null) return "—";

  return formatSpeakingBand(band);

}



/** Color band for a display score on the 1–6 scale. */

export function getScoreBand(displayBand: number | null | undefined): ScoreBand {

  const n = normalizeScore(displayBand);

  if (n == null) return "none";

  if (n >= 5) return "high";

  if (n >= 3.5) return "mid";

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



/** @deprecated Use formatDisplayScore for raw 1–5, or formatSpeakingBand for band values. */

export function formatScore(score: number | null | undefined): string {

  return formatDisplayScore(score);

}



/** Average of question raw scores, returned as display band (1–6). */

export function averageScores(questions: TestQuestionProgress[]): number | null {

  const completed = questions

    .map((q) => normalizeScore(q.score))

    .filter((s): s is number => s != null);

  if (completed.length === 0) return null;

  const bands = completed.map((s) => rawScoreToSpeakingBand(s));

  const sum = bands.reduce((a, b) => a + b, 0);

  return Math.round((sum / bands.length) * 10) / 10;

}



export function sectionHasProgress(questions: TestQuestionProgress[]): boolean {

  return questions.some((q) => q.status !== "not_started");

}



export function progressPercent(

  displayBand: number | null,

  max = SCORE_MAX

): number {

  const n = normalizeScore(displayBand);

  if (n == null) return 0;

  return Math.min(100, Math.max(0, (n / max) * 100));

}


