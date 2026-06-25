"use client";

import Link from "next/link";
import type { ExamProgressInfo } from "@/lib/examFlow";
import type { ExamStageLabel } from "@/lib/examFlow";
import { StageBadge } from "@/components/exam/StageBadge";

export interface ExamHeaderProps {
  testTitle: string;
  progress: ExamProgressInfo;
  stageLabel: ExamStageLabel | null;
  exitHref: string;
  /** Called when the user leaves the exam (e.g. clear saved draft). */
  onExit?: () => void;
  sticky?: boolean;
}

export function ExamHeader({
  testTitle,
  progress,
  stageLabel,
  exitHref,
  onExit,
  sticky = true,
}: ExamHeaderProps) {
  return (
    <header
      className={
        sticky
          ? "sticky top-0 z-20 -mx-1 mb-4 border-b border-slate-200/80 bg-slate-50/95 px-1 py-3 backdrop-blur"
          : "mb-6 space-y-3"
      }
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-medium text-slate-500">
            {testTitle}
          </p>
          <p className="mt-0.5 text-sm font-semibold text-slate-900">
            Question {progress.globalQuestion} of {progress.globalTotal}
          </p>
          <p className="text-xs text-slate-600">{progress.taskType}</p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">
          {stageLabel && <StageBadge label={stageLabel} />}
          <Link
            href={exitHref}
            onClick={() => onExit?.()}
            className="text-xs font-medium text-slate-500 hover:text-slate-800"
          >
            Exit test
          </Link>
        </div>
      </div>

      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-200">
        <div
          className="h-full rounded-full bg-[#1e3a5f] transition-all duration-500"
          style={{ width: `${progress.progressPercent}%` }}
        />
      </div>
    </header>
  );
}
