import {
  formatSpeakingBand,
  rawScoreToSpeakingBand,
  SPEAKING_BAND_MAX,
} from "@/lib/toeflSpeakingBand";

export type InterviewDimensionScore = 1 | 2 | 3 | 4 | 5;

export interface InterviewScores {
  topic: InterviewDimensionScore;
  pace: InterviewDimensionScore;
  pronunciation: InterviewDimensionScore;
  grammar: InterviewDimensionScore;
}

export interface InterviewScoreCardProps {
  scores: InterviewScores;
  /** Optional summary below dimensions */
  feedback?: string;
  className?: string;
}

const DIMENSIONS = [
  { key: "topic", label: "Topic Development" },
  { key: "pace", label: "Pace & Pauses" },
  { key: "pronunciation", label: "Pronunciation & Rhythm" },
  { key: "grammar", label: "Grammar & Vocabulary" },
] as const satisfies ReadonlyArray<{
  key: keyof InterviewScores;
  label: string;
}>;

function clampScore(score: number): InterviewDimensionScore {
  const rounded = Math.round(score);
  if (rounded <= 1) return 1;
  if (rounded >= 5) return 5;
  return rounded as InterviewDimensionScore;
}

function averageScore(scores: InterviewScores): number {
  const total =
    scores.topic + scores.pace + scores.pronunciation + scores.grammar;
  return total / 4;
}

function ScoreBar({ band }: { band: number }) {
  const filled = Math.round(band);
  return (
    <div
      className="flex gap-1"
      role="img"
      aria-label={`Score ${formatSpeakingBand(band)} out of ${SPEAKING_BAND_MAX}`}
    >
      {Array.from({ length: SPEAKING_BAND_MAX }, (_, i) => i + 1).map((step) => (
        <span
          key={step}
          className={`h-1.5 w-full max-w-8 rounded-full ${
            step <= filled ? "bg-slate-900" : "bg-slate-200"
          }`}
        />
      ))}
    </div>
  );
}

export function InterviewScoreCard({
  scores,
  feedback,
  className = "",
}: InterviewScoreCardProps) {
  const normalized: InterviewScores = {
    topic: clampScore(scores.topic),
    pace: clampScore(scores.pace),
    pronunciation: clampScore(scores.pronunciation),
    grammar: clampScore(scores.grammar),
  };

  const overallBand = rawScoreToSpeakingBand(averageScore(normalized));

  return (
    <div
      className={`rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6 ${className}`}
    >
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.15em] text-slate-500">
            Virtual Interview
          </p>
          <div className="mt-3 flex items-end gap-2">
            <p className="text-4xl font-semibold tabular-nums text-slate-900">
              {formatSpeakingBand(overallBand)}
            </p>
            <p className="mb-1.5 text-sm text-slate-400">/ {SPEAKING_BAND_MAX}</p>
          </div>
        </div>
      </div>

      <ul className="mt-6 space-y-4">
        {DIMENSIONS.map(({ key, label }) => {
          const raw = normalized[key];
          const band = rawScoreToSpeakingBand(raw);
          return (
            <li key={key}>
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-medium text-slate-700">{label}</span>
                <span className="font-mono text-sm tabular-nums text-slate-900">
                  {formatSpeakingBand(band)}
                  <span className="text-slate-400">/{SPEAKING_BAND_MAX}</span>
                </span>
              </div>
              <div className="mt-2">
                <ScoreBar band={band} />
              </div>
            </li>
          );
        })}
      </ul>

      {feedback && (
        <p className="mt-5 border-t border-slate-100 pt-4 text-sm leading-relaxed text-slate-600">
          {feedback}
        </p>
      )}
    </div>
  );
}

export function interviewScoresToBand(scores: InterviewScores): number {
  return rawScoreToSpeakingBand(averageScore(scores));
}
