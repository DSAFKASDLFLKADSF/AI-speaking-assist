import type { InterviewScores } from "@/components/InterviewScoreCard";
import type { LocalPracticeMode } from "@/lib/localHistory";
import {
  interviewScoresFromCloud,
  mergeUnifiedHistory,
  type UnifiedHistoryItem,
} from "@/lib/unifiedHistory";
import type { PracticeHistoryItem } from "@/lib/history-types";
import {
  formatSpeakingBand,
  rawScoreToSpeakingBand,
  SPEAKING_BAND_MAX,
} from "@/lib/toeflSpeakingBand";

export interface GrowthOverview {
  totalSessions: number;
  listenRepeatCount: number;
  interviewCount: number;
  mockExamCount: number;
  avgListenRepeat: number | null;
  avgInterview: number | null;
  avgMockExam: number | null;
  practiceDays: number;
  currentStreak: number;
}

export interface WeeklyBucket {
  weekLabel: string;
  sessionCount: number;
  avgScore: number | null;
}

export interface DimensionInsight {
  label: string;
  average: number;
  level: "strong" | "developing" | "focus";
}

export interface GrowthSummary {
  overview: GrowthOverview;
  weeklyTrend: WeeklyBucket[];
  dimensionInsights: DimensionInsight[];
  highlights: string[];
  focusAreas: string[];
  narrative: string;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function average(nums: number[]): number | null {
  if (nums.length === 0) return null;
  return round1(nums.reduce((a, b) => a + b, 0) / nums.length);
}

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function weekKey(date: Date): string {
  const d = startOfDay(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return d.toISOString().slice(0, 10);
}

function formatWeekLabel(key: string): string {
  const d = new Date(`${key}T00:00:00`);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function scoreFromItem(item: UnifiedHistoryItem): number | null {
  if (item.mode === "listen_repeat" && item.listenRepeatScore != null) {
    return rawScoreToSpeakingBand(item.listenRepeatScore);
  }
  if (item.mode === "interview" && item.interviewAvg != null) {
    return rawScoreToSpeakingBand(item.interviewAvg);
  }
  if (item.mode === "mock_exam" && item.mockExamOverall != null) {
    return item.mockExamOverall;
  }
  if (item.scaledScore != null) {
    return rawScoreToSpeakingBand(item.scaledScore / 6);
  }
  return null;
}

function collectInterviewScores(
  items: UnifiedHistoryItem[]
): InterviewScores[] {
  const scores: InterviewScores[] = [];

  for (const item of items) {
    if (item.localEntry?.interviewScores) {
      scores.push(item.localEntry.interviewScores);
    }
    if (item.localEntry?.mockExam?.interview) {
      for (const q of item.localEntry.mockExam.interview) {
        scores.push(q.scores);
      }
    }
    if (item.cloudItem) {
      const cloud = interviewScoresFromCloud(item.cloudItem);
      if (cloud) scores.push(cloud);
    }
  }

  return scores;
}

function computeStreak(dates: Date[]): number {
  if (dates.length === 0) return 0;

  const uniqueDays = Array.from(
    new Set(dates.map((d) => startOfDay(d).getTime()))
  ).sort((a, b) => b - a);

  let streak = 0;
  let cursor = startOfDay(new Date()).getTime();

  for (const day of uniqueDays) {
    if (day === cursor) {
      streak += 1;
      cursor -= 24 * 60 * 60 * 1000;
    } else if (day === cursor - 24 * 60 * 60 * 1000) {
      streak += 1;
      cursor = day - 24 * 60 * 60 * 1000;
    } else if (streak === 0 && day === cursor - 24 * 60 * 60 * 1000) {
      cursor = day;
      streak = 1;
      cursor -= 24 * 60 * 60 * 1000;
    } else {
      break;
    }
  }

  return streak;
}

function buildWeeklyTrend(items: UnifiedHistoryItem[]): WeeklyBucket[] {
  const buckets = new Map<string, number[]>();

  for (const item of items) {
    const score = scoreFromItem(item);
    const key = weekKey(new Date(item.createdAt));
    const list = buckets.get(key) ?? [];
    if (score != null) list.push(score);
    buckets.set(key, list);
  }

  const keys = Array.from(buckets.keys()).sort().slice(-6);
  return keys.map((key) => {
    const scores = buckets.get(key) ?? [];
    return {
      weekLabel: formatWeekLabel(key),
      sessionCount: items.filter((i) => weekKey(new Date(i.createdAt)) === key)
        .length,
      avgScore: average(scores),
    };
  });
}

function dimensionLevel(avgBand: number): DimensionInsight["level"] {
  if (avgBand >= 5) return "strong";
  if (avgBand >= 3.5) return "developing";
  return "focus";
}

export function computeGrowthSummary(
  cloudItems: PracticeHistoryItem[] = []
): GrowthSummary {
  const items = mergeUnifiedHistory(cloudItems);

  const listenRepeatScores = items
    .filter((i) => i.mode === "listen_repeat")
    .map((i) => i.listenRepeatScore)
    .filter((s): s is number => s != null)
    .map(rawScoreToSpeakingBand);

  const interviewAvgs = items
    .filter((i) => i.mode === "interview")
    .map((i) => i.interviewAvg)
    .filter((s): s is number => s != null)
    .map(rawScoreToSpeakingBand);

  const mockScores = items
    .filter((i) => i.mode === "mock_exam")
    .map((i) => i.mockExamOverall)
    .filter((s): s is number => s != null);

  const dates = items.map((i) => new Date(i.createdAt));
  const practiceDays = new Set(
    dates.map((d) => startOfDay(d).toISOString())
  ).size;

  const overview: GrowthOverview = {
    totalSessions: items.length,
    listenRepeatCount: items.filter((i) => i.mode === "listen_repeat").length,
    interviewCount: items.filter((i) => i.mode === "interview").length,
    mockExamCount: items.filter((i) => i.mode === "mock_exam").length,
    avgListenRepeat: average(listenRepeatScores),
    avgInterview: average(interviewAvgs),
    avgMockExam: average(mockScores),
    practiceDays,
    currentStreak: computeStreak(dates),
  };

  const interviewScores = collectInterviewScores(items);
  const dimensionKeys = [
    { key: "topic" as const, label: "Topic Development" },
    { key: "pace" as const, label: "Pace & Fluency" },
    { key: "pronunciation" as const, label: "Pronunciation" },
    { key: "grammar" as const, label: "Grammar" },
  ];

  const dimensionInsights: DimensionInsight[] = dimensionKeys.map(
    ({ key, label }) => {
      const vals = interviewScores.map((s) => rawScoreToSpeakingBand(s[key]));
      const avg = average(vals) ?? 0;
      return { label, average: avg, level: dimensionLevel(avg) };
    }
  );

  const weeklyTrend = buildWeeklyTrend(items);

  const highlights: string[] = [];
  const focusAreas: string[] = [];

  if (overview.totalSessions === 0) {
    return {
      overview,
      weeklyTrend,
      dimensionInsights,
      highlights: ["Complete your first practice to start tracking growth."],
      focusAreas: ["Try a Listen & Repeat drill or a Full Mock Exam."],
      narrative:
        "Your growth dashboard will populate as you practice. Sessions are saved on this device automatically — no login required.",
    };
  }

  if (overview.currentStreak >= 2) {
    highlights.push(
      `${overview.currentStreak}-day practice streak — consistency builds fluency.`
    );
  }
  if (overview.mockExamCount > 0) {
    highlights.push(
      `Completed ${overview.mockExamCount} full mock exam${overview.mockExamCount > 1 ? "s" : ""}.`
    );
  }
  if (overview.avgListenRepeat != null && overview.avgListenRepeat >= 5) {
    highlights.push(
      `Listen & Repeat average is ${formatSpeakingBand(overview.avgListenRepeat)}/${SPEAKING_BAND_MAX} — strong shadowing accuracy.`
    );
  }

  const strongDims = dimensionInsights.filter((d) => d.level === "strong");
  const focusDims = dimensionInsights.filter((d) => d.level === "focus");

  for (const d of strongDims.slice(0, 2)) {
    highlights.push(
      `${d.label} is a relative strength (${formatSpeakingBand(d.average)}/${SPEAKING_BAND_MAX}).`
    );
  }
  for (const d of focusDims.slice(0, 2)) {
    focusAreas.push(
      `Invest more time in ${d.label} (avg ${formatSpeakingBand(d.average)}/${SPEAKING_BAND_MAX}).`
    );
  }

  if (focusAreas.length === 0 && overview.avgInterview != null) {
    if (overview.avgInterview < 3.5) {
      focusAreas.push(
        "Run shorter Virtual Interview drills with 0s prep to simulate test conditions."
      );
    } else {
      focusAreas.push(
        "Schedule a full mock exam weekly to measure end-to-end readiness."
      );
    }
  }

  const recent = weeklyTrend.at(-1);
  const prior = weeklyTrend.at(-2);
  let trendNote = "";
  if (recent?.avgScore != null && prior?.avgScore != null) {
    const delta = round1(recent.avgScore - prior.avgScore);
    if (delta > 0.2) trendNote = ` Scores improved by ${delta} points this week.`;
    else if (delta < -0.2)
      trendNote = ` Scores dipped slightly (${Math.abs(delta)} pts) — review feedback in History.`;
  }

  const narrative = `Across ${overview.totalSessions} session${overview.totalSessions === 1 ? "" : "s"} on ${overview.practiceDays} day${overview.practiceDays === 1 ? "" : "s"}, you are building measurable speaking practice.${trendNote}${
    overview.avgMockExam != null
      ? ` Mock exam average: ${overview.avgMockExam?.toFixed(1)}/6.`
      : ""
  } Keep alternating Listen & Repeat precision work with timed interview responses.`;

  return {
    overview,
    weeklyTrend,
    dimensionInsights,
    highlights: highlights.slice(0, 4),
    focusAreas: focusAreas.slice(0, 3),
    narrative,
  };
}

export function countByMode(
  items: UnifiedHistoryItem[]
): Record<LocalPracticeMode, number> {
  return {
    listen_repeat: items.filter((i) => i.mode === "listen_repeat").length,
    interview: items.filter((i) => i.mode === "interview").length,
    mock_exam: items.filter((i) => i.mode === "mock_exam").length,
  };
}
