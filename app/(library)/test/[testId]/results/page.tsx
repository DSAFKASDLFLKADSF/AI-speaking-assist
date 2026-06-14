import Link from "next/link";
import { notFound } from "next/navigation";
import { QuestionProgressRow } from "@/components/dashboard/QuestionProgressRow";
import { ScoreSummary } from "@/components/dashboard/ScoreSummary";
import {
  formatDisplayScore,
  getScoreBand,
  SCORE_BAND_TEXT,
  toDisplayScore,
} from "@/lib/testLibrary/scores";
import { getTestSetById } from "@/lib/testLibrary";
import { SPEAKING_BAND_MAX } from "@/lib/toeflSpeakingBand";

export default function TestResultsPage({
  params,
}: {
  params: { testId: string };
}) {
  const testSet = getTestSetById(params.testId);
  if (!testSet) notFound();

  const allQuestions = [
    ...testSet.listenRepeatQuestions,
    ...testSet.interviewQuestions,
  ];
  const completed = allQuestions.filter((q) => q.score != null);

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
          Results & progress
        </p>
        <h1 className="mt-1 text-2xl font-semibold text-slate-900">
          {testSet.title}
        </h1>

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

      {completed.length === 0 ? (
        <section className="mt-6 rounded-xl border border-dashed border-slate-200 bg-white p-8 text-center">
          <p className="text-sm text-slate-600">
            No completed questions yet. Start the test to see results here.
          </p>
          <Link
            href={`/test/${testSet.id}`}
            className="mt-4 inline-block rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-medium text-white"
          >
            Start Test
          </Link>
        </section>
      ) : (
        <section className="mt-6 space-y-6">
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-900">
              Listen & Repeat
            </h2>
            <ul className="mt-4 space-y-3">
              {testSet.listenRepeatQuestions.map((q) => (
                <li
                  key={q.label}
                  className="flex items-center justify-between gap-3 border-b border-slate-50 pb-2 last:border-0"
                >
                  <span className="text-sm text-slate-700">{q.label}</span>
                  <QuestionProgressRow question={q} />
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-900">
              Virtual Interview
            </h2>
            <ul className="mt-4 space-y-3">
              {testSet.interviewQuestions.map((q) => (
                <li key={q.label}>
                  <QuestionProgressRow question={q} />
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-900">Score summary</h2>
            <ul className="mt-3 space-y-2">
              {completed.map((q) => {
                const display = toDisplayScore(q.score);
                const band = getScoreBand(display);
                return (
                  <li
                    key={q.label}
                    className="flex justify-between text-sm"
                  >
                    <span className="text-slate-600">{q.label}</span>
                    <span
                      className={`font-medium tabular-nums ${SCORE_BAND_TEXT[band]}`}
                    >
                      {formatDisplayScore(q.score)}/{SPEAKING_BAND_MAX}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>
      )}
    </div>
  );
}
