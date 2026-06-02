import type { ReactNode } from "react";

export type WordStatus = "correct" | "replacement" | "missing";

/** Aligned word pair from original ↔ user diff */
export interface ComparisonWord {
  status: WordStatus;
  /** Token from the original transcript (null if user inserted extra word) */
  original: string | null;
  /** Token from the user transcript (null if user skipped this word) */
  user: string | null;
}

export interface ComparisonTextProps {
  original: string;
  user: string;
  words: ComparisonWord[];
  className?: string;
  showLegend?: boolean;
}

const USER_STATUS_CLASS: Record<WordStatus, string> = {
  correct: "bg-emerald-100 text-emerald-900",
  replacement: "bg-amber-100 text-amber-900",
  missing: "bg-red-100 text-red-500 line-through decoration-red-400",
};

const ORIGINAL_STATUS_CLASS: Partial<Record<WordStatus, string>> = {
  missing: "bg-red-100 text-red-900 line-through decoration-red-400",
};

function Token({ text, className }: { text: string; className?: string }) {
  return (
    <span
      className={`rounded px-0.5 py-px ${className ?? "text-slate-700"}`}
    >
      {text}
    </span>
  );
}

function Column({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </h3>
      <div className="flex flex-wrap gap-x-1 gap-y-1 rounded-lg bg-slate-50 p-3 text-sm leading-relaxed">
        {children}
      </div>
    </div>
  );
}

function Legend() {
  const items = [
    { color: "bg-emerald-100 border-emerald-300", label: "Correct" },
    { color: "bg-amber-100 border-amber-300", label: "Replacement" },
    { color: "bg-red-100 border-red-300", label: "Missing" },
  ] as const;

  return (
    <div className="mb-4 flex flex-wrap gap-3">
      {items.map(({ color, label }) => (
        <span
          key={label}
          className="flex items-center gap-1.5 text-xs text-slate-600"
        >
          <span
            className={`h-3 w-3 rounded border ${color}`}
            aria-hidden="true"
          />
          {label}
        </span>
      ))}
    </div>
  );
}

export function ComparisonText({
  original,
  user,
  words,
  className = "",
  showLegend = true,
}: ComparisonTextProps) {
  const hasWords = words.length > 0;

  return (
    <div className={className}>
      {showLegend && <Legend />}

      <div className="grid gap-4 sm:grid-cols-2">
        <Column label="Original">
          {hasWords ? (
            words.map((word, i) => {
              if (word.original === null) return null;
              return (
                <Token
                  key={`orig-${i}`}
                  text={word.original}
                  className={ORIGINAL_STATUS_CLASS[word.status]}
                />
              );
            })
          ) : (
            <span className="text-slate-700">{original}</span>
          )}
        </Column>

        <Column label="Your Response">
          {hasWords ? (
            words.map((word, i) => {
              if (word.status === "missing") {
                return (
                  <Token
                    key={`user-${i}`}
                    text={word.original ?? "—"}
                    className={USER_STATUS_CLASS.missing}
                  />
                );
              }
              if (word.user === null) return null;
              return (
                <Token
                  key={`user-${i}`}
                  text={word.user}
                  className={
                    word.original === null
                      ? USER_STATUS_CLASS.replacement
                      : USER_STATUS_CLASS[word.status]
                  }
                />
              );
            })
          ) : (
            <span className="text-slate-700">{user}</span>
          )}
        </Column>
      </div>
    </div>
  );
}
