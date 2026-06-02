"use client";

import { useEffect, useState } from "react";

export const DEFAULT_REALTIME_HINTS = [
  "Give example",
  "Explain reason",
  "State your view",
  "Add a transition",
  "Wrap up clearly",
] as const;

export interface RealTimeHintProps {
  hints?: readonly string[];
  /** Show the floating hint bar */
  visible?: boolean;
  /** Controlled active hint index */
  activeIndex?: number;
  onActiveIndexChange?: (index: number) => void;
  /** Auto-rotate hints (ms). Set 0 to disable. Default 8000 */
  intervalMs?: number;
  className?: string;
}

export function RealTimeHint({
  hints = DEFAULT_REALTIME_HINTS,
  visible = true,
  activeIndex: controlledIndex,
  onActiveIndexChange,
  intervalMs = 8000,
  className = "",
}: RealTimeHintProps) {
  const [internalIndex, setInternalIndex] = useState(0);
  const activeIndex = controlledIndex ?? internalIndex;

  useEffect(() => {
    if (
      !visible ||
      hints.length <= 1 ||
      intervalMs <= 0 ||
      controlledIndex !== undefined
    ) {
      return;
    }

    const id = setInterval(() => {
      setInternalIndex((prev) => {
        const next = (prev + 1) % hints.length;
        onActiveIndexChange?.(next);
        return next;
      });
    }, intervalMs);

    return () => clearInterval(id);
  }, [visible, hints.length, intervalMs, controlledIndex, onActiveIndexChange]);

  if (!visible || hints.length === 0) return null;

  const current = hints[activeIndex] ?? hints[0];

  return (
    <div
      className={`pointer-events-none fixed bottom-6 left-1/2 z-40 -translate-x-1/2 ${className}`}
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      <div className="flex items-center gap-2 rounded-full border border-slate-200/80 bg-white/90 px-4 py-2.5 shadow-lg backdrop-blur-md">
        <span
          className="flex h-2 w-2 shrink-0 animate-pulse rounded-full bg-emerald-500"
          aria-hidden="true"
        />
        <p className="whitespace-nowrap text-sm font-medium text-slate-800">
          {current}
        </p>
      </div>

      {hints.length > 1 && (
        <div
          className="mt-2 flex justify-center gap-1.5"
          aria-hidden="true"
        >
          {hints.map((_, i) => (
            <span
              key={i}
              className={`h-1 w-1 rounded-full transition-colors ${
                i === activeIndex ? "bg-slate-700" : "bg-slate-300"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
