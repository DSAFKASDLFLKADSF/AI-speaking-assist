"use client";

import { useEffect, useState } from "react";

export const PREP_TIME_PRESETS = [0, 15, 30, 45] as const;

export type PrepTimePreset = (typeof PREP_TIME_PRESETS)[number];

export interface PrepTimeSelectorProps {
  value: number;
  onChange: (seconds: number) => void;
  disabled?: boolean;
  className?: string;
  minCustom?: number;
  maxCustom?: number;
}

function isPreset(value: number): value is PrepTimePreset {
  return (PREP_TIME_PRESETS as readonly number[]).includes(value);
}

export function PrepTimeSelector({
  value,
  onChange,
  disabled = false,
  className = "",
  minCustom = 0,
  maxCustom = 120,
}: PrepTimeSelectorProps) {
  const [mode, setMode] = useState<"preset" | "custom">(
    isPreset(value) ? "preset" : "custom"
  );
  const [customValue, setCustomValue] = useState(
    isPreset(value) ? "" : String(value)
  );

  useEffect(() => {
    if (isPreset(value)) {
      setMode("preset");
    } else {
      setMode("custom");
      setCustomValue(String(value));
    }
  }, [value]);

  const selectPreset = (seconds: PrepTimePreset) => {
    setMode("preset");
    onChange(seconds);
  };

  const selectCustom = () => {
    setMode("custom");
    const parsed = Number(customValue);
    if (!Number.isNaN(parsed)) {
      onChange(clampCustom(parsed, minCustom, maxCustom));
    }
  };

  const handleCustomChange = (raw: string) => {
    setCustomValue(raw);
    const parsed = Number(raw);
    if (raw !== "" && !Number.isNaN(parsed)) {
      onChange(clampCustom(parsed, minCustom, maxCustom));
    }
  };

  return (
    <div className={className}>
      <p className="text-sm font-medium text-slate-900">Preparation Time</p>
      <p className="mt-1 text-xs text-slate-500">
        Choose how long to prepare before recording
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        {PREP_TIME_PRESETS.map((seconds) => {
          const selected = mode === "preset" && value === seconds;
          return (
            <button
              key={seconds}
              type="button"
              disabled={disabled}
              onClick={() => selectPreset(seconds)}
              className={`rounded-full px-4 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                selected
                  ? "bg-slate-900 text-white"
                  : "border border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
              }`}
            >
              {seconds}s
            </button>
          );
        })}

        <button
          type="button"
          disabled={disabled}
          onClick={selectCustom}
          className={`rounded-full px-4 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
            mode === "custom"
              ? "bg-slate-900 text-white"
              : "border border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
          }`}
        >
          Custom
        </button>
      </div>

      {mode === "custom" && (
        <div className="mt-3 flex items-center gap-2">
          <input
            type="number"
            min={minCustom}
            max={maxCustom}
            disabled={disabled}
            value={customValue}
            onChange={(e) => handleCustomChange(e.target.value)}
            placeholder="Seconds"
            className="w-24 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-400 disabled:opacity-50"
            aria-label="Custom preparation time in seconds"
          />
          <span className="text-sm text-slate-500">seconds</span>
        </div>
      )}

      <p className="mt-3 text-xs text-slate-400">
        Selected: {value}s
        {value === 0 && " (no preparation)"}
      </p>
    </div>
  );
}

function clampCustom(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Math.round(value)));
}
