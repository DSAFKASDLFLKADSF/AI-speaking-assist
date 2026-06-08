"use client";

import { FeedbackCard } from "@/components/FeedbackCard";
import { InterviewScoreCard } from "@/components/InterviewScoreCard";
import { ListenRepeatFeedbackPanel } from "@/components/exam/ListenRepeatFeedbackPanel";
import {
  interviewScoresAverage,
  type LocalHistoryEntry,
  type LocalInterviewDetail,
  type LocalListenRepeatDetail,
} from "@/lib/localHistory";

function ListenRepeatHistoryItem({
  item,
  index,
}: {
  item: LocalListenRepeatDetail;
  index: number;
}) {
  const original = item.original ?? item.title;

  if (item.analysis) {
    return (
      <ListenRepeatFeedbackPanel
        original={original}
        analysis={item.analysis}
        title={`Question ${index + 1} · ${item.title} — ${item.score}/5`}
      />
    );
  }

  return (
    <details className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <summary className="cursor-pointer list-none px-5 py-4 text-sm font-medium text-slate-900 [&::-webkit-details-marker]:hidden">
        Question {index + 1} · {item.title}
        <span className="ml-2 text-slate-500">· {item.score}/5</span>
      </summary>
      <div className="space-y-3 border-t border-slate-100 px-5 pb-5 pt-4">
        <p className="text-sm text-slate-700">{item.scoreSummary}</p>
        <FeedbackCard summary={item.feedbackSummary} sections={[]} />
        <p className="text-xs text-slate-500">
          Detailed word-level feedback was not saved for this attempt.
        </p>
      </div>
    </details>
  );
}

function InterviewHistoryItem({ item }: { item: LocalInterviewDetail }) {
  const prompt = item.promptText ?? item.promptPreview;
  const avg = interviewScoresAverage(item.scores);
  const label = item.title ?? item.sessionTheme;

  if (item.analysis) {
    return (
      <details className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <summary className="cursor-pointer list-none px-5 py-4 text-sm font-medium text-slate-900 [&::-webkit-details-marker]:hidden">
          {label}
          <span className="ml-2 text-slate-500">· {avg}/5</span>
        </summary>
        <div className="border-t border-slate-100 px-5 pb-5 pt-4">
          <p className="text-sm text-slate-700">{prompt}</p>
          <InterviewScoreCard
            scores={item.analysis.scores}
            feedback={item.analysis.scoreSummary}
            className="mt-3"
          />
          <FeedbackCard
            summary={item.analysis.feedback.summary}
            sections={item.analysis.feedback.sections}
            className="mt-4"
          />
        </div>
      </details>
    );
  }

  return (
    <details className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <summary className="cursor-pointer list-none px-5 py-4 text-sm font-medium text-slate-900 [&::-webkit-details-marker]:hidden">
        {label}
        <span className="ml-2 text-slate-500">· {avg}/5</span>
      </summary>
      <div className="border-t border-slate-100 px-5 pb-5 pt-4">
        <p className="text-sm text-slate-700">{prompt}</p>
        <InterviewScoreCard
          scores={item.scores}
          feedback={item.scoreSummary}
          className="mt-3"
        />
        <FeedbackCard summary={item.feedbackSummary} sections={[]} className="mt-4" />
        <p className="mt-3 text-xs text-slate-500">
          Detailed feedback sections were not saved for this attempt.
        </p>
      </div>
    </details>
  );
}

export function HistoryEntryDetail({ entry }: { entry: LocalHistoryEntry }) {
  if (entry.mode === "mock_exam" && entry.mockExam) {
    const { mockExam } = entry;

    return (
      <div className="mt-3 space-y-4 border-t border-slate-100 pt-4">
        <p className="text-xs text-slate-500">
          Overall {mockExam.overallScore.toFixed(1)}/5 · Listen & Repeat{" "}
          {mockExam.listenRepeatAvg.toFixed(1)}/5 · Interview{" "}
          {mockExam.interviewAvg.toFixed(1)}/5
        </p>

        {mockExam.listenRepeat.length > 0 && (
          <section className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Listen & Repeat
            </h4>
            {mockExam.listenRepeat.map((item, index) => (
              <ListenRepeatHistoryItem
                key={item.promptId}
                item={item}
                index={index}
              />
            ))}
          </section>
        )}

        {mockExam.interview.length > 0 && (
          <section className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Virtual Interview
            </h4>
            {mockExam.interview.map((item) => (
              <InterviewHistoryItem key={item.questionId} item={item} />
            ))}
          </section>
        )}
      </div>
    );
  }

  if (entry.mode === "listen_repeat" && entry.listenRepeatScore != null) {
    return (
      <div className="mt-3 border-t border-slate-100 pt-4">
        <p className="text-sm text-slate-700">{entry.summary}</p>
        {entry.overallFeedback && (
          <FeedbackCard summary={entry.overallFeedback} sections={[]} className="mt-3" />
        )}
      </div>
    );
  }

  if (entry.mode === "interview" && entry.interviewScores) {
    return (
      <div className="mt-3 border-t border-slate-100 pt-4">
        <InterviewScoreCard scores={entry.interviewScores} feedback={entry.summary} />
        {entry.overallFeedback && (
          <FeedbackCard summary={entry.overallFeedback} sections={[]} className="mt-3" />
        )}
      </div>
    );
  }

  return (
    <p className="mt-3 border-t border-slate-100 pt-4 text-sm text-slate-600">
      {entry.summary}
    </p>
  );
}
