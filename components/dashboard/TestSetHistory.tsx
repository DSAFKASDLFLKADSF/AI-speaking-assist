"use client";

import { HistoryEntryDetail } from "@/components/dashboard/HistoryEntryDetail";
import type { LocalHistoryEntry } from "@/lib/localHistory";
import { getHistoryForTestSet } from "@/lib/localHistory";
import { useEffect, useState } from "react";

export interface TestSetHistoryProps {
  testSetId: string;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function modeLabel(entry: LocalHistoryEntry): string {
  if (entry.examMode === "listen_repeat") return "Listen & Repeat";
  if (entry.examMode === "interview") return "Interview";
  return "Full test";
}

export function TestSetHistory({ testSetId }: TestSetHistoryProps) {
  const [entries, setEntries] = useState<LocalHistoryEntry[]>([]);

  useEffect(() => {
    setEntries(getHistoryForTestSet(testSetId));
  }, [testSetId]);

  if (entries.length === 0) {
    return (
      <p className="text-sm text-slate-500">
        No attempts saved for this set on this device yet.
      </p>
    );
  }

  return (
    <ul className="divide-y divide-slate-100">
      {entries.map((entry) => (
        <li key={entry.id} className="py-3 first:pt-0">
          <details className="group">
            <summary className="cursor-pointer list-none [&::-webkit-details-marker]:hidden">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-slate-900">
                    {modeLabel(entry)}
                    <span className="ml-2 text-xs font-normal text-slate-400">
                      Tap to view details
                    </span>
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">{entry.summary}</p>
                </div>
                <time className="shrink-0 text-xs text-slate-400">
                  {formatDate(entry.createdAt)}
                </time>
              </div>
            </summary>
            <HistoryEntryDetail entry={entry} />
          </details>
        </li>
      ))}
    </ul>
  );
}
