"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { getPracticeHistory } from "@/lib/api";
import { computeGrowthSummary, type GrowthSummary } from "@/lib/growthStats";
import { getModeLabel } from "@/lib/unifiedHistory";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase";

function StatCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-slate-900">{value}</p>
      {sub && <p className="mt-1 text-xs text-slate-400">{sub}</p>}
    </div>
  );
}

const LEVEL_STYLE = {
  strong: "bg-emerald-50 text-emerald-700",
  developing: "bg-amber-50 text-amber-700",
  focus: "bg-red-50 text-red-700",
} as const;

export default function GrowthPage() {
  const [summary, setSummary] = useState<GrowthSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);

  const load = useCallback(async () => {
    setLoading(true);

    let cloudItems: Awaited<
      ReturnType<typeof getPracticeHistory>
    >["items"] = [];

    if (isSupabaseConfigured()) {
      const supabase = getSupabase();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      setUser(session?.user ?? null);

      if (session?.user) {
        try {
          const data = await getPracticeHistory({ limit: 100 });
          cloudItems = data.items;
        } catch {
          // Local-only growth still works
        }
      }
    }

    setSummary(computeGrowthSummary(cloudItems));
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading || !summary) {
    return (
      <main className="min-h-screen bg-slate-50">
        <div className="mx-auto max-w-3xl px-4 pb-16 pt-28 sm:px-6 md:pt-24 lg:px-8 lg:pt-28">
          <p className="text-sm text-slate-500">Loading growth summary…</p>
        </div>
      </main>
    );
  }

  const { overview, weeklyTrend, dimensionInsights, highlights, focusAreas, narrative } =
    summary;

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-3xl px-4 pb-16 pt-28 sm:px-6 md:pt-24 lg:px-8 lg:pt-28">
        <header className="mb-8">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-500">
            Progress
          </p>
          <h1 className="mt-2 text-2xl font-semibold text-slate-900 sm:text-3xl">
            Growth Summary
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Combined view of drills and mock exams on this device
            {user ? " plus your cloud history" : ""}.
          </p>
          <Link
            href="/history"
            className="mt-3 inline-flex items-center text-sm font-medium text-slate-900 underline"
          >
            View full history →
          </Link>
        </header>

        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="text-sm font-medium text-slate-900">Your journey</h2>
          <p className="mt-3 text-sm leading-relaxed text-slate-600">{narrative}</p>
        </section>

        <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Total sessions"
            value={String(overview.totalSessions)}
            sub={`${overview.practiceDays} practice day${overview.practiceDays === 1 ? "" : "s"}`}
          />
          <StatCard
            label="Current streak"
            value={`${overview.currentStreak} day${overview.currentStreak === 1 ? "" : "s"}`}
          />
          <StatCard
            label="Listen & Repeat avg"
            value={
              overview.avgListenRepeat != null
                ? `${overview.avgListenRepeat}/5`
                : "—"
            }
            sub={`${overview.listenRepeatCount} sessions`}
          />
          <StatCard
            label="Interview avg"
            value={
              overview.avgInterview != null
                ? `${overview.avgInterview.toFixed(1)}/5`
                : "—"
            }
            sub={`${overview.interviewCount} sessions`}
          />
        </section>

        {overview.mockExamCount > 0 && (
          <section className="mt-6">
            <StatCard
              label="Full mock exams"
              value={String(overview.mockExamCount)}
              sub={
                overview.avgMockExam != null
                  ? `Average overall ${overview.avgMockExam}/5`
                  : undefined
              }
            />
          </section>
        )}

        <section className="mt-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="text-sm font-medium text-slate-900">Practice mix</h2>
          <div className="mt-4 flex flex-wrap gap-3">
            {(
              [
                ["listen_repeat", overview.listenRepeatCount],
                ["interview", overview.interviewCount],
                ["mock_exam", overview.mockExamCount],
              ] as const
            ).map(([mode, count]) => (
              <span
                key={mode}
                className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700"
              >
                {getModeLabel(mode)} · {count}
              </span>
            ))}
          </div>
        </section>

        {weeklyTrend.length > 0 && (
          <section className="mt-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <h2 className="text-sm font-medium text-slate-900">Weekly trend</h2>
            <ul className="mt-4 space-y-3">
              {weeklyTrend.map((week) => (
                <li
                  key={week.weekLabel}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="text-slate-600">Week of {week.weekLabel}</span>
                  <span className="text-slate-900">
                    {week.avgScore != null ? `${week.avgScore}/5` : "—"} ·{" "}
                    {week.sessionCount} session
                    {week.sessionCount === 1 ? "" : "s"}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {dimensionInsights.some((d) => d.average > 0) && (
          <section className="mt-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <h2 className="text-sm font-medium text-slate-900">
              Interview dimensions
            </h2>
            <ul className="mt-4 space-y-3">
              {dimensionInsights.map((dim) => (
                <li
                  key={dim.label}
                  className="flex items-center justify-between gap-3"
                >
                  <span className="text-sm text-slate-700">{dim.label}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-slate-900">
                      {dim.average > 0 ? `${dim.average}/5` : "—"}
                    </span>
                    {dim.average > 0 && (
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-medium uppercase ${LEVEL_STYLE[dim.level]}`}
                      >
                        {dim.level}
                      </span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}

        <div className="mt-6 grid gap-6 sm:grid-cols-2">
          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-medium text-emerald-800">Highlights</h2>
            <ul className="mt-3 space-y-2">
              {highlights.map((item) => (
                <li
                  key={item}
                  className="flex gap-2 text-sm leading-relaxed text-slate-600"
                >
                  <span className="text-emerald-500" aria-hidden="true">
                    ✓
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-medium text-slate-900">Focus next</h2>
            <ul className="mt-3 space-y-2">
              {focusAreas.map((item) => (
                <li
                  key={item}
                  className="flex gap-2 text-sm leading-relaxed text-slate-600"
                >
                  <span className="text-slate-400" aria-hidden="true">
                    →
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </section>
        </div>

        {overview.totalSessions === 0 && (
          <section className="mt-6 rounded-xl border border-dashed border-slate-200 bg-white p-6 text-center">
            <p className="text-sm text-slate-600">
              Start practicing to unlock personalized growth insights.
            </p>
            <div className="mt-4 flex flex-wrap justify-center gap-3">
              <Link
                href="/mock-exam"
                className="rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white"
              >
                Full Mock Exam
              </Link>
              <Link
                href="/listen-repeat"
                className="rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700"
              >
                Quick drill
              </Link>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
