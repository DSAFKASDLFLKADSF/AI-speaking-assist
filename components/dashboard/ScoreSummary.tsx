import {
  formatScore,
  getScoreBand,
  normalizeScore,
  progressPercent,
  SCORE_BAND_FILL,
  SCORE_MAX,
} from "@/lib/testLibrary/scores";

export interface ScoreSummaryProps {
  label: string;
  score: number | null;
  max?: number;
  className?: string;
}

/** Section average: large score + horizontal bar (replaces semicircle gauge). */
export function ScoreSummary({
  label,
  score,
  max = SCORE_MAX,
  className = "",
}: ScoreSummaryProps) {
  const numeric = normalizeScore(score);
  const hasScore = numeric != null;
  const band = getScoreBand(numeric);
  const fillPct = hasScore ? Math.max(8, progressPercent(numeric, max)) : 0;

  return (
    <div className={`flex min-w-0 flex-1 flex-col items-center ${className}`}>
      <p className="text-[10px] font-medium uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p
        className={`mt-1 text-2xl font-semibold tabular-nums ${
          hasScore ? "text-slate-900" : "text-slate-400"
        }`}
      >
        {hasScore ? formatScore(numeric) : "—"}
        <span className="text-sm font-normal text-slate-400">/{max}</span>
      </p>
      <div
        className="mt-2 h-2.5 w-full max-w-[8.5rem] overflow-hidden rounded-full bg-slate-100"
        aria-hidden="true"
      >
        <div
          className="h-full rounded-full"
          style={{
            width: `${fillPct}%`,
            backgroundColor: SCORE_BAND_FILL[band],
          }}
        />
      </div>
    </div>
  );
}
