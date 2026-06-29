import type { InterviewScores } from "@/components/InterviewScoreCard";
import type { PracticeHistoryItem } from "@/lib/history-types";
import {
  getLocalHistory,
  interviewScoresAverage,
  type LocalHistoryEntry,
  type LocalPracticeMode,
} from "@/lib/localHistory";

export type UnifiedHistorySource = "local" | "cloud";

export interface UnifiedHistoryItem {
  id: string;
  source: UnifiedHistorySource;
  mode: LocalPracticeMode;
  createdAt: string;
  title: string;
  summary: string;
  listenRepeatScore?: number;
  interviewAvg?: number;
  mockExamOverall?: number;
  scaledScore?: number;
  overallFeedback?: string;
  localEntry?: LocalHistoryEntry;
  cloudItem?: PracticeHistoryItem;
}

const MODE_LABEL: Record<LocalPracticeMode, string> = {
  listen_repeat: "Listen & Repeat",
  interview: "Virtual Interview",
  mock_exam: "Full Mock Exam",
};

export function getModeLabel(mode: LocalPracticeMode): string {
  return MODE_LABEL[mode];
}

function inferCloudMode(item: PracticeHistoryItem): LocalPracticeMode {
  const promptId = item.session.promptId ?? "";
  if (promptId.startsWith("lr-")) return "listen_repeat";
  if (promptId.startsWith("iv-")) return "interview";
  const text = item.session.promptText.toLowerCase();
  if (text.includes("repeat") || text.includes("library")) {
    return "listen_repeat";
  }
  return "interview";
}

function mapCloudItem(item: PracticeHistoryItem): UnifiedHistoryItem {
  const mode = inferCloudMode(item);
  const title =
    mode === "listen_repeat"
      ? "Listen & Repeat"
      : item.session.promptText.slice(0, 60) +
        (item.session.promptText.length > 60 ? "…" : "");

  return {
    id: `cloud-${item.session.id}`,
    source: "cloud",
    mode,
    createdAt: item.session.createdAt,
    title,
    summary: item.score?.overallFeedback ?? "Saved practice session",
    scaledScore: item.score?.scaledScore,
    overallFeedback: item.score?.overallFeedback ?? undefined,
    cloudItem: item,
  };
}

function mapLocalItem(entry: LocalHistoryEntry): UnifiedHistoryItem {
  const interviewAvg = entry.interviewScores
    ? interviewScoresAverage(entry.interviewScores)
    : undefined;

  return {
    id: entry.id,
    source: "local",
    mode: entry.mode,
    createdAt: entry.createdAt,
    title: entry.title,
    summary: entry.summary,
    listenRepeatScore: entry.listenRepeatScore,
    interviewAvg,
    mockExamOverall: entry.mockExam?.overallScore,
    overallFeedback: entry.overallFeedback,
    localEntry: entry,
  };
}

export function mergeUnifiedHistory(
  cloudItems: PracticeHistoryItem[] = [],
  viewerUserId: string | null = null
): UnifiedHistoryItem[] {
  const local = getLocalHistory(viewerUserId).map(mapLocalItem);
  const cloud = cloudItems.map(mapCloudItem);

  const seen = new Set<string>();
  const merged = [...local, ...cloud]
    .filter((item) => {
      const key = `${item.mode}-${item.createdAt}-${item.title}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

  return merged;
}

export function interviewScoresFromCloud(
  item: PracticeHistoryItem
): InterviewScores | null {
  if (!item.score) return null;
  const clamp = (n: number) =>
    Math.min(5, Math.max(1, Math.round(n))) as InterviewScores["topic"];
  return {
    topic: clamp(item.score.topicDevelopmentScore),
    pace: clamp(item.score.deliveryScore),
    pronunciation: clamp(item.score.deliveryScore),
    grammar: clamp(item.score.languageUseScore),
  };
}
