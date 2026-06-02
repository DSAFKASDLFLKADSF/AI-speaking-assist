export interface ToeflQuestion {
  id?: string;
  taskNumber: 1 | 2 | 3 | 4;
  taskLabel: string;
  prompt: string;
  readingPassage?: string;
  prepSeconds?: number;
  responseSeconds?: number;
}

export interface QuestionDisplayProps {
  question: ToeflQuestion;
  className?: string;
}

export function QuestionDisplay({ question, className = "" }: QuestionDisplayProps) {
  const { taskNumber, taskLabel, prompt, readingPassage, prepSeconds, responseSeconds } =
    question;

  return (
    <section
      className={`rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6 ${className}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-medium text-slate-900">Question</h2>
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span>Task {taskNumber}</span>
          {prepSeconds !== undefined && responseSeconds !== undefined && (
            <>
              <span aria-hidden="true">·</span>
              <span>
                {prepSeconds}s prep · {responseSeconds}s response
              </span>
            </>
          )}
        </div>
      </div>

      <p className="mt-1 text-xs text-slate-500">{taskLabel}</p>

      {readingPassage && (
        <div className="mt-4 rounded-lg bg-slate-50 p-3">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Reading
          </p>
          <p className="mt-2 text-sm leading-relaxed text-slate-700">
            {readingPassage}
          </p>
        </div>
      )}

      <p className="mt-4 text-base leading-relaxed text-slate-800">{prompt}</p>
    </section>
  );
}
