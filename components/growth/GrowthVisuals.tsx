import type { ReactNode } from "react";
import type {
  DimensionInsight,
  GrowthOverview,
  WeeklyBucket,
} from "@/lib/growthStats";
import { getModeLabel } from "@/lib/unifiedHistory";
import { SCORE_BAND_FILL } from "@/lib/testLibrary/scores";
import {
  formatSpeakingBand,
  SPEAKING_BAND_MAX,
} from "@/lib/toeflSpeakingBand";

const ACCENT = {
  blue: { border: "border-blue-200", bg: "bg-blue-50", text: "text-blue-700", icon: "bg-blue-100 text-blue-600" },
  emerald: { border: "border-emerald-200", bg: "bg-emerald-50", text: "text-emerald-700", icon: "bg-emerald-100 text-emerald-600" },
  violet: { border: "border-violet-200", bg: "bg-violet-50", text: "text-violet-700", icon: "bg-violet-100 text-violet-600" },
  amber: { border: "border-amber-200", bg: "bg-amber-50", text: "text-amber-700", icon: "bg-amber-100 text-amber-600" },
} as const;

export function GrowthHero({
  overview,
  narrative,
}: {
  overview: GrowthOverview;
  narrative: string;
}) {
  const headline =
    overview.avgMockExam != null
      ? `${formatSpeakingBand(overview.avgMockExam)}/${SPEAKING_BAND_MAX}`
      : overview.avgListenRepeat != null
        ? `${formatSpeakingBand(overview.avgListenRepeat)}/${SPEAKING_BAND_MAX}`
        : overview.totalSessions > 0
          ? String(overview.totalSessions)
          : "—";

  const headlineLabel =
    overview.avgMockExam != null
      ? "Mock exam speaking band"
      : overview.avgListenRepeat != null
        ? "Listen & Repeat average"
        : overview.totalSessions > 0
          ? "Sessions completed"
          : "Start practicing";

  return (
    <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#1e3a5f] via-[#2563eb] to-[#3b82f6] p-6 text-white shadow-md sm:p-8">
      <div className="absolute -right-8 -top-8 h-40 w-40 rounded-full bg-white/10 blur-2xl" aria-hidden="true" />
      <div className="absolute -bottom-12 -left-8 h-48 w-48 rounded-full bg-white/5 blur-2xl" aria-hidden="true" />
      <div className="relative flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-blue-100">
            Your progress
          </p>
          <p className="mt-3 text-5xl font-bold tabular-nums tracking-tight sm:text-6xl">
            {headline}
          </p>
          <p className="mt-1 text-sm text-blue-100">{headlineLabel}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          {overview.currentStreak > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-sm font-medium backdrop-blur">
              <span aria-hidden="true">🔥</span>
              {overview.currentStreak}-day streak
            </span>
          )}
          <span className="inline-flex items-center rounded-full bg-white/15 px-3 py-1.5 text-sm font-medium backdrop-blur">
            {overview.practiceDays} practice day{overview.practiceDays === 1 ? "" : "s"}
          </span>
        </div>
      </div>
      <p className="relative mt-5 max-w-2xl text-sm leading-relaxed text-blue-50/90">
        {narrative}
      </p>
    </section>
  );
}

export function GrowthStatCard({
  label,
  value,
  sub,
  accent,
  icon,
}: {
  label: string;
  value: string;
  sub?: string;
  accent: keyof typeof ACCENT;
  icon: ReactNode;
}) {
  const style = ACCENT[accent];
  return (
    <div
      className={`rounded-xl border ${style.border} ${style.bg} p-4 shadow-sm`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className={`text-xs font-medium ${style.text}`}>{label}</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-slate-900">
            {value}
          </p>
          {sub && <p className="mt-1 text-xs text-slate-500">{sub}</p>}
        </div>
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${style.icon}`}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}

const MODE_COLORS = {
  listen_repeat: { bar: "bg-blue-500", label: "text-blue-700", bg: "bg-blue-100" },
  interview: { bar: "bg-violet-500", label: "text-violet-700", bg: "bg-violet-100" },
  mock_exam: { bar: "bg-emerald-500", label: "text-emerald-700", bg: "bg-emerald-100" },
} as const;

export function PracticeMixChart({
  overview,
}: {
  overview: GrowthOverview;
}) {
  const total =
    overview.listenRepeatCount +
    overview.interviewCount +
    overview.mockExamCount;

  const segments = [
    { mode: "listen_repeat" as const, count: overview.listenRepeatCount },
    { mode: "interview" as const, count: overview.interviewCount },
    { mode: "mock_exam" as const, count: overview.mockExamCount },
  ];

  if (total === 0) {
    return (
      <p className="text-sm text-slate-500">No sessions yet — start a drill to see your mix.</p>
    );
  }

  return (
    <div>
      <div className="flex h-4 overflow-hidden rounded-full bg-slate-100">
        {segments.map(({ mode, count }) =>
          count > 0 ? (
            <div
              key={mode}
              className={`${MODE_COLORS[mode].bar} transition-all`}
              style={{ width: `${(count / total) * 100}%` }}
              title={`${getModeLabel(mode)}: ${count}`}
            />
          ) : null
        )}
      </div>
      <ul className="mt-4 grid gap-2 sm:grid-cols-3">
        {segments.map(({ mode, count }) => (
          <li
            key={mode}
            className={`flex items-center justify-between rounded-lg px-3 py-2 ${MODE_COLORS[mode].bg}`}
          >
            <span className={`text-xs font-medium ${MODE_COLORS[mode].label}`}>
              {getModeLabel(mode)}
            </span>
            <span className="text-sm font-semibold tabular-nums text-slate-900">
              {count}
              <span className="ml-1 text-xs font-normal text-slate-500">
                ({Math.round((count / total) * 100)}%)
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function WeeklyTrendChart({ weeks }: { weeks: WeeklyBucket[] }) {
  const maxScore = Math.max(
    SPEAKING_BAND_MAX,
    ...weeks.map((w) => w.avgScore ?? 0)
  );

  return (
    <div className="flex items-end justify-between gap-2 sm:gap-4">
      {weeks.map((week) => {
        const pct =
          week.avgScore != null ? (week.avgScore / maxScore) * 100 : 8;
        const barColor =
          week.avgScore == null
            ? "bg-slate-200"
            : week.avgScore >= 5
              ? "bg-emerald-500"
              : week.avgScore >= 3.5
                ? "bg-blue-500"
                : "bg-orange-400";

        return (
          <div
            key={week.weekLabel}
            className="flex min-w-0 flex-1 flex-col items-center gap-2"
          >
            <span className="text-xs font-semibold tabular-nums text-slate-800">
              {week.avgScore != null ? formatSpeakingBand(week.avgScore) : "—"}
            </span>
            <div className="flex h-28 w-full items-end justify-center">
              <div
                className={`w-full max-w-[2.5rem] rounded-t-md ${barColor} transition-all`}
                style={{ height: `${Math.max(pct, 8)}%` }}
              />
            </div>
            <span className="w-full truncate text-center text-[10px] text-slate-500">
              {week.weekLabel}
            </span>
            <span className="text-[10px] text-slate-400">
              {week.sessionCount} sess.
            </span>
          </div>
        );
      })}
    </div>
  );
}

const LEVEL_BAR: Record<DimensionInsight["level"], string> = {
  strong: SCORE_BAND_FILL.high,
  developing: SCORE_BAND_FILL.mid,
  focus: SCORE_BAND_FILL.low,
};

export function DimensionProgressList({
  dimensions,
}: {
  dimensions: DimensionInsight[];
}) {
  return (
    <ul className="space-y-4">
      {dimensions.map((dim) => {
        const pct = dim.average > 0 ? (dim.average / SPEAKING_BAND_MAX) * 100 : 0;
        return (
          <li key={dim.label}>
            <div className="mb-1.5 flex items-center justify-between gap-2">
              <span className="text-sm font-medium text-slate-700">{dim.label}</span>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold tabular-nums text-slate-900">
                  {dim.average > 0 ? `${formatSpeakingBand(dim.average)}/${SPEAKING_BAND_MAX}` : "—"}
                </span>
                {dim.average > 0 && (
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${
                      dim.level === "strong"
                        ? "bg-emerald-100 text-emerald-700"
                        : dim.level === "developing"
                          ? "bg-blue-100 text-blue-700"
                          : "bg-orange-100 text-orange-700"
                    }`}
                  >
                    {dim.level}
                  </span>
                )}
              </div>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${pct}%`,
                  backgroundColor: LEVEL_BAR[dim.level],
                }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export function InsightPanel({
  title,
  items,
  variant,
}: {
  title: string;
  items: string[];
  variant: "highlight" | "focus";
}) {
  const isHighlight = variant === "highlight";
  return (
    <section
      className={`rounded-xl border p-5 shadow-sm ${
        isHighlight
          ? "border-emerald-200 bg-gradient-to-br from-emerald-50 to-white"
          : "border-slate-200 bg-gradient-to-br from-slate-50 to-white"
      }`}
    >
      <h2
        className={`text-sm font-semibold ${
          isHighlight ? "text-emerald-800" : "text-slate-800"
        }`}
      >
        {title}
      </h2>
      <ul className="mt-3 space-y-2.5">
        {items.map((item) => (
          <li
            key={item}
            className="flex gap-2.5 text-sm leading-relaxed text-slate-600"
          >
            <span
              className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs ${
                isHighlight
                  ? "bg-emerald-100 text-emerald-600"
                  : "bg-slate-200 text-slate-600"
              }`}
              aria-hidden="true"
            >
              {isHighlight ? "✓" : "→"}
            </span>
            {item}
          </li>
        ))}
      </ul>
    </section>
  );
}
