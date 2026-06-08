"use client";

import Link from "next/link";
import { QuestionProgressRow } from "@/components/dashboard/QuestionProgressRow";
import { ScoreSummary } from "@/components/dashboard/ScoreSummary";
import { TestSetHistory } from "@/components/dashboard/TestSetHistory";
import { getScoringRecordings } from "@/lib/examRecordings";
import { buildExamPlanForTest } from "@/lib/mockExamConfig";
import { loadExamDraft } from "@/lib/examSessionPersistence";
import type { TestExamMode } from "@/lib/localHistory";
import { applyLocalProgressToTestSets } from "@/lib/testLibrary/applyLocalProgress";
import { getTestSetById } from "@/lib/testLibrary";
import type { TestSet } from "@/lib/testLibrary/types";
import { useEffect, useState } from "react";

const RUN_MODE_HREF: Record<TestExamMode, string> = {
  full: "full",
  listen_repeat: "listen-repeat",
  interview: "interview",
};

const RUN_MODE_LABEL: Record<TestExamMode, string> = {
  full: "Full test",
  listen_repeat: "Listen & Repeat",
  interview: "Interview",
};

export function TestOverviewClient({ testId }: { testId: string }) {
  const [testSet, setTestSet] = useState<TestSet | undefined>(() =>
    getTestSetById(testId)
  );
  const [savedSessions, setSavedSessions] = useState<
    Array<{ mode: TestExamMode; count: number; href: string }>
  >([]);

  useEffect(() => {
    const base = getTestSetById(testId);
    if (base) {
      setTestSet(applyLocalProgressToTestSets([base])[0]);
    }

    const modes: TestExamMode[] = ["full", "listen_repeat", "interview"];
    setSavedSessions(
      modes
        .map((mode) => {
          const draft = loadExamDraft(testId, mode);
          if (!draft?.recordings.length) return null;
          const plan = buildExamPlanForTest(testId);
          const count = getScoringRecordings(draft.recordings, plan, mode).length;
          if (count === 0) return null;
          return {
            mode,
            count,
            href: `/test/${testId}/run/${RUN_MODE_HREF[mode]}`,
          };
        })
        .filter((item): item is NonNullable<typeof item> => item != null)
    );
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

      {savedSessions.length > 0 && (
        <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <p className="text-sm font-medium text-emerald-900">
            Saved recordings found on this device
          </p>
          <p className="mt-1 text-xs text-emerald-800">
            Continue where you left off — your audio is still saved.
          </p>
          <ul className="mt-3 space-y-2">
            {savedSessions.map((session) => (
              <li key={session.mode}>
                <Link
                  href={session.href}
                  className="inline-flex rounded-lg bg-emerald-800 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-900"
                >
                  Resume {RUN_MODE_LABEL[session.mode]} ({session.count}{" "}
                  recording{session.count === 1 ? "" : "s"})
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

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
          Realistic 2026 TOEFL flow: instructions → listen → record → review.
          Choose scoring and feedback on the next screen.
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
