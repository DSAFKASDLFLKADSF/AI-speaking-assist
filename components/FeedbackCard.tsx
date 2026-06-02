"use client";

import { useId, useState } from "react";

export interface FeedbackSection {
  title: string;
  content: string;
}

export interface FeedbackCardProps {
  /** Short preview shown when collapsed */
  summary: string;
  /** Structured feedback sections */
  sections?: FeedbackSection[];
  /** Plain-text fallback when sections are not provided */
  content?: string;
  defaultOpen?: boolean;
  className?: string;
}

export function FeedbackCard({
  summary,
  sections,
  content,
  defaultOpen = false,
  className = "",
}: FeedbackCardProps) {
  const [open, setOpen] = useState(defaultOpen);
  const panelId = useId();

  const hasDetails =
    (sections && sections.length > 0) || Boolean(content?.trim());

  return (
    <div
      className={`rounded-xl border border-slate-200 bg-white shadow-sm ${className}`}
    >
      <button
        type="button"
        onClick={() => hasDetails && setOpen((prev) => !prev)}
        disabled={!hasDetails}
        aria-expanded={open}
        aria-controls={hasDetails ? panelId : undefined}
        className="flex w-full items-start justify-between gap-3 p-5 text-left sm:p-6 disabled:cursor-default"
      >
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium uppercase tracking-[0.15em] text-slate-500">
            AI Feedback
          </p>
          <p className="mt-2 text-sm leading-relaxed text-slate-700">
            {summary}
          </p>
        </div>

        {hasDetails && (
          <span
            className={`mt-0.5 shrink-0 text-slate-400 transition-transform duration-200 ${
              open ? "rotate-180" : ""
            }`}
            aria-hidden="true"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="m19.5 8.25-7.5 7.5-7.5-7.5"
              />
            </svg>
          </span>
        )}
      </button>

      {hasDetails && open && (
        <div
          id={panelId}
          className="border-t border-slate-100 px-5 pb-5 pt-4 sm:px-6 sm:pb-6"
        >
          {sections && sections.length > 0 ? (
            <ul className="space-y-4">
              {sections.map((section) => (
                <li key={section.title}>
                  <h3 className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    {section.title}
                  </h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-slate-700">
                    {section.content}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
              {content}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
