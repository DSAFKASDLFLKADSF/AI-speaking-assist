export interface BehaviorMetrics {
  /** Words per minute — 语速 */
  speakingRateWpm: number;
  /** Total pause count — 停顿 */
  pauseCount: number;
  /** Filler words (um, uh, like, …) — 填充词 */
  fillerWordCount: number;
  /** Longest single pause — 最长停顿 (seconds) */
  longestPauseSeconds: number;
}

export interface BehaviorMetricsCardProps {
  metrics: BehaviorMetrics;
  className?: string;
}

const METRICS = [
  {
    key: "speakingRateWpm",
    label: "语速",
    format: (value: number) => `${formatNumber(value, 0)} 词/分`,
  },
  {
    key: "pauseCount",
    label: "停顿",
    format: (value: number) => `${formatNumber(value, 0)} 次`,
  },
  {
    key: "fillerWordCount",
    label: "填充词",
    format: (value: number) => `${formatNumber(value, 0)} 个`,
  },
  {
    key: "longestPauseSeconds",
    label: "最长停顿",
    format: (value: number) => `${formatNumber(value, 1)} 秒`,
  },
] as const satisfies ReadonlyArray<{
  key: keyof BehaviorMetrics;
  label: string;
  format: (value: number) => string;
}>;

function formatNumber(value: number, decimals: number): string {
  if (!Number.isFinite(value) || value < 0) return "—";
  return value.toFixed(decimals);
}

function normalizeMetrics(metrics: BehaviorMetrics): BehaviorMetrics {
  return {
    speakingRateWpm: Math.max(0, metrics.speakingRateWpm),
    pauseCount: Math.max(0, Math.round(metrics.pauseCount)),
    fillerWordCount: Math.max(0, Math.round(metrics.fillerWordCount)),
    longestPauseSeconds: Math.max(0, metrics.longestPauseSeconds),
  };
}

export function BehaviorMetricsCard({
  metrics,
  className = "",
}: BehaviorMetricsCardProps) {
  const normalized = normalizeMetrics(metrics);

  return (
    <div
      className={`rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6 ${className}`}
    >
      <p className="text-xs font-medium uppercase tracking-[0.15em] text-slate-500">
        行为指标
      </p>

      <dl className="mt-5 grid grid-cols-2 gap-4 sm:gap-5">
        {METRICS.map(({ key, label, format }) => (
          <div
            key={key}
            className="rounded-lg border border-slate-100 bg-slate-50/80 px-4 py-3"
          >
            <dt className="text-sm text-slate-600">{label}</dt>
            <dd className="mt-1 font-mono text-lg font-semibold tabular-nums text-slate-900">
              {format(normalized[key])}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
