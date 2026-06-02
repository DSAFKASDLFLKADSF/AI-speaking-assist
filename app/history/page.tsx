"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { getPracticeHistory } from "@/lib/api";
import { getModeLabel, mergeUnifiedHistory, type UnifiedHistoryItem } from "@/lib/unifiedHistory";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase";

function scoreBadge(item: UnifiedHistoryItem): string | null {
  if (item.mode === "listen_repeat" && item.listenRepeatScore != null) {
    return `${item.listenRepeatScore}/5`;
  }
  if (item.mode === "interview" && item.interviewAvg != null) {
    return `${item.interviewAvg.toFixed(1)}/5`;
  }
  if (item.mode === "mock_exam" && item.mockExamOverall != null) {
    return `${item.mockExamOverall.toFixed(1)}/5`;
  }
  if (item.scaledScore != null) {
    return `${item.scaledScore}/30`;
  }
  return null;
}

const MODE_STYLE: Record<
  UnifiedHistoryItem["mode"],
  string
> = {
  listen_repeat: "bg-blue-50 text-blue-700",
  interview: "bg-violet-50 text-violet-700",
  mock_exam: "bg-emerald-50 text-emerald-700",
};

export default function HistoryPage() {
  const [user, setUser] = useState<User | null>(null);
  const [items, setItems] = useState<UnifiedHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadHistory = useCallback(async () => {
    setLoading(true);
    setError(null);

    let cloudItems: Awaited<
      ReturnType<typeof getPracticeHistory>
    >["items"] = [];

    if (isSupabaseConfigured()) {
      const supabase = getSupabase();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const currentUser = session?.user ?? null;
      setUser(currentUser);

      if (currentUser) {
        try {
          const data = await getPracticeHistory({ limit: 50 });
          cloudItems = data.items;
        } catch (err) {
          setError(
            err instanceof Error ? err.message : "Failed to load cloud history."
          );
        }
      }
    }

    setItems(mergeUnifiedHistory(cloudItems));
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-3xl px-4 pb-16 pt-28 sm:px-6 md:pt-24 lg:px-8 lg:pt-28">
        <header className="mb-8">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-500">
            Progress
          </p>
          <h1 className="mt-2 text-2xl font-semibold text-slate-900 sm:text-3xl">
            Practice History
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Sessions are saved on this device automatically. Log in to sync
            additional records to the cloud.
          </p>
          <Link
            href="/growth"
            className="mt-3 inline-flex items-center text-sm font-medium text-slate-900 underline"
          >
            View growth summary →
          </Link>
        </header>

        {loading && (
          <p className="text-sm text-slate-500">Loading history…</p>
        )}

        {error && (
          <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
            {error} Local sessions on this device are still shown below.
          </p>
        )}

        {!loading && items.length === 0 && (
          <div className="rounded-xl border border-dashed border-slate-200 bg-white p-6 text-center">
            <p className="text-sm text-slate-600">
              No practice sessions yet. Complete a drill or mock exam to see
              your history here.
            </p>
            <div className="mt-4 flex flex-wrap justify-center gap-3">
              <Link
                href="/listen-repeat"
                className="rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white"
              >
                Listen & Repeat
              </Link>
              <Link
                href="/mock-exam"
                className="rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700"
              >
                Full Mock Exam
              </Link>
            </div>
          </div>
        )}

        {!loading && user && (
          <p className="mb-4 text-xs text-slate-500">
            Signed in as {user.email} — cloud and local records are combined.
          </p>
        )}

        <ul className="space-y-4">
          {items.map((item) => {
            const badge = scoreBadge(item);
            return (
              <li
                key={item.id}
                className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${MODE_STYLE[item.mode]}`}
                      >
                        {getModeLabel(item.mode)}
                      </span>
                      {item.source === "local" && (
                        <span className="text-[10px] text-slate-400">
                          This device
                        </span>
                      )}
                    </div>
                    <p className="mt-2 text-sm font-medium text-slate-900">
                      {item.title}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {new Date(item.createdAt).toLocaleString()}
                    </p>
                  </div>
                  {badge && (
                    <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                      {badge}
                    </span>
                  )}
                </div>
                <p className="mt-3 text-sm text-slate-600">{item.summary}</p>
                {item.mode === "mock_exam" && item.localEntry?.mockExam && (
                  <p className="mt-2 text-xs text-slate-500">
                    {item.localEntry.mockExam.listenRepeat.length} Listen & Repeat
                    · {item.localEntry.mockExam.interview.length} Interview
                    questions
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </main>
  );
}
