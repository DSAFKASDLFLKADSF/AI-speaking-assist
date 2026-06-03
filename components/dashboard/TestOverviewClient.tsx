"use client";

import Link from "next/link";
import { QuestionProgressRow } from "@/components/dashboard/QuestionProgressRow";
import { ScoreSummary } from "@/components/dashboard/ScoreSummary";
import { TestSetHistory } from "@/components/dashboard/TestSetHistory";
import { applyLocalProgressToTestSets } from "@/lib/testLibrary/applyLocalProgress";
import { getTestSetById } from "@/lib/testLibrary";
import type { TestSet } from "@/lib/testLibrary/types";
import { useEffect, useState } from "react";

export function TestOverviewClient({ testId }: { testId: string }) {
  const [testSet, setTestSet] = useState<TestSet | undefined>(() =>
    getTestSetById(testId)
  );

  useEffect(() => {
    const base = getTestSetById(testId);
    if (base) {
      setTestSet(applyLocalProgressToTestSets([base])[0]);
    }
  }, [testId]);

  if (!testSet) return null;

  return (
    <div className="mx-auto max-w-2xl">
      <Link
        href="/dashboard"
        className="text-sm font-medium text-blue-600 hover:underline"
      >
        ← Back to library
      </Link>

      <header className="mt-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
          Official ETS practice set
        </p>
        <h1 className="mt-1 text-2xl font-semibold text-slate-900">
          {testSet.title}
        </h1>
        <p className="mt-1 text-sm text-slate-600">{testSet.subtitle}</p>

        <div className="mt-6 flex justify-around border-t border-slate-100 pt-6">
          <ScoreSummary
            label="L&R Score"
            score={testSet.scores.listenRepeatAverage}
          />
          <ScoreSummary
            label="INT Score"
            score={testSet.scores.interviewAverage}
          />
        </div>
      </header>

      <section className="mt-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-900">Start practice</h2>
        <p className="mt-1 text-xs text-slate-500">
          Exam mode: audio plays once, recording is automatic, scores at the end.
        </p>
        <Link
          href={`/test/${testSet.id}/run/full`}
          className="mt-4 flex w-full items-center justify-center rounded-lg bg-[#1e3a5f] py-3 text-sm font-medium text-white hover:bg-[#152a45]"
        >
          Full speaking test (7 + 4)
        </Link>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <Link
            href={`/test/${testSet.id}/run/listen-repeat`}
            className="rounded-lg border border-slate-200 py-2.5 text-center text-sm font-medium text-slate-800 hover:bg-slate-50"
          >
            Listen & Repeat only
          </Link>
          <Link
            href={`/test/${testSet.id}/run/interview`}
            className="rounded-lg border border-slate-200 py-2.5 text-center text-sm font-medium text-slate-800 hover:bg-slate-50"
          >
            Interview only
          </Link>
        </div>
      </section>

      <section className="mt-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-900">Progress</h2>
        <ul className="mt-4 space-y-2">
          {[...testSet.listenRepeatQuestions, ...testSet.interviewQuestions].map(
            (q) => (
              <li key={q.label}>
                <QuestionProgressRow question={q} />
              </li>
            )
          )}
        </ul>
      </section>

      <section className="mt-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-900">History</h2>
        <div className="mt-4">
          <TestSetHistory testSetId={testSet.id} />
        </div>
      </section>
    </div>
  );
}
