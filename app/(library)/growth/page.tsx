"use client";



import Link from "next/link";

import { useCallback, useEffect, useState } from "react";

import type { User } from "@supabase/supabase-js";

import {

  DimensionProgressList,

  GrowthHero,

  GrowthStatCard,

  InsightPanel,

  PracticeMixChart,

  WeeklyTrendChart,

} from "@/components/growth/GrowthVisuals";

import { getPracticeHistory } from "@/lib/api";

import { computeGrowthSummary, type GrowthSummary } from "@/lib/growthStats";

import { getSupabase, isSupabaseConfigured } from "@/lib/supabase";

import {
  formatSpeakingBand,
  SPEAKING_BAND_MAX,
} from "@/lib/toeflSpeakingBand";



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

      <div className="mx-auto max-w-4xl">

        <div className="animate-pulse space-y-4">

          <div className="h-40 rounded-2xl bg-slate-200" />

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

            {[1, 2, 3, 4].map((i) => (

              <div key={i} className="h-24 rounded-xl bg-slate-200" />

            ))}

          </div>

        </div>

      </div>

    );

  }



  const { overview, weeklyTrend, dimensionInsights, highlights, focusAreas, narrative } =

    summary;



  return (

    <div className="mx-auto max-w-4xl pb-8">

      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">

        <div>

          <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-500">

            Progress

          </p>

          <h1 className="mt-1 text-2xl font-semibold text-slate-900 sm:text-3xl">

            Growth Summary

          </h1>

          <p className="mt-1 text-sm text-slate-600">

            Combined view on this device

            {user ? " plus cloud history" : ""}

          </p>

        </div>

        <Link

          href="/dashboard"

          className="inline-flex items-center rounded-lg bg-[#1e3a5f] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#152a45]"

        >

          Practice now →

        </Link>

      </header>



      <GrowthHero overview={overview} narrative={narrative} />



      <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

        <GrowthStatCard

          label="Total sessions"

          value={String(overview.totalSessions)}

          sub={`${overview.practiceDays} practice day${overview.practiceDays === 1 ? "" : "s"}`}

          accent="blue"

          icon={

            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">

              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25A2.25 2.25 0 0 1 13.5 18v-2.25Z" />

            </svg>

          }

        />

        <GrowthStatCard

          label="Current streak"

          value={`${overview.currentStreak} day${overview.currentStreak === 1 ? "" : "s"}`}

          sub={overview.currentStreak >= 2 ? "Keep it going!" : "Practice daily to build streak"}

          accent="amber"

          icon={

            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">

              <path strokeLinecap="round" strokeLinejoin="round" d="M15.362 5.214A8.252 8.252 0 0 1 12 21 8.25 8.25 0 0 1 6 15.75M15.362 5.214A8.252 8.252 0 0 0 12 2.25a8.252 8.252 0 0 0-3.362 2.964M15.362 5.214 12 12m0 0-3.362-6.786M12 12v8.25" />

            </svg>

          }

        />

        <GrowthStatCard

          label="Listen & Repeat avg"

          value={

            overview.avgListenRepeat != null

              ? `${formatSpeakingBand(overview.avgListenRepeat)}/${SPEAKING_BAND_MAX}`

              : "—"

          }

          sub={`${overview.listenRepeatCount} sessions`}

          accent="emerald"

          icon={

            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">

              <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 0 1 0 12.728M16.463 8.288a5.25 5.25 0 0 1 0 7.424M6.75 8.25l4.72-4.72a.75.75 0 0 1 1.28.53v15.88a.75.75 0 0 1-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.009 9.009 0 0 1 2.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75Z" />

            </svg>

          }

        />

        <GrowthStatCard

          label="Interview avg"

          value={

            overview.avgInterview != null

              ? `${formatSpeakingBand(overview.avgInterview)}/${SPEAKING_BAND_MAX}`

              : "—"

          }

          sub={`${overview.interviewCount} sessions`}

          accent="violet"

          icon={

            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">

              <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 0 1-.825-.242m9.345-8.334a2.126 2.126 0 0 0-.476-.095 48.64 48.64 0 0 0-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.697c0-1.355-.872-2.552-2.105-2.814a48.676 48.676 0 0 0-8.048 0c-1.233.262-2.105 1.46-2.105 2.814v1.512" />

            </svg>

          }

        />

      </section>



      {overview.mockExamCount > 0 && (

        <section className="mt-6">

          <GrowthStatCard

            label="Full mock exams"

            value={String(overview.mockExamCount)}

            sub={

              overview.avgMockExam != null

                ? `Average speaking band ${formatSpeakingBand(overview.avgMockExam)}/${SPEAKING_BAND_MAX}`

                : undefined

            }

            accent="blue"

            icon={

              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">

                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />

              </svg>

            }

          />

        </section>

      )}



      <div className="mt-6 grid gap-6 lg:grid-cols-2">

        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">

          <h2 className="text-sm font-semibold text-slate-900">Practice mix</h2>

          <p className="mt-1 text-xs text-slate-500">How you split your sessions</p>

          <div className="mt-4">

            <PracticeMixChart overview={overview} />

          </div>

        </section>



        {weeklyTrend.length > 0 && (

          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">

            <h2 className="text-sm font-semibold text-slate-900">Weekly trend</h2>

            <p className="mt-1 text-xs text-slate-500">Average score by week</p>

            <div className="mt-6">

              <WeeklyTrendChart weeks={weeklyTrend} />

            </div>

          </section>

        )}

      </div>



      {dimensionInsights.some((d) => d.average > 0) && (

        <section className="mt-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">

          <h2 className="text-sm font-semibold text-slate-900">

            Interview dimensions

          </h2>

          <p className="mt-1 text-xs text-slate-500">

            Rubric breakdown from your interview sessions

          </p>

          <div className="mt-5">

            <DimensionProgressList dimensions={dimensionInsights} />

          </div>

        </section>

      )}



      <div className="mt-6 grid gap-6 sm:grid-cols-2">

        <InsightPanel title="Highlights" items={highlights} variant="highlight" />

        <InsightPanel title="Focus next" items={focusAreas} variant="focus" />

      </div>



      {overview.totalSessions === 0 && (

        <section className="mt-6 rounded-xl border border-dashed border-blue-200 bg-blue-50/50 p-8 text-center">

          <p className="text-sm text-slate-700">

            Start practicing to unlock personalized growth insights.

          </p>

          <Link

            href="/dashboard"

            className="mt-4 inline-block rounded-lg bg-[#1e3a5f] px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#152a45]"

          >

            Open Test Library

          </Link>

        </section>

      )}

    </div>

  );

}


