import {
  formatSpeakingBand,
  rawScoreToSpeakingBand,
  SPEAKING_BAND_MAX,
} from "@/lib/toeflSpeakingBand";

export type ListenRepeatScore = 1 | 2 | 3 | 4 | 5;

export interface ScoreCardProps {
  score: ListenRepeatScore;
  /** Optional short feedback below the score */
  feedback?: string;
  className?: string;
}

const SCORE_LABEL: Record<ListenRepeatScore, string> = {
  1: "Needs improvement",
  2: "Developing",
  3: "Fair",
  4: "Good",
  5: "Excellent",
};

function clampScore(score: number): ListenRepeatScore {
  const rounded = Math.round(score);
  if (rounded <= 1) return 1;
  if (rounded >= 5) return 5;
  return rounded as ListenRepeatScore;
}

function ScoreBar({ band }: { band: number }) {
  const filled = Math.round(band);
  return (
    <div
      className="flex gap-1.5"
      role="img"
      aria-label={`Score ${formatSpeakingBand(band)} out of ${SPEAKING_BAND_MAX}`}
    >
      {Array.from({ length: SPEAKING_BAND_MAX }, (_, i) => i + 1).map((step) => (
        <span
          key={step}
          className={`h-1.5 flex-1 rounded-full ${
            step <= filled ? "bg-slate-900" : "bg-slate-200"
          }`}
        />
      ))}
    </div>
  );
}

export function ScoreCard({
  score,
  feedback,
  className = "",
}: ScoreCardProps) {
  const value = clampScore(score);
  const band = rawScoreToSpeakingBand(value);
  const label = feedback ?? SCORE_LABEL[value];

  return (
    <div
      className={`rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6 ${className}`}
    >
      <p className="text-xs font-medium uppercase tracking-[0.15em] text-slate-500">
        Listen & Repeat
      </p>

      <div className="mt-4 flex items-end gap-3">
        <p className="text-4xl font-semibold tabular-nums text-slate-900">
          {formatSpeakingBand(band)}
        </p>
        <p className="mb-1.5 text-sm text-slate-400">/ {SPEAKING_BAND_MAX}</p>
      </div>

      <div className="mt-3">
        <ScoreBar band={band} />
      </div>

      {label && (
        <p className="mt-4 text-sm leading-relaxed text-slate-600">{label}</p>
      )}
    </div>
  );
}
