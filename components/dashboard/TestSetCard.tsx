import Link from "next/link";
import { QuestionProgressRow } from "@/components/dashboard/QuestionProgressRow";
import { ScoreSummary } from "@/components/dashboard/ScoreSummary";
import { formatUserCount } from "@/lib/testLibrary";
import type { TestSet } from "@/lib/testLibrary/types";

export interface TestSetCardProps {
  testSet: TestSet;
}

function formatLastAttempt(iso: string | null): string {
  if (!iso) return "Not attempted";
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function TestSetCard({ testSet }: TestSetCardProps) {
  return (
    <article className="flex flex-col rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
      <header className="border-b border-slate-100 pb-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h2 className="truncate text-base font-semibold text-slate-900">
              {testSet.title}
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">{testSet.subtitle}</p>
          </div>
          <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600">
            {formatUserCount(testSet.userCount)} users
          </span>
        </div>
        <p className="mt-2 text-[11px] text-slate-400">
          Last attempt: {formatLastAttempt(testSet.lastAttemptAt)}
        </p>
      </header>

      <div className="mt-4 flex justify-around gap-2 border-b border-slate-100 pb-4">
        <ScoreSummary
          label="L&R Score"
          score={testSet.scores.listenRepeatAverage}
        />
        <ScoreSummary
          label="INT Score"
          score={testSet.scores.interviewAverage}
        />
      </div>

      <section className="mt-4">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-700">
          Questions
        </h3>
        <ul className="mt-3 max-h-48 space-y-2 overflow-y-auto">
          {[
            ...testSet.listenRepeatQuestions,
            ...testSet.interviewQuestions,
          ].map((q) => (
            <li key={q.label}>
              <QuestionProgressRow question={q} />
            </li>
          ))}
        </ul>
      </section>

      <footer className="mt-5 border-t border-slate-100 pt-4">
        <Link
          href={`/test/${testSet.id}`}
          className="flex w-full items-center justify-center rounded-lg bg-[#1e3a5f] py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#152a45]"
        >
          Open test set
        </Link>
      </footer>
    </article>
  );
}
