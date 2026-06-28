"use client";

import { HistoryEntryDetail } from "@/components/dashboard/HistoryEntryDetail";
import { getPracticeHistory } from "@/lib/api";
import { fetchCurrentUser } from "@/lib/auth/client";
import { getInterviewSessionForOfficialSet } from "@/lib/interviewPrompts";
import type { LocalHistoryEntry } from "@/lib/localHistory";
import { getHistoryForTestSet } from "@/lib/localHistory";
import { getPromptsBySetId } from "@/lib/prompts";
import { getOfficialSetIdForTest } from "@/lib/testLibrary/mockTestSets";
import { useEffect, useState } from "react";

export interface TestSetHistoryProps {
  testSetId: string;
}

type HistoryRow =
  | { kind: "local"; entry: LocalHistoryEntry }
  | {
      kind: "cloud";
      id: string;
      createdAt: string;
      title: string;
      summary: string;
      scaledScore?: number;
    };

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

function cloudTitle(promptText: string): string {
  const trimmed = promptText.trim();
  const short = trimmed.slice(0, 48);
  return short.length < trimmed.length ? `${short}…` : short;
}

function buildPromptTextSet(testSetId: string): Set<string> {
  const officialSetId = getOfficialSetIdForTest(testSetId);
  if (!officialSetId) return new Set();

  const texts = new Set<string>();
  for (const prompt of getPromptsBySetId(officialSetId)) {
    texts.add(prompt.transcript.trim().toLowerCase());
  }
  const session = getInterviewSessionForOfficialSet(officialSetId);
  if (session) {
    for (const question of session.questions) {
      texts.add(question.prompt.trim().toLowerCase());
    }
  }
  return texts;
}

export function TestSetHistory({ testSetId }: TestSetHistoryProps) {
  const [rows, setRows] = useState<HistoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      const local = getHistoryForTestSet(testSetId).map(
        (entry): HistoryRow => ({ kind: "local", entry })
      );

      const user = await fetchCurrentUser();
      if (cancelled) return;
      setLoggedIn(Boolean(user));

      const merged: HistoryRow[] = [...local];

      if (user) {
        const promptTexts = buildPromptTextSet(testSetId);
        try {
          const data = await getPracticeHistory({ limit: 100 });
          for (const item of data.items) {
            const text = item.session.promptText.trim().toLowerCase();
            if (promptTexts.size > 0 && !promptTexts.has(text)) continue;
            merged.push({
              kind: "cloud",
              id: item.session.id,
              createdAt: item.session.createdAt,
              title: cloudTitle(item.session.promptText),
              summary:
                item.score?.overallFeedback ??
                "Practice saved to your account",
              scaledScore: item.score?.scaledScore ?? undefined,
            });
          }
        } catch {
          // Cloud history optional when server DB unavailable
        }
      }

      merged.sort(
        (a, b) =>
          new Date(
            b.kind === "local" ? b.entry.createdAt : b.createdAt
          ).getTime() -
          new Date(
            a.kind === "local" ? a.entry.createdAt : a.createdAt
          ).getTime()
      );

      if (!cancelled) {
        setRows(merged);
        setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [testSetId]);

  if (loading) {
    return <p className="text-sm text-slate-500">Loading history…</p>;
  }

  if (rows.length === 0) {
    return (
      <p className="text-sm text-slate-500">
        {loggedIn
          ? "No attempts for this set yet. Complete a practice session while signed in to save it here."
          : "No attempts saved for this set yet. Sign in to save progress to your account."}
      </p>
    );
  }

  return (
    <ul className="divide-y divide-slate-100">
      {rows.map((row) =>
        row.kind === "local" ? (
          <li key={row.entry.id} className="py-3 first:pt-0">
            <details className="group">
              <summary className="cursor-pointer list-none [&::-webkit-details-marker]:hidden">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-900">
                      {modeLabel(row.entry)}
                      <span className="ml-2 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-500">
                        This device
                      </span>
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {row.entry.summary}
                    </p>
                  </div>
                  <time className="shrink-0 text-xs text-slate-400">
                    {formatDate(row.entry.createdAt)}
                  </time>
                </div>
              </summary>
              <HistoryEntryDetail entry={row.entry} />
            </details>
          </li>
        ) : (
          <li key={`cloud-${row.id}`} className="py-3 first:pt-0">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-slate-900">
                  {row.title}
                  <span className="ml-2 rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-emerald-700">
                    Account
                  </span>
                </p>
                <p className="mt-0.5 text-xs text-slate-500">{row.summary}</p>
                {row.scaledScore != null && (
                  <p className="mt-1 text-xs text-slate-600">
                    Score: {row.scaledScore}/30
                  </p>
                )}
              </div>
              <time className="shrink-0 text-xs text-slate-400">
                {formatDate(row.createdAt)}
              </time>
            </div>
          </li>
        )
      )}
    </ul>
  );
}
