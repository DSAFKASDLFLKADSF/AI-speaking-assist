"use client";

import type { ReactNode } from "react";

export type TimerMode = "prep" | "response" | "elapsed";

export interface TimerProps {
  /** prep/response: seconds remaining · elapsed: seconds recorded */
  value: number;
  totalSeconds: number;
  mode: TimerMode;
  label?: string;
  sublabel?: string;
  /** Turn red when remaining ≤ threshold (countdown) or remaining ≤ threshold (elapsed) */
  warningThreshold?: number;
  className?: string;
  actions?: ReactNode;
}

const MODE_LABEL: Record<TimerMode, string> = {
  prep: "Preparation time",
  response: "Response time",
  elapsed: "Recording time",
};

const MODE_SUBLABEL: Record<TimerMode, string> = {
  prep: "Prep remaining",
  response: "Response remaining",
  elapsed: "Elapsed",
};

function formatTime(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds));
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function getProgress(mode: TimerMode, value: number, total: number): number {
  if (total <= 0) return 0;
  if (mode === "elapsed") {
    return Math.min(100, (value / total) * 100);
  }
  return Math.min(100, ((total - value) / total) * 100);
}

function isWarning(
  mode: TimerMode,
  value: number,
  total: number,
  threshold: number
): boolean {
  if (mode === "elapsed") {
    return total > 0 && total - value <= threshold;
  }
  return value <= threshold && value > 0;
}

export function Timer({
  value,
  totalSeconds,
  mode,
  label,
  sublabel,
  warningThreshold = 10,
  className = "",
  actions,
}: TimerProps) {
  const warn = isWarning(mode, value, totalSeconds, warningThreshold);
  const progress = getProgress(mode, value, totalSeconds);
  const displaySeconds = mode === "elapsed" ? value : Math.max(0, value);

  return (
    <section
      className={`rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6 ${className}`}
    >
      <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            {label ?? MODE_LABEL[mode]}
          </p>

          <p
            className={`mt-2 font-mono text-5xl font-semibold tabular-nums transition-colors ${
              warn ? "text-red-600" : "text-slate-900"
            } ${warn ? "animate-pulse" : ""}`}
            aria-live="polite"
            aria-atomic="true"
          >
            {formatTime(displaySeconds)}
          </p>

          <p className="mt-1 text-xs text-slate-400">
            {sublabel ?? MODE_SUBLABEL[mode]}
            {mode !== "elapsed" && totalSeconds > 0 && (
              <span> · {formatTime(totalSeconds)} total</span>
            )}
          </p>

          {warn && (
            <p className="mt-2 text-xs font-medium text-red-600" role="status">
              {mode === "elapsed"
                ? `${formatTime(Math.max(0, totalSeconds - value))} left — wrap up soon`
                : `${formatTime(value)} remaining — hurry up`}
            </p>
          )}
        </div>

        {actions && (
          <div className="flex shrink-0 items-center gap-3">{actions}</div>
        )}
      </div>

      <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full rounded-full transition-all duration-1000 ${
            warn || mode === "response" ? "bg-red-500" : "bg-slate-900"
          }`}
          style={{ width: `${progress}%` }}
          role="progressbar"
          aria-valuenow={progress}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>
    </section>
  );
}
